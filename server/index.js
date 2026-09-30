import express from 'express';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import pg from 'pg';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '6mb' }));
app.use(cookieParser());
const cookieName = '__Host-cap_session';
const hashToken = (value) => createHash('sha256').update(value).digest('hex');
const sessionAge = 7 * 24 * 60 * 60 * 1000;
const rate = new Map();
const bad = (res, status, error) => res.status(status).json({ success: false, error });
const object = (value) => value && typeof value === 'object' && !Array.isArray(value);

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS organizers (
      id uuid PRIMARY KEY, name text NOT NULL, email text NOT NULL UNIQUE,
      password_hash text NOT NULL, role text NOT NULL DEFAULT 'ORGANIZER',
      status text NOT NULL DEFAULT 'ACTIVE', created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash text PRIMARY KEY, organizer_id uuid NOT NULL REFERENCES organizers(id) ON DELETE CASCADE,
      expires_at timestamptz NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sessions_organizer_idx ON sessions(organizer_id);
    CREATE TABLE IF NOT EXISTS tournaments (
      id text PRIMARY KEY, organizer_id uuid NOT NULL REFERENCES organizers(id) ON DELETE CASCADE,
      data jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS tournaments_organizer_idx ON tournaments(organizer_id);
    CREATE TABLE IF NOT EXISTS teams (
      tournament_id text NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
      id text NOT NULL, data jsonb NOT NULL, PRIMARY KEY(tournament_id,id)
    );
    CREATE TABLE IF NOT EXISTS players (
      tournament_id text NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
      id text NOT NULL, data jsonb NOT NULL, PRIMARY KEY(tournament_id,id)
    );
    CREATE TABLE IF NOT EXISTS organizer_settings (
      organizer_id uuid PRIMARY KEY REFERENCES organizers(id) ON DELETE CASCADE,
      rules jsonb, live_state jsonb
    );
    CREATE TABLE IF NOT EXISTS tournament_live_state (
      tournament_id text PRIMARY KEY REFERENCES tournaments(id) ON DELETE CASCADE,
      data jsonb NOT NULL
    );
  `);
}

function limit(req, res, next) {
  const now = Date.now();
  const key = req.ip;
  const entry = rate.get(key) || { count: 0, reset: now + 15 * 60_000 };
  if (now > entry.reset) { entry.count = 0; entry.reset = now + 15 * 60_000; }
  rate.set(key, entry);
  if (++entry.count > 30) return bad(res, 429, 'Too many attempts. Please try later.');
  next();
}

app.use('/api', (req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    if (process.env.APP_ORIGIN && req.get('origin') !== process.env.APP_ORIGIN) return bad(res, 403, 'Invalid request origin');
    if (!req.is('application/json')) return bad(res, 415, 'JSON is required');
  }
  next();
});

async function session(res, user) {
  const token = randomBytes(32).toString('base64url');
  await pool.query('INSERT INTO sessions(token_hash,organizer_id,expires_at) VALUES($1,$2,now()+interval \'7 days\')', [hashToken(token), user.id]);
  res.cookie(cookieName, token, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: sessionAge });
  res.json({ success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status } });
}

async function requireUser(req, res, next) {
  const token = req.cookies[cookieName];
  if (!token) return bad(res, 401, 'Please sign in');
  const result = await pool.query(`SELECT o.id,o.name,o.email,o.role,o.status FROM sessions s JOIN organizers o ON o.id=s.organizer_id WHERE s.token_hash=$1 AND s.expires_at>now() AND o.status='ACTIVE'`, [hashToken(token)]);
  if (!result.rowCount) return bad(res, 401, 'Please sign in');
  req.user = result.rows[0];
  next();
}

async function owns(tournamentId, userId, client = pool) {
  const result = await client.query('SELECT id FROM tournaments WHERE id=$1 AND organizer_id=$2', [tournamentId, userId]);
  return result.rowCount > 0;
}

app.post('/api/auth/register', limit, async (req, res) => {
  const name = String(req.body?.name || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  if (!name || name.length > 100 || !/^\S+@\S+\.\S+$/.test(email) || email.length > 255 || password.length < 12 || password.length > 128) return bad(res, 400, 'Enter a name, valid email and password of at least 12 characters');
  try {
    const result = await pool.query('INSERT INTO organizers(id,name,email,password_hash) VALUES($1,$2,$3,$4) RETURNING id,name,email,role,status', [randomUUID(), name, email, await bcrypt.hash(password, 12)]);
    await session(res, result.rows[0]);
  } catch (error) {
    if (error.code === '23505') return bad(res, 409, 'Email already registered');
    throw error;
  }
});

app.post('/api/auth/login', limit, async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const result = await pool.query('SELECT * FROM organizers WHERE email=$1', [email]);
  if (!result.rowCount || !await bcrypt.compare(String(req.body?.password || ''), result.rows[0].password_hash)) return bad(res, 401, 'Invalid email or password');
  if (result.rows[0].status !== 'ACTIVE') return bad(res, 403, 'Account is blocked');
  await session(res, result.rows[0]);
});

app.get('/api/auth/me', requireUser, (req, res) => res.json({ success: true, user: req.user }));
app.post('/api/auth/logout', requireUser, async (req, res) => {
  await pool.query('DELETE FROM sessions WHERE token_hash=$1', [hashToken(req.cookies[cookieName])]);
  res.clearCookie(cookieName, { httpOnly: true, secure: true, sameSite: 'lax', path: '/' });
  res.json({ success: true });
});

app.get('/api/db/bootstrap', requireUser, async (req, res) => {
  const id = req.user.id;
  const [tournaments, teams, players, settings] = await Promise.all([
    pool.query('SELECT data FROM tournaments WHERE organizer_id=$1 ORDER BY updated_at DESC', [id]),
    pool.query('SELECT tm.data FROM teams tm JOIN tournaments t ON t.id=tm.tournament_id WHERE t.organizer_id=$1', [id]),
    pool.query('SELECT p.data FROM players p JOIN tournaments t ON t.id=p.tournament_id WHERE t.organizer_id=$1', [id]),
    pool.query('SELECT rules,live_state FROM organizer_settings WHERE organizer_id=$1', [id]),
  ]);
  res.json({ success: true, dbType: 'PostgreSQL', tournaments: tournaments.rows.map(x => x.data), teams: teams.rows.map(x => x.data), players: players.rows.map(x => x.data), rules: settings.rows[0]?.rules || null, liveState: settings.rows[0]?.live_state || null });
});

app.get('/api/tournaments/:id/live', requireUser, async (req, res) => {
  if (!await owns(req.params.id, req.user.id)) return bad(res, 404, 'Tournament not found');
  const result = await pool.query('SELECT data FROM tournament_live_state WHERE tournament_id=$1', [req.params.id]);
  res.json({ success: true, liveState: result.rows[0]?.data || { currentPlayerId: '', currentBid: 0, leadingTeam: null, bidsHistory: [] } });
});

async function saveTournament(client, tournament, user) {
  if (!object(tournament) || typeof tournament.id !== 'string' || !tournament.id || tournament.id.length > 160 || typeof tournament.name !== 'string' || !tournament.name.trim()) throw Object.assign(new Error('Invalid tournament'), { status: 400 });
  const data = { ...tournament, userId: user.id, creatorEmail: user.email };
  const result = await client.query('INSERT INTO tournaments(id,organizer_id,data) VALUES($1,$2,$3) ON CONFLICT(id) DO UPDATE SET data=excluded.data,updated_at=now() WHERE tournaments.organizer_id=$2 RETURNING id', [data.id, user.id, data]);
  if (!result.rowCount) throw Object.assign(new Error('Tournament belongs to another organizer'), { status: 403 });
}

async function saveEntries(client, table, entries, userId) {
  if (!Array.isArray(entries) || entries.length > 10000) throw Object.assign(new Error('Invalid records'), { status: 400 });
  for (const item of entries) {
    if (!object(item) || typeof item.id !== 'string' || !item.id || typeof item.tournamentId !== 'string' || !await owns(item.tournamentId, userId, client)) throw Object.assign(new Error('Record is outside your tournament'), { status: 403 });
    await client.query(`INSERT INTO ${table}(tournament_id,id,data) VALUES($1,$2,$3) ON CONFLICT(tournament_id,id) DO UPDATE SET data=excluded.data`, [item.tournamentId, item.id, item]);
  }
}

app.post('/api/db/sync', requireUser, async (req, res) => {
  const body = req.body || {};
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const tournaments = [...(Array.isArray(body.tournaments) ? body.tournaments : []), ...(body.tournament ? [body.tournament] : [])];
    for (const item of tournaments) await saveTournament(client, item, req.user);
    await saveEntries(client, 'teams', [...(Array.isArray(body.teams) ? body.teams : []), ...(body.team ? [body.team] : [])], req.user.id);
    await saveEntries(client, 'players', [...(Array.isArray(body.players) ? body.players : []), ...(body.player ? [body.player] : [])], req.user.id);
    if (body.rules) {
      await client.query('INSERT INTO organizer_settings(organizer_id,rules) VALUES($1,$2) ON CONFLICT(organizer_id) DO UPDATE SET rules=excluded.rules', [req.user.id, body.rules]);
    }
    if (body.liveState) {
      const tournamentId = body.liveState.tournamentId;
      if (!await owns(tournamentId, req.user.id, client)) throw Object.assign(new Error('Live state is outside your tournament'), { status: 403 });
      await client.query('INSERT INTO tournament_live_state(tournament_id,data) VALUES($1,$2) ON CONFLICT(tournament_id) DO UPDATE SET data=excluded.data', [tournamentId, body.liveState]);
    }
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
});

app.delete('/api/tournaments/:id', requireUser, async (req, res) => {
  await pool.query('DELETE FROM tournaments WHERE id=$1 AND organizer_id=$2', [req.params.id, req.user.id]);
  res.json({ success: true });
});
for (const [route, table] of [['teams', 'teams'], ['players', 'players']]) {
  app.delete(`/api/${route}/:id`, requireUser, async (req, res) => {
    await pool.query(`DELETE FROM ${table} x USING tournaments t WHERE x.tournament_id=t.id AND x.id=$1 AND t.organizer_id=$2`, [req.params.id, req.user.id]);
    res.json({ success: true });
  });
}

app.get('/api/public/tournaments/:id', async (req, res) => {
  const result = await pool.query('SELECT data FROM tournaments WHERE id=$1', [req.params.id]);
  if (!result.rowCount) return bad(res, 404, 'Tournament not found');
  const { userId, creatorEmail, ...tournament } = result.rows[0].data;
  res.json({ success: true, tournament });
});
app.get('/api/public/tournaments/:id/summary', async (req, res) => {
  const result = await pool.query('SELECT data FROM tournaments WHERE id=$1', [req.params.id]);
  if (!result.rowCount) return bad(res, 404, 'Tournament not found');
  const { userId, creatorEmail, customFields, gpayNumber, upiId, gpayQrUrl, ...tournament } = result.rows[0].data;
  const [teamRows, playerRows] = await Promise.all([
    pool.query('SELECT data FROM teams WHERE tournament_id=$1', [req.params.id]),
    pool.query('SELECT data FROM players WHERE tournament_id=$1', [req.params.id]),
  ]);
  const teams = teamRows.rows.map(({ data: t }) => ({ id: t.id, name: t.name, shortCode: t.shortCode, logo: t.logo, colorHex: t.colorHex, totalPurse: t.totalPurse, remainingPurse: t.remainingPurse }));
  const players = playerRows.rows.filter(({ data: p }) => p.approvalStatus === 'APPROVED').map(({ data: p }) => ({ id: p.id, name: p.name, photoUrl: p.photoUrl, role: p.role, status: p.status, soldToTeamId: p.soldToTeamId, soldPrice: p.soldPrice, basePrice: p.basePrice }));
  res.json({ success: true, tournament, teams, players });
});
app.post('/api/public/tournaments/:id/register', limit, async (req, res) => {
  const result = await pool.query('SELECT data FROM tournaments WHERE id=$1', [req.params.id]);
  if (!result.rowCount || result.rows[0].data.registrationOpen === false) return bad(res, 404, 'Registration is closed');
  const player = req.body?.player;
  if (!object(player) || typeof player.name !== 'string' || !player.name.trim() || typeof player.mobile !== 'string' || !player.mobile.trim()) return bad(res, 400, 'Name and mobile are required');
  const registered = { ...player, id: randomUUID(), tournamentId: req.params.id, approvalStatus: 'PENDING', status: 'AVAILABLE', paymentStatus: 'PENDING', registeredAt: new Date().toISOString() };
  await pool.query('INSERT INTO players(tournament_id,id,data) VALUES($1,$2,$3)', [req.params.id, registered.id, registered]);
  res.status(201).json({ success: true, player: registered });
});

app.get('/api/db/export', requireUser, async (req, res) => {
  const id = req.user.id;
  const [tournaments, teams, players] = await Promise.all([
    pool.query('SELECT data FROM tournaments WHERE organizer_id=$1', [id]),
    pool.query('SELECT x.data FROM teams x JOIN tournaments t ON x.tournament_id=t.id WHERE t.organizer_id=$1', [id]),
    pool.query('SELECT x.data FROM players x JOIN tournaments t ON x.tournament_id=t.id WHERE t.organizer_id=$1', [id]),
  ]);
  res.set('Content-Disposition', 'attachment; filename="cricket_auction_backup.json"');
  res.json({ exportedAt: new Date().toISOString(), engine: 'PostgreSQL', tournaments: tournaments.rows.map(x=>x.data), teams: teams.rows.map(x=>x.data), players: players.rows.map(x=>x.data) });
});
app.post('/api/db/import', requireUser, async (req, res) => {
  const data = req.body;
  if (!Array.isArray(data?.tournaments) || !Array.isArray(data?.teams) || !Array.isArray(data?.players)) return bad(res, 400, 'Invalid backup');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const t of data.tournaments) await saveTournament(client, t, req.user);
    await saveEntries(client, 'teams', data.teams, req.user.id);
    await saveEntries(client, 'players', data.players, req.user.id);
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
});

app.get('/api/health', async (_req, res) => { await pool.query('SELECT 1'); res.json({ ok: true }); });
app.all('/api/*path', (_req, res) => bad(res, 404, 'Not found'));
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
app.use(express.static(dist));
app.use((_req, res) => res.sendFile(path.join(dist, 'index.html')));
app.use((error, _req, res, _next) => { console.error(error); bad(res, error.status || 500, error.status ? error.message : 'Server error'); });

await migrate();
app.listen(Number(process.env.PORT || 3000), '0.0.0.0', () => console.log('Cricket Auction Pro ready'));
