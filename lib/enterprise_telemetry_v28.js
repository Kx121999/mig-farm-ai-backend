import { createHash } from "node:crypto";

const VERSION="28.0",MAX_MEMORY=250;
const memory=globalThis.__migV28Telemetry||[];
globalThis.__migV28Telemetry=memory;

function clean(value="",max=1200){return String(value??"").replace(/[\u0000-\u001f]/g," ").replace(/\s+/g," ").trim().slice(0,max);}
function hash(value=""){return createHash("sha256").update(String(value||"")).digest("hex").slice(0,20);}
function boolEnv(name,def=false){const value=process.env[name];return value===undefined?def:/^(1|true|yes|on)$/i.test(String(value));}
function redisConfig(){return {url:clean(process.env.UPSTASH_REDIS_REST_URL||process.env.KV_REST_API_URL||"",1200).replace(/\/+$/,"") ,token:clean(process.env.UPSTASH_REDIS_REST_TOKEN||process.env.KV_REST_API_TOKEN||"",5000)};}
function redisKey(){return clean(process.env.MIG_V28_TELEMETRY_KEY||"mig:v28:telemetry",120).replace(/[^a-zA-Z0-9:_-]/g,"_");}
function ttl(){return Math.max(86400,Math.min(31536000,Number(process.env.MIG_V28_TELEMETRY_TTL_SECONDS)||7776000));}
function redact(value=""){
  return clean(value,500).replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g,"[email]").replace(/(?:\+?971|0)?[\s-]?(?:5\d)[\s-]?\d{3}[\s-]?\d{4}/g,"[phone]").replace(/\b\d{10,16}\b/g,"[number]");
}
async function redisCommand(command=[],timeout=1600){
  const cfg=redisConfig();if(!cfg.url||!cfg.token)return {ok:false,reason:"not_configured",result:null};
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
  try{const response=await fetch(cfg.url,{method:"POST",signal:controller.signal,headers:{Authorization:`Bearer ${cfg.token}`,"Content-Type":"application/json"},body:JSON.stringify(command)});const data=await response.json().catch(()=>({}));return response.ok&&!data?.error?{ok:true,result:data?.result??null}:{ok:false,reason:`redis_${response.status}`,result:null};}
  catch(error){return {ok:false,reason:error?.name==="AbortError"?"timeout":clean(error?.message||"redis_error",100),result:null};}
  finally{clearTimeout(timer);}
}
function normalizeEvent(event={}){
  return {version:VERSION,id:clean(event.id||crypto.randomUUID(),80),at:clean(event.at||new Date().toISOString(),40),session_hash:clean(event.session_hash,40),query_hash:clean(event.query_hash,40),preview:clean(event.preview,220),intent:clean(event.intent||"unknown",80),source:clean(event.source||"unknown",120),dialect:clean(event.dialect||"unknown",40),quality_score:Math.max(0,Math.min(100,Number(event.quality_score)||0)),resolved:Boolean(event.resolved),multi_intent:Boolean(event.multi_intent),lead_temperature:clean(event.lead_temperature||"cold",20),latency_ms:Math.max(0,Math.min(120000,Number(event.latency_ms)||0)),flags:Array.isArray(event.flags)?event.flags.map(x=>clean(x,80)).filter(Boolean).slice(0,8):[]};
}

export function buildEnterpriseTurnEventV28({sessionId="",message="",analysis={},frame=null,source="",audit={},selfLearning={},leadTemperature="cold",startedAt=Date.now()}={}){
  const allowPreview=boolEnv("MIG_ADMIN_REDACTED_TRANSCRIPTS",false);
  const flags=[...(audit?.flags||[]),...(selfLearning?.flags||[])];
  return normalizeEvent({session_hash:hash(sessionId),query_hash:hash(clean(message,3000).toLowerCase()),preview:allowPreview?redact(message):"",intent:analysis?.intent||frame?.tasks?.[0]?.intent||"unknown",source,dialect:frame?.dialect||"unknown",quality_score:Number(audit?.quality_score??audit?.score??selfLearning?.score??0),resolved:!(source&&/(fallback|unknown|no_live|clarify|repair|off_domain)/.test(source))&&!flags.some(x=>/missing|empty|fail/.test(x)),multi_intent:Boolean(frame?.is_multi_intent||frame?.task_count>1),lead_temperature:leadTemperature,latency_ms:Date.now()-Number(startedAt||Date.now()),flags});
}

export async function recordEnterpriseTurnV28(event={}){
  const safe=normalizeEvent(event);memory.unshift(safe);if(memory.length>MAX_MEMORY)memory.length=MAX_MEMORY;
  const pushed=await redisCommand(["LPUSH",redisKey(),JSON.stringify(safe)]);
  if(pushed.ok)await Promise.all([redisCommand(["LTRIM",redisKey(),"0","499"]),redisCommand(["EXPIRE",redisKey(),String(ttl())])]);
  return {recorded:true,mode:pushed.ok?"redis":"memory",reason:pushed.ok?"ok":pushed.reason};
}
function top(events,key,limit=8){const map=new Map();for(const event of events){const value=clean(event?.[key]||"unknown",100);map.set(value,(map.get(value)||0)+1);}return [...map.entries()].sort((a,b)=>b[1]-a[1]).slice(0,limit).map(([label,count])=>({label,count}));}

export async function enterpriseTelemetrySnapshotV28({limit=30}={}){
  let events=memory.slice(0,500),mode="memory";
  const remote=await redisCommand(["LRANGE",redisKey(),"0","499"],2200);
  if(remote.ok&&Array.isArray(remote.result)){events=remote.result.map(x=>{try{return normalizeEvent(JSON.parse(String(x)));}catch{return null;}}).filter(Boolean);mode="redis";}
  const total=events.length,resolved=events.filter(x=>x.resolved).length,quality=total?events.reduce((sum,x)=>sum+x.quality_score,0)/total:0,latency=total?events.reduce((sum,x)=>sum+x.latency_ms,0)/total:0;
  const fallback=events.filter(x=>/(fallback|unknown|no_live|clarify|repair|off_domain)/.test(x.source)).length;
  const alerts=[];if(total&&quality<75)alerts.push({level:"danger",code:"quality_below_target",message:"متوسط الجودة أقل من 75%."});if(total&&fallback/total>.2)alerts.push({level:"warning",code:"fallback_rate_high",message:"نسبة الردود الاحتياطية أعلى من 20%."});if(mode==="memory")alerts.push({level:"info",code:"volatile_telemetry",message:"اربط Upstash Redis لحفظ بيانات اللوحة بين عمليات النشر."});
  return {version:VERSION,mode,generated_at:new Date().toISOString(),totals:{turns:total,resolved,unresolved:total-resolved,resolution_rate:total?Number((resolved/total*100).toFixed(1)):0,average_quality:Number(quality.toFixed(1)),average_latency_ms:Math.round(latency),fallback_rate:total?Number((fallback/total*100).toFixed(1)):0,multi_intent:events.filter(x=>x.multi_intent).length,hot_leads:events.filter(x=>x.lead_temperature==="hot").length},top:{intents:top(events,"intent"),sources:top(events,"source"),dialects:top(events,"dialect")},alerts,recent:events.slice(0,Math.max(1,Math.min(100,Number(limit)||30))),privacy:{raw_transcripts_stored:false,redacted_preview_enabled:boolEnv("MIG_ADMIN_REDACTED_TRANSCRIPTS",false),phone_email_redaction:true,session_ids_hashed:true}};
}

export function enterpriseTelemetryHealthV28(){const cfg=redisConfig();return {version:VERSION,provider:cfg.url&&cfg.token?"upstash_redis":"memory_fallback",persistent:Boolean(cfg.url&&cfg.token),retention_days:Math.round(ttl()/86400),raw_transcripts:false,redacted_preview_enabled:boolEnv("MIG_ADMIN_REDACTED_TRANSCRIPTS",false)};}
