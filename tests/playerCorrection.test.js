import test from 'node:test';
import assert from 'node:assert/strict';
import { correctPlayer } from '../shared/playerCorrection.js';
const rules = { minPlayersPerTeam: 2, maxPlayersPerTeam: 2, minimumPlayerReserve: 100 };
const player = { id: 'p', status: 'SOLD', basePrice: 100, soldPrice: 300, soldToTeamId: 'a' };
const teams = [{ id: 'a', remainingPurse: 700 }, { id: 'b', remainingPurse: 1000 }];
test('unsold refunds purchase and clears team and price without mutating originals', () => {
 const result=correctPlayer([player], teams, 'p','UNSOLD',null,null,rules);
 assert.equal(result.teams[0].remainingPurse,1000); assert.equal(result.player.status,'UNSOLD'); assert.equal(result.player.soldPrice,undefined); assert.equal(teams[0].remainingPurse,700);
});
test('manual transfer refunds old team and charges new team once', () => {
 const result=correctPlayer([player],teams,'p','SOLD','b',500,rules);
 assert.equal(result.teams[0].remainingPurse,1000);assert.equal(result.teams[1].remainingPurse,500);assert.equal(result.player.soldToTeamId,'b');
});
test('delete refunds sold player and removes from active pool',()=>{const r=correctPlayer([player],teams,'p','DELETE',null,null,rules);assert.equal(r.players.length,0);assert.equal(r.teams[0].remainingPurse,1000);});
test('manual sold respects reserve and squad limits',()=>{
 assert.throws(()=>correctPlayer([player],teams,'p','SOLD','b',950,rules),/maximum bid/);
 assert.throws(()=>correctPlayer([player,{id:'x',status:'SOLD',soldToTeamId:'b'},{id:'y',status:'SOLD',soldToTeamId:'b'}],teams,'p','SOLD','b',100,rules),/Squad complete/);
});
