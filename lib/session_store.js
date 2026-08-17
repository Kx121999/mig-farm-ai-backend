const SESSION_TTL_SECONDS=Math.max(3600,Number(process.env.MIG_SESSION_TTL_SECONDS||604800));
const PREFIX=String(process.env.MIG_SESSION_PREFIX||"mig:assistant:session:v1:");

const memory=globalThis.__migAssistantSessions || new Map();
globalThis.__migAssistantSessions=memory;

function redisConfig(){
  const url=String(process.env.UPSTASH_REDIS_REST_URL||process.env.KV_REST_API_URL||"").replace(/\/+$/,"");
  const token=String(process.env.UPSTASH_REDIS_REST_TOKEN||process.env.KV_REST_API_TOKEN||"");
  return {url,token,enabled:Boolean(url&&token)};
}

async function redisCommand(parts=[]){
  const cfg=redisConfig();
  if(!cfg.enabled) return {ok:false,result:null,reason:"not_configured"};
  try{
    const response=await fetch(cfg.url,{
      method:"POST",
      headers:{"Authorization":`Bearer ${cfg.token}`,"Content-Type":"application/json"},
      body:JSON.stringify(parts)
    });
    if(!response.ok) return {ok:false,result:null,reason:`redis_${response.status}`};
    const data=await response.json();
    return {ok:true,result:data?.result??null,reason:""};
  }catch(error){
    return {ok:false,result:null,reason:String(error?.message||"redis_error").slice(0,120)};
  }
}

function cleanString(v,max=300){ return String(v||"").slice(0,max); }
function cleanObject(value,depth=0){
  if(depth>5) return null;
  if(value===null||value===undefined) return null;
  if(typeof value==="string") return cleanString(value,800);
  if(typeof value==="number"||typeof value==="boolean") return value;
  if(Array.isArray(value)) return value.slice(0,12).map(v=>cleanObject(v,depth+1)).filter(v=>v!==null);
  if(typeof value==="object"){
    const out={};
    for(const [key,val] of Object.entries(value).slice(0,60)){
      if(/message|history|phone|email|address|raw/i.test(key)) continue;
      const cleaned=cleanObject(val,depth+1);
      if(cleaned!==null) out[cleanString(key,80)]=cleaned;
    }
    return out;
  }
  return null;
}

function sanitizeSession(value={}){
  const state=cleanObject(value?.conversation_state||{})||{};
  const profile=cleanObject(value?.customer_profile||{})||{};
  return {
    v:1,
    conversation_state:state,
    customer_profile:profile,
    sales_stage:cleanString(value?.sales_stage,40),
    lead_temperature:cleanString(value?.lead_temperature,20),
    updated_at:new Date().toISOString()
  };
}

function memoryRead(key){
  const entry=memory.get(key);
  if(!entry) return null;
  if(Date.now()>entry.expiresAt){ memory.delete(key); return null; }
  return entry.value;
}
function memoryWrite(key,value){
  memory.set(key,{value,expiresAt:Date.now()+SESSION_TTL_SECONDS*1000});
  if(memory.size>5000){
    const now=Date.now();
    for(const [k,v] of memory){ if(now>v.expiresAt) memory.delete(k); }
    while(memory.size>5000){ memory.delete(memory.keys().next().value); }
  }
}

export function sessionPersistenceMode(){ return redisConfig().enabled?"redis":"memory"; }
export function sessionTtlSeconds(){ return SESSION_TTL_SECONDS; }

export async function readServerSession(sessionId=""){
  const id=cleanString(sessionId,160);
  if(!id) return null;
  const key=PREFIX+id;
  const cfg=redisConfig();
  if(cfg.enabled){
    const result=await redisCommand(["GET",key]);
    if(result.ok&&typeof result.result==="string"){
      try{return sanitizeSession(JSON.parse(result.result));}catch{}
    }
  }
  return memoryRead(key);
}

export async function writeServerSession(sessionId="",value={}){
  const id=cleanString(sessionId,160);
  if(!id) return {ok:false,mode:sessionPersistenceMode()};
  const key=PREFIX+id;
  const safe=sanitizeSession(value);
  memoryWrite(key,safe);
  const cfg=redisConfig();
  if(cfg.enabled){
    const result=await redisCommand(["SET",key,JSON.stringify(safe),"EX",String(SESSION_TTL_SECONDS)]);
    return {ok:result.ok,mode:"redis",reason:result.reason||""};
  }
  return {ok:true,mode:"memory",reason:"redis_not_configured"};
}

export async function deleteServerSession(sessionId=""){
  const id=cleanString(sessionId,160);
  if(!id) return false;
  const key=PREFIX+id;
  memory.delete(key);
  const cfg=redisConfig();
  if(cfg.enabled) await redisCommand(["DEL",key]);
  return true;
}

export function mergeSessionState(serverSession={},clientState={}){
  const a=serverSession?.conversation_state&&typeof serverSession.conversation_state==="object"?serverSession.conversation_state:{};
  const b=clientState&&typeof clientState==="object"&&!Array.isArray(clientState)?clientState:{};
  return {...a,...b};
}

export function mergeSessionProfile(serverSession={},clientProfile={}){
  const a=serverSession?.customer_profile&&typeof serverSession.customer_profile==="object"?serverSession.customer_profile:{};
  const b=clientProfile&&typeof clientProfile==="object"&&!Array.isArray(clientProfile)?clientProfile:{};
  return {...a,...b};
}
