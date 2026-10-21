import { correctPlayer } from '../shared/playerCorrection.js';
import { normalizeMobile } from '../shared/registrationValidation.js';
import { approveRegistration } from '../shared/playerApproval.js';
import { compressRecordImages } from './imageCompression.js';

export function registerPlayerCorrectionRoutes(app, { pool, requireUser, owns }) {
app.get('/api/tournaments/:id/deleted-players', requireUser, async (req, res) => {
  if (!await owns(req.params.id, req.user.id)) return res.status(404).json({ error: 'Tournament not found' });
  res.set('Cache-Control', 'no-store');
  const rows = await pool.query("SELECT jsonb_build_object('id',id,'name',data->'name','role',data->'role','lotOrder',data->'lotOrder') AS data,deleted_at FROM deleted_players WHERE tournament_id=$1 ORDER BY deleted_at DESC,id", [req.params.id]);
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
    const rows = await client.query("SELECT CASE WHEN id=$2 THEN data ELSE data - 'photoUrl' - 'paymentScreenshotUrl' - 'customData' END AS data FROM players WHERE tournament_id=$1", [req.params.id, playerId]);
    const teamRows = await client.query('SELECT data FROM teams WHERE tournament_id=$1', [req.params.id]);
    let changedPlayer = null;
    let changedTeams = teamRows.rows.map(r => r.data);
    if (action === 'DELETE' && !rows.rows.some(r => r.data.id === playerId)) {
      const archived = await client.query('SELECT data FROM deleted_players WHERE tournament_id=$1 AND id=$2', [req.params.id, playerId]);
      if (!archived.rowCount) throw new Error('Player not found. Refresh the player list and try again.');
      // A repeated click or retried request must not refund a sold player twice.
    } else if (action === 'RESTORE') {
      const archived = await client.query('SELECT data FROM deleted_players WHERE tournament_id=$1 AND id=$2', [req.params.id, playerId]);
      if (!archived.rowCount || rows.rows.some(r => r.data.id === playerId)) throw new Error('Deleted player unavailable or already restored');
      const original = archived.rows[0].data;
      if (rows.rows.some(r => normalizeMobile(r.data.mobile) && normalizeMobile(r.data.mobile) === normalizeMobile(original.mobile))) throw new Error('Mobile number already registered');
      const { soldPrice, soldToTeamId, ...restored } = original;
      changedPlayer = await compressRecordImages(approveRegistration({ ...restored, status: 'AVAILABLE' }), ['photoUrl', 'paymentScreenshotUrl']);
      await client.query('INSERT INTO players(tournament_id,id,data) VALUES($1,$2,$3)', [req.params.id, playerId, changedPlayer]);
      await client.query('DELETE FROM deleted_players WHERE tournament_id=$1 AND id=$2', [req.params.id, playerId]);
    } else {
      const result = correctPlayer(rows.rows.map(r => r.data), teamRows.rows.map(r => r.data), playerId, action, teamId, amount, tournament.rows[0].data.rules || {});
      changedTeams = result.teams;
      changedPlayer = action === 'DELETE' ? null : result.player;
      for (const team of result.teams) await client.query('UPDATE teams SET data=$3 WHERE tournament_id=$1 AND id=$2', [req.params.id, team.id, team]);
      if (action === 'DELETE') {
        const original = rows.rows.find(r => r.data.id === playerId).data;
        await client.query('INSERT INTO deleted_players(tournament_id,id,data) VALUES($1,$2,$3) ON CONFLICT(tournament_id,id) DO UPDATE SET data=excluded.data,deleted_at=now()', [req.params.id, playerId, original]);
        await client.query('DELETE FROM players WHERE tournament_id=$1 AND id=$2', [req.params.id, playerId]);
      } else await client.query('UPDATE players SET data=$3 WHERE tournament_id=$1 AND id=$2', [req.params.id, playerId, result.player]);
    }
    // Remove stale bids and selection for the corrected player.
    await client.query("UPDATE tournament_live_state SET data=data || '{\"currentPlayerId\":\"\",\"currentBid\":0,\"leadingTeam\":null,\"bidsHistory\":[],\"lastEvent\":null}'::jsonb WHERE tournament_id=$1 AND data->>'currentPlayerId'=$2", [req.params.id, playerId]);
    const live = await client.query('SELECT data FROM tournament_live_state WHERE tournament_id=$1', [req.params.id]);
    await client.query('COMMIT');
    res.set('Cache-Control', 'no-store');
    res.json({ success: true, player: changedPlayer, removedPlayerId: action === 'DELETE' ? playerId : null, teams: changedTeams, liveState: live.rows[0]?.data || {} });
  } catch (err) { await client.query('ROLLBACK'); res.status(409).json({ error: err.message }); }
  finally { client.release(); }
});

}
