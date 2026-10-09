export function registerOrganizerAccountRoutes(app, { pool, requireUser, limit, bcrypt, hashToken, cookieName }) {
  app.patch('/api/auth/profile', requireUser, async (req, res) => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!name || name.length > 100) return res.status(400).json({ error: 'Name must contain 1–100 characters' });
    const result = await pool.query('UPDATE organizers SET name=$2 WHERE id=$1 RETURNING id,name,email,role,status', [req.user.id, name]);
    res.json({ success: true, user: result.rows[0] });
  });
  app.post('/api/auth/password', requireUser, limit, async (req, res) => {
    const { currentPassword, newPassword } = req.body || {};
    if (typeof newPassword !== 'string' || (!/^\d{5}$/.test(newPassword) && newPassword.length < 12) || newPassword.length > 128) return res.status(400).json({ error: 'New password must contain exactly 5 digits or 12–128 characters' });
    const result = await pool.query('SELECT password_hash FROM organizers WHERE id=$1', [req.user.id]);
    if (typeof currentPassword !== 'string' || currentPassword.length > 128 || !await bcrypt.compare(currentPassword, result.rows[0].password_hash)) return res.status(400).json({ error: 'Current password is incorrect' });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('UPDATE organizers SET password_hash=$2 WHERE id=$1', [req.user.id, await bcrypt.hash(newPassword, 12)]);
      await client.query('DELETE FROM sessions WHERE organizer_id=$1 AND token_hash<>$2', [req.user.id, hashToken(req.cookies[cookieName])]);
      await client.query('COMMIT');
      res.json({ success: true });
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  });
}
