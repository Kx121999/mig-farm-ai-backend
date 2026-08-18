import assert from 'node:assert/strict';
import http from 'node:http';

const kv=new Map(); const z=new Map();
const server=http.createServer(async (req,res)=>{
  let body=''; for await (const chunk of req) body+=chunk;
  let cmd=[]; try{cmd=JSON.parse(body);}catch{}
  const op=String(cmd[0]||'').toUpperCase(); let result=null;
  if(op==='SET'){ kv.set(String(cmd[1]),String(cmd[2])); result='OK'; }
  else if(op==='GET'){ result=kv.get(String(cmd[1]))??null; }
  else if(op==='ZINCRBY'){ const key=String(cmd[1]),inc=Number(cmd[2])||0,member=String(cmd[3]); if(!z.has(key))z.set(key,new Map()); const m=z.get(key); const score=(m.get(member)||0)+inc;m.set(member,score);result=String(score); }
  else if(op==='ZREVRANGE'){ const key=String(cmd[1]),rows=[...(z.get(key)||new Map()).entries()].sort((a,b)=>b[1]-a[1]); result=[]; for(const [m,s] of rows){result.push(m,String(s));} }
  else if(op==='EXPIRE'){ result=1; }
  res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({result}));
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const {port}=server.address();
process.env.UPSTASH_REDIS_REST_URL=`http://127.0.0.1:${port}`;
process.env.UPSTASH_REDIS_REST_TOKEN='test-token';
process.env.PERSISTENT_MEMORY_SALT='unit-test-salt';

const { writePersistentSnapshot, readPersistentSnapshot, recordKnowledgeGaps, readTopKnowledgeGaps, persistentStoreHealth }=await import('../lib/persistent_store.js');
const session='raw-session-must-not-be-key';
const snapshot={v:12,profile:{crop:'tomato',budget:90},memories:[{id:'m',kind:'goal',text:'بذور طماطم',salience:.8,count:1}],knowledge_gaps:[{text:'مقاومة الحرارة غير مؤكدة',count:1}]};
let out=await writePersistentSnapshot(session,snapshot); assert.equal(out.persisted,true);
assert.ok([...kv.keys()].every(k=>!k.includes(session)),'raw session id must never be used in storage key');
out=await readPersistentSnapshot(session); assert.equal(out.persisted,true); assert.equal(out.snapshot.profile.crop,'tomato'); assert.equal(out.snapshot.profile.budget,90);
await recordKnowledgeGaps(['مقاومة الحرارة غير مؤكدة','مقاومة الحرارة غير مؤكدة','مدة الإنبات غير موثقة']);
const gaps=await readTopKnowledgeGaps(10); assert.equal(gaps.items[0].count,2); assert.ok(gaps.items.some(x=>x.gap.includes('الإنبات')));
const health=persistentStoreHealth(); assert.equal(health.configured,true); assert.equal(health.salt_configured,true); assert.equal(health.raw_session_id_stored,false);
await new Promise(resolve=>server.close(resolve));
console.log('MIG FARM V12 persistent store mock tests passed');
