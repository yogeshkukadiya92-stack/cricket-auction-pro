// Player (mobile-number) accounts: sign in, see every tournament registration for that
// mobile number, follow live auctions and browse the public player directory.
// Player sessions use their own cookie so an organizer and a player can be signed in
// on the same device without interfering with each other.
import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { normalizeMobile } from '../shared/registrationValidation.js';
import {
  PLAYER_PASSWORD_MIN, PLAYER_ROLES, isValidPlayerPassword, isUuid, decodeDataImage,
  toRegistrationSummary, toPublicProfile, toHistoryEntry,
} from '../shared/playerAccess.js';

const PLAYER_COOKIE = '__Host-cap_player';
const SESSION_DAYS = 30;
const VALID_MOBILE = /^[6-9]\d{9}$/;
const PAGE_SIZE = 24;
const cookieOptions = { httpOnly: true, secure: true, sameSite: 'lax', path: '/' };
const hashToken = value => createHash('sha256').update(value).digest('hex');
// Compared against when the account does not exist, so response time doesn't reveal it.
const DUMMY_HASH = bcrypt.hashSync('cap-player-placeholder-password', 10);

export async function migratePlayerAccounts(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS player_accounts (
      mobile text PRIMARY KEY, password_hash text NOT NULL,
      status text NOT NULL DEFAULT 'ACTIVE', created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS player_sessions (
      token_hash text PRIMARY KEY, mobile text NOT NULL REFERENCES player_accounts(mobile) ON DELETE CASCADE,
      expires_at timestamptz NOT NULL
    );
    CREATE INDEX IF NOT EXISTS player_sessions_mobile_idx ON player_sessions(mobile);
    ALTER TABLE player_profiles ADD COLUMN IF NOT EXISTS public_id uuid NOT NULL DEFAULT gen_random_uuid();
    CREATE UNIQUE INDEX IF NOT EXISTS player_profiles_public_id_idx ON player_profiles(public_id);
    DELETE FROM player_sessions WHERE expires_at < now();
  `);
}

export function registerPlayerRoutes(app, { pool, limit, bad }) {
  const readMobile = value => {
    const mobile = normalizeMobile(value);
    return VALID_MOBILE.test(mobile) ? mobile : null;
  };

  const isRegistered = async mobile =>
    (await pool.query("SELECT 1 FROM players WHERE data->>'mobile'=$1 LIMIT 1", [mobile])).rowCount > 0;

  async function startSession(res, mobile) {
    const token = randomBytes(32).toString('base64url');
    await pool.query(`INSERT INTO player_sessions(token_hash,mobile,expires_at) VALUES($1,$2,now()+interval '${SESSION_DAYS} days')`, [hashToken(token), mobile]);
    res.cookie(PLAYER_COOKIE, token, { ...cookieOptions, maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000 });
  }

  async function requirePlayer(req, res, next) {
    const token = req.cookies[PLAYER_COOKIE];
    if (!token) return bad(res, 401, 'Please sign in');
    const result = await pool.query(
      "SELECT a.mobile FROM player_sessions s JOIN player_accounts a ON a.mobile=s.mobile WHERE s.token_hash=$1 AND s.expires_at>now() AND a.status='ACTIVE'",
      [hashToken(token)],
    );
    if (!result.rowCount) return bad(res, 401, 'Please sign in');
    req.playerMobile = result.rows[0].mobile;
    req.playerTokenHash = hashToken(token);
    next();
  }

  // Every registration for a mobile number, joined with tournament, buying team and live lot.
  const registrationsFor = mobile => pool.query(`
    SELECT p.data AS player, t.data AS tournament, tm.data AS team, ls.data->>'currentPlayerId' AS current_player_id
    FROM players p
    JOIN tournaments t ON t.id=p.tournament_id
    LEFT JOIN teams tm ON tm.tournament_id=p.tournament_id AND tm.id=p.data->>'soldToTeamId'
    LEFT JOIN tournament_live_state ls ON ls.tournament_id=p.tournament_id
    WHERE p.data->>'mobile'=$1
    ORDER BY (t.data->>'status'='LIVE') DESC, p.data->>'registeredAt' DESC NULLS LAST`, [mobile]);
  const toRow = r => ({ player: r.player, tournament: r.tournament, team: r.team, liveState: { currentPlayerId: r.current_player_id || '' } });

  // ---------- Authentication ----------
  app.post('/api/player/auth/check', limit, async (req, res) => {
    const mobile = readMobile(req.body?.mobile);
    if (!mobile) return bad(res, 400, 'Enter a valid 10-digit mobile number');
    const account = await pool.query('SELECT status FROM player_accounts WHERE mobile=$1', [mobile]);
    if (account.rowCount) return res.json({ success: true, next: account.rows[0].status === 'ACTIVE' ? 'LOGIN' : 'BLOCKED' });
    res.json({ success: true, next: await isRegistered(mobile) ? 'SETUP' : 'NOT_REGISTERED' });
  });

  app.post('/api/player/auth/setup', limit, async (req, res) => {
    const mobile = readMobile(req.body?.mobile);
    const password = req.body?.password;
    if (!mobile) return bad(res, 400, 'Enter a valid 10-digit mobile number');
    if (!isValidPlayerPassword(password)) return bad(res, 400, `Password must be at least ${PLAYER_PASSWORD_MIN} characters`);
    if (!await isRegistered(mobile)) return bad(res, 404, 'This mobile number is not registered in any tournament');
    const created = await pool.query(
      'INSERT INTO player_accounts(mobile,password_hash) VALUES($1,$2) ON CONFLICT(mobile) DO NOTHING RETURNING mobile',
      [mobile, await bcrypt.hash(password, 12)],
    );
    if (!created.rowCount) return bad(res, 409, 'An account already exists for this mobile number. Please sign in.');
    await startSession(res, mobile);
    res.status(201).json({ success: true });
  });

  app.post('/api/player/auth/login', limit, async (req, res) => {
    const mobile = readMobile(req.body?.mobile);
    const password = String(req.body?.password || '');
    const account = mobile ? await pool.query('SELECT password_hash,status FROM player_accounts WHERE mobile=$1', [mobile]) : { rowCount: 0, rows: [] };
    const valid = await bcrypt.compare(password, account.rows[0]?.password_hash || DUMMY_HASH);
    if (!account.rowCount || !valid) return bad(res, 401, 'Invalid mobile number or password');
    if (account.rows[0].status !== 'ACTIVE') return bad(res, 403, 'This player account is blocked');
    await startSession(res, mobile);
    res.json({ success: true });
  });

  app.post('/api/player/auth/logout', async (req, res) => {
    const token = req.cookies[PLAYER_COOKIE];
    if (token) await pool.query('DELETE FROM player_sessions WHERE token_hash=$1', [hashToken(token)]);
    res.clearCookie(PLAYER_COOKIE, cookieOptions);
    res.json({ success: true });
  });

  app.post('/api/player/auth/password', requirePlayer, limit, async (req, res) => {
    const { currentPassword, newPassword } = req.body || {};
    if (!isValidPlayerPassword(newPassword)) return bad(res, 400, `New password must be at least ${PLAYER_PASSWORD_MIN} characters`);
    const account = await pool.query('SELECT password_hash FROM player_accounts WHERE mobile=$1', [req.playerMobile]);
    if (!await bcrypt.compare(String(currentPassword || ''), account.rows[0].password_hash)) return bad(res, 401, 'Current password is incorrect');
    await pool.query('UPDATE player_accounts SET password_hash=$2 WHERE mobile=$1', [req.playerMobile, await bcrypt.hash(newPassword, 12)]);
    // Sign out every other device that used the old password.
    await pool.query('DELETE FROM player_sessions WHERE mobile=$1 AND token_hash<>$2', [req.playerMobile, req.playerTokenHash]);
    res.json({ success: true });
  });

  // ---------- Signed-in player ----------
  app.get('/api/player/me', requirePlayer, async (req, res) => {
    const [profile, registrations] = await Promise.all([
      pool.query('SELECT public_id,data FROM player_profiles WHERE mobile=$1', [req.playerMobile]),
      registrationsFor(req.playerMobile),
    ]);
    const row = profile.rows[0];
    const latest = registrations.rows[0]?.player || {};
    res.json({
      success: true,
      player: { mobile: req.playerMobile, ...toPublicProfile(row?.public_id || null, row?.data || latest) },
      registrations: registrations.rows.map(r => toRegistrationSummary(toRow(r))),
    });
  });

  // ---------- Public player directory (signed-in players only) ----------
  app.get('/api/players', requirePlayer, async (req, res) => {
    const q = String(req.query.q || '').trim().slice(0, 60);
    const role = PLAYER_ROLES.includes(req.query.role) ? req.query.role : '';
    const page = Math.max(0, Math.min(500, Number.parseInt(req.query.page, 10) || 0));
    const pattern = q ? `%${q.replace(/[\\%_]/g, '\\$&')}%` : '';
    const result = await pool.query(`
      SELECT pp.public_id, pp.data,
        count(*)::int AS appearances,
        count(*) FILTER (WHERE p.data->>'status'='SOLD')::int AS sold_count,
        bool_or(t.data->>'status'='LIVE') AS in_live,
        count(*) OVER()::int AS total
      FROM player_profiles pp
      JOIN players p ON p.data->>'mobile'=pp.mobile
      JOIN tournaments t ON t.id=p.tournament_id
      WHERE coalesce(p.data->>'approvalStatus','APPROVED')='APPROVED'
        AND ($1::text='' OR pp.data->>'name' ILIKE $1 OR coalesce(pp.data->>'city','') ILIKE $1)
        AND ($2::text='' OR pp.data->>'role'=$2)
      GROUP BY pp.mobile
      ORDER BY lower(pp.data->>'name'), pp.public_id
      LIMIT $3 OFFSET $4`, [pattern, role, PAGE_SIZE, page * PAGE_SIZE]);
    const total = result.rows[0]?.total || 0;
    res.json({
      success: true,
      total,
      page,
      hasMore: (page + 1) * PAGE_SIZE < total,
      players: result.rows.map(r => ({ ...toPublicProfile(r.public_id, r.data), appearances: r.appearances, soldCount: r.sold_count, inLiveTournament: !!r.in_live })),
    });
  });

  app.get('/api/players/:publicId', requirePlayer, async (req, res) => {
    if (!isUuid(req.params.publicId)) return bad(res, 404, 'Player not found');
    const profile = await pool.query('SELECT mobile,public_id,data FROM player_profiles WHERE public_id=$1', [req.params.publicId]);
    if (!profile.rowCount) return bad(res, 404, 'Player not found');
    const { mobile, public_id: publicId, data } = profile.rows[0];
    const registrations = await registrationsFor(mobile);
    const history = registrations.rows.map(r => toHistoryEntry(toRow(r))).filter(Boolean);
    const isMe = mobile === req.playerMobile;
    if (!history.length && !isMe) return bad(res, 404, 'Player not found');
    res.json({
      success: true,
      isMe,
      player: toPublicProfile(publicId, data),
      summary: {
        tournaments: history.length,
        sold: history.filter(h => h.auctionStatus === 'SOLD').length,
        unsold: history.filter(h => h.auctionStatus === 'UNSOLD').length,
      },
      history,
    });
  });

  app.get('/api/players/:publicId/photo', requirePlayer, async (req, res) => {
    if (!isUuid(req.params.publicId)) return bad(res, 404, 'Photo not found');
    const result = await pool.query("SELECT data->>'photoUrl' AS photo FROM player_profiles WHERE public_id=$1", [req.params.publicId]);
    const photo = result.rows[0]?.photo;
    if (!photo) return bad(res, 404, 'Photo not found');
    if (/^https?:\/\//.test(photo) || /^\/(?!\/)/.test(photo)) return res.redirect(302, photo);
    const image = decodeDataImage(photo);
    if (!image) return bad(res, 404, 'Photo not found');
    res.set('Cache-Control', 'private, max-age=3600');
    res.type(image.mime).send(image.buffer);
  });
}
