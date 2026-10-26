import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import compression from 'compression';
import { requestJson } from '../shared/requestJson.js';

test('startup requests finish, report failures and time out even during body download', async t => {
  const app = express();
  app.use(compression({ threshold: 1024 }));
  app.get('/ok', (_req, res) => res.json({ success: true, players: Array.from({ length: 500 }, (_, id) => ({ id, name: 'Example player', status: 'AVAILABLE' })) }));
  app.get('/error', (_req, res) => res.status(503).json({ error: 'Database unavailable' }));
  app.get('/slow', (req, res) => { res.type('json'); res.write('{'); req.on('close', () => res.end()); });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const result = await requestJson(`${base}/ok`);
  assert.equal(result.players.length, 500);
  await assert.rejects(requestJson(`${base}/error`), /Database unavailable/);
  await assert.rejects(requestJson(`${base}/slow`, {}, 50), /taking too long/);
  const response = await fetch(`${base}/ok`, { headers: { 'Accept-Encoding': 'gzip' } });
  assert.equal(response.headers.get('content-encoding'), 'gzip');
  assert.deepEqual(await response.json(), result);
});
