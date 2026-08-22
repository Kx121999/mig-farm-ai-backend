import { createHash, randomUUID } from 'node:crypto';
import {
  runUnifiedIntelligenceV33, buildConversationStateV33, routeIntelligenceV33, rewriteQueryV33,
  isUnifiedIntelligenceEnabledV33, unifiedIntelligenceHealthV33
} from './unified_intelligence_v33.js';
import { buildSemanticCoreV35, applySemanticCoreV35, stabilizeMeaningFrameV35, semanticCoreHealthV35 } from './semantic_intelligence_core_v35.js';
import { rewriteQueryV36, buildRetrievalPlanV36, rerankCandidatesV36, assessEvidenceV36, advancedRagHealthV36 } from './advanced_rag_reranker_v36.js';
import { updatePersistentMemoryV37, memoryContextV37, persistentMemoryHealthV37 } from './persistent_memory_v37.js';
import { buildProductGraphV38, productGraphContextV38, productGraphHealthV38 } from './product_intelligence_graph_v38.js';
import { buildDiagnosticFrameV39, agriculturalDiagnosticHealthV39 } from './agricultural_diagnostic_engine_v39.js';
import { buildSalesPlanV40, autonomousSalesHealthV40 } from './autonomous_sales_intelligence_v40.js';

const VERSION='40.0.0';
const MODE='unified_evolution_intelligence_v40';
const RELEASE='MIG_FARM_AI_V40_UNIFIED_EVOLUTION';
const stats=globalThis.__migV40Stats||{turns:0,generated:0,repairs:0,repair_failures:0,low_evidence:0,diagnostic_turns:0,sales_plans:0,last_error:null};
globalThis.__migV40Stats=stats;
function clean(v='',max=6000){return String(v??'').replace(/[\u0000-\u001f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max);}
function arr(v){return Array.isArray(v)?v:[];}
function boolEnv(name,fallback=true){const raw=process.env[name];if(raw===undefined)return fallback;return !/^(?:0|false|off|no)$/i.test(String(raw));}
function hash(v=''){return createHash('sha256').update(String(v)).digest('hex').slice(0,20);}
function replyText(payload={}){return clean(payload?.display_reply||payload?.reply,8000);}
function traceId(){return `ai40_${new Date().toISOString().slice(0,10).replace(/-/g,'')}_${randomUUID().slice(0,8)}`;}
function canonicalResultEntityV40(item={}){
  if(!item||typeof item!=='object')return null;
  const name=clean(item.name||item.title,300),sku=clean(item.sku||item.default_code,120),external_id=clean(item.external_id,180);
  if(!name&&!sku&&!external_id)return null;
  return {entity_id:clean(item.entity_id,160)||external_id||sku||`product40_${hash(name)}`,name,sku,external_id,category:clean(item.category,180),source:clean(item.source||'verified_retrieval_v40',120),confidence:.96};
}
function canonicalizeCorrectionStateV40({conversationState={},semanticCore={},meaningFrame={},results=[]}={}){
  const target=clean(meaningFrame?.entities?.product_name||meaningFrame?.entities?.product_reference,300);
  if(!semanticCore?.correction||!target)return {state:conversationState,core:semanticCore,canonicalized:false};
  const rows=arr(results).filter(x=>x&&typeof x==='object');
  const chosen=rows.find(x=>x.v40_entity_lock_match===true)||(rows.length===1?rows[0]:null);
  const entity=canonicalResultEntityV40(chosen||{});
  if(!entity)return {state:conversationState,core:semanticCore,canonicalized:false};
  const current=arr(conversationState?.active_products);
  const remaining=current.filter(x=>clean(x?.entity_id,160)!==entity.entity_id&&clean(x?.sku,120)!==entity.sku&&clean(x?.external_id,180)!==entity.external_id);
  const state={...conversationState,active_products:[entity,...remaining].slice(0,6),active_product_id:entity.entity_id,last_reference_resolution:{kind:'canonical_verified_correction_v40',resolved:true,entity_id:entity.entity_id,entity_name:entity.name,confidence:.96}};
  const core={...semanticCore,active_entity:{entity_id:entity.entity_id,name:entity.name,sku:entity.sku},reference:{...(semanticCore?.reference||{}),resolved_text:entity.name,confidence:Math.max(.96,Number(semanticCore?.reference?.confidence)||0)}};
  return {state,core,canonicalized:true};
}

export function buildEvolutionContextV40({message='',state={},history=[],meaningFrame={},selectedProduct=null,selectedProducts=[],visionFrame=null,salesTurn=null,conversionDecision=null,autonomousPlan=null}={}){
  const priorConversationState=state?.intelligence_v33&&typeof state.intelligence_v33==='object'?state.intelligence_v33:{};
  const effectiveMeaning=stabilizeMeaningFrameV35({message,meaningFrame,conversationState:priorConversationState});
  const previewState=buildConversationStateV33({message,state,meaningFrame:effectiveMeaning,selectedProduct,selectedProducts,visionFrame});
  const route=routeIntelligenceV33({meaningFrame:effectiveMeaning,conversationState:previewState,hasImages:Boolean(visionFrame?.has_visual_context)});
  const baseQuery=rewriteQueryV33({message,meaningFrame:effectiveMeaning,conversationState:previewState,route});
  const semanticCore=buildSemanticCoreV35({message,meaningFrame:effectiveMeaning,conversationState:previewState,history});
  const query=rewriteQueryV36({baseQuery,semanticCore,conversationState:previewState,route});
  const retrievalPlan=buildRetrievalPlanV36({route,semanticCore,query});
  const memory=updatePersistentMemoryV37({previous:state?.persistent_memory_v37||{},message,semanticCore,conversationState:previewState,history});
  const productGraph=buildProductGraphV38({conversationState:previewState,results:[],semanticCore});
  const diagnostic=buildDiagnosticFrameV39({semanticCore,conversationState:previewState,visionFrame,meaningFrame:effectiveMeaning});
  const sales=buildSalesPlanV40({semanticCore,salesTurn,conversionDecision,autonomousPlan,diagnosticFrame:diagnostic});
  return {version:VERSION,mode:MODE,release:RELEASE,effective_meaning_frame:effectiveMeaning,semantic_core_v35:semanticCore,retrieval_v36:{...retrievalPlan,query},memory_v37:memoryContextV37(memory),product_graph_v38:productGraphContextV38(productGraph),diagnostic_v39:diagnostic,sales_v40:sales,compatibility:{base_pipeline:'v33.2',single_user_facing_orchestrator:true,legacy_pipeline:'rollback_only'}};
}

function pressureRisk(reply='',sales={}){
  if(!reply||!['browse_no_pressure','technical_first'].includes(sales?.mode))return false;
  const t=reply.toLowerCase();
  const pressure=(t.match(/(?:اطلب الآن|اطلب دلوقتي|احجز الآن|راسلنا واتساب|تواصل واتساب|اشتري الآن|buy now|order now)/gi)||[]).length;
  return pressure>0;
}
function internalLeak(reply=''){return /(?:semantic_core_v35|retrieval_v36|persistent_memory_v37|product_graph_v38|diagnostic_v39|sales_v40|route score|rerank score|chain[- ]of[- ]thought)/i.test(reply);}
function validateEvolutionV40({payload={},evolution={},baseValidation={}}={}){
  const reply=replyText(payload),flags=[],hard=[];
  if(!reply){flags.push('empty_response');hard.push('empty_response');}
  if(internalLeak(reply)){flags.push('internal_metadata_leak');hard.push('internal_metadata_leak');}
  if(pressureRisk(reply,evolution?.sales_v40)){flags.push('sales_pressure_when_forbidden');hard.push('sales_policy_failure');}
  if(evolution?.diagnostic_v39?.risk?.regulated_dosage&&evolution?.diagnostic_v39?.missing_evidence?.includes('verified_label_or_product_identity')&&/\b\d+(?:[.,]\d+)?\s*(?:مل|ml|جرام|جم|g|لتر|l)\b/i.test(reply)){flags.push('unverified_dosage_quantity');hard.push('grounding_failure');}
  for(const flag of arr(baseValidation?.hard_blocks))hard.push(flag);
  const uniqueHard=[...new Set(hard)],uniqueFlags=[...new Set([...flags,...arr(baseValidation?.flags)])];
  const score=Math.max(0,Math.min(100,Number(baseValidation?.score??100)-flags.length*12-uniqueHard.filter(x=>!arr(baseValidation?.hard_blocks).includes(x)).length*28));
  return {version:VERSION,accepted:uniqueHard.length===0&&score>=78,score,flags:uniqueFlags,hard_blocks:uniqueHard,base_validation:baseValidation||null};
}

export async function runUnifiedEvolutionV40({message='',conversationId='',state={},history=[],meaningFrame={},semanticFrame={},analysis={},selectedProduct=null,selectedProducts=[],visionFrame=null,salesTurn=null,conversionDecision=null,autonomousPlan=null,generate=null,fallback=null}={}){
  stats.turns+=1;const started=Date.now(),id=traceId();
  const evolution=buildEvolutionContextV40({message,state,history,meaningFrame,selectedProduct,selectedProducts,visionFrame,salesTurn,conversionDecision,autonomousPlan});
  if(evolution.diagnostic_v39?.active)stats.diagnostic_turns+=1;if(evolution.sales_v40)stats.sales_plans+=1;
  const wrappedGenerate=typeof generate==='function'?async ctx=>generate({...ctx,rewritten_query:evolution.retrieval_v36.query,evolution_v40:evolution,semantic_core_v35:evolution.semantic_core_v35,retrieval_v36:evolution.retrieval_v36,memory_v37:evolution.memory_v37,product_graph_v38:evolution.product_graph_v38,diagnostic_v39:evolution.diagnostic_v39,sales_v40:evolution.sales_v40}):null;
  let base;
  try{
    const effectiveMeaning=evolution.effective_meaning_frame||meaningFrame;
    const wrappedFallback=typeof fallback==='function'?async ctx=>fallback({...ctx,meaning:effectiveMeaning,evolution_v40:evolution,semantic_core_v35:evolution.semantic_core_v35,retrieval_v36:evolution.retrieval_v36,memory_v37:evolution.memory_v37,product_graph_v38:evolution.product_graph_v38,diagnostic_v39:evolution.diagnostic_v39,sales_v40:evolution.sales_v40}):null;
    base=await runUnifiedIntelligenceV33({message,conversationId,state,history,meaningFrame:effectiveMeaning,semanticFrame,analysis,selectedProduct,selectedProducts,visionFrame,generate:wrappedGenerate,fallback:wrappedFallback});
  }catch(error){stats.last_error=clean(error?.message||'v33_base_failed',180);throw error;}
  const reranked=rerankCandidatesV36({query:evolution.retrieval_v36.query,candidates:base.results||[],conversationState:base.conversation_state||{},meaningFrame:evolution.effective_meaning_frame||meaningFrame,semanticCore:evolution.semantic_core_v35,limit:8});
  const evidenceAssessment=assessEvidenceV36({query:evolution.retrieval_v36.query,selected:reranked,route:base.route||{}});if(evidenceAssessment.low_confidence&&arr(base.results).length)stats.low_evidence+=1;
  const canonicalized=canonicalizeCorrectionStateV40({conversationState:base.conversation_state||{},semanticCore:evolution.semantic_core_v35,meaningFrame:evolution.effective_meaning_frame||meaningFrame,results:reranked.length?reranked:base.results||[]});
  const resolvedConversationState=canonicalized.state,finalSemanticCore=canonicalized.core;
  const finalGraph=buildProductGraphV38({conversationState:resolvedConversationState,results:reranked.length?reranked:base.results||[],semanticCore:finalSemanticCore});
  const finalMemory=updatePersistentMemoryV37({previous:state?.persistent_memory_v37||{},message,semanticCore:finalSemanticCore,conversationState:resolvedConversationState,history:[...arr(history),{role:'user',content:message},{role:'assistant',content:replyText(base.payload)}]});
  let nextState={...resolvedConversationState};
  nextState=applySemanticCoreV35(nextState,finalSemanticCore);
  nextState.persistent_memory_v37=finalMemory;
  nextState.product_graph_v38=finalGraph;
  nextState.diagnostic_state_v39=evolution.diagnostic_v39;
  nextState.sales_intelligence_v40=evolution.sales_v40;
  nextState.intelligence_version=VERSION;nextState.mode=MODE;nextState.final_release=RELEASE;
  let payload=base.payload||{},validation=validateEvolutionV40({payload,evolution,baseValidation:base.validation});
  if(!validation.accepted&&typeof generate==='function'){
    stats.repairs+=1;
    try{
      const repair=await generate({version:VERSION,release:RELEASE,current_message:message,meaning:meaningFrame,active_state:nextState,route:base.route,rewritten_query:evolution.retrieval_v36.query,recent_dialogue:arr(history).slice(-12),semantic_frame:semanticFrame,evolution_v40:{...evolution,product_graph_v38:productGraphContextV38(finalGraph),memory_v37:memoryContextV37(finalMemory),evidence_v36:evidenceAssessment},validation_repair:{previous_reply:replyText(payload),issues:validation.flags,hard_blocks:validation.hard_blocks,instruction:'Regenerate a fresh natural answer for the latest message. Respect no-pressure sales policy, diagnostic safety, entity consistency and verified evidence. Do not expose internal metadata.'}});
      if(repair?.payload?.reply||repair?.reply){const candidate=repair.payload||{reply:repair.reply};const candidateValidation=validateEvolutionV40({payload:candidate,evolution,baseValidation:{accepted:true,score:96,flags:[],hard_blocks:[]}});if(candidateValidation.accepted||candidateValidation.score>validation.score){payload=candidate;validation=candidateValidation;}}
    }catch(error){stats.repair_failures+=1;stats.last_error=clean(error?.message||'v40_repair_failed',180);}
  }
  stats.generated+=1;
  const meta={version:VERSION,mode:MODE,release:RELEASE,trace_id:id,latency_ms:Date.now()-started,semantic_signature:evolution.semantic_core_v35.semantic_signature,route:base.route?.kind||evolution.retrieval_v36.kind,evidence:evidenceAssessment,validation:{accepted:validation.accepted,score:validation.score,flags:validation.flags,hard_blocks:validation.hard_blocks},layers:{v35:true,v36:true,v37:true,v38:true,v39:true,v40:true}};
  return {...base,payload:{...payload,reply:replyText(payload),display_reply:replyText(payload),__unified_v40:true,unified_evolution_v40:meta},source:clean(base.source||'unified_evolution_v40',120),results:reranked.length?reranked:base.results,conversation_state:nextState,validation_v40:validation,evolution_v40:{...evolution,semantic_core_v35:finalSemanticCore,canonicalized_entity_v40:canonicalized.canonicalized,evidence_v36:evidenceAssessment,product_graph_v38:productGraphContextV38(finalGraph),memory_v37:memoryContextV37(finalMemory)},trace_v40:meta};
}

export function unifiedEvolutionHealthV40(){return {version:VERSION,mode:MODE,release:RELEASE,ready:true,enabled:isUnifiedEvolutionEnabledV40(),architecture:'single_evolution_orchestrator_over_v33_proven_core',base:unifiedIntelligenceHealthV33(),layers:{semantic_core_v35:semanticCoreHealthV35(),advanced_rag_v36:advancedRagHealthV36(),persistent_memory_v37:persistentMemoryHealthV37(),product_graph_v38:productGraphHealthV38(),agricultural_diagnostic_v39:agriculturalDiagnosticHealthV39(),autonomous_sales_v40:autonomousSalesHealthV40()},stats:{...stats}};}
export function isUnifiedEvolutionEnabledV40(){return boolEnv('AI_PIPELINE_V40',true)&&isUnifiedIntelligenceEnabledV33();}
export { rerankCandidatesV36 as rerankCandidatesV40 } from './advanced_rag_reranker_v36.js';
