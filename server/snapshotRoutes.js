// MVCC row versions let frequent live polls skip unchanged photo collections.
export function registerSnapshotRoutes(app, { pool, requireUser, owns }) {
  app.get('/api/tournaments/:id/snapshot', requireUser, async (req, res) => {
    if (!await owns(req.params.id, req.user.id)) return res.status(404).json({ error: 'Tournament not found' });
    res.set('Cache-Control', 'no-store');
    const id = req.params.id;
    const [playerVersion, teamVersion, live] = await Promise.all([
      pool.query("SELECT md5(coalesce(string_agg(id || ':' || xmin::text, ',' ORDER BY id),'')) AS version FROM players WHERE tournament_id=$1", [id]),
      pool.query("SELECT md5(coalesce(string_agg(id || ':' || xmin::text, ',' ORDER BY id),'')) AS version FROM teams WHERE tournament_id=$1", [id]),
      pool.query('SELECT data FROM tournament_live_state WHERE tournament_id=$1', [id]),
    ]);
    const versions = { players: playerVersion.rows[0].version, teams: teamVersion.rows[0].version };
    const result = { success: true, liveState: live.rows[0]?.data || {}, versions };
    if (req.query.playersVersion !== versions.players) result.players = (await pool.query('SELECT data FROM players WHERE tournament_id=$1', [id])).rows.map(row => row.data);
    if (req.query.teamsVersion !== versions.teams) result.teams = (await pool.query('SELECT data FROM teams WHERE tournament_id=$1', [id])).rows.map(row => row.data);
    res.json(result);
  });
}
