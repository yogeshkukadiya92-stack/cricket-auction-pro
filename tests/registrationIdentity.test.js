import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { hasRegisteredMobile, registerRegistrationIdentityRoutes } from '../server/registrationIdentity.js';

test('mobile identity includes removed registrations, ignores formatting and stays scoped to one tournament', async () => {
  const client = { query: async (sql, params) => {
    assert.ok(sql.includes('FROM deleted_players'), 'Removing a player must not permit a second form');
    assert.ok(sql.includes('UNION ALL'));
    return { rows: params[0] === 't1' ? [{ mobile: '+91 98765 43210' }] : [] };
  } };
  for (const mobile of ['9876543210', '09876543210', '+91 98765 43210']) assert.equal(await hasRegisteredMobile(client, 't1', mobile), true);
  assert.equal(await hasRegisteredMobile(client, 't2', '9876543210'), false);
  assert.equal(await hasRegisteredMobile(client, 't1', '9123456789'), false);
});

test('public check returns an Already registered notice without exposing player details', async t => {
  const app = express(); app.use(express.json());
  registerRegistrationIdentityRoutes(app, { limit: (_req,_res,next) => next(), pool: { query: async (sql, params) => {
    if (sql.includes('FROM tournaments')) return { rowCount: params[0] === 'missing' ? 0 : 1 };
    return { rows: params[0] === 't1' ? [{ mobile: '9876543210' }] : [] };
  } } });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const check = (tournament, mobile) => fetch(`${base}/api/public/tournaments/${tournament}/registration-check`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mobile }) });
  const response = await check('t1', '+91 98765 43210');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const data = await response.json();
  assert.equal(data.registered, true);
  assert.match(data.message, /Already registered/);
  assert.deepEqual(Object.keys(data).sort(), ['message','registered']);
  assert.deepEqual(await (await check('t2','9876543210')).json(), { registered: false, message: '' });
  assert.equal((await check('t1','123')).status, 400);
  assert.equal((await check('missing','9876543210')).status, 404);
});
