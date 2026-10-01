import { correctPlayer } from '../shared/playerCorrection.js';
import { normalizeMobile, isUploadedImage } from '../shared/registrationValidation.js';
import { getBidBudget } from '../shared/auctionBudget.js';
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

const safeImage = value => !value || typeof value === 'string' && value.length <= 2_000_000 && (
  /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(value) ||
  /^https?:\/\/[^\s]+$/.test(value) || /^\/(?!\/)[^\s]*$/.test(value)
);

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
    CREATE TABLE IF NOT EXISTS deleted_players (
      tournament_id text NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
      id text NOT NULL, data jsonb NOT NULL, deleted_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(tournament_id,id)
    );
    CREATE TABLE IF NOT EXISTS organizer_settings (
      organizer_id uuid PRIMARY KEY REFERENCES organizers(id) ON DELETE CASCADE,
      rules jsonb, live_state jsonb
    );
    CREATE TABLE IF NOT EXISTS tournament_live_state (
      tournament_id text PRIMARY KEY REFERENCES tournaments(id) ON DELETE CASCADE,
      data jsonb NOT NULL
    );
    UPDATE tournaments t SET data=jsonb_set(t.data,'{rules}',s.rules)
      FROM organizer_settings s WHERE s.organizer_id=t.organizer_id AND s.rules IS NOT NULL AND NOT (t.data ? 'rules');
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
  res.set('Cache-Control', 'no-store');
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

function requireAdmin(req, res, next) {
  if (req.user.role !== 'ADMIN') return bad(res, 403, 'Administrator access required');
  next();
}

async function owns(tournamentId, userId, client = pool) {
  const result = await client.query(`SELECT id FROM tournaments WHERE id=$1 AND (organizer_id=$2 OR EXISTS (SELECT 1 FROM organizers WHERE id=$2 AND role='ADMIN'))${client !== pool ? ' FOR UPDATE' : ''}`, [tournamentId, userId]);
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

app.get('/api/admin/users', requireUser, requireAdmin, async (_req, res) => {
  const result = await pool.query(`SELECT o.id,o.name,o.email,o.role,o.status,o.created_at,
    count(t.id)::integer AS tournaments_count FROM organizers o
    LEFT JOIN tournaments t ON t.organizer_id=o.id
    GROUP BY o.id ORDER BY o.created_at DESC`);
  res.json({ success: true, users: result.rows.map(({ created_at, tournaments_count, ...user }) => ({ ...user, createdAt: created_at, tournamentsCount: tournaments_count })) });
});

app.get('/api/admin/stats', requireUser, requireAdmin, async (_req, res) => {
  const result = await pool.query(`SELECT
    (SELECT count(*)::integer FROM organizers WHERE role='ORGANIZER') AS users_count,
    (SELECT count(*)::integer FROM tournaments) AS tournaments_count,
    (SELECT count(*)::integer FROM tournaments WHERE data->>'status'='LIVE') AS live_tournaments_count,
    (SELECT count(*)::integer FROM teams) AS teams_count,
    (SELECT count(*)::integer FROM players) AS players_count,
    (SELECT count(*)::integer FROM players WHERE data->>'status'='SOLD') AS sold_players_count`);
  const { users_count, tournaments_count, live_tournaments_count, teams_count, players_count, sold_players_count } = result.rows[0];
  res.json({ success: true, stats: { usersCount: users_count, tournamentsCount: tournaments_count, liveTournamentsCount: live_tournaments_count, teamsCount: teams_count, playersCount: players_count, soldPlayersCount: sold_players_count } });
});

app.post('/api/admin/toggle-user', requireUser, requireAdmin, async (req, res) => {
  const result = await pool.query(`UPDATE organizers SET status=CASE WHEN status='ACTIVE' THEN 'BLOCKED' ELSE 'ACTIVE' END
    WHERE id=$1 AND role='ORGANIZER' RETURNING status`, [req.body?.userId]);
  if (!result.rowCount) return bad(res, 404, 'Organizer not found');
  if (result.rows[0].status === 'BLOCKED') await pool.query('DELETE FROM sessions WHERE organizer_id=$1', [req.body.userId]);
  res.json({ success: true, status: result.rows[0].status });
});

app.get('/api/ping', (_req, res) => res.json({ ok: true }));

app.get('/api/db/bootstrap', requireUser, async (req, res) => {
  const id = req.user.id;
  const [tournaments, teams, players, settings] = await Promise.all([
    pool.query('SELECT data FROM tournaments WHERE organizer_id=$1 OR $2 ORDER BY updated_at DESC', [id, req.user.role === 'ADMIN']),
    pool.query('SELECT tm.data FROM teams tm JOIN tournaments t ON t.id=tm.tournament_id WHERE t.organizer_id=$1 OR $2', [id, req.user.role === 'ADMIN']),
    pool.query('SELECT p.data FROM players p JOIN tournaments t ON t.id=p.tournament_id WHERE t.organizer_id=$1 OR $2', [id, req.user.role === 'ADMIN']),
    pool.query('SELECT rules,live_state FROM organizer_settings WHERE organizer_id=$1', [id]),
  ]);
  res.json({ success: true, dbType: 'PostgreSQL', tournaments: tournaments.rows.map(x => x.data), teams: teams.rows.map(x => x.data), players: players.rows.map(x => x.data), rules: settings.rows[0]?.rules || null, liveState: settings.rows[0]?.live_state || null });
});

app.get('/api/tournaments/:id/deleted-players', requireUser, async (req, res) => {
  if (!await owns(req.params.id, req.user.id)) return bad(res, 404, 'Tournament not found');
  const rows = await pool.query('SELECT data,deleted_at FROM deleted_players WHERE tournament_id=$1 ORDER BY deleted_at DESC', [req.params.id]);
  res.json({ players: rows.rows.map(r => ({ ...r.data, deletedAt: r.deleted_at })) });
});
app.post('/api/tournaments/:id/player-correction', requireUser, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (!await owns(req.params.id, req.user.id, client)) throw new Error('Tournament not found');
    const tournament = await client.query('SELECT data FROM tournaments WHERE id=$1 FOR UPDATE', [req.params.id]);
    const { action, playerId, teamId, amount } = req.body || {};
    if (!['SOLD','UNSOLD','AVAILABLE','DELETE','RESTORE'].includes(action)) throw new Error('Invalid correction');
    const rows = await client.query('SELECT data FROM players WHERE tournament_id=$1', [req.params.id]);
    const teamRows = await client.query('SELECT data FROM teams WHERE tournament_id=$1', [req.params.id]);
    if (action === 'RESTORE') {
      const archived = await client.query('SELECT data FROM deleted_players WHERE tournament_id=$1 AND id=$2', [req.params.id, playerId]);
      if (!archived.rowCount || rows.rows.some(r => r.data.id === playerId)) throw new Error('Deleted player unavailable or already restored');
      const original = archived.rows[0].data;
      if (rows.rows.some(r => normalizeMobile(r.data.mobile) && normalizeMobile(r.data.mobile) === normalizeMobile(original.mobile))) throw new Error('Mobile number already registered');
      const { soldPrice, soldToTeamId, ...restored } = original;
      await client.query('INSERT INTO players(tournament_id,id,data) VALUES($1,$2,$3)', [req.params.id, playerId, { ...restored, status: 'AVAILABLE' }]);
      await client.query('DELETE FROM deleted_players WHERE tournament_id=$1 AND id=$2', [req.params.id, playerId]);
    } else {
      const result = correctPlayer(rows.rows.map(r => r.data), teamRows.rows.map(r => r.data), playerId, action, teamId, amount, tournament.rows[0].data.rules || {});
      for (const team of result.teams) await client.query('UPDATE teams SET data=$3 WHERE tournament_id=$1 AND id=$2', [req.params.id, team.id, team]);
      if (action === 'DELETE') {
        const original = rows.rows.find(r => r.data.id === playerId).data;
        await client.query('INSERT INTO deleted_players(tournament_id,id,data) VALUES($1,$2,$3) ON CONFLICT(tournament_id,id) DO UPDATE SET data=excluded.data,deleted_at=now()', [req.params.id, playerId, original]);
        await client.query('DELETE FROM players WHERE tournament_id=$1 AND id=$2', [req.params.id, playerId]);
      } else await client.query('UPDATE players SET data=$3 WHERE tournament_id=$1 AND id=$2', [req.params.id, playerId, result.player]);
    }
    // Remove stale bids and selection for the corrected player.
    await client.query("UPDATE tournament_live_state SET data=data || '{\"currentPlayerId\":\"\",\"currentBid\":0,\"leadingTeam\":null,\"bidsHistory\":[],\"lastEvent\":null}'::jsonb WHERE tournament_id=$1 AND data->>'currentPlayerId'=$2", [req.params.id, playerId]);
    await client.query('COMMIT'); res.json({ success: true });
  } catch (err) { await client.query('ROLLBACK'); bad(res, 409, err.message); }
  finally { client.release(); }
});

app.get('/api/tournaments/:id/live', requireUser, async (req, res) => {
  if (!await owns(req.params.id, req.user.id)) return bad(res, 404, 'Tournament not found');
  const result = await pool.query('SELECT data FROM tournament_live_state WHERE tournament_id=$1', [req.params.id]);
  res.json({ success: true, liveState: result.rows[0]?.data || { currentPlayerId: '', currentBid: 0, leadingTeam: null, bidsHistory: [] } });
});

// Auction commands serialize on the tournament row, so two devices cannot
// accept stale bids or deduct a winning team's purse more than once.
app.post('/api/tournaments/:id/auction', requireUser, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (!await owns(req.params.id, req.user.id, client)) throw Object.assign(new Error('Tournament not found'), { status: 404 });
    await client.query('SELECT id FROM tournaments WHERE id=$1 FOR UPDATE', [req.params.id]);
    const live = await client.query('SELECT data FROM tournament_live_state WHERE tournament_id=$1', [req.params.id]);
    let state = live.rows[0]?.data || { currentPlayerId: '', currentBid: 0, leadingTeam: null, bidsHistory: [] };
    const playerRows = await client.query('SELECT data FROM players WHERE tournament_id=$1', [req.params.id]);
    const teamRows = await client.query('SELECT data FROM teams WHERE tournament_id=$1', [req.params.id]);
    let players = playerRows.rows.map(x => x.data), teams = teamRows.rows.map(x => x.data);
    const body = req.body || {};
    const fail = message => { throw Object.assign(new Error(message), { status: 409 }); };
    const eligible = p => p && (!p.approvalStatus || p.approvalStatus === 'APPROVED') && ['AVAILABLE','IN_AUCTION'].includes(p.status);
    if (body.action === 'ACCELERATE') {
      const discount = body.discountPercent;
      if (!Number.isFinite(discount) || discount < 0 || discount > 100) throw Object.assign(new Error('Invalid discount'), { status: 400 });
      const recalled = players.filter(p => p.status === 'UNSOLD' && (!p.approvalStatus || p.approvalStatus === 'APPROVED'));
      if (!recalled.length) fail('No unsold players available');
      players = players.map(p => recalled.some(x => x.id === p.id) ? { ...p, status: 'AVAILABLE', category: 'ACCELERATED', basePrice: Math.max(0, Math.round(p.basePrice * (1 - discount / 100))) } : p);
      for (const player of players.filter(p => recalled.some(x => x.id === p.id))) await client.query('UPDATE players SET data=$3 WHERE tournament_id=$1 AND id=$2', [req.params.id, player.id, player]);
      state = { currentPlayerId: recalled[0].id, currentBid: 0, leadingTeam: null, bidsHistory: [] };
    } else if (body.action === 'RESET') {
      players = players.map(p => { const { soldPrice, soldToTeamId, ...rest } = p; return { ...rest, status: 'AVAILABLE' }; });
      teams = teams.map(t => ({ ...t, remainingPurse: t.totalPurse }));
      for (const player of players) await client.query('UPDATE players SET data=$3 WHERE tournament_id=$1 AND id=$2', [req.params.id, player.id, player]);
      for (const team of teams) await client.query('UPDATE teams SET data=$3 WHERE tournament_id=$1 AND id=$2', [req.params.id, team.id, team]);
      state = { currentPlayerId: '', currentBid: 0, leadingTeam: null, bidsHistory: [] };
    } else if (body.action === 'SELECT') {
      const player = players.find(p => p.id === body.playerId);
      if (!eligible(player)) fail('Player is not available for auction');
      state = { currentPlayerId: player.id, currentBid: 0, leadingTeam: null, bidsHistory: [] };
    } else {
      const player = players.find(p => p.id === state.currentPlayerId);
      if (!eligible(player) || body.playerId !== player.id) fail('Auction lot changed; refresh and try again');
      const settings = await client.query("SELECT data->'rules' AS rules FROM tournaments WHERE id=$1", [req.params.id]);
      const rules = settings.rows[0]?.rules || {};
      if (body.action === 'BID') {
        const team = teams.find(t => t.id === body.teamId);
        const amount = body.amount;
        if (!team || !Number.isFinite(amount) || amount < player.basePrice || amount <= state.currentBid) fail('Bid must exceed the current bid and meet the base price');
        const budget = getBidBudget(team, players, rules);
        if (budget.squadComplete) fail(`Squad complete — ${team.name} has reached the maximum of ${rules.maxPlayersPerTeam || 15} players`);
        if ((rules.minimumPlayerReserve || !rules.allowNegativePurse) && amount > budget.maxBid) fail(`Maximum bid is ${budget.maxBid}; ${budget.reserve} must remain reserved for the squad`);
        if (players.filter(p => p.status === 'SOLD' && p.soldToTeamId === team.id).length >= (rules.maxPlayersPerTeam || 15)) fail('Squad complete — no further players or bids allowed');
        const record = { id: randomUUID(), playerId: player.id, teamId: team.id, teamName: team.name, amount, timestamp: Date.now() };
        state = { ...state, currentBid: amount, leadingTeam: team, bidsHistory: [record, ...(state.bidsHistory || [])] };
      } else if (body.action === 'UNDO') {
        const history = (state.bidsHistory || []).slice(1), previous = history[0];
        state = { ...state, bidsHistory: history, currentBid: previous?.amount || 0, leadingTeam: teams.find(t => t.id === previous?.teamId) || null };
      } else if (body.action === 'SOLD' || body.action === 'UNSOLD') {
        if (body.action === 'SOLD') {
          const winner = teams.find(t => t.id === state.leadingTeam?.id);
          if (!winner || !state.currentBid || body.amount !== state.currentBid || body.teamId !== winner.id) fail('Winning bid changed; review it before marking sold');
          const budget = getBidBudget(winner, players, rules);
          if (budget.squadComplete) fail("Squad complete — no further players or bids allowed");
          if ((rules.minimumPlayerReserve || !rules.allowNegativePurse) && state.currentBid > budget.maxBid) fail(`Winning bid exceeds the current maximum of ${budget.maxBid}; undo the bid or update squad rules`);
          if (budget.bought >= (rules.maxPlayersPerTeam || 15)) fail('Squad complete — no further players or bids allowed');
          const sold = { ...player, status: 'SOLD', soldToTeamId: winner.id, soldPrice: state.currentBid };
          const updatedTeam = { ...winner, remainingPurse: winner.remainingPurse - state.currentBid };
          await client.query('UPDATE players SET data=$3 WHERE tournament_id=$1 AND id=$2', [req.params.id, player.id, sold]);
          await client.query('UPDATE teams SET data=$3 WHERE tournament_id=$1 AND id=$2', [req.params.id, winner.id, updatedTeam]);
          players = players.map(p => p.id === sold.id ? sold : p);
          teams = teams.map(t => t.id === winner.id ? updatedTeam : t);
        } else {
          const unsold = { ...player, status: 'UNSOLD' };
          await client.query('UPDATE players SET data=$3 WHERE tournament_id=$1 AND id=$2', [req.params.id, player.id, unsold]);
          players = players.map(p => p.id === player.id ? unsold : p);
        }
        const lastEvent = { id: randomUUID(), type: body.action, player, team: state.leadingTeam, price: state.currentBid, timestamp: Date.now() };
        const next = players.find(eligible);
        state = { currentPlayerId: next?.id || '', currentBid: 0, leadingTeam: null, bidsHistory: [], lastEvent };
      } else throw Object.assign(new Error('Unknown auction command'), { status: 400 });
    }
    state.tournamentId = req.params.id;
    await client.query('INSERT INTO tournament_live_state(tournament_id,data) VALUES($1,$2) ON CONFLICT(tournament_id) DO UPDATE SET data=excluded.data', [req.params.id, state]);
    await client.query('COMMIT');
    res.json({ success: true, liveState: state, players, teams });
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
});

app.get('/api/tournaments/:id/snapshot', requireUser, async (req, res) => {
  if (!await owns(req.params.id, req.user.id)) return bad(res, 404, 'Tournament not found');
  const [live, teams, players] = await Promise.all([
    pool.query('SELECT data FROM tournament_live_state WHERE tournament_id=$1', [req.params.id]),
    pool.query('SELECT data FROM teams WHERE tournament_id=$1', [req.params.id]),
    pool.query('SELECT data FROM players WHERE tournament_id=$1', [req.params.id]),
  ]);
  res.json({ success: true, liveState: live.rows[0]?.data || {}, teams: teams.rows.map(x => x.data), players: players.rows.map(x => x.data) });
});

async function saveTournament(client, tournament, user) {
  if (!object(tournament) || typeof tournament.id !== 'string' || !tournament.id || tournament.id.length > 160 || typeof tournament.name !== 'string' || !tournament.name.trim()) throw Object.assign(new Error('Invalid tournament'), { status: 400 });
  if (!safeImage(tournament.gpayQrUrl)) throw Object.assign(new Error('Invalid payment QR image'), { status: 400 });
  let owner = user;
  if (user.role === 'ADMIN') {
    const existing = await client.query('SELECT o.id,o.email FROM tournaments t JOIN organizers o ON o.id=t.organizer_id WHERE t.id=$1', [tournament.id]);
    if (existing.rowCount) owner = existing.rows[0];
  }
  const data = { ...tournament, userId: owner.id, creatorEmail: owner.email };
  const result = await client.query(`INSERT INTO tournaments(id,organizer_id,data) VALUES($1,$2,$3) ON CONFLICT(id) DO UPDATE SET data=CASE WHEN tournaments.data ? 'rules' THEN jsonb_set(excluded.data,'{rules}',tournaments.data->'rules') ELSE excluded.data END,updated_at=now() WHERE tournaments.organizer_id=$2 RETURNING id`, [data.id, owner.id, data]);
  if (!result.rowCount) throw Object.assign(new Error('Tournament belongs to another organizer'), { status: 403 });
}

async function saveEntries(client, table, entries, userId, importing = false) {
  if (!Array.isArray(entries) || entries.length > 10000) throw Object.assign(new Error('Invalid records'), { status: 400 });
  for (const item of entries) {
    if (!object(item) || typeof item.id !== 'string' || !item.id || typeof item.tournamentId !== 'string' || !await owns(item.tournamentId, userId, client)) throw Object.assign(new Error('Record is outside your tournament'), { status: 403 });
    if (typeof item.name !== 'string' || !item.name.trim() || item.name.length > 100) throw Object.assign(new Error('Record name is required and must be at most 100 characters'), { status: 400 });
    if (table === 'teams' && (!Number.isFinite(item.totalPurse) || item.totalPurse <= 0 || !Number.isFinite(item.remainingPurse))) throw Object.assign(new Error('Invalid team purse'), { status: 400 });
    if (table === 'players' && (!Number.isFinite(item.basePrice) || item.basePrice < 0 || !['AVAILABLE','IN_AUCTION','SOLD','UNSOLD'].includes(item.status))) throw Object.assign(new Error('Invalid player price or status'), { status: 400 });
    if (table === 'players' && (!safeImage(item.photoUrl) || !safeImage(item.paymentScreenshotUrl))) throw Object.assign(new Error('Invalid player image or receipt'), { status: 400 });
    let data = item;
    if (table === 'players' && !importing) {
      const archived = await client.query('SELECT id FROM deleted_players WHERE tournament_id=$1 AND id=$2', [item.tournamentId, item.id]);
      if (archived.rowCount) continue;
      const existing = await client.query('SELECT data FROM players WHERE tournament_id=$1 AND id=$2', [item.tournamentId, item.id]);
      const previous = existing.rows[0]?.data;
      if (previous && ['SOLD','UNSOLD'].includes(previous.status)) data = { ...item, status: previous.status, soldPrice: previous.soldPrice, soldToTeamId: previous.soldToTeamId };
      else if (item.status === 'SOLD') throw Object.assign(new Error('Use the auction desk to mark a player sold'), { status: 400 });
    }
    if (table === 'teams' && !importing) {
      const spent = await client.query("SELECT coalesce(sum((data->>'soldPrice')::numeric),0) AS spent FROM players WHERE tournament_id=$1 AND data->>'soldToTeamId'=$2 AND data->>'status'='SOLD'", [item.tournamentId, item.id]);
      const remainingPurse = item.totalPurse - Number(spent.rows[0].spent);
      if (remainingPurse < 0) throw Object.assign(new Error('Team purse cannot be less than its purchases'), { status: 400 });
      data = { ...item, remainingPurse };
    }
    await client.query(`INSERT INTO ${table}(tournament_id,id,data) VALUES($1,$2,$3) ON CONFLICT(tournament_id,id) DO UPDATE SET data=excluded.data`, [item.tournamentId, item.id, data]);
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
      const r = body.rules;
      if (r?.minimumPlayerReserve !== undefined && (!Number.isSafeInteger(r.minimumPlayerReserve) || r.minimumPlayerReserve <= 0)) throw Object.assign(new Error("Invalid minimum player reserve"), { status: 400 });
      if (!object(r) || !Number.isFinite(r.pursePerTeam) || r.pursePerTeam <= 0 || !Number.isInteger(r.minPlayersPerTeam) || !Number.isInteger(r.maxPlayersPerTeam) || r.minPlayersPerTeam < 1 || r.maxPlayersPerTeam < r.minPlayersPerTeam || !Number.isFinite(r.timerSeconds) || r.timerSeconds < 1) throw Object.assign(new Error('Invalid auction rules'), { status: 400 });
      if (body.tournamentId) {
        if (!await owns(body.tournamentId, req.user.id, client)) throw Object.assign(new Error('Rules are outside your tournament'), { status: 403 });
        await client.query("UPDATE tournaments SET data=jsonb_set(data,'{rules}',$2::jsonb),updated_at=now() WHERE id=$1", [body.tournamentId, JSON.stringify(body.rules)]);
      }
      if (!body.tournamentId) await client.query('INSERT INTO organizer_settings(organizer_id,rules) VALUES($1,$2) ON CONFLICT(organizer_id) DO UPDATE SET rules=excluded.rules', [req.user.id, body.rules]);
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
  await pool.query("DELETE FROM tournaments WHERE id=$1 AND (organizer_id=$2 OR EXISTS (SELECT 1 FROM organizers WHERE id=$2 AND role='ADMIN'))", [req.params.id, req.user.id]);
  res.json({ success: true });
});
for (const [route, table] of [['teams', 'teams'], ['players', 'players']]) {
  app.delete(`/api/${route}/:id`, requireUser, async (req, res) => {
    const tournamentId = req.query.tournamentId;
    if (typeof tournamentId !== 'string' || !await owns(tournamentId, req.user.id)) return bad(res, 404, 'Tournament not found');
    const sold = await pool.query(table === 'teams'
      ? "SELECT id FROM players WHERE tournament_id=$1 AND data->>'soldToTeamId'=$2 AND data->>'status'='SOLD'"
      : "SELECT id FROM players WHERE tournament_id=$1 AND id=$2 AND data->>'status'='SOLD'", [tournamentId, req.params.id]);
    if (sold.rowCount) return bad(res, 409, 'Reset the auction before deleting sold records');
    const result = table === 'players'
      ? await pool.query(`WITH removed AS (DELETE FROM players WHERE tournament_id=$1 AND id=$2 RETURNING tournament_id,id,data) INSERT INTO deleted_players(tournament_id,id,data) SELECT tournament_id,id,data FROM removed ON CONFLICT(tournament_id,id) DO UPDATE SET data=excluded.data,deleted_at=now() RETURNING id`, [tournamentId, req.params.id])
      : await pool.query(`DELETE FROM ${table} WHERE tournament_id=$1 AND id=$2 RETURNING id`, [tournamentId, req.params.id]);
    if (!result.rowCount) return bad(res, 404, 'Record not found');
    res.json({ success: true });
  });
}

app.get('/api/public/tournaments/:id', async (req, res) => {
  const result = await pool.query('SELECT data FROM tournaments WHERE id=$1', [req.params.id]);
  if (!result.rowCount) return bad(res, 404, 'Tournament not found');
  const { userId, creatorEmail, ...tournament } = result.rows[0].data;
  res.json({ success: true, tournament });
});
// Owner-share view exposes only identity, photo and cricket role, including pending forms.
app.get('/api/public/tournaments/:id/registrations', async (req, res) => {
  const result = await pool.query('SELECT data FROM tournaments WHERE id=$1', [req.params.id]);
  if (!result.rowCount) return bad(res, 404, 'Tournament not found');
  const rows = await pool.query("SELECT data FROM players WHERE tournament_id=$1 ORDER BY data->>'registeredAt' DESC NULLS LAST", [req.params.id]);
  const tournament = result.rows[0].data;
  res.set('Cache-Control', 'no-store');
  res.json({ tournament: { name: tournament.name, season: tournament.season }, players: rows.rows.map(({ data: player }) => ({ id: player.id, name: player.name, photoUrl: player.photoUrl, role: player.role })) });
});

app.get('/api/public/tournaments/:id/summary', async (req, res) => {
  const result = await pool.query('SELECT data FROM tournaments WHERE id=$1', [req.params.id]);
  if (!result.rowCount) return bad(res, 404, 'Tournament not found');
  const { userId, creatorEmail, customFields, gpayNumber, upiId, gpayQrUrl, ...tournament } = result.rows[0].data;
  const [teamRows, playerRows, liveRows] = await Promise.all([
    pool.query('SELECT data FROM teams WHERE tournament_id=$1', [req.params.id]),
    pool.query('SELECT data FROM players WHERE tournament_id=$1', [req.params.id]),
    pool.query('SELECT data FROM tournament_live_state WHERE tournament_id=$1', [req.params.id]),
  ]);
  const teams = teamRows.rows.map(({ data: t }) => ({ id: t.id, name: t.name, shortCode: t.shortCode, logo: t.logo, colorHex: t.colorHex, totalPurse: t.totalPurse, remainingPurse: t.remainingPurse }));
  const players = playerRows.rows.filter(({ data: p }) => !p.approvalStatus || p.approvalStatus === 'APPROVED').map(({ data: p }) => ({ id: p.id, name: p.name, photoUrl: p.photoUrl, role: p.role, status: p.status, soldToTeamId: p.soldToTeamId, soldPrice: p.soldPrice, basePrice: p.basePrice, category: p.category, lotOrder: p.lotOrder, battingStyle: p.battingStyle, bowlingStyle: p.bowlingStyle, stats: p.stats || { matches: 0, runs: 0, wickets: 0, strikeRate: 0 } }));
  const registrationPlayers = playerRows.rows.map(({ data: p }) => ({ id: p.id, name: p.name, photoUrl: p.photoUrl, role: p.role, approvalStatus: p.approvalStatus || 'APPROVED', status: p.status, basePrice: p.basePrice, soldPrice: p.soldPrice, soldToTeamId: p.soldToTeamId }));
  const registrationStats = { total: playerRows.rows.length, pending: playerRows.rows.filter(({data: p}) => p.approvalStatus === 'PENDING').length, approved: players.length, rejected: playerRows.rows.filter(({data: p}) => p.approvalStatus === 'REJECTED').length };
  const state = liveRows.rows[0]?.data || {};
  res.set('Cache-Control', 'no-store');
  res.json({ success: true, tournament, teams, players, registrationPlayers, registrationStats, liveState: { currentPlayerId: state.currentPlayerId || '', currentBid: state.currentBid || 0, leadingTeam: state.leadingTeam ? { id: state.leadingTeam.id } : null, bidsHistory: (state.bidsHistory || []).slice(0, 10).map(b => ({ id: b.id, playerId: b.playerId, teamId: b.teamId, teamName: teams.find(t => t.id === b.teamId)?.name || b.teamName, amount: b.amount, timestamp: b.timestamp })), lastEvent: state.lastEvent ? { id: state.lastEvent.id, type: state.lastEvent.type, timestamp: state.lastEvent.timestamp, price: state.lastEvent.price, player: players.find(p => p.id === state.lastEvent.player?.id) || null, team: teams.find(t => t.id === state.lastEvent.team?.id) || null } : null } });
});
app.post('/api/public/tournaments/:id/register', limit, async (req, res) => {
  const result = await pool.query('SELECT data FROM tournaments WHERE id=$1', [req.params.id]);
  if (!result.rowCount || result.rows[0].data.registrationOpen === false) return bad(res, 404, 'Registration is closed');
  const player = req.body?.player;
  if (!object(player) || typeof player.name !== 'string' || !player.name.trim() || typeof player.mobile !== 'string' || !player.mobile.trim()) return bad(res, 400, 'Name and mobile are required');
  const tournament = result.rows[0].data;
  if (tournament.registrationDeadline && new Date(`${tournament.registrationDeadline}T23:59:59+05:30`) < new Date()) return bad(res, 400, 'Registration deadline has passed');
  if (player.name.trim().length > 100 || !/^\+?[\d\s()-]{7,20}$/.test(player.mobile.trim())) return bad(res, 400, 'Enter a valid name and mobile number');
  if (!['BATSMAN', 'BOWLER', 'ALL_ROUNDER', 'WICKET_KEEPER'].includes(player.role)) return bad(res, 400, 'Invalid player role');
  if (!object(player.stats) || ['matches','runs','wickets','strikeRate'].some(key => !Number.isFinite(player.stats[key]) || player.stats[key] < 0)) return bad(res, 400, 'Enter valid non-negative player statistics');
  if (!safeImage(player.photoUrl) || !safeImage(player.paymentScreenshotUrl)) return bad(res, 400, 'Invalid photo or payment receipt');
  if (!isUploadedImage(player.photoUrl)) return bad(res, 400, 'Player photo upload is required');
  if (tournament.paymentMandatory && !isUploadedImage(player.paymentScreenshotUrl)) return bad(res, 400, 'Payment receipt is required');
  for (const field of tournament.customFields || []) {
    const value = player.customData?.[field.id];
    if (field.enabled && field.required && (value === undefined || value === null || value === false || String(value).trim() === '')) return bad(res, 400, `${field.label} is required`);
  }
  const mobile = normalizeMobile(player.mobile);
  if (!/^[6-9]\d{9}$/.test(mobile)) return bad(res, 400, "Enter a valid 10-digit Indian mobile number");
  const { soldToTeamId, soldPrice, ...safePlayer } = player;
  const registered = { ...safePlayer, mobile, basePrice: tournament.defaultBasePrice || 20000, paymentAmount: tournament.registrationFee || 0, id: randomUUID(), tournamentId: req.params.id, approvalStatus: 'PENDING', status: 'AVAILABLE', paymentStatus: 'PENDING', registeredAt: new Date().toISOString() };
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Serialize registration checks for this tournament to reject concurrent duplicates.
    await client.query('SELECT id FROM tournaments WHERE id=$1 FOR UPDATE', [req.params.id]);
    const existing = await client.query("SELECT data->>'mobile' AS mobile FROM players WHERE tournament_id=$1", [req.params.id]);
    if (existing.rows.some(row => normalizeMobile(row.mobile) === mobile)) {
      await client.query('ROLLBACK');
      return bad(res, 409, 'This mobile number is already registered in this tournament. Only one registration per mobile number is allowed.');
    }
    await client.query('INSERT INTO players(tournament_id,id,data) VALUES($1,$2,$3)', [req.params.id, registered.id, registered]);
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
  res.status(201).json({ success: true, player: registered });
});

app.get('/api/db/export', requireUser, async (req, res) => {
  const id = req.user.id;
  const [tournaments, teams, players] = await Promise.all([
    pool.query('SELECT data FROM tournaments WHERE organizer_id=$1 OR $2', [id, req.user.role === 'ADMIN']),
    pool.query('SELECT x.data FROM teams x JOIN tournaments t ON x.tournament_id=t.id WHERE t.organizer_id=$1 OR $2', [id, req.user.role === 'ADMIN']),
    pool.query('SELECT x.data FROM players x JOIN tournaments t ON x.tournament_id=t.id WHERE t.organizer_id=$1 OR $2', [id, req.user.role === 'ADMIN']),
  ]);
  const live = await pool.query("SELECT x.tournament_id,x.data FROM tournament_live_state x JOIN tournaments t ON t.id=x.tournament_id WHERE t.organizer_id=$1 OR $2", [id, req.user.role === 'ADMIN']);
  res.set('Content-Disposition', 'attachment; filename="cricket_auction_backup.json"');
  res.json({ exportedAt: new Date().toISOString(), engine: 'PostgreSQL', liveStates: live.rows.map(x => ({ ...x.data, tournamentId: x.tournament_id })), tournaments: tournaments.rows.map(x=>x.data), teams: teams.rows.map(x=>x.data), players: players.rows.map(x=>x.data) });
});
app.post('/api/db/import', requireUser, async (req, res) => {
  const data = req.body;
  if (!Array.isArray(data?.tournaments) || !Array.isArray(data?.teams) || !Array.isArray(data?.players)) return bad(res, 400, 'Invalid backup');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const t of data.tournaments) {
      let owner = req.user;
      if (req.user.role === 'ADMIN') {
        const found = await client.query('SELECT id,email FROM organizers WHERE id=$1', [t.userId]);
        if (!found.rowCount) throw Object.assign(new Error('Backup organizer is missing; restore into its original installation'), { status: 400 });
        owner = found.rows[0];
      }
      await saveTournament(client, t, owner);
      if (t.rules) await client.query("UPDATE tournaments SET data=jsonb_set(data,'{rules}',$2::jsonb) WHERE id=$1", [t.id, JSON.stringify(t.rules)]);
      await saveEntries(client, 'teams', data.teams.filter(x => x.tournamentId === t.id), owner.id, true);
      await saveEntries(client, 'players', data.players.filter(x => x.tournamentId === t.id), owner.id, true);
    }
    for (const state of data.liveStates || []) {
      if (!object(state) || !await owns(state.tournamentId, req.user.id, client)) throw Object.assign(new Error('Invalid backup live state'), { status: 400 });
      await client.query('INSERT INTO tournament_live_state(tournament_id,data) VALUES($1,$2) ON CONFLICT(tournament_id) DO UPDATE SET data=excluded.data', [state.tournamentId, state]);
    }
    if (data.teams.some(x => !data.tournaments.some(t => t.id === x.tournamentId)) || data.players.some(x => !data.tournaments.some(t => t.id === x.tournamentId))) throw Object.assign(new Error('Backup contains orphan records'), { status: 400 });
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
app.use((error, _req, res, _next) => { if (!error.status || error.status >= 500) console.error(error); bad(res, error.status || 500, error.status ? error.message : 'Server error'); });

await migrate();
app.listen(Number(process.env.PORT || 3000), '0.0.0.0', () => console.log('Cricket Auction Pro ready'));
