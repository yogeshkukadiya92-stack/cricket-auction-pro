import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { registerPlayerCorrectionRoutes } from '../server/playerCorrectionRoutes.js';

test('remove, repeat remove and restore preserve details, refund once and enforce ownership', async t => {
  const original = { id: 'p1', tournamentId: 't1', name: 'Ravi', mobile: '9876543210', role: 'BATSMAN', status: 'SOLD', soldPrice: 300, soldToTeamId: 'a', photoUrl: '/photo.png', paymentScreenshotUrl: '/receipt.png', paymentStatus: 'PAID', paymentUtr: 'UTR123', customData: { shirt: 'M' }, approvalStatus: 'APPROVED' };
  let players = [structuredClone(original)];
  let teams = [{ id: 'a', tournamentId: 't1', name: 'Team A', remainingPurse: 700 }];
  const archived = new Map();
  let live = { currentPlayerId: 'p1', currentBid: 300 };
  const query = async (sql, values = []) => {
    if (['BEGIN','COMMIT','ROLLBACK'].includes(sql)) return { rows: [] };
    if (sql.includes('FROM tournaments')) return { rows: [{ data: { rules: {} } }] };
    if (sql.startsWith('SELECT') && sql.includes('FROM deleted_players')) {
      if (values[1]) return { rowCount: archived.has(values[1]) ? 1 : 0, rows: archived.has(values[1]) ? [{ data: structuredClone(archived.get(values[1])) }] : [] };
      assert.ok(sql.includes('jsonb_build_object'), 'Recycle Bin does not download photos and private forms');
      return { rows: [...archived.values()].map(p => ({ data: { id: p.id, name: p.name, role: p.role }, deleted_at: '2026-10-21T05:00:00Z' })) };
    }
    if (sql.startsWith('SELECT') && sql.includes('FROM players')) return { rows: players.map(p => ({ data: structuredClone(p) })) };
    if (sql.startsWith('SELECT') && sql.includes('FROM teams')) return { rows: teams.map(p => ({ data: structuredClone(p) })) };
    if (sql.startsWith('SELECT') && sql.includes('FROM tournament_live_state')) return { rows: [{ data: live }] };
    if (sql.startsWith('INSERT INTO deleted_players')) archived.set(values[1], structuredClone(values[2]));
    else if (sql.startsWith('DELETE FROM players')) players = players.filter(p => p.id !== values[1]);
    else if (sql.startsWith('INSERT INTO players')) players.push(structuredClone(values[2]));
    else if (sql.startsWith('DELETE FROM deleted_players')) archived.delete(values[1]);
    else if (sql.startsWith('UPDATE teams')) teams = teams.map(team => team.id === values[1] ? structuredClone(values[2]) : team);
    else if (sql.startsWith('UPDATE tournament_live_state')) { if (live.currentPlayerId === values[1]) live = {}; }
    else throw new Error(`Unexpected SQL: ${sql}`);
    return { rows: [] };
  };
  const app = express();
  app.use(express.json());
  registerPlayerCorrectionRoutes(app, { pool: { query, connect: async () => ({ query, release() {} }) }, requireUser: (req,res,next) => {
    if (!req.headers['x-owner']) return res.status(401).json({ error: 'Sign in' });
    req.user = { id: req.headers['x-owner'] }; next();
  }, owns: async (id, user) => id === 't1' && user === 'owner' });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const root = `http://127.0.0.1:${server.address().port}/api/tournaments/t1`;
  const mutate = (action, owner = 'owner') => fetch(`${root}/player-correction`, { method: 'POST', headers: { 'content-type': 'application/json', ...(owner ? { 'x-owner': owner } : {}) }, body: JSON.stringify({ action, playerId: 'p1' }) });
  assert.equal((await mutate('DELETE', '')).status, 401);
  assert.equal((await mutate('DELETE', 'other')).status, 409);
  assert.equal(players.length, 1);
  const removed = await mutate('DELETE');
  assert.equal(removed.status, 200);
  const data = await removed.json();
  assert.equal(data.removedPlayerId, 'p1');
  assert.equal(data.teams[0].remainingPurse, 1000);
  assert.equal(players.length, 0);
  assert.equal((await mutate('DELETE')).status, 200);
  assert.equal(teams[0].remainingPurse, 1000, 'Repeated deletes cannot refund twice');
  assert.equal((await fetch(`${root}/deleted-players`)).status, 401);
  assert.equal((await fetch(`${root}/deleted-players`, { headers: { 'x-owner': 'other' } })).status, 404);
  const bin = await fetch(`${root}/deleted-players`, { headers: { 'x-owner': 'owner' } });
  assert.equal(bin.headers.get('cache-control'), 'no-store');
  const binText = await bin.text();
  assert.equal(JSON.parse(binText).players.length, 1);
  assert.ok(!binText.includes(original.mobile));
  const restored = await mutate('RESTORE');
  assert.equal(restored.status, 200);
  const { soldPrice, soldToTeamId, ...details } = original;
  assert.deepEqual(players[0], { ...details, status: 'AVAILABLE' });
  assert.equal(archived.size, 0);
  assert.equal(teams[0].remainingPurse, 1000);
  assert.equal((await mutate('RESTORE')).status, 409, 'Restore cannot create duplicate players');
  assert.equal((await mutate('DELETE')).status, 200);
  players.push({ ...details, id: 'p2', status: 'AVAILABLE' });
  assert.equal((await mutate('RESTORE')).status, 409, 'Duplicate mobile registration blocks restore without losing the archive');
  assert.equal(archived.size, 1);
  assert.equal(players[0].id, 'p2');
});
