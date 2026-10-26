import { sendConditionalJson } from './conditionalJson.js';
import { publicProjection, publicImageProjection, publicImageUrl } from './publicDirectoryRoutes.js';

const tournamentFields = ['id','name','season','year','city','ground','status','rules','registrationOpen'];
const teamFields = ['id','name','shortCode','colorHex','totalPurse','remainingPurse'];
const playerFields = ['id','name','role','status','soldToTeamId','soldPrice','basePrice','category','lotOrder','battingStyle','bowlingStyle','stats','approvalStatus'];

export function registerPublicSummaryRoutes(app, { pool }) {
app.get('/api/public/tournaments/:id/summary', async (req, res) => {
  const root = `/api/public/tournaments/${encodeURIComponent(req.params.id)}/players-directory`;
  const result = await pool.query(`SELECT jsonb_build_object(${publicProjection(tournamentFields)}) AS data, ${publicImageProjection('logoUrl')} FROM tournaments WHERE id=$1`, [req.params.id]);
  if (!result.rowCount) return res.status(404).json({ error: 'Tournament not found' });
  const { userId, creatorEmail, customFields, gpayNumber, upiId, gpayQrUrl, ...tournament } = result.rows[0].data;
  tournament.logoUrl = publicImageUrl(result.rows[0], `${root}/logo`);
  const [teamRows, playerRows, liveRows] = await Promise.all([
    pool.query(`SELECT jsonb_build_object(${publicProjection(teamFields)}) AS data, ${publicImageProjection('logo')} FROM teams WHERE tournament_id=$1`, [req.params.id]),
    pool.query(`SELECT jsonb_build_object(${publicProjection(playerFields)}) AS data, ${publicImageProjection('photoUrl')} FROM players WHERE tournament_id=$1`, [req.params.id]),
    pool.query('SELECT data FROM tournament_live_state WHERE tournament_id=$1', [req.params.id]),
  ]);
  for (const row of playerRows.rows) row.data.photoUrl = publicImageUrl(row, `${root}/${encodeURIComponent(row.data.id)}/photo`);
  for (const row of teamRows.rows) row.data.logo = publicImageUrl(row, `${root}/teams/${encodeURIComponent(row.data.id)}/logo`);
  const teams = teamRows.rows.map(({ data: t }) => ({ id: t.id, name: t.name, shortCode: t.shortCode, logo: t.logo, colorHex: t.colorHex, totalPurse: t.totalPurse, remainingPurse: t.remainingPurse }));
  const players = playerRows.rows.filter(({ data: p }) => !p.approvalStatus || p.approvalStatus === 'APPROVED').map(({ data: p }) => ({ id: p.id, name: p.name, photoUrl: p.photoUrl, role: p.role, status: p.status, soldToTeamId: p.soldToTeamId, soldPrice: p.soldPrice, basePrice: p.basePrice, category: p.category, lotOrder: p.lotOrder, battingStyle: p.battingStyle, bowlingStyle: p.bowlingStyle, stats: p.stats || { matches: 0, runs: 0, wickets: 0, strikeRate: 0 } }));
  const registrationPlayers = playerRows.rows.map(({ data: p }) => ({ id: p.id, name: p.name, photoUrl: p.photoUrl, role: p.role, approvalStatus: p.approvalStatus || 'APPROVED', status: p.status, basePrice: p.basePrice, soldPrice: p.soldPrice, soldToTeamId: p.soldToTeamId }));
  const registrationStats = { total: playerRows.rows.length, pending: 0, approved: players.length, rejected: 0 };
  const state = liveRows.rows[0]?.data || {};
  res.set('Cache-Control', 'no-store');
  sendConditionalJson(req, res, { success: true, tournament, teams, players, registrationPlayers, registrationStats, liveState: { currentPlayerId: state.currentPlayerId || '', currentBid: state.currentBid || 0, leadingTeam: state.leadingTeam ? { id: state.leadingTeam.id } : null, bidsHistory: (state.bidsHistory || []).slice(0, 10).map(b => ({ id: b.id, playerId: b.playerId, teamId: b.teamId, teamName: teams.find(t => t.id === b.teamId)?.name || b.teamName, amount: b.amount, timestamp: b.timestamp })), lastEvent: state.lastEvent ? { id: state.lastEvent.id, type: state.lastEvent.type, timestamp: state.lastEvent.timestamp, price: state.lastEvent.price, player: players.find(p => p.id === state.lastEvent.player?.id) || null, team: teams.find(t => t.id === state.lastEvent.team?.id) || null } : null } });
});
}
