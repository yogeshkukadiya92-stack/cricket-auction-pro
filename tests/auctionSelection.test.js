import test from 'node:test';
import assert from 'node:assert/strict';
import { registerAuctionRoutes } from '../server/auctionRoutes.js';

test('selection reads only target eligibility, preserves bids and rejects unavailable lots', async () => {
  let handler, state = {}, status = 'AVAILABLE';
  const queries = [];
  const client = { release() {}, async query(sql, args) {
    queries.push(sql);
    if (sql.includes('FROM tournament_live_state')) return { rows: [{ data: state }] };
    if (sql.includes('AS approval FROM players')) return { rows: [{ status, approval: 'APPROVED' }] };
    if (sql.startsWith('INSERT INTO tournament_live_state')) state = args[1];
    return { rows: [] };
  } };
  registerAuctionRoutes({ post(_path, _auth, fn) { handler = fn; } }, { pool: { connect: async () => client }, requireUser() {}, owns: async () => true });
  const select = playerId => handler({ params: { id: 't1' }, user: { id: 'owner' }, body: { action: 'SELECT', playerId } }, { json(value) { return value; } });
  assert.equal((await select('p1')).liveState.currentPlayerId, 'p1');
  assert.ok(!queries.some(sql => sql.includes('FROM teams') || sql.includes('customData')), 'No roster or media projection needed');
  state = { ...state, currentBid: 100 };
  assert.equal((await select('p1')).liveState.currentBid, 100);
  await assert.rejects(select('p2'), /Finish or undo/);
  state = { ...state, currentBid: 0 };
  status = 'SOLD';
  await assert.rejects(select('p2'), /not available/);
});

test('cached bids commit together, retry once and detect competing desks', async () => {
  let handler, state = { currentPlayerId: 'p', currentBid: 0, bidsHistory: [] };
  const client = { release() {}, async query(sql, args) {
    if (sql.includes('FROM tournament_live_state')) return { rows: [{ data: state }] };
    if (sql.includes('FROM players')) return { rows: [{ data: { id: 'p', status: 'AVAILABLE', basePrice: 5 } }] };
    if (sql.includes('FROM teams')) return { rows: [{ data: { id: 't', name: 'Team', remainingPurse: 100 } }] };
    if (sql.startsWith('INSERT INTO tournament_live_state')) state = args[1];
    return { rows: [] };
  } };
  registerAuctionRoutes({ post(_path, _auth, fn) { handler = fn; } }, { pool: { connect: async () => client }, requireUser() {}, owns: async () => true });
  const submit = (amounts, revision = '') => handler({ params: { id: 'cup' }, user: { id: 'owner' },
    body: { action: 'BID_BATCH', revision, playerId: 'p', bids: amounts.map(amount => ({ id: String(amount), playerId: 'p', teamId: 't', amount })) },
  }, { json() {} });
  await assert.rejects(submit([5, 4]), /exceed/);
  assert.equal(state.currentBid, 0);
  await submit([5, 10]);
  await submit([5, 10]);
  assert.deepEqual(state.bidsHistory.map(bid => bid.amount), [10, 5]);
  await assert.rejects(submit([15]), /another device/);
});
