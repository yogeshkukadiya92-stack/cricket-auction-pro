import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldRecoverChunk } from '../shared/chunkRecovery.js';
import express from 'express';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { mountStaticFrontend } from '../server/staticFrontend.js';

test('stale module recovery reloads once, avoids loops and ignores ordinary app errors', () => {
  const values = new Map();
  const storage = { getItem:key => values.get(key), setItem:(key,value) => values.set(key,value) };
  const error = new TypeError('Failed to fetch dynamically imported module: /assets/PlayerManagerView-old.js');
  assert.equal(shouldRecoverChunk(new Error('Player not found'),storage,100000),false);
  assert.equal(shouldRecoverChunk(error,storage,100000),true);
  assert.equal(shouldRecoverChunk(error,storage,100001),false);
  assert.equal(shouldRecoverChunk(error,storage,160001),true);
  assert.equal(shouldRecoverChunk(error,{getItem(){throw new Error('Blocked storage');}},200000),false);
  assert.equal(shouldRecoverChunk(new TypeError('Importing a module script failed.'),storage,300000),true);
});

test('missing assets return uncached 404 rather than the SPA HTML; valid assets and routes still work', async t => {
  const dist = await mkdtemp(path.join(os.tmpdir(),'auction-static-'));
  await mkdir(path.join(dist,'assets'));
  await writeFile(path.join(dist,'assets','current.js'),'export const ready=true;');
  await writeFile(path.join(dist,'index.html'),'<!doctype html><div id="root"></div>');
  const app=express();mountStaticFrontend(app,dist);
  const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
  t.after(async()=>{await new Promise(resolve=>server.close(resolve));await rm(dist,{recursive:true,force:true});});
  const base=`http://127.0.0.1:${server.address().port}`;
  const missing=await fetch(`${base}/assets/PlayerManagerView-old.js`);
  assert.equal(missing.status,404);assert.equal(missing.headers.get('cache-control'),'no-store');assert.ok(!missing.headers.get('content-type').includes('text/html'));
  const current=await fetch(`${base}/assets/current.js`);assert.equal(current.status,200);assert.match(current.headers.get('cache-control'),/immutable/);
  const route=await fetch(`${base}/some-spa-route`);assert.equal(route.status,200);assert.match(await route.text(),/id="root"/);
});
