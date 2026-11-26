import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const {registerPublicSummaryRoutes}=await import(pathToFileURL(process.cwd()+'/server/publicSummaryRoutes.js'));
let handler;
const rows=Array.from({length:500},(_,i)=>({data:{id:String(i),name:'Player '+i}}));
registerPublicSummaryRoutes({get(_,fn){handler=fn}}, {pool:{async query(sql){if(sql.includes('FROM tournaments'))return {rowCount:1,rows:[{data:{id:'fixture'}}]};return {rows:sql.includes('FROM players')?rows:[]}}}});
let etag,status;
const res={set(k,v){if(k==='ETag')etag=v;return this},type(){return this},send(){},status(n){status=n;return this},end(){}};
const req={params:{id:'fixture'},query:{},headers:{}};
await handler(req,res);req.headers['if-none-match']=etag;
const start=performance.now();
for(let i=0;i<250;i++){status=200;await handler(req,res);assert.equal(status,304)}
console.log((performance.now()-start).toFixed(1)+' ms');
