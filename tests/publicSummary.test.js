import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { registerPublicSummaryRoutes } from '../server/publicSummaryRoutes.js';

test('summary keeps live state and totals exact while excluding embedded images and private form fields', async t => {
  const app = express();
  const pool = { query: async (sql, params) => {
    assert.deepEqual(params, ['t1']);
    if (sql.includes('FROM tournament_live_state')) return { rows: [{ data: { currentPlayerId: 'p0', currentBid: 25000, leadingTeam: { id: 'team1' }, bidsHistory: [{ id: 'bid1', playerId: 'p0', teamId: 'team1', amount: 25000 }], lastEvent: { id: 'ev1', type: 'SOLD', player: { id: 'p0', photoUrl: 'data:image/png;base64,PRIVATE' }, team: { id: 'team1' } } } }] };
    assert.ok(sql.includes('jsonb_build_object'), 'Only public metadata is read');
    assert.ok(sql.includes("LIKE 'data:image/%'"), 'Embedded images must not be transferred by summary queries');
    for (const field of ['mobile', 'email', 'paymentScreenshotUrl', 'customData', 'paymentUtr', 'photoUrl', 'logo', 'logoUrl']) {
      assert.ok(!sql.includes(`data->'${field}'`), `No raw ${field} in projected data`);
    }
    if (sql.includes('FROM tournaments')) return { rowCount: 1, rows: [{ data: { id: 't1', name: 'League', rules: { currency: 'INR' } }, uploaded_image: true }] };
    if (sql.includes('FROM teams')) return { rows: [{ data: { id: 'team1', name: 'Team', remainingPurse: 75000 }, uploaded_image: true }] };
    return { rows: Array.from({ length: 35 }, (_, i) => ({ data: { id: `p${i}`, name: `Player ${i}`, role: 'BATSMAN', approvalStatus: 'APPROVED', status: i === 0 ? 'IN_AUCTION' : 'AVAILABLE', basePrice: 20000 }, uploaded_image: true })) };
  } };
  registerPublicSummaryRoutes(app, { pool });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/public/tournaments/t1/summary`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const text = await response.text();
  assert.ok(text.length < 35000);
  assert.ok(!text.includes('base64'));
  const data = JSON.parse(text);
  assert.equal(data.players.length, 35);
  assert.equal(data.registrationStats.total, 35);
  assert.equal(data.liveState.currentBid, 25000);
  assert.equal(data.liveState.lastEvent.player.photoUrl, data.players[0].photoUrl);
  assert.equal(data.liveState.bidsHistory[0].teamName, 'Team');
  assert.match(data.players[0].photoUrl, /\/p0\/photo$/);
  assert.match(data.teams[0].logo, /\/teams\/team1\/logo$/);
  assert.match(data.tournament.logoUrl, /\/logo$/);
});
