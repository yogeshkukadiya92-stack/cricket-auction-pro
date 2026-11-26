import { createHash } from 'node:crypto';
import { sendConditionalJson } from './conditionalJson.js';
import { publicProjection, publicImageProjection, publicImageUrl } from './publicDirectoryRoutes.js';

const tournamentFields = ['id','name','season','year','city','ground','status','rules','registrationOpen'];
const teamFields = ['id','name','shortCode','colorHex','totalPurse','remainingPurse'];
const playerFields = ['id','name','role','status','soldToTeamId','soldPrice','basePrice','category','lotOrder','battingStyle','bowlingStyle','stats','approvalStatus'];

export function registerPublicSummaryRoutes(app, { pool }) {
  const snapshots = new Map();
  app.get('/api/public/tournaments/:id/summary', async (req, res) => {
    const id = req.params.id;
    let entry = snapshots.get(id);
    if (!entry || entry.expires <= Date.now()) {
      entry = { expires: Infinity, snapshot: loadSummary(id) };
      snapshots.set(id, entry);
      if (snapshots.size > 32) snapshots.delete(snapshots.keys().next().value);
      try { await entry.snapshot; }
      finally { entry.expires = Date.now() + 1000; }
    }
    const snapshot = await entry.snapshot;
    if (!snapshot) return res.status(404).json({ error: 'Tournament not found' });
    res.set('Cache-Control', 'no-store');
    const { rosterVersion, liveState } = snapshot;
    const unchangedRoster = req.query.rosterVersion === rosterVersion;
    return sendConditionalJson(req, res, unchangedRoster ? { success: true, rosterVersion, liveState } : snapshot);
  });

  async function loadSummary(id) {
  const root = `/api/public/tournaments/${encodeURIComponent(id)}/players-directory`;
  const result = await pool.query(`SELECT jsonb_build_object(${publicProjection(tournamentFields)}) AS data, ${publicImageProjection('logoUrl')} FROM tournaments WHERE id=$1`, [id]);
  if (!result.rowCount) return null;
  const { userId, creatorEmail, customFields, gpayNumber, upiId, gpayQrUrl, ...tournament } = result.rows[0].data;
  tournament.logoUrl = publicImageUrl(result.rows[0], `${root}/logo`);
  const [teamRows, playerRows, liveRows] = await Promise.all([
    pool.query(`SELECT jsonb_build_object(${publicProjection(teamFields)}) AS data, ${publicImageProjection('logo')} FROM teams WHERE tournament_id=$1`, [id]),
    pool.query(`SELECT jsonb_build_object(${publicProjection(playerFields)}) AS data, ${publicImageProjection('photoUrl')} FROM players WHERE tournament_id=$1`, [id]),
    pool.query('SELECT data FROM tournament_live_state WHERE tournament_id=$1', [id]),
  ]);
  for (const row of playerRows.rows) row.data.photoUrl = publicImageUrl(row, `${root}/${encodeURIComponent(row.data.id)}/photo`);
  for (const row of teamRows.rows) row.data.logo = publicImageUrl(row, `${root}/teams/${encodeURIComponent(row.data.id)}/logo`);
  const teams = teamRows.rows.map(({ data: t }) => ({ id: t.id, name: t.name, shortCode: t.shortCode, logo: t.logo, colorHex: t.colorHex, totalPurse: t.totalPurse, remainingPurse: t.remainingPurse }));
  const players = playerRows.rows.filter(({ data: p }) => !p.approvalStatus || p.approvalStatus === 'APPROVED').map(({ data: p }) => ({ id: p.id, name: p.name, photoUrl: p.photoUrl, role: p.role, status: p.status, soldToTeamId: p.soldToTeamId, soldPrice: p.soldPrice, basePrice: p.basePrice, category: p.category, lotOrder: p.lotOrder, battingStyle: p.battingStyle, bowlingStyle: p.bowlingStyle, stats: p.stats || { matches: 0, runs: 0, wickets: 0, strikeRate: 0 } }));
  const registrationPlayers = playerRows.rows.map(({ data: p }) => ({ id: p.id, name: p.name, photoUrl: p.photoUrl, role: p.role, approvalStatus: p.approvalStatus || 'APPROVED', status: p.status, basePrice: p.basePrice, soldPrice: p.soldPrice, soldToTeamId: p.soldToTeamId }));
  const registrationStats = { total: playerRows.rows.length, pending: 0, approved: players.length, rejected: 0 };
  const state = liveRows.rows[0]?.data || {};
  const roster = { tournament, teams, players, registrationPlayers, registrationStats };
  const rosterVersion = createHash('sha256').update(JSON.stringify(roster)).digest('base64url');
  return { success: true, ...roster, rosterVersion, liveState: { currentPlayerId: state.currentPlayerId || '', currentBid: state.currentBid || 0, leadingTeam: state.leadingTeam ? { id: state.leadingTeam.id } : null, bidsHistory: (state.bidsHistory || []).slice(0, 10).map(b => ({ id: b.id, playerId: b.playerId, teamId: b.teamId, teamName: teams.find(t => t.id === b.teamId)?.name || b.teamName, amount: b.amount, timestamp: b.timestamp })), lastEvent: state.lastEvent ? { id: state.lastEvent.id, type: state.lastEvent.type, timestamp: state.lastEvent.timestamp, price: state.lastEvent.price, player: players.find(p => p.id === state.lastEvent.player?.id) || null, team: teams.find(t => t.id === state.lastEvent.team?.id) || null } : null } };
  }
}
