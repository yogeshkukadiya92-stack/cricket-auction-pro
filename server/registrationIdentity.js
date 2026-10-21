import { normalizeMobile } from '../shared/registrationValidation.js';

export const ALREADY_REGISTERED = 'Already registered: this mobile number has already submitted a form for this tournament. Please contact the organizer for changes.';

export async function hasRegisteredMobile(client, tournamentId, mobile) {
  const rows = await client.query(`SELECT data->>'mobile' AS mobile FROM players WHERE tournament_id=$1
    UNION ALL SELECT data->>'mobile' AS mobile FROM deleted_players WHERE tournament_id=$1`, [tournamentId]);
  return rows.rows.some(row => normalizeMobile(row.mobile) === normalizeMobile(mobile));
}

export function registerRegistrationIdentityRoutes(app, { pool, limit }) {
  app.post('/api/public/tournaments/:id/registration-check', limit, async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const mobile = normalizeMobile(req.body?.mobile);
    if (!/^[6-9]\d{9}$/.test(mobile)) return res.status(400).json({ error: 'Enter a valid 10-digit Indian mobile number.' });
    const tournament = await pool.query('SELECT id FROM tournaments WHERE id=$1', [req.params.id]);
    if (!tournament.rowCount) return res.status(404).json({ error: 'Tournament not found' });
    const registered = await hasRegisteredMobile(pool, req.params.id, mobile);
    res.json({ registered, message: registered ? ALREADY_REGISTERED : '' });
  });
}
