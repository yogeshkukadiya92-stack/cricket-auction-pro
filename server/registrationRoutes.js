// Both URLs require an organizer session; old shared links must not bypass access checks.
export function registerRegistrationRoutes(app, { pool, requireUser, owns }) {
  app.get(['/api/tournaments/:id/registrations', '/api/public/tournaments/:id/registrations'], requireUser, async (req, res) => {
    res.set('Cache-Control', 'no-store');
    if (!await owns(req.params.id, req.user.id)) return res.status(403).json({ error: 'Only the tournament organizer can view form responses' });
    const result = await pool.query('SELECT data FROM tournaments WHERE id=$1', [req.params.id]);
    if (!result.rowCount) return res.status(404).json({ error: 'Tournament not found' });
    const rows = await pool.query("SELECT data FROM players WHERE tournament_id=$1 ORDER BY data->>'registeredAt' DESC NULLS LAST, id", [req.params.id]);
    const tournament = result.rows[0].data;
    res.json({ tournament: { name: tournament.name, season: tournament.season, customFields: tournament.customFields || [] }, players: rows.rows.map(({ data }) => data) });
  });
}
