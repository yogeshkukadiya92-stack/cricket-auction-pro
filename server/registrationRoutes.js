import { sendConditionalJson } from './conditionalJson.js';
import { mediaColumns, projectMedia } from './recordMedia.js';

// Both URLs require an organizer session; search and pagination retain ownership checks.
export function registerRegistrationRoutes(app, { pool, requireUser, owns }) {
  app.get(['/api/tournaments/:id/registrations', '/api/public/tournaments/:id/registrations'], requireUser, async (req, res) => {
    res.set('Cache-Control', 'no-store');
    if (!await owns(req.params.id, req.user.id)) return res.status(403).json({ error: 'Only the tournament organizer can view form responses' });
    const result = await pool.query('SELECT data FROM tournaments WHERE id=$1', [req.params.id]);
    if (!result.rowCount) return res.status(404).json({ error: 'Tournament not found' });
    const page = Math.max(0, Math.min(10000, Number.parseInt(req.query.page, 10) || 0));
    const pageSize = 25;
    const search = String(req.query.q || '').trim().slice(0, 100);
    const pattern = search ? `%${search.replace(/[\\%_]/g, '\\$&')}%` : '';
    const matches = "($2::text='' OR data->>'name' ILIKE $2 OR data->>'mobile' ILIKE $2 OR data->>'email' ILIKE $2 OR data->>'city' ILIKE $2)";
    const [counts, rows] = await Promise.all([
      pool.query(`SELECT count(*)::int AS total, count(*) FILTER (WHERE ${matches})::int AS matched FROM players WHERE tournament_id=$1`, [req.params.id, pattern]),
      pool.query(`SELECT ${mediaColumns('players')} FROM players WHERE tournament_id=$1 AND ${matches} ORDER BY data->>'registeredAt' DESC NULLS LAST, id LIMIT $3 OFFSET $4`, [req.params.id, pattern, pageSize, page * pageSize]),
    ]);
    const tournament = result.rows[0].data;
    const { total, matched } = counts.rows[0];
    sendConditionalJson(req, res, { tournament: { name: tournament.name, season: tournament.season, customFields: tournament.customFields || [] }, players: rows.rows.map(row => projectMedia('players', row)), total, matched, page, pageSize, hasMore: (page + 1) * pageSize < matched });
  });
}
