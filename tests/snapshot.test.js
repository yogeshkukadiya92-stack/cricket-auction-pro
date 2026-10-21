import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { registerSnapshotRoutes } from '../server/snapshotRoutes.js';

test('live polls omit unchanged photos but return changed players, teams and deletions', async t => {
  let players = [{id:'p1',photoUrl:'data:image/png;base64,AAAA'}];
  let pVersion='p1', tVersion='t1'; let fullReads=0;
  const pool={query:async(sql)=>{
    if(sql.includes('string_agg')) return{rows:[{version:sql.includes('FROM players')?pVersion:tVersion}]};
    if(sql.includes('FROM tournament_live_state'))return{rows:[{data:{currentBid:100}}]};
    fullReads++;
    return{rows:(sql.includes('FROM players')?players:[{id:'k11',remainingPurse:1000}]).map(data=>({data}))};
  }};
  const app=express();registerSnapshotRoutes(app,{pool,requireUser:(req,_res,next)=>{req.user={id:'owner'};next();},owns:async id=>id==='t1'});
  const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
  const base=`http://127.0.0.1:${server.address().port}/api/tournaments`;
  let response=await fetch(`${base}/t1/snapshot`);let data=await response.json();assert.equal(data.players.length,1);assert.equal(fullReads,2);
  response=await fetch(`${base}/t1/snapshot?playersVersion=p1&teamsVersion=t1`);data=await response.json();assert.equal(data.players,undefined);assert.equal(data.teams,undefined);assert.equal(data.liveState.currentBid,100);assert.equal(fullReads,2);
  players=[];pVersion='p2';tVersion='t2';data=await(await fetch(`${base}/t1/snapshot?playersVersion=p1&teamsVersion=t1`)).json();assert.deepEqual(data.players,[]);assert.equal(data.teams.length,1);assert.equal(fullReads,4);
  assert.equal((await fetch(`${base}/other/snapshot`)).status,404);
});
