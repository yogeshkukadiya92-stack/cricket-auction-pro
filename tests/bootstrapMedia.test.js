import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { mediaPath, projectPlayerMedia, restorePlayerMedia, registerBootstrapMedia } from '../server/bootstrapMedia.js';

test('startup omits embedded media and editing retains original image bytes', () => {
  const previous = { id: 'p1', tournamentId: 't1', name: 'Player', photoUrl: 'data:image/png;base64,AAAA', paymentScreenshotUrl: 'data:image/png;base64,BBBB' };
  const projected = projectPlayerMedia({ data: { id: 'p1', tournamentId: 't1', name: 'Player' }, embedded_photo: true, embedded_receipt: true });
  assert.equal(projected.photoUrl, mediaPath('t1', 'p1', 'photoUrl'));
  assert.equal(JSON.stringify(projected).includes('base64'), false);
  assert.deepEqual(restorePlayerMedia(projected, previous), previous);
  assert.equal(restorePlayerMedia({ ...projected, photoUrl: '' }, previous).photoUrl, '');
  assert.equal(restorePlayerMedia({ ...projected, photoUrl: 'data:image/png;base64,CCCC' }, previous).photoUrl, 'data:image/png;base64,CCCC');
  assert.throws(() => restorePlayerMedia(projected, null), /no longer available/);
});

test('player media requires authentication, tournament ownership and field allowlist', async t => {
  let reads = 0;
  const app = express();
  registerBootstrapMedia(app, {
    requireUser: (req, res, next) => { if (!req.headers['x-test-user']) return res.sendStatus(401); req.user = { id: req.headers['x-test-user'] }; next(); },
    owns: async (id, user) => id === 't1' && user === 'owner',
    pool: { query: async (_sql, args) => { reads++; return { rows: args[1] === 'p1' ? [{ image: 'data:image/png;base64,AAAA' }] : [] }; } }
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const url = base + mediaPath('t1', 'p1', 'photoUrl');
  assert.equal((await fetch(url)).status, 401);
  assert.equal((await fetch(url, { headers: { 'x-test-user': 'other' } })).status, 404);
  assert.equal((await fetch(base + mediaPath('t1', 'p1', 'mobile'), { headers: { 'x-test-user': 'owner' } })).status, 404);
  assert.equal(reads, 0);
  const response = await fetch(url, { headers: { 'x-test-user': 'owner' } });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'image/png');
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), Buffer.from('AAAA', 'base64'));
});
