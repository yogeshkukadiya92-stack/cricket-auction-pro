import test from 'node:test';
import assert from 'node:assert/strict';
import { getBidBudget } from '../shared/auctionBudget.js';
const team = { id: 'a', remainingPurse: 10000000 };
const rules = { minPlayersPerTeam: 12, minimumPlayerReserve: 200000 };
test('one crore purse allows 78 lakh with 22 lakh reserved for eleven players', () => {
  assert.deepEqual(getBidBudget(team, [], rules), { bought: 0, remainingSlots: 11, reserve: 2200000, maxBid: 7800000 });
});
test('reserve decreases as players are bought, using the actual remaining purse', () => {
  const players = [{ status: 'SOLD', soldToTeamId: 'a' }, { status: 'UNSOLD', soldToTeamId: 'a' }, { status: 'SOLD', soldToTeamId: 'b' }];
  assert.deepEqual(getBidBudget({ ...team, remainingPurse: 8000000 }, players, rules), { bought: 1, remainingSlots: 10, reserve: 2000000, maxBid: 6000000 });
});
test('last required player may use all remaining purse', () => {
  const players = Array.from({ length: 11 }, () => ({ status: 'SOLD', soldToTeamId: 'a' }));
  assert.equal(getBidBudget(team, players, rules).reserve, 0);
  assert.equal(getBidBudget(team, players, rules).maxBid, 10000000);
});
test('thirteen player squad reserves 24 lakh and permits 76 lakh', () => {
  assert.equal(getBidBudget(team, [], { ...rules, minPlayersPerTeam: 13 }).maxBid, 7600000);
});
test('insufficient purse never produces a negative maximum', () => {
  assert.equal(getBidBudget({ ...team, remainingPurse: 100000 }, [], rules).maxBid, 0);
});
