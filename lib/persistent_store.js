import { createHash, createHmac } from 'node:crypto';

function clean(v,max=1000){ return String(v??'').replace(/\s+/g,' ').trim().slice(0,max); }
function num(v,fallback=0){ const n=Number(v); return Number.isFinite(n)?n:fallback; }
function arr(v){ return Array.isArray(v)?v:[]; }

function redisConfig(){
  const url=clean(process.env.UPSTASH_REDIS_REST_URL||process.env.KV_REST_API_URL||process.env.REDIS_REST_API_URL||'',1000).replace(/\/$/,'');
  const token=clean(process.env.UPSTASH_REDIS_REST_TOKEN||process.env.KV_REST_API_TOKEN||process.env.REDIS_REST_API_TOKEN||'',3000);
  return {url,token,configured:Boolean(url&&token)};
}
function ttlSeconds(){ return Math.max(86400,Math.min(15552000,num(process.env.PERSISTENT_MEMORY_TTL_SECONDS,2592000))); }
function keyPrefix(){ return clean(process.env.PERSISTENT_MEMORY_PREFIX||'mig:v12',80).replace(/[^a-zA-Z0-9:_-]/g,'_'); }
function salt(){ return clean(process.env.PERSISTENT_MEMORY_SALT||'',500); }
function sessionHash(sessionId=''){
  const input=clean(sessionId,220);
  if(salt()) return createHmac('sha256',salt()).update(input).digest('hex').slice(0,40);
  return createHash('sha256').update(`mig-farm-v12:${input}`).digest('hex').slice(0,40);
}
function sessionKey(sessionId=''){ return `${keyPrefix()}:session:${sessionHash(sessionId)}`; }
function gapsKey(){ return `${keyPrefix()}:knowledge_gaps`; }

async function redisCommand(command=[],timeoutMs=2500){
  const cfg=redisConfig();
  if(!cfg.configured) return {ok:false,reason:'not_configured',result:null};
  const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),Math.max(500,timeoutMs));
  try{
    const response=await fetch(cfg.url,{
      method:'POST',signal:controller.signal,
      headers:{'Authorization':`Bearer ${cfg.token}`,'Content-Type':'application/json'},
      body:JSON.stringify(command)
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok || data?.error) return {ok:false,reason:clean(data?.error||`http_${response.status}`,300),result:null};
    return {ok:true,result:data?.result??null};
  }catch(error){ return {ok:false,reason:clean(error?.message||'redis_failed',300),result:null}; }
  finally{ clearTimeout(timer); }
}

function sanitizeProduct(p={}){
  return {
    name:clean(p.name,260),price:clean(p.price,80),currency:clean(p.currency||'AED',20),availability:clean(p.availability,100),
    url:clean(p.url,800),sku:clean(p.sku,120),observed_at:clean(p.observed_at,40),last_seen_at:clean(p.last_seen_at,40),source:clean(p.source,80)
  };
}
function sanitizeMemory(x={}){
  return {id:clean(x.id,100),kind:clean(x.kind||'memory',50),text:clean(x.text,650),salience:Math.max(0,Math.min(1,num(x.salience,.5))),first_seen_at:clean(x.first_seen_at,40),last_seen_at:clean(x.last_seen_at,40),source:clean(x.source,80),count:Math.max(1,Math.min(999,num(x.count,1)))};
}
function sanitizeGraph(g={}){
  const nodes=arr(g.nodes).slice(0,48).map(n=>({id:clean(n.id,120),type:clean(n.type,50),label:clean(n.label,300),weight:Math.max(0,Math.min(1,num(n.weight,.5))),first_seen_at:clean(n.first_seen_at,40),last_seen_at:clean(n.last_seen_at,40),meta:n?.meta&&typeof n.meta==='object'&&!Array.isArray(n.meta)?n.meta:{}})).filter(x=>x.id&&x.label);
  const ids=new Set(nodes.map(x=>x.id));
  const edges=arr(g.edges).slice(0,80).map(e=>({from:clean(e.from,120),to:clean(e.to,120),relation:clean(e.relation,80),weight:Math.max(0,Math.min(1,num(e.weight,.5))),first_seen_at:clean(e.first_seen_at,40),last_seen_at:clean(e.last_seen_at,40),count:Math.max(1,Math.min(999,num(e.count,1)))})).filter(x=>ids.has(x.from)&&ids.has(x.to)&&x.relation);
  return {nodes,edges};
}
export function sanitizePersistentSnapshot(value={}){
  const v=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
  const p=v.profile&&typeof v.profile==='object'&&!Array.isArray(v.profile)?v.profile:{};
  const journey=v.journey&&typeof v.journey==='object'&&!Array.isArray(v.journey)?v.journey:{};
  return {
    v:12,
    updated_at:clean(v.updated_at,40),
    profile:{
      category:clean(p.category,60),crop:clean(p.crop,60),emirate:clean(p.emirate,60),cultivation:clean(p.cultivation,60),quantity:clean(p.quantity,80),
      budget:p.budget!==null&&p.budget!==''&&Number.isFinite(Number(p.budget))?Number(p.budget):null,
      price_preference:['lower','higher','neutral'].includes(p.price_preference)?p.price_preference:'neutral',
      require_available:Boolean(p.require_available)
    },
    goals:arr(v.goals).slice(-10).map(x=>({text:clean(x?.text,240),first_seen_at:clean(x?.first_seen_at,40),last_seen_at:clean(x?.last_seen_at,40),count:Math.max(1,Math.min(999,num(x?.count,1)))})).filter(x=>x.text),
    decisions:arr(v.decisions).slice(-12).map(x=>({summary:clean(x?.summary,450),basis:arr(x?.basis).slice(0,8).map(y=>clean(y,120)),products:arr(x?.products).slice(0,4).map(sanitizeProduct),at:clean(x?.at,40),turn:Math.max(0,num(x?.turn,0))})).filter(x=>x.summary),
    memories:arr(v.memories).slice(-36).map(sanitizeMemory).filter(x=>x.text),
    temporal_products:arr(v.temporal_products).slice(-48).map(sanitizeProduct).filter(x=>x.name),
    graph:sanitizeGraph(v.graph||{}),
    knowledge_gaps:arr(v.knowledge_gaps).slice(-16).map(x=>({text:clean(x?.text||x,220),count:Math.max(1,Math.min(999,num(x?.count,1))),first_seen_at:clean(x?.first_seen_at,40),last_seen_at:clean(x?.last_seen_at,40)})).filter(x=>x.text),
    journey:{stage:clean(journey.stage||'discover',30),score:Math.max(0,Math.min(100,num(journey.score,0))),signals:arr(journey.signals).slice(0,10).map(x=>clean(x,100)),last_changed_at:clean(journey.last_changed_at,40)},
    stats:{reads:Math.max(0,num(v?.stats?.reads,0)),writes:Math.max(0,num(v?.stats?.writes,0))}
  };
}

export async function readPersistentSnapshot(sessionId=''){
  if(!sessionId || !redisConfig().configured) return {snapshot:sanitizePersistentSnapshot({}),persisted:false,reason:'not_configured'};
  const res=await redisCommand(['GET',sessionKey(sessionId)]);
  if(!res.ok) return {snapshot:sanitizePersistentSnapshot({}),persisted:false,reason:res.reason};
  if(!res.result) return {snapshot:sanitizePersistentSnapshot({}),persisted:false,reason:'not_found'};
  try{
    const snapshot=sanitizePersistentSnapshot(JSON.parse(String(res.result)));
    snapshot.stats.reads+=1;
    return {snapshot,persisted:true,reason:'ok'};
  }catch{ return {snapshot:sanitizePersistentSnapshot({}),persisted:false,reason:'invalid_snapshot'}; }
}

export async function writePersistentSnapshot(sessionId='',snapshot={}){
  if(!sessionId || !redisConfig().configured) return {persisted:false,reason:'not_configured'};
  const safe=sanitizePersistentSnapshot(snapshot); safe.stats.writes+=1; safe.updated_at=new Date().toISOString();
  const res=await redisCommand(['SET',sessionKey(sessionId),JSON.stringify(safe),'EX',String(ttlSeconds())],3200);
  return {persisted:res.ok,reason:res.ok?'ok':res.reason};
}

export async function recordKnowledgeGaps(gaps=[]){
  if(!redisConfig().configured) return {recorded:0,reason:'not_configured'};
  let recorded=0;
  for(const raw of arr(gaps).slice(0,5)){
    const gap=clean(raw?.text||raw,220); if(!gap) continue;
    const member=gap.toLowerCase();
    const res=await redisCommand(['ZINCRBY',gapsKey(),'1',member],1800);
    if(res.ok) recorded+=1;
  }
  if(recorded) await redisCommand(['EXPIRE',gapsKey(),String(Math.max(ttlSeconds(),7776000))],1200);
  return {recorded,reason:recorded?'ok':'none'};
}

export async function readTopKnowledgeGaps(limit=20){
  const cap=Math.max(1,Math.min(100,Number(limit)||20));
  if(!redisConfig().configured) return {items:[],reason:'not_configured'};
  const res=await redisCommand(['ZREVRANGE',gapsKey(),'0',String(cap-1),'WITHSCORES'],2200);
  if(!res.ok) return {items:[],reason:res.reason};
  const raw=arr(res.result),items=[];
  for(let i=0;i<raw.length;i+=2) items.push({gap:clean(raw[i],220),count:Number(raw[i+1])||0});
  return {items,reason:'ok'};
}

export function persistentStoreHealth(){
  const cfg=redisConfig();
  return {
    version:'12.0',provider:cfg.configured?'redis_rest':'disabled_fallback',configured:cfg.configured,
    key_privacy:'sha256_or_hmac_session_key',salt_configured:Boolean(salt()),ttl_days:Math.round(ttlSeconds()/86400),
    bounded:true,raw_session_id_stored:false,raw_full_chat_stored:false
  };
}
