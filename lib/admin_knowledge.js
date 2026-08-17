import { normalizeAr, tokenize, fuzzyWordMatch } from "./utils.js";

const DOC_KEY=String(process.env.MIG_KNOWLEDGE_KEY||"mig:knowledge:v1:active");
const HISTORY_KEY=String(process.env.MIG_KNOWLEDGE_HISTORY_KEY||"mig:knowledge:v1:history");
const MAX_HISTORY=Math.max(3,Math.min(50,Number(process.env.MIG_KNOWLEDGE_HISTORY_MAX||20)));
const CACHE_MS=Math.max(0,Math.min(60000,Number(process.env.MIG_KNOWLEDGE_CACHE_MS||12000)));

const runtime=globalThis.__migAdminKnowledge || {
  loadedAt:0,
  doc:null,
  history:[]
};
globalThis.__migAdminKnowledge=runtime;

const DEFAULT_DOC={
  schema_version:1,
  revision:0,
  updated_at:null,
  updated_by:"system",
  entries:[],
  settings:{
    enabled:true,
    min_match_score:10,
    max_answer_entries:2
  }
};

const HIGH_RISK_RE=/(جرع|جرعة|dose|dosage|mix rate|نسبة الخلط|كم مل|كم ملي|سموم|toxicity)/i;
const DYNAMIC_RE=/(سعر|price|stock|مخزون|متوفر|availability|دفع|payment|ضريب|vat|شحن|shipping|توصيل|delivery|استلام|pickup|دوام|ساعات العمل|working hours)/i;

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
      headers:{
        "Authorization":`Bearer ${cfg.token}`,
        "Content-Type":"application/json"
      },
      body:JSON.stringify(parts)
    });
    if(!response.ok) return {ok:false,result:null,reason:`redis_${response.status}`};
    const data=await response.json();
    return {ok:true,result:data?.result??null,reason:""};
  }catch(error){
    return {ok:false,result:null,reason:String(error?.message||"redis_error").slice(0,120)};
  }
}

function str(v="",max=1500){ return String(v??"").trim().slice(0,max); }
function bool(v){ return Boolean(v); }
function num(v,fallback=0){ const n=Number(v); return Number.isFinite(n)?n:fallback; }
function cleanKeywords(value){
  const list=Array.isArray(value)?value:String(value||"").split(",");
  return [...new Set(list.map(x=>str(x,120)).filter(Boolean))].slice(0,30);
}
function slug(value=""){
  return normalizeAr(value).replace(/\s+/g,"-").replace(/[^a-z0-9\u0600-\u06ff-]/g,"").slice(0,80);
}
function idFor(entry,index=0){
  const supplied=str(entry?.id,100);
  if(supplied) return supplied;
  return `${slug(entry?.title||entry?.question||entry?.category||"entry")||"entry"}-${index+1}`;
}

function sanitizeEntry(entry={},index=0){
  const type=["faq","fact","policy","service","notice"].includes(entry.type)?entry.type:"fact";
  return {
    id:idFor(entry,index),
    type,
    category:str(entry.category||"general",80)||"general",
    title:str(entry.title||entry.question||"",300),
    question:str(entry.question||"",500),
    content:str(entry.content||entry.answer||"",3500),
    answer:str(entry.answer||entry.content||"",3500),
    keywords:cleanKeywords(entry.keywords),
    locale:entry.locale==="en"?"en":"ar",
    enabled:entry.enabled!==false,
    priority:Math.max(-20,Math.min(100,num(entry.priority,10))),
    verified:bool(entry.verified),
    safety_approved:bool(entry.safety_approved),
    source_label:str(entry.source_label||"",240),
    source_url:str(entry.source_url||"",1000),
    notes:str(entry.notes||"",1000)
  };
}

export function sanitizeKnowledgeDocument(input={}){
  const entries=Array.isArray(input?.entries)?input.entries.slice(0,500).map(sanitizeEntry):[];
  const settings=input?.settings&&typeof input.settings==="object"?input.settings:{};
  return {
    schema_version:1,
    revision:Math.max(0,Math.floor(num(input?.revision,0))),
    updated_at:str(input?.updated_at||"",50)||null,
    updated_by:str(input?.updated_by||"admin",120),
    entries,
    settings:{
      enabled:settings.enabled!==false,
      min_match_score:Math.max(4,Math.min(60,num(settings.min_match_score,10))),
      max_answer_entries:Math.max(1,Math.min(4,num(settings.max_answer_entries,2)))
    }
  };
}

export function validateKnowledgeDocument(input={}){
  const doc=sanitizeKnowledgeDocument(input);
  const errors=[];
  const warnings=[];
  const ids=new Set();

  doc.entries.forEach((entry,index)=>{
    const at=`entries[${index}]`;
    if(!entry.id) errors.push(`${at}: id مطلوب`);
    if(ids.has(entry.id)) errors.push(`${at}: id مكرر (${entry.id})`);
    ids.add(entry.id);
    if(!entry.title && !entry.question) errors.push(`${at}: العنوان أو السؤال مطلوب`);
    if(!entry.content && !entry.answer) errors.push(`${at}: المحتوى/الإجابة مطلوب`);
    if(!entry.keywords.length && !entry.question) warnings.push(`${at}: أضف keywords لتحسين المطابقة`);

    const all=[entry.title,entry.question,entry.content,entry.answer,...entry.keywords].join(" ");
    if(HIGH_RISK_RE.test(all) && !entry.safety_approved){
      errors.push(`${at}: معلومات الجرعات/السلامة تحتاج safety_approved=true`);
    }
    if(DYNAMIC_RE.test(all) && !entry.verified){
      warnings.push(`${at}: معلومة متغيرة؛ يفضّل verified=true ومصدر واضح`);
    }
    if(entry.verified && !entry.source_label && !entry.source_url){
      warnings.push(`${at}: verified بدون source_label أو source_url`);
    }
  });

  return {ok:errors.length===0,errors,warnings,doc};
}

function clone(value){ return JSON.parse(JSON.stringify(value)); }
function nowIso(){ return new Date().toISOString(); }

export function knowledgePersistenceMode(){ return redisConfig().enabled?"redis":"runtime"; }

async function loadRedisDoc(){
  const result=await redisCommand(["GET",DOC_KEY]);
  if(!result.ok || typeof result.result!=="string") return null;
  try{return sanitizeKnowledgeDocument(JSON.parse(result.result));}catch{return null;}
}

export async function getKnowledgeDocument({force=false}={}){
  if(!force && runtime.doc && Date.now()-runtime.loadedAt<CACHE_MS) return clone(runtime.doc);

  if(redisConfig().enabled){
    const remote=await loadRedisDoc();
    if(remote){
      runtime.doc=remote;
      runtime.loadedAt=Date.now();
      return clone(remote);
    }
  }

  if(!runtime.doc){
    runtime.doc=clone(DEFAULT_DOC);
    runtime.loadedAt=Date.now();
  }
  return clone(runtime.doc);
}

async function pushHistory(doc){
  const item=JSON.stringify(doc);
  if(redisConfig().enabled){
    await redisCommand(["LPUSH",HISTORY_KEY,item]);
    await redisCommand(["LTRIM",HISTORY_KEY,"0",String(MAX_HISTORY-1)]);
  }else{
    runtime.history.unshift(clone(doc));
    runtime.history=runtime.history.slice(0,MAX_HISTORY);
  }
}

export async function saveKnowledgeDocument(input={},meta={}){
  const validation=validateKnowledgeDocument(input);
  if(!validation.ok) return {...validation,saved:false,persistence:knowledgePersistenceMode()};

  const previous=await getKnowledgeDocument({force:true});
  if(previous?.revision || previous?.entries?.length) await pushHistory(previous);

  const next=validation.doc;
  next.revision=Math.max(previous?.revision||0,next.revision||0)+1;
  next.updated_at=nowIso();
  next.updated_by=str(meta.updated_by||next.updated_by||"admin",120);

  runtime.doc=clone(next);
  runtime.loadedAt=Date.now();

  if(redisConfig().enabled){
    const result=await redisCommand(["SET",DOC_KEY,JSON.stringify(next)]);
    if(!result.ok){
      return {...validation,doc:next,saved:false,persistence:"redis",error:result.reason||"redis_write_failed"};
    }
  }

  return {...validation,doc:clone(next),saved:true,persistence:knowledgePersistenceMode()};
}

export async function listKnowledgeVersions(limit=10){
  const max=Math.max(1,Math.min(MAX_HISTORY,Number(limit)||10));
  let docs=[];
  if(redisConfig().enabled){
    const result=await redisCommand(["LRANGE",HISTORY_KEY,"0",String(max-1)]);
    if(result.ok && Array.isArray(result.result)){
      docs=result.result.map(raw=>{try{return sanitizeKnowledgeDocument(JSON.parse(raw));}catch{return null;}}).filter(Boolean);
    }
  }else{
    docs=runtime.history.slice(0,max).map(clone);
  }
  return docs.map(doc=>({
    revision:doc.revision,
    updated_at:doc.updated_at,
    updated_by:doc.updated_by,
    entries_count:doc.entries?.length||0,
    doc
  }));
}

export async function rollbackKnowledgeDocument(revision,meta={}){
  const target=Number(revision);
  const versions=await listKnowledgeVersions(MAX_HISTORY);
  const found=versions.find(x=>Number(x.revision)===target);
  if(!found) return {ok:false,error:"revision_not_found"};
  return await saveKnowledgeDocument(found.doc,{updated_by:meta.updated_by||`rollback:${target}`});
}

export async function resetKnowledgeDocument(meta={}){
  const empty=clone(DEFAULT_DOC);
  empty.updated_by=meta.updated_by||"admin";
  return await saveKnowledgeDocument(empty,meta);
}

function phraseMatch(hay="",needle=""){
  const h=normalizeAr(hay), q=normalizeAr(needle);
  if(!h||!q) return 0;
  if(h===q) return 18;
  if(h.includes(q)||q.includes(h)) return q.includes(" ")?12:7;
  return 0;
}
function tokenSimilarity(a="",b=""){
  const aa=tokenize(a), bb=tokenize(b);
  if(!aa.length||!bb.length) return 0;
  let matched=0;
  for(const x of aa){
    if(bb.some(y=>x===y||x.includes(y)||y.includes(x)||fuzzyWordMatch(x,y))) matched++;
  }
  return (matched/Math.max(aa.length,bb.length))*14;
}

function scoreEntry(entry,message,locale){
  if(!entry.enabled) return -999;
  if(entry.locale && entry.locale!==locale) return -50;
  let score=entry.priority||0;
  score+=phraseMatch(message,entry.question)*1.4;
  score+=tokenSimilarity(message,entry.question)*1.5;
  for(const keyword of entry.keywords){
    score+=phraseMatch(message,keyword)*1.2;
    score+=tokenSimilarity(message,keyword)*0.7;
  }
  score+=tokenSimilarity(message,entry.title)*0.5;
  return score;
}

export async function answerAdminKnowledge(message="",context={}){
  const doc=await getKnowledgeDocument();
  if(!doc?.settings?.enabled || !message) return null;
  const locale=context.locale==="en"?"en":"ar";
  const ranked=(doc.entries||[])
    .map(entry=>({entry,score:scoreEntry(entry,message,locale)}))
    .filter(x=>x.score>=doc.settings.min_match_score)
    .sort((a,b)=>b.score-a.score || (b.entry.priority||0)-(a.entry.priority||0))
    .slice(0,doc.settings.max_answer_entries);

  if(!ranked.length) return null;

  const answers=ranked.map(x=>x.entry.answer||x.entry.content).filter(Boolean);
  if(!answers.length) return null;

  const sources=ranked.map(x=>({
    id:x.entry.id,
    title:x.entry.title||x.entry.question,
    verified:x.entry.verified,
    source_label:x.entry.source_label,
    source_url:x.entry.source_url,
    score:Number(x.score.toFixed(2))
  }));

  return {
    reply:answers.join("\n\n"),
    quick_replies:[],
    entries:sources,
    confidence:ranked[0].entry.verified?"high":"medium",
    revision:doc.revision
  };
}

export async function adminKnowledgeStatus(){
  const doc=await getKnowledgeDocument();
  return {
    enabled:Boolean(doc?.settings?.enabled),
    revision:doc?.revision||0,
    entries_count:doc?.entries?.length||0,
    updated_at:doc?.updated_at||null,
    persistence:knowledgePersistenceMode(),
    cache_ms:CACHE_MS
  };
}
