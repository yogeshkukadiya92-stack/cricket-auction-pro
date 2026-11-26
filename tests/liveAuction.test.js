import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { registerAuctionRoutes } from '../server/auctionRoutes.js';

test('auction rehearsal: bid, undo, safe selection, sold once, unsold, recall and reset', async t => {
  let players = [{ id:'p2',tournamentId:'t1',name:'Player Two',status:'AVAILABLE',basePrice:100,lotOrder:2 },{ id:'p1',tournamentId:'t1',name:'Player One',status:'AVAILABLE',basePrice:100,photoUrl:'/one.png',lotOrder:1 }];
  let teams = [{ id:'k11',tournamentId:'t1',name:'Karma 11',totalPurse:1000,remainingPurse:1000 }];
  let state = {}; const rules = { minPlayersPerTeam:2,maxPlayersPerTeam:2,minimumPlayerReserve:100 };
  const pool = { connect: async () => {
    let before;
    return { release(){}, query: async(sql,values=[]) => {
      if(sql==='BEGIN'){before=structuredClone({players,teams,state});return{rows:[]};}
      if(sql==='COMMIT')return{rows:[]};
      if(sql==='ROLLBACK'){({players,teams,state}=before);return{rows:[]};}
      if(sql.includes("data->'rules'"))return{rows:[{rules}]};
      if(sql.includes("AS approval FROM players"))return{rows:players.filter(p=>p.id===values[1]).map(p=>({status:p.status,approval:p.approvalStatus}))};
      if(sql.startsWith('SELECT')&&sql.includes('FROM players'))return{rows:players.map(data=>({data:structuredClone(data)}))};
      if(sql.startsWith('SELECT')&&sql.includes('FROM teams'))return{rows:teams.map(data=>({data:structuredClone(data)}))};
      if(sql.startsWith('SELECT')&&sql.includes('FROM tournament_live_state'))return{rows:[{data:structuredClone(state)}]};
      if(sql.startsWith('SELECT'))return{rows:[{id:'t1'}]};
      if(sql.startsWith('UPDATE players p')) { const patches=JSON.parse(values[1]); players=players.map(p=>{const patch=patches.find(x=>x.id===p.id);if(!patch)return p;const {soldPrice,soldToTeamId,...rest}=p;return {...rest,...patch};}); }
      else if(sql.startsWith('UPDATE teams t')) { const patches=JSON.parse(values[1]); teams=teams.map(team=>({...team,...patches.find(x=>x.id===team.id)})); }
      else if(sql.startsWith('UPDATE players'))players=players.map(p=>p.id===values[1]?values[2]:p);
      else if(sql.startsWith('UPDATE teams'))teams=teams.map(team=>team.id===values[1]?values[2]:team);
      else if(sql.startsWith('INSERT INTO tournament_live_state'))state=values[1];
      else throw new Error(sql);
      return{rows:[]};
    }};
  }};
  const app=express();app.use(express.json());registerAuctionRoutes(app,{pool,requireUser:(req,res,next)=>{req.user={id:'owner'};next();},owns:async id=>id==='t1'});
  const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
  const command=async(action,extra={})=>{const response=await fetch(`http://127.0.0.1:${server.address().port}/api/tournaments/t1/auction`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,playerId:state.currentPlayerId,...extra})});return{status:response.status,data:await response.json()};};
  app.use((error,_req,res,_next)=>res.status(error.status||500).json({error:error.message}));
  assert.equal((await command('SELECT',{playerId:'p1'})).status,200);
  assert.equal((await command('BID',{teamId:'k11',amount:100})).status,200);
  assert.equal((await command('SELECT',{playerId:'p1'})).data.liveState.currentBid,100,'Clicking the selected lot preserves bids');
  assert.equal((await command('SELECT',{playerId:'p2'})).status,409);
  assert.equal((await command('ACCELERATE',{discountPercent:50})).status,409);
  assert.equal((await command('BID',{teamId:'k11',amount:950})).status,409,'Squad reserve enforced');
  await command('BID',{teamId:'k11',amount:200});await command('UNDO');assert.equal(state.currentBid,100);
  assert.equal((await command('SOLD',{teamId:'k11',amount:100})).status,200);
  assert.equal(teams[0].remainingPurse,900);assert.equal(players.find(p=>p.id==='p1').status,'SOLD');assert.equal(state.currentPlayerId,'p2','The next lot follows lot order');
  assert.equal((await command('SOLD',{playerId:'p1',teamId:'k11',amount:100})).status,409);assert.equal(teams[0].remainingPurse,900);
  const reverse = { soldPlayerId: 'p1', teamId: 'k11', amount: 100, newStatus: 'AVAILABLE' };
  assert.equal((await command('REVERSE_SALE', { ...reverse, amount: 200 })).status, 409);
  assert.equal((await command('REVERSE_SALE', reverse)).status, 200);
  assert.equal(state.currentPlayerId, 'p2');
  assert.equal(teams[0].remainingPurse, 1000);
  assert.equal(players.find(p => p.id === 'p1').soldToTeamId, undefined);
  assert.equal((await command('REVERSE_SALE', reverse)).status, 409);
  assert.equal(teams[0].remainingPurse, 1000);
  await command('SELECT', { playerId: 'p1' });
  await command('BID', { teamId: 'k11', amount: 100 });
  await command('SOLD', { teamId: 'k11', amount: 100 });
  assert.equal((await command('REVERSE_SALE', { ...reverse, newStatus: 'UNSOLD' })).status, 200);
  assert.equal(players.find(p => p.id === 'p1').status, 'UNSOLD');
  assert.equal((await command('UNSOLD')).status,200);assert.equal(players.find(p=>p.id==='p2').status,'UNSOLD');
  await command('ACCELERATE',{discountPercent:50});assert.equal(players.find(p=>p.id==='p2').basePrice,50);
  assert.ok(players.every(p => p.status === 'AVAILABLE'));
  await command('UNSOLD');await command('UNSOLD');await command('ACCELERATE',{discountPercent:50});assert.equal(players.find(p=>p.id==='p2').basePrice,50,'Repeat rounds do not compound the discount');
  await command('RESET');assert.equal(teams[0].remainingPurse,1000);assert.ok(players.every(p=>p.status==='AVAILABLE'));assert.equal(players.find(p=>p.id==='p2').basePrice,100,'Reset restores the original base price');assert.equal(players.find(p=>p.id==='p1').photoUrl,'/one.png');
  rules.maxPlayersPerTeam = 1;
  rules.minPlayersPerTeam = 1;
  await command('SELECT', { playerId: 'p1' });
  for (const newStatus of ['AVAILABLE', 'UNSOLD']) {
    assert.equal((await command('BID', { teamId: 'k11', amount: 1001 })).status, 409);
    assert.equal((await command('BID', { teamId: 'k11', amount: 1000 })).status, 200);
    assert.equal((await command('SOLD', { teamId: 'k11', amount: 1000 })).status, 200);
    assert.equal(teams[0].remainingPurse, 0);
    assert.equal((await command('BID', { teamId: 'k11', amount: 100 })).status, 409);
    const correction = { soldPlayerId: 'p1', teamId: 'k11', amount: 1000, newStatus };
    assert.equal((await command('REVERSE_SALE', correction)).status, 200);
    assert.equal((await command('REVERSE_SALE', correction)).status, 409);
    assert.equal(teams[0].remainingPurse, 1000);
    assert.equal(players.filter(p => p.status === 'SOLD' && p.soldToTeamId === 'k11').length, 0);
    assert.equal((await command('BID', { teamId: 'k11', amount: 1000 })).status, 200);
    await command('UNDO');
    if (newStatus === 'AVAILABLE') await command('SELECT', { playerId: 'p1' });
  }

});
