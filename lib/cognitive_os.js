import { normalizeAr } from './utils.js';
import { localEmbedding, cosineSimilarity } from './vector_memory.js';
import { sanitizePersistentSnapshot } from './persistent_store.js';

function arr(v){ return Array.isArray(v)?v:[]; }
function clean(v,max=500){ return String(v??'').replace(/\s+/g,' ').trim().slice(0,max); }
function n(v=''){ return normalizeAr(String(v||'')); }
function now(){ return new Date().toISOString(); }
function keyText(v=''){ return n(v).replace(/\s+/g,' ').trim(); }
function finite(v){ const x=Number(v); return Number.isFinite(x)?x:null; }
function priceValue(v){ const m=String(v??'').replace(/,/g,'').match(/-?\d+(?:\.\d+)?/); return m?Number(m[0]):null; }
function stableId(prefix,text){ let h=2166136261; const s=`${prefix}:${keyText(text)}`; for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);} return `${prefix}-${(h>>>0).toString(36)}`; }

export function hydrateStateFromPersistent(input={},snapshot={}){
  const s=input&&typeof input==='object'&&!Array.isArray(input)?{...input}:{};
  const p=sanitizePersistentSnapshot(snapshot);
  const profile=p.profile||{};
  s.category=s.category||profile.category||'';
  s.crop=s.crop||profile.crop||'';
  s.emirate=s.emirate||profile.emirate||'';
  s.cultivation=s.cultivation||profile.cultivation||'';
  s.quantity=s.quantity||profile.quantity||'';
  const cm={...(s.cognitive_memory||{})}; const cc={...(cm.constraints||{})};
  if(!cc.category&&profile.category) cc.category=profile.category;
  if(!cc.crop&&profile.crop) cc.crop=profile.crop;
  if(!cc.emirate&&profile.emirate) cc.emirate=profile.emirate;
  if(!cc.cultivation&&profile.cultivation) cc.cultivation=profile.cultivation;
  if((cc.total_budget===null||cc.total_budget===undefined||cc.total_budget==='')&&profile.budget!==null) cc.total_budget=profile.budget;
  if(!cc.price_preference&&profile.price_preference) cc.price_preference=profile.price_preference;
  if(!cc.require_available&&profile.require_available) cc.require_available=true;
  cm.constraints=cc; s.cognitive_memory=cm;
  const hm={...(s.hybrid_memory||{})}; const hp={...(hm.preferences||{})};
  hp.emirate=hp.emirate||profile.emirate||''; hp.cultivation=hp.cultivation||profile.cultivation||'';
  if((hp.budget===null||hp.budget===undefined||hp.budget==='')&&profile.budget!==null) hp.budget=profile.budget;
  hp.price_preference=hp.price_preference||profile.price_preference||'neutral'; if(!hp.require_available&&profile.require_available) hp.require_available=true;
  hm.preferences=hp;
  if(!hm.active_goal&&p.goals.length) hm.active_goal=p.goals[p.goals.length-1].text;
  if(!arr(hm.last_decisions).length&&p.decisions.length) hm.last_decisions=p.decisions.slice(-5).map(d=>({summary:d.summary,basis:d.basis,products:d.products,turn:d.turn}));
  if(!arr(hm.knowledge_gaps).length&&p.knowledge_gaps.length) hm.knowledge_gaps=p.knowledge_gaps.slice(-8).map(x=>x.text);
  s.hybrid_memory=hm;
  return s;
}

export function hydrateProfileFromPersistent(input={},snapshot={}){
  const profile=input&&typeof input==='object'&&!Array.isArray(input)?{...input}:{}; const p=sanitizePersistentSnapshot(snapshot).profile;
  for(const field of ['category','crop','emirate','cultivation','quantity']) if(!profile[field]&&p[field]) profile[field]=p[field];
  if((profile.budget===null||profile.budget===undefined||profile.budget==='')&&p.budget!==null) profile.budget=p.budget;
  if(!profile.price_preference&&p.price_preference) profile.price_preference=p.price_preference;
  if(!profile.require_available&&p.require_available) profile.require_available=true;
  return profile;
}

function currentTruthNeed(message='',analysis={},cognition={}){
  const t=n(message); const goal=String(cognition?.goal||''); const intent=String(analysis?.intent||'');
  return Boolean(analysis?.category||analysis?.crop||analysis?.knownProduct||analysis?.seedVarieties?.length || ['product_search','recommendation','product_memory'].includes(intent) || ['compare','recommend','optimize_budget','bundle','purchase'].includes(goal) || /(سعر|بكم|متوفر|موجود|ارخص|اغلى|اختار|رشح|قارن|price|stock|available|cheapest|compare|recommend)/.test(t));
}
function memoryNeed(message='',analysis={}){ const t=n(message); return analysis?.intent==='product_memory'||/(قبل|المرة|اخترنا|قولت|قلت|فاكر|تفتكر|اللي شوفناه|السابق|last time|remember|previous|earlier)/.test(t); }
function knowledgeNeed(message='',analysis={}){ const t=n(message); return ['agriculture_general','plant_problem','pesticide_dose','fertilizer_dose','unknown'].includes(analysis?.intent)||/(كيف|ليش|لماذا|مقاوم|زراعه|زراعة|مشكله|مرض|سماد|مبيد|طريقة|موعد|how|why)/.test(t); }
function siteNeed(message='',analysis={}){ const t=n(message); return ['returns','privacy','terms','cookies','payment','tax','hours'].includes(analysis?.intent)||/(سياس|شروط|خصوص|استرجاع|موقع|صفحه|صفحة|policy|terms|privacy|site)/.test(t); }

export function buildRetrievalRoute({message='',analysis={},cognition={},persistent={}}={}){
  const route=[]; const push=(source,reason,priority)=>{ if(!route.some(x=>x.source===source)) route.push({source,reason,priority}); };
  if(currentTruthNeed(message,analysis,cognition)) push('live_catalog','current commerce truth',100);
  if(memoryNeed(message,analysis)||arr(persistent?.memories).length) push('persistent_memory','cross-session goals, preferences and decisions',82);
  if(knowledgeNeed(message,analysis)) push('managed_knowledge','verified agricultural and business knowledge',92);
  if(siteNeed(message,analysis)) push('site_pages','public policy or page evidence',72);
  if(!route.length){ push('managed_knowledge','default verified knowledge first',80); push('persistent_memory','context continuity if relevant',55); }
  route.sort((a,b)=>b.priority-a.priority);
  const complexity=Math.min(5,Math.max(1,route.length+(currentTruthNeed(message,analysis,cognition)?1:0)+(memoryNeed(message,analysis)?1:0)));
  return {version:'12.0',sources:route,complexity,requires_live_catalog:route.some(x=>x.source==='live_catalog'),requires_persistent_memory:route.some(x=>x.source==='persistent_memory'),generated_at:now()};
}

function upsertSimple(list,text,timestamp){
  const key=keyText(text); if(!key) return list;
  const found=list.find(x=>keyText(x.text)===key);
  if(found){found.last_seen_at=timestamp;found.count=Math.min(999,(found.count||1)+1);return list;}
  list.push({text:clean(text,240),first_seen_at:timestamp,last_seen_at:timestamp,count:1}); return list;
}
function upsertGap(list,text,timestamp){
  const key=keyText(text); if(!key) return list; const found=list.find(x=>keyText(x.text)===key);
  if(found){found.last_seen_at=timestamp;found.count=Math.min(999,(found.count||1)+1);} else list.push({text:clean(text,220),count:1,first_seen_at:timestamp,last_seen_at:timestamp});
  return list;
}
function upsertMemory(list,{kind='memory',text='',salience=.5,source='conversation'}={},timestamp){
  const key=`${kind}:${keyText(text)}`; if(!text) return list; const found=list.find(x=>`${x.kind}:${keyText(x.text)}`===key);
  if(found){found.last_seen_at=timestamp;found.count=Math.min(999,(found.count||1)+1);found.salience=Math.max(found.salience||0,salience);} else list.push({id:stableId(kind,text),kind,text:clean(text,650),salience:Math.max(0,Math.min(1,salience)),first_seen_at:timestamp,last_seen_at:timestamp,source:clean(source,80),count:1});
  return list;
}
function mergeGraph(oldGraph={},newGraph={},timestamp){
  const nodes=new Map();
  for(const node of [...arr(oldGraph.nodes),...arr(newGraph.nodes)]){
    if(!node?.id||!node?.label) continue; const prev=nodes.get(node.id);
    if(prev){prev.weight=Math.max(Number(prev.weight)||0,Number(node.weight)||0);prev.last_seen_at=timestamp;prev.meta={...(prev.meta||{}),...(node.meta||{})};}
    else nodes.set(node.id,{...node,first_seen_at:node.first_seen_at||timestamp,last_seen_at:timestamp});
  }
  const edges=new Map();
  for(const edge of [...arr(oldGraph.edges),...arr(newGraph.edges)]){
    if(!edge?.from||!edge?.to||!edge?.relation) continue; const key=`${edge.from}|${edge.relation}|${edge.to}`; const prev=edges.get(key);
    if(prev){prev.weight=Math.max(Number(prev.weight)||0,Number(edge.weight)||0);prev.last_seen_at=timestamp;prev.count=Math.min(999,(prev.count||1)+1);} else edges.set(key,{...edge,first_seen_at:edge.first_seen_at||timestamp,last_seen_at:timestamp,count:edge.count||1});
  }
  const nodeRows=[...nodes.values()].sort((a,b)=>(Number(b.weight)||0)-(Number(a.weight)||0)).slice(0,48); const ids=new Set(nodeRows.map(x=>x.id));
  const edgeRows=[...edges.values()].filter(x=>ids.has(x.from)&&ids.has(x.to)).sort((a,b)=>(Number(b.weight)||0)-(Number(a.weight)||0)).slice(0,80);
  return {nodes:nodeRows,edges:edgeRows};
}
function mergeTemporal(oldRows=[],products=[],source='',timestamp){
  const rows=arr(oldRows).map(x=>({...x}));
  for(const p of arr(products).slice(0,8)){
    if(!p?.name) continue; const price=String(p.price??''); const availability=String(p.availability||''); const id=keyText(p.sku||p.url||p.name);
    const latest=[...rows].reverse().find(x=>keyText(x.sku||x.url||x.name)===id);
    const changed=!latest||String(latest.price??'')!==price||String(latest.availability||'')!==availability;
    if(changed) rows.push({name:clean(p.name,260),price:clean(price,80),currency:clean(p.currency||'AED',20),availability:clean(availability,100),url:clean(p.url,800),sku:clean(p.sku,120),observed_at:timestamp,last_seen_at:timestamp,source:clean(source||'live_catalog',80)});
    else latest.last_seen_at=timestamp;
  }
  const grouped=new Map();
  for(const row of rows){ const k=keyText(row.sku||row.url||row.name); if(!grouped.has(k)) grouped.set(k,[]); grouped.get(k).push(row); }
  const compact=[];
  for(const items of grouped.values()) compact.push(...items.slice(-3));
  return compact.sort((a,b)=>String(a.observed_at).localeCompare(String(b.observed_at))).slice(-48);
}
function journeyFrom({analysis={},state={},profile={},results=[],decision=null,source=''}){
  const signals=[]; let score=10;
  if(analysis?.category||state?.category||profile?.category){score+=10;signals.push('category_known');}
  if(analysis?.crop||state?.crop||profile?.crop){score+=10;signals.push('crop_known');}
  if(profile?.budget||state?.cognitive_memory?.constraints?.total_budget){score+=12;signals.push('budget_known');}
  if(profile?.emirate||state?.emirate){score+=8;signals.push('emirate_known');}
  if(arr(results).length){score+=18;signals.push('products_seen');}
  if(decision?.handled||/decision|compare|cognitive/.test(source)){score+=15;signals.push('decision_activity');}
  if(/purchase|checkout|handoff|whatsapp/.test(source)){score+=22;signals.push('purchase_or_handoff');}
  score=Math.min(100,score); const stage=score>=75?'purchase_intent':score>=55?'consider':score>=30?'explore':'discover';
  return {stage,score,signals,last_changed_at:now()};
}

export function consolidatePersistentSnapshot({previous={},state={},profile={},analysis={},message='',source='',results=[],responseGraph={},decision=null,route=null}={}){
  const ts=now(); const out=sanitizePersistentSnapshot(previous); out.v=12; out.updated_at=ts;
  const c=state?.cognitive_memory?.constraints||{}; const hp=state?.hybrid_memory?.preferences||{};
  out.profile={
    category:analysis?.category?.key||state?.category||profile?.category||out.profile.category||'',
    crop:analysis?.crop?.key||state?.crop||profile?.crop||out.profile.crop||'',
    emirate:analysis?.emirate||state?.emirate||profile?.emirate||out.profile.emirate||'',
    cultivation:analysis?.cultivation||state?.cultivation||profile?.cultivation||out.profile.cultivation||'',
    quantity:analysis?.quantity||state?.quantity||profile?.quantity||out.profile.quantity||'',
    budget:finite(c.total_budget)??finite(profile?.budget)??finite(hp.budget)??out.profile.budget,
    price_preference:c.price_preference||hp.price_preference||out.profile.price_preference||'neutral',
    require_available:Boolean(c.require_available||hp.require_available||out.profile.require_available)
  };
  const goal=state?.hybrid_memory?.active_goal||state?.cognitive_memory?.active_goal||analysis?.intent||'';
  if(goal&&goal!=='unknown') out.goals=upsertSimple(out.goals,goal,ts).slice(-10);
  const compactIntent=[out.profile.category,out.profile.crop,out.profile.emirate,out.profile.cultivation].filter(Boolean).join(' | ');
  if(compactIntent) out.memories=upsertMemory(out.memories,{kind:'profile_context',text:compactIntent,salience:.76,source:'cognitive_os'},ts);
  if(out.profile.budget!==null) out.memories=upsertMemory(out.memories,{kind:'budget',text:`budget=${out.profile.budget}`,salience:.86,source:'cognitive_os'},ts);
  if(out.profile.require_available) out.memories=upsertMemory(out.memories,{kind:'availability_preference',text:'require_available=true',salience:.8,source:'cognitive_os'},ts);
  if(['product_memory','recommendation'].includes(analysis?.intent)){
    const safeGoal=['intent='+clean(analysis?.intent,60),out.profile.category?`category=${out.profile.category}`:'',out.profile.crop?`crop=${out.profile.crop}`:'',out.profile.emirate?`emirate=${out.profile.emirate}`:'',out.profile.cultivation?`cultivation=${out.profile.cultivation}`:''].filter(Boolean).join('; ');
    if(safeGoal) out.memories=upsertMemory(out.memories,{kind:'user_goal',text:safeGoal,salience:.66,source:'structured_user_goal'},ts);
  }
  if(decision?.handled){
    const summary=clean(decision.display_reply||decision.memory_reply||'decision',450); const basis=arr(decision.decision_basis).slice(0,8).map(x=>clean(x,120));
    out.decisions.push({summary,basis,products:arr(decision.results).slice(0,4),at:ts,turn:Number(state?.turn)||0}); out.decisions=out.decisions.slice(-12);
    out.memories=upsertMemory(out.memories,{kind:'decision',text:summary,salience:.96,source:'decision_engine'},ts);
  }
  const gaps=[...arr(decision?.knowledge_gaps),...arr(state?.cognitive_memory?.last_knowledge_gaps),...arr(state?.hybrid_memory?.knowledge_gaps)].map(x=>clean(x?.text||x,220)).filter(Boolean);
  for(const gap of gaps.slice(-8)) out.knowledge_gaps=upsertGap(out.knowledge_gaps,gap,ts);
  out.knowledge_gaps=out.knowledge_gaps.sort((a,b)=>(b.count||0)-(a.count||0)).slice(0,16);
  out.temporal_products=mergeTemporal(out.temporal_products,results,source,ts);
  out.graph=mergeGraph(out.graph,responseGraph,ts);
  out.journey=journeyFrom({analysis,state,profile,results,decision,source});
  if(route) out.memories=upsertMemory(out.memories,{kind:'retrieval_route',text:arr(route.sources).map(x=>x.source).join(' > '),salience:.35,source:'router'},ts);
  out.memories=out.memories.sort((a,b)=>((b.salience||0)*.75+(b.count||1)*.01)-((a.salience||0)*.75+(a.count||1)*.01)).slice(0,36);
  return sanitizePersistentSnapshot(out);
}

function candidatesFromSnapshot(snapshot={}){
  const p=sanitizePersistentSnapshot(snapshot); const rows=[];
  for(const m of p.memories) rows.push({kind:m.kind,text:m.text,salience:m.salience,source:'persistent_memory',at:m.last_seen_at});
  for(const d of p.decisions) rows.push({kind:'decision',text:`${d.summary}${d.basis.length?` | ${d.basis.join(', ')}`:''}`,salience:.96,source:'persistent_decision',at:d.at});
  for(const g of p.knowledge_gaps) rows.push({kind:'knowledge_gap',text:g.text,salience:.7,source:'persistent_gap',at:g.last_seen_at});
  return rows;
}
export function persistentMemoryCandidates(query='',snapshot={},limit=8){
  const q=clean(query,700); if(!q) return []; const qv=localEmbedding(q); const rows=candidatesFromSnapshot(snapshot);
  return rows.map((row,i)=>{ const semantic=cosineSimilarity(qv,localEmbedding(row.text)); const score=(semantic*.76)+(Number(row.salience||.5)*.24); return {id:`pm-${i}-${stableId(row.kind,row.text)}`,title:row.kind,answer:row.text,source:row.source,score:Number(score.toFixed(4)),verified:false,at:row.at}; }).filter(x=>x.score>=.22).sort((a,b)=>b.score-a.score).slice(0,Math.max(1,Math.min(12,Number(limit)||8)));
}
export function temporalMemoryCandidates(query='',snapshot={},limit=8){
  const q=clean(query,700); const qv=localEmbedding(q); const p=sanitizePersistentSnapshot(snapshot);
  const rows=p.temporal_products.map((x,i)=>{ const text=`${x.name} | price ${x.price} ${x.currency} | ${x.availability} | observed ${x.observed_at}`; const semantic=cosineSimilarity(qv,localEmbedding(text)); return {id:`tp-${i}`,title:x.name,answer:text,source:'temporal_product_memory',score:Number(semantic.toFixed(4)),verified:false,observed_at:x.observed_at,url:x.url}; });
  return rows.filter(x=>x.score>=.18).sort((a,b)=>b.score-a.score).slice(0,Math.max(1,Math.min(12,Number(limit)||8)));
}
export function temporalConflictSummary(snapshot={}){
  const p=sanitizePersistentSnapshot(snapshot),groups=new Map();
  for(const x of p.temporal_products){ const k=keyText(x.sku||x.url||x.name); if(!groups.has(k)) groups.set(k,[]); groups.get(k).push(x); }
  const changes=[];
  for(const items of groups.values()){
    if(items.length<2) continue; const a=items[items.length-2],b=items[items.length-1];
    if(String(a.price)!==String(b.price)||String(a.availability)!==String(b.availability)) changes.push({product:b.name,previous:{price:a.price,availability:a.availability,observed_at:a.observed_at},latest:{price:b.price,availability:b.availability,observed_at:b.observed_at}});
  }
  return changes.slice(0,8);
}
export function cognitiveOSMeta({snapshot={},route={},persisted=false,persistence_reason='',persistent_hits=0}={}){
  const p=sanitizePersistentSnapshot(snapshot);
  return {version:'12.0',mode:'persistent_cognitive_os',persistence:{active:Boolean(persisted),reason:persistence_reason||''},retrieval_router:route,memory:{items:p.memories.length,decisions:p.decisions.length,temporal_product_observations:p.temporal_products.length,persistent_hits:Number(persistent_hits)||0},knowledge_graph:{nodes:p.graph.nodes.length,edges:p.graph.edges.length,persistent:Boolean(persisted)},knowledge_gaps:p.knowledge_gaps.slice(0,5),journey:p.journey,temporal_changes:temporalConflictSummary(p)};
}
export function cognitiveOSHealth(persistence={}){
  return {version:'12.0',mode:'persistent_cognitive_os',capabilities:['persistent_bounded_memory','memory_consolidation','temporal_product_memory','persistent_knowledge_graph','retrieval_router','knowledge_gap_queue','journey_memory','cross_session_preference_hydration','temporal_conflict_detection','privacy_bounded_retention'],persistence};
}
