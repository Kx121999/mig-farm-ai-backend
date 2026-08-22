import { normalizeAr } from './utils.js';
import { rerankCandidatesV33 } from './unified_intelligence_v33.js';

const VERSION='36.0.0';
const RELEASE='ADVANCED_RAG_RERANKER_V36';
const stats=globalThis.__migV36Stats||{reranks:0,candidates:0,selected:0,low_confidence:0,diversity_drops:0};
globalThis.__migV36Stats=stats;
function clean(v='',max=3000){return String(v??'').replace(/[\u0000-\u001f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max);}
function arr(v){return Array.isArray(v)?v:[];}
function canonical(v=''){return normalizeAr(clean(v,1200)).replace(/[^\p{L}\p{N}]+/gu,' ').replace(/\s+/g,' ').trim();}
function toks(v=''){return canonical(v).split(' ').filter(x=>x.length>1);}
function setOverlap(a='',b=''){const A=new Set(toks(a)),B=new Set(toks(b));if(!A.size||!B.size)return 0;let hit=0;for(const t of A)if(B.has(t))hit+=1;return hit/Math.max(1,A.size);}
function authority(item={}){const s=clean(item.source||item.document_type||'',120).toLowerCase();if(/live|odoo|structured|truth/.test(s))return 1;if(/dossier|official|catalog/.test(s))return .9;if(/enterprise|knowledge|rag/.test(s))return .75;return .55;}
function freshness(item={}){const raw=item.updated_at||item.modified_at||item.date||null;if(!raw)return .65;const t=Date.parse(raw);if(!Number.isFinite(t))return .65;const days=Math.max(0,(Date.now()-t)/86400000);return days<=30?1:days<=180?.85:days<=730?.7:.55;}
function identity(item={}){return clean(item.entity_id||item.external_id||item.sku||canonical(item.name||item.title||item.id),220);}
function candidateText(item={}){return [item.name,item.title,item.sku,item.category,item.description,item.sales_description,item.ecommerce_description,...arr(item.type),...arr(item.feature),...arr(item.tags)].filter(Boolean).join(' ');}

export function rewriteQueryV36({baseQuery='',semanticCore={},conversationState={},route={}}={}){
  const parts=[clean(baseQuery,1800)];const active=semanticCore?.active_entity;
  if(active?.name&&!canonical(baseQuery).includes(canonical(active.name)))parts.push(`canonical_entity=${active.name}${active.sku?` sku=${active.sku}`:''}`);
  const slots=semanticCore?.slots||{};
  if(slots.crop&&!canonical(baseQuery).includes(canonical(slots.crop)))parts.push(`crop=${clean(slots.crop,100)}`);
  if(slots.environment&&!canonical(baseQuery).includes(canonical(slots.environment)))parts.push(`environment=${clean(slots.environment,100)}`);
  if(slots.problem?.description)parts.push(`problem=${clean(slots.problem.description,280)}`);
  if(arr(route?.intents).length)parts.push(`intent=${arr(route.intents).filter(x=>x!=='correction').join(',')}`);
  return parts.filter(Boolean).join(' | ').slice(0,2200);
}

export function buildRetrievalPlanV36({route={},semanticCore={},query=''}={}){
  const exact=Boolean(route?.requires_structured_data);const semantic=Boolean(route?.requires_semantic_knowledge);const kind=clean(route?.kind,80)||'conversation_only';
  const channels=[];if(exact)channels.push('structured_exact');if(['product_exact','product_discovery','commerce','multi_source'].includes(kind))channels.push('entity','lexical','vector');if(semantic||['technical','multimodal'].includes(kind))channels.push('vector','lexical','knowledge_graph');
  return {version:VERSION,kind,query:clean(query,2200),channels:[...new Set(channels)],candidate_target:semantic?14:10,select_target:semantic?5:4,max_attempts:2,requires_freshness:exact,entity_lock:semanticCore?.active_entity?.entity_id||null};
}

export function rerankCandidatesV36({query='',candidates=[],conversationState={},meaningFrame={},semanticCore={},limit=6}={}){
  stats.reranks+=1;stats.candidates+=arr(candidates).length;
  const baseline=rerankCandidatesV33({query,candidates,conversationState,meaningFrame,limit:Math.max(12,Number(limit)||6)});
  const activeId=semanticCore?.active_entity?.entity_id||conversationState?.active_product_id||null,activeName=canonical(semanticCore?.active_entity?.name||'');
  const scored=baseline.map((item,index)=>{
    const text=candidateText(item),lex=setOverlap(query,text),auth=authority(item),fresh=freshness(item),id=identity(item),name=canonical(item.name||item.title||'');
    let score=Number(item.rerank_score||item.score||0)+lex*110+auth*36+fresh*16;const reasons=[...(item.rerank_reasons||[])];
    const semanticSource=clean(item.source||'',160).toLowerCase();
    if(activeId&&id===activeId){score+=180;reasons.push('v36_active_entity_id');}else if(activeName&&name&&(name===activeName||name.includes(activeName)||activeName.includes(name))){score+=120;reasons.push('v36_active_entity_name');}
    if(item?.v40_entity_lock_match===true){score+=360;reasons.push('v36_entity_lock_match');}
    if(semanticCore?.correction&&/(?:fuzzy_entity|canonical_entity|entity_resolver)/.test(semanticSource)){score+=220;reasons.push('v36_current_correction_entity_resolution');}
    else if(activeName&&/(?:fuzzy_entity|canonical_entity|entity_resolver)/.test(semanticSource)){score+=90;reasons.push('v36_contextual_entity_resolution');}
    if(auth>=.9)reasons.push('v36_authoritative_source');if(fresh>=.85)reasons.push('v36_fresh_source');if(lex>=.35)reasons.push('v36_query_coverage');
    return {...item,v36_score:Number(score.toFixed(4)),v36_authority:auth,v36_freshness:fresh,v36_query_coverage:Number(lex.toFixed(4)),v36_reasons:[...new Set(reasons)].slice(0,10),__rank:index};
  }).sort((a,b)=>b.v36_score-a.v36_score);
  const selected=[],seen=new Set();
  for(const item of scored){const key=identity(item);if(key&&seen.has(key)){stats.diversity_drops+=1;continue;}if(key)seen.add(key);selected.push(item);if(selected.length>=Math.max(1,Math.min(10,Number(limit)||6)))break;}
  stats.selected+=selected.length;if(!selected.length||Number(selected[0]?.v36_query_coverage||0)<.08)stats.low_confidence+=1;
  return selected.map(({__rank,...x})=>x);
}

export function assessEvidenceV36({query='',selected=[],route={}}={}){
  const rows=arr(selected);if(!rows.length)return {version:VERSION,confidence:0,coverage:0,authority:0,freshness:0,low_confidence:true,reason:'no_evidence'};
  const coverage=rows.reduce((a,x)=>a+Number(x.v36_query_coverage??setOverlap(query,candidateText(x))),0)/rows.length;
  const auth=rows.reduce((a,x)=>a+Number(x.v36_authority??authority(x)),0)/rows.length;
  const fresh=rows.reduce((a,x)=>a+Number(x.v36_freshness??freshness(x)),0)/rows.length;
  const exactPenalty=route?.requires_structured_data&&auth<.85?.18:0;const confidence=Math.max(0,Math.min(1,coverage*.45+auth*.4+fresh*.15-exactPenalty));
  return {version:VERSION,confidence:Number(confidence.toFixed(4)),coverage:Number(coverage.toFixed(4)),authority:Number(auth.toFixed(4)),freshness:Number(fresh.toFixed(4)),low_confidence:confidence<.48,reason:confidence<.48?'weak_semantic_or_authority_match':'sufficient_evidence'};
}

export function advancedRagHealthV36(){return {version:VERSION,release:RELEASE,ready:true,hybrid:['structured','entity','lexical','vector','knowledge_graph'],reranking:'authority+freshness+semantic+entity+diversity',stats:{...stats}};}
