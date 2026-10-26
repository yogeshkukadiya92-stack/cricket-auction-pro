import test from 'node:test';
import assert from 'node:assert/strict';
import { changedRecords, mergePending } from '../shared/recordChanges.js';
import { readExportImage } from '../shared/exportImage.js';

test('one player edit saves only that player and retries preserve every outstanding record', () => {
  const records = Array.from({length:1000},(_,id)=>({id:String(id),tournamentId:'a',name:`Player ${id}`}));
  const next = records.map(p=>p.id==='41'?{...p,name:'Updated'}:p);
  const changes = changedRecords(JSON.stringify(records),next);
  assert.equal(changes.length,1);
  const merged = mergePending({players:[records[0],records[41]],rules:{timerSeconds:20}}, {players:[changes[0],{...records[0],tournamentId:'b'}]});
  assert.equal(merged.players.length,3);
  assert.equal(merged.players.find(p=>p.id==='41').name,'Updated');
  assert.equal(merged.rules.timerSeconds,20);
});

test('image exports fetch deferred uploads with same-origin credentials and retain original bytes', async t => {
  const before = globalThis.fetch;
  t.after(()=>{globalThis.fetch=before;});
  globalThis.fetch=async(url,options)=>{
    assert.match(url,/^\/api\/tournaments\//);
    assert.equal(options.credentials,'same-origin');
    return new Response(Uint8Array.from([0,1,2,255]),{headers:{'content-type':'image/png'}});
  };
  assert.equal(await readExportImage('/api/tournaments/t1/players/p1/media/photoUrl'),'data:image/png;base64,AAEC/w==');
  assert.equal(await readExportImage('https://other.example/photo.png'),null);
  assert.equal(await readExportImage('data:image/png;base64,AAAA'),'data:image/png;base64,AAAA');
  globalThis.fetch=async()=>new Response('Denied',{status:403});
  await assert.rejects(readExportImage('/api/tournaments/t1/players/p1/media/photoUrl'),/Could not download/);
});

test('a newer collection edit supersedes an older singleton across debounce and retry', () => {
  const older = { player: {id:'p1',tournamentId:'t1',name:'Old'} };
  const newer = { players: [{id:'p1',tournamentId:'t1',name:'New'},{id:'p2',tournamentId:'t1',name:'Two'}] };
  const merged = mergePending(older, newer);
  assert.equal(merged.player,undefined);
  assert.equal(merged.players.length,2);
  assert.equal(merged.players[0].name,'New');
  assert.equal(mergePending(merged,{player:{...merged.players[0],name:'Newest'}}).players[0].name,'Newest');
});

test('deferred custom uploads preserve answers, and replacement/clear remain explicit', async () => {
  const {projectMedia,restoreMedia,customMediaPath}=await import('../server/recordMedia.js');
  const previous={id:'p1',tournamentId:'t1',customData:{'proof / image':'data:image/png;base64,AAAA',available:false}};
  const projected=projectMedia('players',{data:previous});
  assert.equal(projected.customData['proof / image'],customMediaPath(previous,'proof / image'));
  assert.equal(projected.customData.available,false);
  assert.deepEqual(restoreMedia('players',projected,previous),previous);
  assert.equal(restoreMedia('players',{...projected,customData:{'proof / image':''}},previous).customData['proof / image'],'');
});
