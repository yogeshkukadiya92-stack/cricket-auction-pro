import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { registerRegistrationRoutes } from '../server/registrationRoutes.js';

test('form responses require an organizer session and tournament ownership on both URLs', async t => {
  const player = { id: 'p1', name: 'Ravi', mobile: '9876543210', email: 'ravi@example.com', customData: { f1: false }, stats: { runs: 10 }, paymentUtr: 'UTR123', paymentScreenshotUrl: 'data:image/png;base64,AAAA' };
  const tournament = { name: 'League', season: 'S4', customFields: [{ id: 'f1', label: 'Available?' }] };
  let queries = 0;
  const app = express();
  registerRegistrationRoutes(app, {
    pool: { query: async sql => { queries++; return sql.includes('FROM tournaments') ? { rowCount: 1, rows: [{ data: tournament }] } : { rows: [{ data: player }] }; } },
    requireUser: (req, res, next) => {
      // Stands in for the production cookie session middleware; player sessions are rejected.
      const id = req.headers['x-test-organizer'];
      if (!id) return res.status(401).json({ error: 'Please sign in' });
      req.user = { id }; next();
    },
    owns: async (id, userId) => id === 't1' && userId === 'owner',
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const prefix of ['/api/tournaments', '/api/public/tournaments']) {
    for (const headers of [{}, { 'x-test-player': 'player' }, { 'x-test-organizer': 'other' }]) {
      const before = queries;
      const response = await fetch(`${base}${prefix}/t1/registrations`, { headers });
      assert.equal(response.status, headers['x-test-organizer'] ? 403 : 401);
      assert.equal(queries, before, 'Unauthorized callers cannot query response data');
      assert.ok(!JSON.stringify(await response.json()).includes(player.mobile));
    }
    const response = await fetch(`${base}${prefix}/t1/registrations`, { headers: { 'x-test-organizer': 'owner' } });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await response.json(), { tournament, players: [player] });
    const wrongTournament = await fetch(`${base}${prefix}/t2/registrations`, { headers: { 'x-test-organizer': 'owner' } });
    assert.equal(wrongTournament.status, 403);
  }
});
