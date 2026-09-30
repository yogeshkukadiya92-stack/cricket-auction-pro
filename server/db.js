import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const DB_DIR = path.resolve(process.cwd(), 'database');
const DB_FILE = path.join(DB_DIR, 'cricket_auction.db');

// Ensure database directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

let dbInstance = null;

export function getDb() {
  if (!dbInstance) {
    dbInstance = new DatabaseSync(DB_FILE);
    dbInstance.exec('PRAGMA journal_mode = WAL;');
    dbInstance.exec('PRAGMA foreign_keys = ON;');
    initTables(dbInstance);
  }
  return dbInstance;
}

function initTables(db) {
  // 1. Tournaments Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS tournaments (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      creator_email TEXT,
      name TEXT NOT NULL,
      year INTEGER,
      season TEXT,
      logo_url TEXT,
      sponsor TEXT,
      co_sponsors TEXT,
      default_base_price INTEGER,
      total_purse_per_team INTEGER,
      expected_teams_count INTEGER,
      ground TEXT,
      city TEXT,
      start_date TEXT,
      end_date TEXT,
      ball_type TEXT,
      status TEXT,
      data_json TEXT NOT NULL,
      created_at TEXT,
      updated_at TEXT
    );
  `);

  try {
    db.exec('ALTER TABLE tournaments ADD COLUMN user_id TEXT;');
  } catch {}
  try {
    db.exec('ALTER TABLE tournaments ADD COLUMN creator_email TEXT;');
  } catch {}

  // 2. Teams Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      tournament_id TEXT,
      name TEXT NOT NULL,
      short_code TEXT,
      logo TEXT,
      color_hex TEXT,
      owner_name TEXT,
      owner_mobile TEXT,
      total_purse INTEGER,
      remaining_purse INTEGER,
      rtm_cards_left INTEGER,
      data_json TEXT NOT NULL,
      created_at TEXT,
      updated_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_teams_tournament ON teams(tournament_id);
  `);

  // 3. Players Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      tournament_id TEXT,
      name TEXT NOT NULL,
      photo_url TEXT,
      mobile TEXT,
      email TEXT,
      city TEXT,
      role TEXT,
      batting_style TEXT,
      bowling_style TEXT,
      base_price INTEGER,
      category TEXT,
      status TEXT,
      sold_to_team_id TEXT,
      sold_price INTEGER,
      lot_order INTEGER,
      approval_status TEXT,
      payment_status TEXT,
      payment_utr TEXT,
      payment_amount INTEGER,
      data_json TEXT NOT NULL,
      created_at TEXT,
      updated_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_players_tournament ON players(tournament_id);
    CREATE INDEX IF NOT EXISTS idx_players_status ON players(status);
  `);

  // 4. Bids Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS bids (
      id TEXT PRIMARY KEY,
      tournament_id TEXT,
      player_id TEXT,
      team_id TEXT,
      team_name TEXT,
      amount INTEGER,
      timestamp INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_bids_player ON bids(player_id);
  `);

  // 5. Rules Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS auction_rules (
      id TEXT PRIMARY KEY,
      rules_json TEXT NOT NULL,
      updated_at TEXT
    );
  `);

  // 6. Live Auction State Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS live_auction_state (
      id TEXT PRIMARY KEY,
      current_player_id TEXT,
      current_bid INTEGER,
      leading_team_json TEXT,
      bids_history_json TEXT,
      updated_at TEXT
    );
  `);

  // 7. Users & Organizers Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'ORGANIZER',
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at TEXT,
      updated_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  `);

  seedDefaultUsersIfEmpty(db);
}

function seedDefaultUsersIfEmpty(db) {
  try {
    const row = db.prepare('SELECT count(*) as cnt FROM users').get();
    if (!row || row.cnt === 0) {
      const now = new Date().toISOString();
      // Default Super Admin
      db.prepare(`
        INSERT INTO users (id, name, email, password, role, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run('user-admin-1', 'Super Administrator', 'admin@cricketauction.pro', 'admin123', 'ADMIN', 'ACTIVE', now, now);

      // Default Organizer
      db.prepare(`
        INSERT INTO users (id, name, email, password, role, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run('user-org-1', 'Cricket League Organizer', 'organizer@cricketauction.pro', 'user123', 'ORGANIZER', 'ACTIVE', now, now);
    }
  } catch (e) {
    console.error('Error seeding default users:', e);
  }
}

// User Authentication & Management Helpers
export function registerUser({ name, email, password, role = 'ORGANIZER' }) {
  const db = getDb();
  const cleanEmail = email.trim().toLowerCase();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
  if (existing) {
    throw new Error('An account with this email already exists.');
  }

  const userId = `usr-${Date.now()}`;
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO users (id, name, email, password, role, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(userId, name.trim(), cleanEmail, password, role, 'ACTIVE', now, now);

  return {
    id: userId,
    name: name.trim(),
    email: cleanEmail,
    role,
    status: 'ACTIVE',
    createdAt: now,
  };
}

export function loginUser({ email, password }) {
  const db = getDb();
  const cleanEmail = email.trim().toLowerCase();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail);
  if (!user) {
    throw new Error('Invalid email or password.');
  }

  if (user.password !== password) {
    throw new Error('Invalid email or password.');
  }

  if (user.status === 'BLOCKED') {
    throw new Error('Your account has been suspended by the platform administrator.');
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    createdAt: user.created_at,
  };
}

export function getAllUsers() {
  const db = getDb();
  const users = db.prepare('SELECT id, name, email, role, status, created_at FROM users ORDER BY created_at DESC').all();
  return users.map((u) => {
    const tourneyCount = db.prepare('SELECT count(*) as cnt FROM tournaments WHERE user_id = ? OR creator_email = ?').get(u.id, u.email)?.cnt || 0;
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status,
      createdAt: u.created_at,
      tournamentsCount: tourneyCount,
    };
  });
}

export function toggleUserStatus(userId) {
  const db = getDb();
  const user = db.prepare('SELECT status, role FROM users WHERE id = ?').get(userId);
  if (!user) throw new Error('User not found');
  if (user.role === 'ADMIN') throw new Error('Cannot block Super Admin');

  const newStatus = user.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';
  db.prepare('UPDATE users SET status = ? WHERE id = ?').run(newStatus, userId);
  return newStatus;
}

export function getAdminPlatformStats() {
  const db = getDb();
  const usersCount = db.prepare('SELECT count(*) as cnt FROM users').get().cnt;
  const tournamentsCount = db.prepare('SELECT count(*) as cnt FROM tournaments').get().cnt;
  const liveTournamentsCount = db.prepare("SELECT count(*) as cnt FROM tournaments WHERE status = 'LIVE'").get().cnt;
  const teamsCount = db.prepare('SELECT count(*) as cnt FROM teams').get().cnt;
  const playersCount = db.prepare('SELECT count(*) as cnt FROM players').get().cnt;
  const soldPlayersCount = db.prepare("SELECT count(*) as cnt FROM players WHERE status = 'SOLD'").get().cnt;
  const totalAuctionVolume = db.prepare("SELECT COALESCE(SUM(sold_price), 0) as total FROM players WHERE status = 'SOLD'").get().total;

  return {
    usersCount,
    tournamentsCount,
    liveTournamentsCount,
    teamsCount,
    playersCount,
    soldPlayersCount,
    totalAuctionVolume,
  };
}

// Data Access Helpers
export function getAllTournaments() {
  const db = getDb();
  const rows = db.prepare('SELECT data_json FROM tournaments ORDER BY created_at DESC').all();
  return rows.map((r) => JSON.parse(r.data_json));
}

export function saveTournament(tournament) {
  const db = getDb();
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO tournaments (
      id, user_id, creator_email, name, year, season, logo_url, sponsor, co_sponsors,
      default_base_price, total_purse_per_team, expected_teams_count,
      ground, city, start_date, end_date, ball_type, status,
      data_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      user_id = excluded.user_id,
      creator_email = excluded.creator_email,
      name = excluded.name,
      year = excluded.year,
      season = excluded.season,
      logo_url = excluded.logo_url,
      sponsor = excluded.sponsor,
      co_sponsors = excluded.co_sponsors,
      default_base_price = excluded.default_base_price,
      total_purse_per_team = excluded.total_purse_per_team,
      expected_teams_count = excluded.expected_teams_count,
      ground = excluded.ground,
      city = excluded.city,
      start_date = excluded.start_date,
      end_date = excluded.end_date,
      ball_type = excluded.ball_type,
      status = excluded.status,
      data_json = excluded.data_json,
      updated_at = excluded.updated_at
  `);

  stmt.run(
    tournament.id,
    tournament.userId || '',
    tournament.creatorEmail || '',
    tournament.name,
    tournament.year || 2026,
    tournament.season || 'Season 1',
    tournament.logoUrl || '',
    tournament.sponsor || '',
    tournament.coSponsors || '',
    tournament.defaultBasePrice || 20000,
    tournament.totalPursePerTeam || 1000000,
    tournament.expectedTeamsCount || 8,
    tournament.ground || '',
    tournament.city || '',
    tournament.startDate || '',
    tournament.endDate || '',
    tournament.ballType || 'Heavy Tennis Ball',
    tournament.status || 'UPCOMING',
    JSON.stringify(tournament),
    now,
    now
  );
}

export function deleteTournament(tournamentId) {
  const db = getDb();
  db.prepare('DELETE FROM tournaments WHERE id = ?').run(tournamentId);
  db.prepare('DELETE FROM teams WHERE tournament_id = ?').run(tournamentId);
  db.prepare('DELETE FROM players WHERE tournament_id = ?').run(tournamentId);
}

export function getAllTeams() {
  const db = getDb();
  const rows = db.prepare('SELECT data_json FROM teams ORDER BY rowid ASC').all();
  return rows.map((r) => JSON.parse(r.data_json));
}

export function saveTeam(team) {
  const db = getDb();
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO teams (
      id, tournament_id, name, short_code, logo, color_hex,
      owner_name, owner_mobile, total_purse, remaining_purse,
      rtm_cards_left, data_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      tournament_id = excluded.tournament_id,
      name = excluded.name,
      short_code = excluded.short_code,
      logo = excluded.logo,
      color_hex = excluded.color_hex,
      owner_name = excluded.owner_name,
      owner_mobile = excluded.owner_mobile,
      total_purse = excluded.total_purse,
      remaining_purse = excluded.remaining_purse,
      rtm_cards_left = excluded.rtm_cards_left,
      data_json = excluded.data_json,
      updated_at = excluded.updated_at
  `);

  stmt.run(
    team.id,
    team.tournamentId || '',
    team.name,
    team.shortCode,
    team.logo,
    team.colorHex,
    team.ownerName,
    team.ownerMobile || '',
    team.totalPurse,
    team.remainingPurse,
    team.rtmCardsLeft,
    JSON.stringify(team),
    now,
    now
  );
}

export function deleteTeam(teamId) {
  const db = getDb();
  db.prepare('DELETE FROM teams WHERE id = ?').run(teamId);
}

export function getAllPlayers() {
  const db = getDb();
  const rows = db.prepare('SELECT data_json FROM players ORDER BY rowid DESC').all();
  return rows.map((r) => JSON.parse(r.data_json));
}

export function savePlayer(player) {
  const db = getDb();
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO players (
      id, tournament_id, name, photo_url, mobile, email, city,
      role, batting_style, bowling_style, base_price, category,
      status, sold_to_team_id, sold_price, lot_order,
      approval_status, payment_status, payment_utr, payment_amount,
      data_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      tournament_id = excluded.tournament_id,
      name = excluded.name,
      photo_url = excluded.photo_url,
      mobile = excluded.mobile,
      email = excluded.email,
      city = excluded.city,
      role = excluded.role,
      batting_style = excluded.batting_style,
      bowling_style = excluded.bowling_style,
      base_price = excluded.base_price,
      category = excluded.category,
      status = excluded.status,
      sold_to_team_id = excluded.sold_to_team_id,
      sold_price = excluded.sold_price,
      lot_order = excluded.lot_order,
      approval_status = excluded.approval_status,
      payment_status = excluded.payment_status,
      payment_utr = excluded.payment_utr,
      payment_amount = excluded.payment_amount,
      data_json = excluded.data_json,
      updated_at = excluded.updated_at
  `);

  stmt.run(
    player.id,
    player.tournamentId || '',
    player.name,
    player.photoUrl,
    player.mobile || '',
    player.email || '',
    player.city || '',
    player.role,
    player.battingStyle || '',
    player.bowlingStyle || '',
    player.basePrice || 20000,
    player.category || 'SET_A',
    player.status || 'AVAILABLE',
    player.soldToTeamId || null,
    player.soldPrice || null,
    player.lotOrder || 99,
    player.approvalStatus || 'PENDING',
    player.paymentStatus || 'PENDING',
    player.paymentUtr || '',
    player.paymentAmount || 0,
    JSON.stringify(player),
    player.registeredAt || now,
    now
  );
}

export function deletePlayer(playerId) {
  const db = getDb();
  db.prepare('DELETE FROM players WHERE id = ?').run(playerId);
}

export function getAuctionRules() {
  const db = getDb();
  const row = db.prepare('SELECT rules_json FROM auction_rules WHERE id = ?').get('global');
  return row ? JSON.parse(row.rules_json) : null;
}

export function saveAuctionRules(rules) {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO auction_rules (id, rules_json, updated_at)
    VALUES ('global', ?, ?)
    ON CONFLICT(id) DO UPDATE SET rules_json = excluded.rules_json, updated_at = excluded.updated_at
  `).run(JSON.stringify(rules), now);
}

export function getLiveAuctionState() {
  const db = getDb();
  const row = db.prepare('SELECT * FROM live_auction_state WHERE id = ?').get('active');
  if (!row) {
    return {
      currentPlayerId: '',
      currentBid: 0,
      leadingTeam: null,
      bidsHistory: [],
    };
  }
  return {
    currentPlayerId: row.current_player_id || '',
    currentBid: row.current_bid || 0,
    leadingTeam: row.leading_team_json ? JSON.parse(row.leading_team_json) : null,
    bidsHistory: row.bids_history_json ? JSON.parse(row.bids_history_json) : [],
  };
}

export function saveLiveAuctionState(state) {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO live_auction_state (id, current_player_id, current_bid, leading_team_json, bids_history_json, updated_at)
    VALUES ('active', ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      current_player_id = excluded.current_player_id,
      current_bid = excluded.current_bid,
      leading_team_json = excluded.leading_team_json,
      bids_history_json = excluded.bids_history_json,
      updated_at = excluded.updated_at
  `).run(
    state.currentPlayerId || '',
    state.currentBid || 0,
    state.leadingTeam ? JSON.stringify(state.leadingTeam) : null,
    JSON.stringify(state.bidsHistory || []),
    now
  );
}

export function recordBid(bid) {
  const db = getDb();
  db.prepare(`
    INSERT OR REPLACE INTO bids (id, tournament_id, player_id, team_id, team_name, amount, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    bid.id || `bid-${Date.now()}`,
    bid.tournamentId || '',
    bid.playerId,
    bid.teamId,
    bid.teamName,
    bid.amount,
    bid.timestamp || Date.now()
  );
}

export function clearAllAuctionData() {
  const db = getDb();
  db.prepare('DELETE FROM players').run();
  db.prepare('DELETE FROM bids').run();
  db.prepare(`
    UPDATE teams SET remaining_purse = total_purse, data_json = json_set(data_json, '$.remainingPurse', total_purse)
  `).run();
  saveLiveAuctionState({
    currentPlayerId: '',
    currentBid: 0,
    leadingTeam: null,
    bidsHistory: [],
  });
}

export function getFullDatabaseBackup() {
  return {
    exportedAt: new Date().toISOString(),
    engine: 'SQLite3 (Node.js Native)',
    version: '1.0.0',
    users: getAllUsers(),
    tournaments: getAllTournaments(),
    teams: getAllTeams(),
    players: getAllPlayers(),
    rules: getAuctionRules(),
    liveState: getLiveAuctionState(),
  };
}

export function restoreDatabaseBackup(data) {
  if (!data) return false;
  const db = getDb();

  if (Array.isArray(data.tournaments)) {
    for (const t of data.tournaments) saveTournament(t);
  }
  if (Array.isArray(data.teams)) {
    for (const t of data.teams) saveTeam(t);
  }
  if (Array.isArray(data.players)) {
    for (const p of data.players) savePlayer(p);
  }
  if (data.rules) {
    saveAuctionRules(data.rules);
  }
  if (data.liveState) {
    saveLiveAuctionState(data.liveState);
  }
  return true;
}

export function seedInitialDataIfEmpty(initialTournaments, initialTeams, initialRules) {
  const existingTourneys = getAllTournaments();
  if (existingTourneys.length === 0 && Array.isArray(initialTournaments)) {
    for (const t of initialTournaments) {
      saveTournament(t);
    }
  }

  const existingTeams = getAllTeams();
  if (existingTeams.length === 0 && Array.isArray(initialTeams)) {
    for (const team of initialTeams) {
      saveTeam(team);
    }
  }

  const existingRules = getAuctionRules();
  if (!existingRules && initialRules) {
    saveAuctionRules(initialRules);
  }
}
