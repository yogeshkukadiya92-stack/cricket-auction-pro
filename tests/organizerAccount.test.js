import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import bcrypt from 'bcryptjs';
import { registerOrganizerAccountRoutes } from '../server/organizerAccountRoutes.js';

test('organizer profile writes only the session owner name; password change validates and retains only current session', async t => {
  const queries = [];
  const passwordHash = await bcrypt.hash('old-password-123', 4);
  const user = { id: 'owner', name: 'Organizer', email: 'owner@example.com', role: 'ORGANIZER', status: 'ACTIVE' };
  const client = { query: async (sql, params) => { queries.push({ sql, params }); return {}; }, release() {} };
  const app = express(); app.use(express.json());
  registerOrganizerAccountRoutes(app, {
    pool: { query: async (sql, params) => {
      queries.push({ sql, params });
      return sql.startsWith('SELECT password') ? { rows: [{ password_hash: passwordHash }] } : { rows: [{ ...user, name: params[1] }] };
    }, connect: async () => client },
    requireUser: (req, res, next) => { if (!req.headers['x-session']) return res.status(401).json({ error: 'Please sign in' }); req.user = user; req.cookies = { session: 'current-token' }; next(); },
    limit: (_req, _res, next) => next(), bcrypt, hashToken: token => `hash:${token}`, cookieName: 'session',
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = (path, method, body, signedIn = true) => fetch(`${base}${path}`, { method, headers: { 'Content-Type': 'application/json', ...(signedIn ? { 'x-session': 'yes' } : {}) }, body: JSON.stringify(body) });
  assert.equal((await request('/api/auth/profile', 'PATCH', { name: 'X' }, false)).status, 401);
  assert.equal((await request('/api/auth/password', 'POST', {}, false)).status, 401);
  assert.equal(queries.length, 0);
  for (const name of ['', '   ', 'x'.repeat(101), {}, null]) assert.equal((await request('/api/auth/profile', 'PATCH', { name })).status, 400);
  const updated = await request('/api/auth/profile', 'PATCH', { name: ' New name ', id: 'victim', role: 'ADMIN', email: 'changed@example.com' });
  assert.equal(updated.status, 200);
  assert.deepEqual((await updated.json()).user, { ...user, name: 'New name' });
  assert.deepEqual(queries[0].params, ['owner', 'New name']);
  assert.equal((await request('/api/auth/password', 'POST', { currentPassword: 'old-password-123', newPassword: 'short' })).status, 400);
  assert.equal((await request('/api/auth/password', 'POST', { currentPassword: 'wrong', newPassword: 'new-password-456' })).status, 400);
  assert.ok(!queries.some(q => q.sql.startsWith('UPDATE organizers SET password')));
  assert.equal((await request('/api/auth/password', 'POST', { currentPassword: 'old-password-123', newPassword: 'new-password-456' })).status, 200);
  const update = queries.find(q => q.sql.startsWith('UPDATE organizers SET password'));
  assert.equal(update.params[0], 'owner');
  assert.ok(await bcrypt.compare('new-password-456', update.params[1]));
  assert.equal((await request('/api/auth/password', 'POST', { currentPassword: 'old-password-123', newPassword: '01234' })).status, 200);
  const pinUpdate = queries.filter(q => q.sql.startsWith('UPDATE organizers SET password')).at(-1);
  assert.ok(await bcrypt.compare('01234', pinUpdate.params[1]));
  for (const invalid of ['1234', '123456', '12a34']) assert.equal((await request('/api/auth/password', 'POST', { currentPassword: 'old-password-123', newPassword: invalid })).status, 400);
  const deletion = queries.find(q => q.sql.startsWith('DELETE FROM sessions'));
  assert.deepEqual(deletion.params, ['owner', 'hash:current-token']);
  assert.ok(deletion.sql.includes('token_hash<>$2'));
  assert.ok(queries.some(q => q.sql === 'COMMIT'));
});
