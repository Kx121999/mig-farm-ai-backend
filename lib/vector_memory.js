import { normalizeAr, tokenize } from "./utils.js";

function n(v=""){ return normalizeAr(String(v||"")); }
function arr(v){ return Array.isArray(v)?v:[]; }
function clamp(v,min=0,max=1){ return Math.max(min,Math.min(max,Number(v)||0)); }
function uniqRows(rows=[],limit=32){
  const seen=new Set(),out=[];
  for(const row of rows){
    if(!row) continue;
    const text=String(row.text||row.summary||"").trim();
    if(!text) continue;
    const key=n(text); if(!key||seen.has(key)) continue;
    seen.add(key); out.push({...row,text}); if(out.length>=limit) break;
  }
  return out;
}
function stableHash(value=""){
  let h=2166136261; const s=String(value);
  for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); }
  return h>>>0;
}
function featureTokens(text=""){
  const base=tokenize(n(text)).filter(x=>x.length>1);
  const grams=[];
  const compact=n(text).replace(/\s+/g," ");
  for(let i=0;i<compact.length-2&&grams.length<160;i++){
    const g=compact.slice(i,i+3); if(!/\s{2,}/.test(g)) grams.push(`g:${g}`);
  }
  return [...base.map(x=>`w:${x}`),...grams];
}
export function localEmbedding(text="",dimensions=128){
  const dim=Math.max(32,Math.min(256,Number(dimensions)||128));
  const vec=new Array(dim).fill(0);
  const features=featureTokens(text);
  for(const feature of features){
    const h=stableHash(feature);
    const idx=h%dim;
    const sign=((h>>>8)&1)?1:-1;
    const weight=feature.startsWith("w:")?1.6:.45;
    vec[idx]+=sign*weight;
  }
  let norm=0; for(const x of vec) norm+=x*x; norm=Math.sqrt(norm)||1;
  return vec.map(x=>x/norm);
}
export function cosineSimilarity(a=[],b=[]){
  const len=Math.min(a.length,b.length); if(!len) return 0;
  let dot=0,aa=0,bb=0;
  for(let i=0;i<len;i++){ const x=Number(a[i])||0,y=Number(b[i])||0; dot+=x*y;aa+=x*x;bb+=y*y; }
  if(!aa||!bb) return 0; return dot/(Math.sqrt(aa)*Math.sqrt(bb));
}

export function sanitizeSemanticMemory(value={}){
  const v=value&&typeof value==="object"&&!Array.isArray(value)?value:{};
  const items=uniqRows(arr(v.items).slice(-28).map(x=>({
    id:String(x?.id||"").slice(0,90),
    kind:String(x?.kind||"fact").slice(0,40),
    text:String(x?.text||"").slice(0,700),
    salience:clamp(x?.salience??.55,0,1),
    turn:Math.max(0,Number(x?.turn)||0),
    source:String(x?.source||"").slice(0,80),
    created_at:String(x?.created_at||"").slice(0,40)
  })),28);
  return {v:1,items,updated_turn:Math.max(0,Number(v.updated_turn)||0)};
}

function memoryId(kind,text,turn){ return `${kind}-${turn}-${stableHash(n(text)).toString(36)}`; }
function pushMemory(items,kind,text,turn,salience=.55,source="conversation"){
  const clean=String(text||"").replace(/\s+/g," ").trim(); if(clean.length<3) return;
  items.push({id:memoryId(kind,clean,turn),kind,text:clean.slice(0,700),turn,salience:clamp(salience),source,created_at:new Date().toISOString()});
}

export function mergeSemanticMemory(previous={},context={}){
  const old=sanitizeSemanticMemory(previous); const turn=Math.max(0,Number(context?.turn)||old.updated_turn);
  let items=[...old.items];
  const message=String(context?.message||"").trim();
  const analysis=context?.analysis||{}; const cognition=context?.cognition||{}; const decision=context?.decision||{};
  if(message){
    const entityBits=[analysis?.category?.key,analysis?.crop?.key,analysis?.emirate,analysis?.cultivation].filter(Boolean);
    const summary=entityBits.length?`${message} | entities: ${entityBits.join(", ")}`:message;
    pushMemory(items,"user_goal",summary,turn,.64,"user");
  }
  const constraints=cognition?.constraints||{};
  const c=[];
  if(constraints.category) c.push(`category=${constraints.category}`);
  if(constraints.crop) c.push(`crop=${constraints.crop}`);
  if(constraints.emirate) c.push(`emirate=${constraints.emirate}`);
  if(constraints.cultivation) c.push(`cultivation=${constraints.cultivation}`);
  if(constraints.total_budget!==null&&constraints.total_budget!==undefined) c.push(`budget=${constraints.total_budget}`);
  if(constraints.require_available) c.push("available=true");
  if(c.length) pushMemory(items,"constraints",c.join("; "),turn,.76,"cognition");
  if(decision?.handled){
    pushMemory(items,"decision",decision.display_reply||decision.memory_reply||"decision",turn,.92,"decision");
    if(arr(decision.decision_basis).length) pushMemory(items,"decision_basis",arr(decision.decision_basis).join("; "),turn,.88,"decision");
  }
  const payload=context?.payload||{};
  if(!decision?.handled && payload?.display_reply && String(payload.display_reply).length<650){
    pushMemory(items,"assistant_result",payload.display_reply,turn,.58,String(context?.source||"assistant"));
  }
  for(const gap of arr(decision?.knowledge_gaps||payload?.knowledge_gaps).slice(0,4)) pushMemory(items,"knowledge_gap",gap,turn,.84,"gap");

  // Favor high-salience recent memories and remove near-duplicates.
  const byKey=new Map();
  for(const item of items){
    const key=n(item.text); const prev=byKey.get(key);
    if(!prev || item.salience>prev.salience || item.turn>prev.turn) byKey.set(key,item);
  }
  items=[...byKey.values()].sort((a,b)=>{
    const ra=(a.salience*.72)+(Math.min(1,a.turn/Math.max(1,turn))*.28);
    const rb=(b.salience*.72)+(Math.min(1,b.turn/Math.max(1,turn))*.28);
    return rb-ra;
  }).slice(0,28).sort((a,b)=>a.turn-b.turn);
  return sanitizeSemanticMemory({v:1,items,updated_turn:turn});
}

export function semanticMemoryCandidates(query="",memory={},limit=6){
  const q=String(query||"").trim(); if(!q) return [];
  const qv=localEmbedding(q); const mem=sanitizeSemanticMemory(memory);
  const rows=mem.items.map(item=>{
    const score=cosineSimilarity(qv,localEmbedding(item.text));
    const recency=mem.updated_turn?Math.max(0,1-((mem.updated_turn-item.turn)/12)):0;
    const final=(score*.70)+(item.salience*.20)+(recency*.10);
    return {id:item.id,title:item.kind,answer:item.text,score:Number(final.toFixed(4)),source:"semantic_memory",verified:false,turn:item.turn};
  }).filter(x=>x.score>=.25).sort((a,b)=>b.score-a.score);
  return rows.slice(0,Math.max(1,Math.min(10,limit)));
}

function remoteEnabled(){ return Boolean(process.env.OPENAI_API_KEY) && String(process.env.OPENAI_EMBEDDINGS||"off").toLowerCase()==="on"; }
async function remoteEmbeddings(texts=[]){
  const apiKey=String(process.env.OPENAI_API_KEY||""); if(!apiKey||!texts.length) return null;
  const model=String(process.env.OPENAI_EMBEDDING_MODEL||"text-embedding-3-small");
  const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),6500);
  try{
    const response=await fetch("https://api.openai.com/v1/embeddings",{
      method:"POST",signal:controller.signal,
      headers:{"Content-Type":"application/json","Authorization":`Bearer ${apiKey}`},
      body:JSON.stringify({model,input:texts.slice(0,24),encoding_format:"float",dimensions:256})
    });
    if(!response.ok) return null;
    const data=await response.json();
    return arr(data?.data).sort((a,b)=>(a.index||0)-(b.index||0)).map(x=>arr(x.embedding));
  }catch{return null;}finally{clearTimeout(timer);}
}

export async function semanticMemoryCandidatesAdaptive(query="",memory={},limit=6){
  const local=semanticMemoryCandidates(query,memory,Math.max(limit,8));
  if(!remoteEnabled()||!local.length) return {items:local.slice(0,limit),engine:"local_feature_hash"};
  const selected=local.slice(0,12); const vectors=await remoteEmbeddings([query,...selected.map(x=>x.answer)]);
  if(!vectors||vectors.length!==selected.length+1) return {items:local.slice(0,limit),engine:"local_feature_hash"};
  const qv=vectors[0];
  const reranked=selected.map((row,i)=>({...row,embedding_score:Number(cosineSimilarity(qv,vectors[i+1]).toFixed(4))}))
    .sort((a,b)=>(b.embedding_score||0)-(a.embedding_score||0)).slice(0,limit);
  return {items:reranked,engine:"openai_embedding_rerank"};
}

export function vectorMemoryHealth(){
  return {
    version:"11.0",
    mode:"bounded_semantic_memory",
    local_embedding:"feature_hash_cosine_v1",
    remote_embedding_configured:remoteEnabled(),
    remote_embedding_model:String(process.env.OPENAI_EMBEDDING_MODEL||"text-embedding-3-small"),
    max_memories:28,
    privacy:"bounded_conversation_state"
  };
}
