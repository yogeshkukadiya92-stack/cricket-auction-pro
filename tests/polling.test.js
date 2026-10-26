import test from 'node:test';
import assert from 'node:assert/strict';
import { createJsonPoller, requestJson } from '../shared/requestJson.js';

test('poll validators are scoped, unchanged responses skip parsing, and failures cannot poison a retry', async t => {
  const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original;});
  const poll=createJsonPoller();let calls=0;
  globalThis.fetch=async(_url,options)=>{
    calls++;
    if(calls===1){assert.equal(options.headers['If-None-Match'],undefined);return new Response('broken',{headers:{etag:'"bad"'}});}
    if(calls===2){assert.equal(options.headers['If-None-Match'],undefined);return new Response('{"bid":100}',{headers:{etag:'"live"'}});}
    assert.equal(options.headers['If-None-Match'],'"live"');return new Response(null,{status:304});
  };
  await assert.rejects(poll('/one'));
  assert.deepEqual(await poll('/one'),{bid:100});
  assert.equal(await poll('/one'),null);
  globalThis.fetch=async(_url,options)=>{assert.equal(options.headers['If-None-Match'],undefined);return new Response('{}');};
  assert.deepEqual(await createJsonPoller()('/other-account'),{});
});

test('navigating away cancels header and body reads', async t=>{
  const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original;});
  globalThis.fetch=(_url,{signal})=>new Promise((_resolve,reject)=>{signal.addEventListener('abort',()=>reject(new Error('cancelled')),{once:true});});
  const controller=new AbortController();const pending=requestJson('/delayed',{signal:controller.signal},1000);controller.abort();
  await assert.rejects(pending,/cancelled/);
});
