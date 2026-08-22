import { searchProducts, searchSitePages, siteOrigin, fetchProduct } from "../lib/site.js";
import { cleanText, safeLocale, safePageUrl, jsonResponse, normalizeAr, tokenize } from "../lib/utils.js";
import { BUSINESS, CATEGORIES, CROPS, GREENHOUSE_KNOWLEDGE, TONE } from "../lib/brain.js";
import {
  analyzeTurn, mergeState, updateState, directReply, productMemoryReply,
  ambiguousContextReply, isClearlyOffDomain, pick
} from "../lib/dialogue.js";
import {
  buildSearchQuery, filterRankProducts, formatProductsForMemory,
  knownSeedFallback, productSearchQuickReplies, discoverMigFarmSeeds,
  mergeProducts, knownCategoryFallback
} from "../lib/catalog.js";
import {
  sanitizeCustomerProfile, extractCustomerSignals, mergeCustomerProfile,
  customerRepairReply
} from "../lib/customer.js";
import {
  leadScore, journeyStage, nextBestQuestion, buildWhatsAppHandoff,
  buildHandoffSummary, salesQuickReplies, purchaseContinuation, greenhouseLeadReply
} from "../lib/sales.js";
import { extendedKnowledgeReply, knowledgeStats } from "../lib/human_knowledge.js";
import { buildLearningEvent, logLearningEvent, assistantMeta } from "../lib/learning.js";
import { readServerSession, writeServerSession, mergeSessionState, mergeSessionProfile, sessionPersistenceMode } from "../lib/session_store.js";
import { searchProductIndex, productIndexStatus } from "../lib/product_index.js";
import { clientProducts, commerceCapabilities } from "../lib/commerce.js";
import { answerGitHubKnowledge, githubKnowledgeStatus } from "../lib/knowledge_loader.js";
import { enforceResponseQuality, conversationQualityMeta } from "../lib/quality.js";
import {
  buildCognitiveFrame, mergeCognitiveMemory, cognitiveProductDecision,
  cognitiveVisibleSetDecision, cognitiveResponseMeta, updateCognitiveDecisionMemory
} from "../lib/cognition.js";
import { evidenceSummary, detectEvidenceRisks } from "../lib/evidence.js";
import {
  semanticKnowledgeCandidates, semanticSiteCandidates, fuseRetrieval, composeHybridKnowledgeAnswer
} from "../lib/semantic_rag.js";
import {
  buildHybridPlan, mergeHybridMemory, criticReview, applyCriticGuard,
  hybridResponseMeta, episodicMemoryCandidates
} from "../lib/hybrid_brain.js";
import {
  mergeSemanticMemory, semanticMemoryCandidates, semanticMemoryCandidatesAdaptive, vectorMemoryHealth
} from "../lib/vector_memory.js";
import {
  buildKnowledgeGraph, knowledgeGraphSummary, knowledgeGraphContext
} from "../lib/knowledge_graph.js";
import {
  runNeuralAgent, shouldUseNeuralAgent, neuralBrainHealth, rewriteNaturalSalesReply
} from "../lib/neural_agent.js";
import {
  readPersistentSnapshot, writePersistentSnapshot, recordKnowledgeGaps, persistentStoreHealth
} from "../lib/persistent_store.js";
import {
  hydrateStateFromPersistent, hydrateProfileFromPersistent, buildRetrievalRoute,
  consolidatePersistentSnapshot, persistentMemoryCandidates, temporalMemoryCandidates,
  cognitiveOSMeta
} from "../lib/cognitive_os.js";
import {
  buildCommerceMission, optimizeLivePortfolio, deterministicComparison, verifyCommerceResponse,
  groundedCommerceFallback, autonomousCommerceMeta
} from "../lib/autonomous_commerce.js";
import {
  searchUaeAgriculture, answerUaeAgricultureKnowledge, uaeAgricultureHealth
} from "../lib/uae_agriculture_intelligence.js";
import {
  analyzeAgriculturalRequest, isAgriculturalExpertQuery, searchAgriculturalEngineering,
  diagnoseAgriculturalProblem, agricultureCalculator, answerAgriculturalEngineerKnowledge,
  agriculturalEngineerHealth
} from "../lib/agricultural_engineer.js";
import {
  analyzeSalesConversation, shouldUseAdaptiveSalesAgent, searchSalesPlaybook, salesReplyQuality
} from "../lib/sales_employee.js";
import {
  analyzeHumanConversationTurn, isolateStateForCurrentTurn, safeCurrentTurnFallback, humanConversationHealth
} from "../lib/human_conversation_brain.js";
import { buildConversionDecision, evaluateConversionReply } from "../lib/conversion_decision_brain.js";
import { searchAgriculturalMasterKnowledge, agriculturalMasterHealth } from "../lib/agricultural_master_knowledge.js";
import {
  searchProductDossiers, getProductDossier, compareProductDossiers, resolveProductEntityFuzzy,
  enrichLiveProductsWithDossiers, productIntelligenceHealth
} from "../lib/product_intelligence.js";
import {
  getStructuredProductFacts, buildProductTruth, getProductRelations, rankLiveAlternatives,
  buildVerifiedQuoteDraft, productTruthHealth
} from "../lib/product_truth_os.js";
import {
  normalizeVisionImages, buildVisionFrame, matchVisualProduct, guardVisualLabelClaim,
  searchVisualAgronomy, buildRetakeAdvice, enforceVisualReplySafety, visionHealth,
  updateActiveVisualContext, visualContextFallback, buildVisualGuidance, planVisualProductAction
} from "../lib/vision_intelligence.js";
import {
  normalizeProductReference, resolveProductContext, evolveProductContext,
  productContextHealth
} from "../lib/product_context_intelligence.js";
import {
  buildSemanticFrame, enrichAnalysisWithSemanticFrame, mergeHumanTurnWithSemanticFrame,
  semanticFrameForClient, semanticHumanBrainHealth
} from "../lib/semantic_human_brain.js";
import { handleAutonomousAction, autonomousActionHealth } from "../lib/autonomous_action_os.js";
import { evaluateAndRecordTurn, selfLearningHealth } from "../lib/self_learning_os.js";
import { detectCurrentTurnPriorityV27, quarantineCurrentTurnStateV27, currentTurnRouterHealthV27 } from "../lib/current_turn_router_v27.js";
import { buildCustomerBrainFrameV27, customerBrainHealthV27 } from "../lib/customer_brain_v27.js";
import { mergeCustomerMemoryV27, customerMemoryHealthV27 } from "../lib/customer_memory_v27.js";
import { auditCustomerResponseV27, enforceCustomerResponseV27, responseAuditorHealthV27 } from "../lib/response_auditor_v27.js";
import { customerKnowledgeHealthV27 } from "../lib/customer_knowledge_v27.js";
import { createSupervisorPlanV28, superviseResponseV28, enterpriseSupervisorHealthV28 } from "../lib/supervisor_v28.js";
import { retrieveEnterpriseKnowledgeV28, enterpriseRetrievalHealthV28 } from "../lib/enterprise_retrieval_v28.js";
import { buildEnterpriseTurnEventV28, recordEnterpriseTurnV28, enterpriseTelemetryHealthV28 } from "../lib/enterprise_telemetry_v28.js";
import {
  reasonConversationTurnV29, applyConversationReasoningV29, updateDialogueStateV29,
  composeNaturalResponseV29, contextualClarificationV29, trackConversationReasoningV29,
  conversationReasoningHealthV29
} from "../lib/conversation_reasoning_v29.js";
import { buildAutonomousCustomerPlanV30, constrainToolsWithPlanV30, autonomousCustomerOSHealthV30 } from "../lib/autonomous_customer_os_v30.js";
import { mergeCustomerDigitalTwinV30, customerDigitalTwinClientV30, customerDigitalTwinHealthV30 } from "../lib/customer_digital_twin_v30.js";
import { naturalConversationHealthV32 } from "../lib/natural_conversation_v32.js";
import { evaluateConfidenceGatewayV30, enforceConfidenceGatewayV30, confidenceGatewayHealthV30 } from "../lib/confidence_gateway_v30.js";
import { recordClosedLoopOutcomeV30, closedLoopLearningSnapshotV30, closedLoopLearningHealthV30 } from "../lib/closed_loop_learning_v30.js";
import {
  understandTurnV31, applyMeaningFrameV31, shouldQuarantineContextV31,
  allowLegacyRouteV31, allowLegacyCompoundV31, auditMeaningAlignmentV31,
  enforceMeaningAlignmentV31, meaningFrameClientV31, llmFirstHealthV31, parseAgriculturalProblemV31
} from "../lib/llm_first_orchestrator_v31.js";
import {
  createFinalTurnContract, finalizeProductionResponse,
  finalProductionHealth, finalProductionSnapshot
} from "../lib/final_production_os.js";
import {
  runUnifiedIntelligenceV33, unifiedIntelligenceHealthV33, isUnifiedIntelligenceEnabledV33, rerankCandidatesV33
} from "../lib/unified_intelligence_v33.js";
import {
  runUnifiedEvolutionV40, unifiedEvolutionHealthV40, isUnifiedEvolutionEnabledV40, rerankCandidatesV40
} from "../lib/unified_evolution_v40.js";

const V40_ENABLED=isUnifiedEvolutionEnabledV40();
const VERSION=V40_ENABLED?"40.0.0":isUnifiedIntelligenceEnabledV33()?"33.2.0":"31.0.0";
const MODE=V40_ENABLED?"unified_evolution_intelligence_v40":isUnifiedIntelligenceEnabledV33()?"unified_semantic_intelligence_v33":"llm_first_semantic_orchestrator_v31";
const DEFAULT_ORIGINS=["https://www.migfarm.com","https://migfarm.com","https://edu-mig-for-agriculture.odoo.com"];
const rateBuckets=globalThis.__migV7Rate || new Map();
globalThis.__migV7Rate=rateBuckets;

function allowedOrigins(){
  const configured=String(process.env.ALLOWED_ORIGINS||"").split(",").map(x=>x.trim()).filter(Boolean);
  return [...new Set([...DEFAULT_ORIGINS,...configured])];
}
function corsHeaders(origin){
  const approved=origin&&allowedOrigins().includes(origin);
  return {
    ...(approved?{"Access-Control-Allow-Origin":origin}:{}),
    "Access-Control-Allow-Methods":"POST, OPTIONS",
    "Access-Control-Allow-Headers":"Content-Type, X-AI-Debug-Token",
    "Access-Control-Max-Age":"86400","Vary":"Origin"
  };
}
function isAllowedOrigin(origin){ return !origin || allowedOrigins().includes(origin); }
function secureEqualV33(a="",b=""){const x=String(a),y=String(b);if(!x||x.length!==y.length)return false;let diff=0;for(let i=0;i<x.length;i++)diff|=x.charCodeAt(i)^y.charCodeAt(i);return diff===0;}
function rateLimit(key){
  const now=Date.now(),windowMs=60000,max=65,current=rateBuckets.get(key);
  if(rateBuckets.size>5000){ for(const [k,b] of rateBuckets){ if(now-b.startedAt>windowMs*5) rateBuckets.delete(k); } }
  if(!current||now-current.startedAt>windowMs){ rateBuckets.set(key,{startedAt:now,count:1}); return true; }
  current.count+=1; rateBuckets.set(key,current); return current.count<=max;
}
function normalizeHistory(value){
  return Array.isArray(value)?value.filter(x=>x&&["user","assistant"].includes(x.role)&&typeof x.content==="string")
    .slice(-18).map(x=>({role:x.role,content:cleanText(x.content,3500)})):[];
}
function normalizeProductContext(value){
  if(!value||typeof value!=="object"||Array.isArray(value)) return null;
  return {
    name:cleanText(value.name||value.title||"",500),
    sku:cleanText(value.sku||value.default_code||"",160),
    external_id:cleanText(value.external_id||"",180),
    product_id:Number.isFinite(Number(value.product_id))?Number(value.product_id):null,
    product_template_id:Number.isFinite(Number(value.product_template_id))?Number(value.product_template_id):null,
    price:cleanText(String(value.price??""),100),currency:cleanText(value.currency||"AED",20),
    availability:cleanText(value.availability||value.stock||"",100),description:cleanText(value.description||"",1800),
    url:safePageUrl(value.url||"")
  };
}
function normalizeSelectedProductContext(value){
  const v=normalizeProductContext(value);
  if(!v||(!v.name&&!v.sku&&!v.external_id)) return null;
  return v;
}
function normalizeSelectedProductContexts(value){
  return Array.isArray(value)?value.map(normalizeSelectedProductContext).filter(Boolean).slice(0,4):[];
}
const BOUND_PRODUCT_DETAIL_RX=/(تفاصيل المنتج|تفاصيله|تفاصيلها|استخدامه|استخدامها|بيستخدم|يستخدم في ايه|يستخدم في إيه|فايدته|فائدته|مواصفاته|مواصفاتها|مواصفات المنتج|product details|details|what is it for|use for)/i;
const BOUND_PRODUCT_PRICE_RX=/(بكام|بكم|السعر|سعره|سعرها|price|how much|cost)/i;
const BOUND_PRODUCT_AVAIL_RX=/(متوفر|متاح|موجود|المخزون|مخزون|available|availability|in stock|stock)/i;
function isGenericProductDetailRequest(message=""){
  const t=cleanText(message,800);
  return BOUND_PRODUCT_DETAIL_RX.test(t);
}
function conciseText(value="",max=900){
  const x=cleanText(value,max+200);
  return x.length>max?`${x.slice(0,max).trim()}…`:x;
}
function absoluteActions(actions=[]){
  const origin=siteOrigin();
  return actions.map(a=>{
    if(a?.type!=="page"||!a.url) return a;
    try{return {...a,url:new URL(a.url,origin).toString()};}catch{return a;}
  }).filter(Boolean);
}
function trustedPageUrl(pageUrl){
  if(!pageUrl) return false;
  try{
    const u=new URL(pageUrl);
    return new Set([new URL(siteOrigin()).origin,"https://www.migfarm.com","https://migfarm.com"]).has(u.origin);
  }catch{return false;}
}
async function resolveCurrentProduct(pageUrl,productContext){
  if(!trustedPageUrl(pageUrl)) return null;
  try{
    const u=new URL(pageUrl);
    if(!u.pathname.startsWith("/shop/")||u.pathname.startsWith("/shop/category/")) return null;
    try{const live=await fetchProduct(pageUrl); if(live?.name) return live;}catch{}
    return productContext?.name?productContext:null;
  }catch{return null;}
}
function pageReference(message=""){
  return /(هذا|هذي|ده|دي|هالمنتج|المنتج هذا|المنتج ده|سعره|سعرها|بكم|بكام|متوفر|تفاصيله|تفاصيلها|وش عنه|شو عنه)/.test(normalizeAr(message));
}
function currentProductReply(message,product,locale="ar"){
  if(!product||!pageReference(message)) return null;
  const t=normalizeAr(message); const name=product.name||"هالمنتج";
  const price=product.price?`${product.price} ${product.currency||"AED"}`:"السعر مب ظاهر";
  const availability=product.availability||"التوفر مب واضح";
  if(/سعر|بكم|بكام|كام/.test(t)) return `${name} سعره ${price}.`;
  if(/متوفر|موجود|التوفر/.test(t)) return `${name}: ${availability}.`;
  return `${name} — ${price}${availability?` - ${availability}`:""}${product.description?`\n${String(product.description).slice(0,500)}`:""}`;
}

function pageAnswer(pages=[],message="",locale="ar"){
  if(!pages.length) return null;
  const terms=tokenize(message).filter(x=>x.length>2);
  if(!terms.length) return null;
  const candidates=[];
  for(const page of pages){
    const text=`${page.title||""}. ${page.description||""}. ${page.text||""}`;
    const norm=normalizeAr(text);
    let pageScore=0;
    for(const term of terms) if(norm.includes(term)) pageScore+=2;
    if(pageScore<4) continue;
    const sentences=String(text).split(/(?<=[.!؟])\s+|\n+/).map(x=>x.trim()).filter(x=>x.length>30&&x.length<700);
    for(const sentence of sentences){
      const sn=normalizeAr(sentence); let score=pageScore;
      for(const term of terms) if(sn.includes(term)) score+=3;
      if(score>=7) candidates.push({sentence,score,page});
    }
  }
  candidates.sort((a,b)=>b.score-a.score);
  if(!candidates.length) return null;
  const top=candidates.slice(0,2);
  return {reply:locale==="en"?top.map(x=>x.sentence).join("\n"):`حسب المعلومات الموجودة في الموقع:\n${top.map(x=>x.sentence).join("\n")}`,page:top[0].page,confidence:top[0].score};
}

function uniqActions(actions=[]){
  const seen=new Set();
  return actions.filter(a=>{
    if(!a) return false;
    const key=`${a.type||""}:${a.url||""}:${a.label||""}`;
    if(seen.has(key)) return false;
    seen.add(key); return true;
  });
}

function sourceNeedsLearning(source=""){
  return /(fallback|no_live|clarify|repair|off_domain)/.test(String(source||""));
}

function editDistanceV33(a="",b=""){
  const x=normalizeAr(a),y=normalizeAr(b),row=Array.from({length:y.length+1},(_,i)=>i);
  for(let i=1;i<=x.length;i++){let previous=row[0];row[0]=i;for(let j=1;j<=y.length;j++){const saved=row[j];row[j]=Math.min(row[j]+1,row[j-1]+1,previous+(x[i-1]===y[j-1]?0:1));previous=saved;}}
  return row[y.length];
}
function fuzzyProductQueryV33(value=""){
  const words=cleanText(value,1000).split(/\s+/),concepts=[];
  for(const [key,item] of Object.entries(CROPS))for(const label of [item?.labelAr,key,...(item?.aliases||[])]){const text=cleanText(label,80);if(text&&/^[\p{L}]+$/u.test(text))concepts.push({text,key});}
  return words.map(word=>{const normalized=normalizeAr(word).replace(/[^\p{L}\p{N}]/gu,"");if(normalized.length<4)return word;let best=null;for(const item of concepts){const target=normalizeAr(item.text);if(Math.abs(target.length-normalized.length)>2)continue;const distance=editDistanceV33(normalized,target),ratio=distance/Math.max(normalized.length,target.length);if(ratio<=.3&&(!best||ratio<best.ratio))best={...item,ratio};}return best?CROPS[best.key]?.labelAr||best.text:word;}).join(" ");
}

async function makeResponse({payload={},status=200,cors={},sessionId,state,analysis,signals,profile,message,source="",results=[],locale="ar",cognition=null,decision=null,retrieval=null,plan=null}){
  const unifiedV40=payload?.__unified_v40===true;
  const unifiedV33=payload?.__unified_v33===true;
  const semanticFrame=state?.__semantic_frame||null;
  const conversationalReasoning=state?.__conversation_reasoning_v29||analysis?.__conversation_reasoning_v29||null;
  const meaningFrameV31=state?.__llm_first_meaning_v31||analysis?.__llm_first_meaning_v31||null;
  const autonomousCustomerPlan=state?.__autonomous_customer_os_v30||analysis?.__autonomous_customer_os_v30||buildAutonomousCustomerPlanV30({message,analysis,semanticFrame,reasoning:conversationalReasoning,state,profile,cognition,hasImages:Boolean(state?.__current_vision_frame?.has_visual_context)});
  const customerFrame=state?.__customer_brain_v27||buildCustomerBrainFrameV27({message,analysis,semanticFrame,state});
  const enterprisePlan=createSupervisorPlanV28({message,frame:customerFrame,analysis,hasImages:Boolean(state?.__current_vision_frame?.has_visual_context)});
  if(!unifiedV33){payload=composeNaturalResponseV29({payload,reasoning:conversationalReasoning,source});payload=enforceResponseQuality(payload);}
  const frame=cognition||buildCognitiveFrame({message,analysis,state,profile});
  const executionPlan=plan||buildHybridPlan({message,analysis,cognition:frame,state,profile});
  const retrievalBundle=retrieval||fuseRetrieval({
    message,
    products:Array.isArray(results)?results:[],
    memory:episodicMemoryCandidates(state?.hybrid_memory||{})
  });

  const evidence=evidenceSummary({source,payload,results,analysis});
  let review,customerAudit,supervision,enterpriseReview,confidenceAssessment,meaningAlignment,finalReview;
  if(unifiedV33){
    const unifiedValidation=payload?.unified_intelligence_v33?.validation||{};
    review={passed:unifiedValidation.accepted!==false,score:Number(unifiedValidation.score)||0,flags:[],source:"unified_validator_v33"};
    customerAudit=auditCustomerResponseV27({reply:payload?.reply||payload?.display_reply||"",frame:customerFrame,source,state});
    supervision={payload,review:{passed:review.passed,score:review.score,flags:[],source:"bypassed_for_single_v33_pipeline"}};
    enterpriseReview={...supervision.review,quality_score:review.score,passed:review.passed,missing_tasks:[],flags:[]};
    confidenceAssessment={version:"33.0",decision:review.passed?"send":"safe_degradation",confidence:Number(review.score||0)/100,source:"unified_validator_v33",reasons:[]};
    meaningAlignment={version:"33.0",passed:unifiedValidation.current_message_used!==false,score:Number(unifiedValidation.score)||0,flags:[],source:"unified_validator_v33",enforced:false};
    const unifiedContract=createFinalTurnContract({message,meaningFrame:meaningFrameV31||{},analysis,state,hasImages:Boolean(state?.__current_vision_frame?.has_visual_context)});
    finalReview={payload:{...payload,final_production_os:true},contract:unifiedContract,truth:{source,live:{price_verified:false,availability_verified:false},label:{verified:false},action:{verified:false},business:{verified:false},products:[]},audit:{passed:review.passed,score:review.score,flags:[],hard_blocks:[],source:"unified_validator_v33"},critic:{used:false,reason:"single_pipeline_validation_v33"},latency_ms:Math.max(0,Date.now()-(Number(state?.__v28_request_started_at)||Date.now()))};
    payload=finalReview.payload;
  }else{
    review=criticReview({payload,source,results,evidence,cognition:frame,retrieval:retrievalBundle,plan:executionPlan});
    payload=enforceCustomerResponseV27(enforceResponseQuality(applyCriticGuard(payload,review)),customerFrame);
    customerAudit=auditCustomerResponseV27({reply:payload?.reply||payload?.display_reply||"",frame:customerFrame,source,state});
    supervision=superviseResponseV28({payload,plan:enterprisePlan,frame:customerFrame,source,audit:customerAudit});
    payload=supervision.payload;
    customerAudit=auditCustomerResponseV27({reply:payload?.reply||payload?.display_reply||"",frame:customerFrame,source,state});
    enterpriseReview={...supervision.review,quality_score:customerAudit.score,passed:Boolean(supervision.review?.passed&&customerAudit.passed),missing_tasks:customerAudit.missing_tasks||[],flags:[...new Set([...(supervision.review?.flags||[]),...(customerAudit.dose_claim_risk?["unsafe_dosage_claim"]:[]),...(customerAudit.stale_context_risk?["stale_context"]:[])])]};
    confidenceAssessment=evaluateConfidenceGatewayV30({payload,plan:autonomousCustomerPlan,source,results,audit:customerAudit,review:enterpriseReview,evidence,reasoning:conversationalReasoning});
    payload=enforceConfidenceGatewayV30({payload,assessment:confidenceAssessment,reasoning:conversationalReasoning});
    meaningAlignment=auditMeaningAlignmentV31({message,frame:meaningFrameV31,payload,source});
    payload=enforceMeaningAlignmentV31({payload,frame:meaningFrameV31,audit:meaningAlignment});
    finalReview=await finalizeProductionResponse({message,payload,meaningFrame:meaningFrameV31||{},analysis,state,results,evidence,source,hasImages:Boolean(state?.__current_vision_frame?.has_visual_context),startedAt:Number(state?.__v28_request_started_at)||Date.now()});
    payload=finalReview.payload;
  }

  const next=updateState(state,analysis,message,source,results,payload);
  next.v=unifiedV33?33:31;
  next.final_release=unifiedV33?"UNIFIED_SEMANTIC_INTELLIGENCE_V33":"FINAL_PRODUCTION_OS";
  if(unifiedV33&&state?.intelligence_v33)next.intelligence_v33=state.intelligence_v33;
  next.dialogue_v29=updateDialogueStateV29({previous:state,next,analysis,message,source,payload,reasoning:conversationalReasoning});
  delete next.__v28_request_started_at;
  next.customer_brain_memory=mergeCustomerMemoryV27(state?.customer_brain_memory||{},customerFrame,next.turn);
  delete next.__customer_brain_v27;
  const activeVisual=updateActiveVisualContext(state?.active_visual_context||{},payload?.vision||state?.__current_vision_frame||{},payload?.visual_evidence||{},next.turn);
  if(activeVisual) next.active_visual_context=activeVisual; else delete next.active_visual_context;
  const productContextUpdate=evolveProductContext({previous:state,next,message,analysis,source,results,payload});
  if(productContextUpdate.active) next.active_product_context=productContextUpdate.active; else delete next.active_product_context;
  if(productContextUpdate.comparison) next.comparison_context=productContextUpdate.comparison; else delete next.comparison_context;
  let cognitiveMemory=mergeCognitiveMemory(state?.cognitive_memory||{},frame,next.turn);
  cognitiveMemory=updateCognitiveDecisionMemory(cognitiveMemory,decision);
  next.cognitive_memory=cognitiveMemory;

  const evidenceRisks=detectEvidenceRisks({source,payload,results});
  const cognitive=cognitiveResponseMeta({frame,memory:cognitiveMemory,decision,evidence,risks:[...evidenceRisks,...(review.flags||[])]});
  const preHybrid=hybridResponseMeta({plan:executionPlan,memory:state?.hybrid_memory||{},review,retrieval:retrievalBundle,evidence,cognition:cognitive});
  const hybridMemory=mergeHybridMemory(state?.hybrid_memory||{}, {
    message,analysis,state,profile,results,source,payload,decision,cognition:frame,
    retrieval:retrievalBundle,turn:next.turn,confidence:preHybrid.confidence
  });
  next.hybrid_memory=hybridMemory;
  const hybrid=hybridResponseMeta({plan:executionPlan,memory:hybridMemory,review,retrieval:retrievalBundle,evidence,cognition:cognitive});

  const semanticMemory=mergeSemanticMemory(state?.v11_memory||{}, {
    message,analysis,cognition:frame,decision,payload,source,turn:next.turn
  });
  next.v11_memory=semanticMemory;
  const semanticHits=semanticMemoryCandidates(message,semanticMemory,6);
  const responseGraph=buildKnowledgeGraph({message,analysis,state:next,profile,results,retrieval:retrievalBundle,memory:semanticHits});
  const priorPersistent=state?.__persistent_snapshot||{};
  const retrievalRoute=state?.__v12_route||buildRetrievalRoute({message,analysis,cognition:frame,persistent:priorPersistent});
  const neuralTrace=Array.isArray(payload?.neural_trace)?payload.neural_trace.slice(0,12):[];
  const neuralModel=String(payload?.neural_model||"");
  const neuralResponseId=String(payload?.neural_response_id||"");
  if(payload && typeof payload==="object"){
    delete payload.neural_trace; delete payload.neural_model; delete payload.neural_response_id;delete payload.__unified_v33;
  }

  const nextProfile=mergeCustomerProfile(profile,signals,analysis,next);
  const stage=journeyStage({analysis,profile:nextProfile,state:next,message,results});
  const lead=leadScore({analysis,profile:nextProfile,state:next,message,source,results});
  const handoffSummary=buildHandoffSummary({profile:nextProfile,state:next,analysis,message});
  const meta=assistantMeta({source,stage,lead,profile:nextProfile});
  const learning=buildLearningEvent({sessionId,message,analysis,profile:nextProfile,source,stage,lead});
  logLearningEvent(learning);

  next.customer_profile=nextProfile;
  next.sales_stage=stage;
  next.lead_score=lead.score;
  next.lead_temperature=lead.temperature;
  next.last_handoff_summary=handoffSummary.slice(0,1500);
  next.customer_digital_twin_v30=mergeCustomerDigitalTwinV30(state?.customer_digital_twin_v30||{}, {frame:customerFrame,analysis,semanticFrame,profile:nextProfile,reasoning:conversationalReasoning,turn:next.turn});

  const persistentSnapshot=consolidatePersistentSnapshot({
    previous:priorPersistent,state:next,profile:nextProfile,analysis,message,source,results,responseGraph,decision,route:retrievalRoute
  });
  const persistentHits=persistentMemoryCandidates(message,persistentSnapshot,6);
  let persistenceResult={persisted:false,reason:"not_attempted"};
  try{ persistenceResult=await writePersistentSnapshot(sessionId,persistentSnapshot); }
  catch(error){ persistenceResult={persisted:false,reason:String(error?.message||"persist_failed").slice(0,160)}; }
  const currentGapSet=[...(Array.isArray(decision?.knowledge_gaps)?decision.knowledge_gaps:[]),...(Array.isArray(payload?.knowledge_gaps)?payload.knowledge_gaps:[])].map(x=>String(x?.text||x||"").slice(0,220)).filter(Boolean);
  if(sourceNeedsLearning(source) && !currentGapSet.length){
    const unresolved=["unresolved",analysis?.intent||"unknown",analysis?.category?.key||next?.category||"",analysis?.crop?.key||next?.crop||""].filter(Boolean).join(":");
    currentGapSet.push(unresolved);
  }
  if(currentGapSet.length){ try{ await recordKnowledgeGaps([...new Set(currentGapSet)].slice(0,5)); }catch{} }
  const cognitiveOS=cognitiveOSMeta({snapshot:persistentSnapshot,route:retrievalRoute,persisted:persistenceResult.persisted,persistence_reason:persistenceResult.reason,persistent_hits:persistentHits.length});

  let actions=uniqActions(payload.suggested_actions||payload.actions||[]);
  if((stage==="ready"||stage==="handoff"||lead.temperature==="hot") && !actions.some(a=>a.type==="whatsapp")){
    actions.push(buildWhatsAppHandoff({profile:nextProfile,state:next,analysis,message}));
  }

  const quality=conversationQualityMeta({previous:state,next,analysis,message,source,payload,results});
  const selfLearning=evaluateAndRecordTurn({message,semanticFrame,analysis,payload,source,evidence,quality,actionState:payload?.autonomous_action||next?.autonomous_action});
  if(selfLearning.gap_fingerprint){try{await recordKnowledgeGaps([selfLearning.gap_fingerprint]);}catch{}}
  const autonomousMission=buildCommerceMission({message,analysis,cognition:frame,state:next,profile:nextProfile,locale});
  const autonomousMeta=autonomousCommerceMeta({mission:autonomousMission});
  const enterpriseEvent=buildEnterpriseTurnEventV28({sessionId,message,analysis,frame:customerFrame,source,audit:{...enterpriseReview,score:finalReview.audit.score,quality_score:finalReview.audit.score,flags:[...new Set([...(enterpriseReview.flags||[]),...(finalReview.audit.flags||[])])]},selfLearning,leadTemperature:lead.temperature,startedAt:Number(state?.__v28_request_started_at)||Date.now()});
  let enterpriseTelemetry={recorded:false,mode:"disabled",reason:"not_attempted"};
  try{enterpriseTelemetry=await recordEnterpriseTurnV28(enterpriseEvent);}catch(error){enterpriseTelemetry={recorded:false,mode:"memory",reason:String(error?.message||"telemetry_failed").slice(0,120)};}
  trackConversationReasoningV29(conversationalReasoning,source);
  const closedLoopOutcome=recordClosedLoopOutcomeV30({analysis,reasoning:conversationalReasoning,plan:autonomousCustomerPlan,assessment:confidenceAssessment,source,results});

  await writeServerSession(sessionId,{
    conversation_state:next,
    customer_profile:nextProfile,
    sales_stage:stage,
    lead_temperature:lead.temperature
  });

  return jsonResponse({
    session_id:sessionId,version:VERSION,mode:MODE,
    ...payload,
    suggested_actions:absoluteActions(actions),
    escalation:Boolean(payload.escalation||stage==="handoff"),
    conversation_state:next,
    customer_profile:nextProfile,
    sales_stage:stage,
    lead_score:lead.score,
    lead_temperature:lead.temperature,
    handoff_summary:handoffSummary,
    assistant_meta:meta,
    runtime:{
      session_persistence:sessionPersistenceMode(),
      persistent_cognitive_store:persistentStoreHealth(),
      product_index:productIndexStatus(),
      product_intelligence:productIntelligenceHealth(),
      product_truth_os:productTruthHealth(),
      product_context_intelligence:productContextHealth(),
      semantic_human_brain:semanticHumanBrainHealth(),
      current_turn_router:currentTurnRouterHealthV27(),
      customer_brain:customerBrainHealthV27(),
      customer_memory:customerMemoryHealthV27(),
      response_auditor:responseAuditorHealthV27(),
      conversation_knowledge:customerKnowledgeHealthV27(),
      enterprise_supervisor:enterpriseSupervisorHealthV28(),
      enterprise_retrieval:enterpriseRetrievalHealthV28(),
      enterprise_telemetry:enterpriseTelemetryHealthV28(),
      conversation_reasoning:conversationReasoningHealthV29(),
      llm_first_orchestrator:llmFirstHealthV31(),
      natural_conversation:naturalConversationHealthV32(),
      unified_evolution:unifiedEvolutionHealthV40(),
      unified_intelligence:unifiedIntelligenceHealthV33(),
      final_production_os:finalProductionHealth(),
      autonomous_customer_os:autonomousCustomerOSHealthV30(),
      customer_digital_twin:customerDigitalTwinHealthV30(),
      confidence_gateway:confidenceGatewayHealthV30(),
      closed_loop_learning:closedLoopLearningHealthV30(),
      autonomous_actions:autonomousActionHealth(),
      self_learning:selfLearningHealth(),
      vision_intelligence:visionHealth(),
      knowledge:githubKnowledgeStatus()
    },
    commerce:commerceCapabilities(),
    conversation_quality:quality,
    self_learning:selfLearning,
    autonomous_actions:{...autonomousActionHealth(),current_status:payload?.autonomous_action?.status||next?.autonomous_action?.status||"idle"},
    product_context_intelligence:{...productContextHealth(),event:productContextUpdate.event,active:Boolean(productContextUpdate.active),comparison_active:Boolean(productContextUpdate.comparison)},
    semantic_human_brain:{...semanticHumanBrainHealth(),frame:semanticFrameForClient(semanticFrame)},
    current_turn_router:currentTurnRouterHealthV27(),
    customer_brain:{...customerBrainHealthV27(),frame:customerFrame},
    customer_memory:{...customerMemoryHealthV27(),current:next.customer_brain_memory},
    response_auditor:{...responseAuditorHealthV27(),current:customerAudit},
    conversation_knowledge:customerKnowledgeHealthV27(),
    enterprise_platform:{version:unifiedV40?"40.0":unifiedV33?"33.0":"31.0",release:unifiedV40?"MIG_FARM_AI_V40_UNIFIED_EVOLUTION":unifiedV33?"UNIFIED_SEMANTIC_INTELLIGENCE_V33":"FINAL_PRODUCTION_OS",unified_evolution:unifiedEvolutionHealthV40(),unified_intelligence:unifiedIntelligenceHealthV33(),final_production_os:finalProductionHealth(),llm_first_orchestrator:llmFirstHealthV31(),natural_conversation:naturalConversationHealthV32(),autonomous_customer_os:autonomousCustomerOSHealthV30(),conversation_reasoning:conversationReasoningHealthV29(),supervisor:{plan:enterprisePlan,review:enterpriseReview},retrieval:enterpriseRetrievalHealthV28(),telemetry:{...enterpriseTelemetryHealthV28(),write:enterpriseTelemetry}},
    final_production:{...finalProductionHealth(),current:{contract:finalReview.contract,truth:finalReview.truth,audit:finalReview.audit,critic:finalReview.critic,latency_ms:finalReview.latency_ms},snapshot:finalProductionSnapshot()},
    llm_first_orchestrator:{...llmFirstHealthV31(),current:meaningFrameClientV31(meaningFrameV31||{})},
    meaning_alignment:{...meaningAlignment},
    conversation_reasoning:{...conversationReasoningHealthV29(),current:conversationalReasoning},
    autonomous_customer_os:{...autonomousCustomerOSHealthV30(),current_plan:autonomousCustomerPlan},
    customer_digital_twin:{...customerDigitalTwinHealthV30(),current:customerDigitalTwinClientV30(next.customer_digital_twin_v30)},
    confidence_gateway:{...confidenceGatewayHealthV30(),current:confidenceAssessment},
    closed_loop_learning:{...closedLoopLearningHealthV30(),outcome:closedLoopOutcome,snapshot:closedLoopLearningSnapshotV30()},
    cognitive,
    evidence,
    hybrid_brain:hybrid,
    cognitive_os:cognitiveOS,
    autonomous_commerce:autonomousMeta,
    uae_agriculture:uaeAgricultureHealth(),
    agricultural_engineer:agriculturalEngineerHealth(),
    neural_brain:{
      ...neuralBrainHealth(),
      used:String(source||"").startsWith("neural_"),
      model_used:neuralModel||undefined,
      response_id:neuralResponseId||undefined,
      tool_trace:neuralTrace,
      semantic_memory:{items:semanticMemory.items.length,recalled:semanticHits.length,engine:vectorMemoryHealth().local_embedding},
      knowledge_graph:knowledgeGraphSummary(responseGraph)
    },
    learning_event:sourceNeedsLearning(source)?learning:undefined,
    source
  },status,cors);
}

async function searchCatalog(analysis,state,message,history){
  const query=buildSearchQuery(analysis,state,message);
  let products=[];

  // V8.1.1: filter indexed candidates BEFORE deciding whether index coverage is enough.
  // A large generic seed index is not considered a valid tomato result set.
  try{
    const indexed=await searchProductIndex(query,analysis,state,12);
    products=filterRankProducts(indexed.products||[],analysis,state,message);
  }catch(error){ console.error("product index search failed",error?.message); }

  if(products.length<4){
    try{
      const liveRaw=await searchProducts(query,history,24);
      const live=filterRankProducts(liveRaw,analysis,state,message);
      products=filterRankProducts(mergeProducts(products,live),analysis,state,message);
    }catch(error){ console.error("product search failed",error?.message); }
  }

  const categoryKey=analysis.category?.key||state.category||"";
  if(categoryKey==="seeds" && products.length<4){
    try{
      const extra=await discoverMigFarmSeeds(analysis.crop?.key||state.crop||"",8);
      products=mergeProducts(products,extra);
    }catch(error){ console.error("seed sitemap discovery failed",error?.message); }
  }
  return {products,categoryKey,query};
}

function unionProductCandidatesV40(...groups){
  const out=[],seen=new Set();
  for(const group of groups){
    for(const item of Array.isArray(group)?group:[]){
      if(!item||typeof item!=="object") continue;
      const key=cleanText(item.external_id||item.sku||normalizeAr(item.name||item.title||""),260);
      if(!key||seen.has(key)) continue;
      seen.add(key);out.push(item);
      if(out.length>=24) return out;
    }
  }
  return out;
}

function seedCountSignalV40(item){
  if(!item)return null;
  const identifier=typeof item==="string"?item:(item.sku||item.external_id||item.name||item.title||"");
  if(!identifier)return null;
  try{
    const facts=getStructuredProductFacts(identifier);
    const hit=(facts?.explicit_facts||[]).find(x=>String(x?.kind||"").toLowerCase()==="seed_count");
    const m=String(hit?.value||"").match(/\d+/);
    return m?Number(m[0]):null;
  }catch{return null;}
}
function applyVariantContinuityV40(candidates=[],priorActive=null){
  const expected=seedCountSignalV40(priorActive);
  if(!expected)return Array.isArray(candidates)?candidates:[];
  return (Array.isArray(candidates)?candidates:[]).map(item=>{
    const current=seedCountSignalV40(item);
    return current===expected?{...item,score:(Number(item.score)||0)+180,v40_variant_continuity:true}:item;
  });
}

async function groundedUnifiedFallbackV33({context={},analysis={},state={},history=[],locale="ar",visionFrame=null}={}){
  const route=context?.route||{},activeState=context?.active_state||{},intent=route.primary_intent||"unknown",effectiveIntent=route.corrected_goal_intent||intent;
  const v40Context=context?.evolution_v40||null;
  const active=(activeState.active_products||[]).find(x=>x.entity_id===activeState.active_product_id)||(activeState.active_products||[])[0]||null;
  const identifier=cleanText(active?.sku||active?.external_id||active?.name||context.rewritten_query||context.current_message,900);
  if(route.kind==="multimodal"){
    const guidance=buildVisualGuidance({frame:visionFrame,activeContext:state?.active_visual_context||{},audit:{}});
    const reply=guidance?.retake?.ask_one||visualContextFallback({frame:visionFrame,activeContext:state?.active_visual_context||{}});
    return {payload:{reply,display_reply:reply,vision:{...(visionFrame||{}),engine:visionHealth(),fallback:true},visual_guidance:guidance},source:"unified_visual_safe_degradation_v33",results:[],evidence:[]};
  }
  const productLikeRoute=["product_exact","product_discovery","commerce"].includes(route.kind)||(route.kind==="multi_source"&&["product_search","product_details","known_product_info","price","availability","suitability","recommendation","compare","purchase","bundle","pack_size","sku"].includes(effectiveIntent));
  if(productLikeRoute){
    const relationship=cleanText(context.meaning?.topic_relationship||"",40),isCorrection=Boolean(activeState.last_correction)||relationship==="correction"||intent==="correction";
    const uncertainNewTopic=relationship==="new_topic"&&cleanText(context.meaning?.domain||"",40)==="unclear"&&intent==="unknown";
    const categoryContext=cleanText(active?.category||(activeState.visible_products||[])[0]?.category||"",180);
    const semanticQuery=fuzzyProductQueryV33(`${context.rewritten_query||context.current_message||identifier}${categoryContext?` | الفئة النشطة: ${categoryContext}`:""}`);
    const previous=(activeState.visible_products||[]).map(item=>getProductDossier(item.sku||item.external_id||item.name,{includeFull:false,includeHtml:false})).filter(Boolean);
    const retrievedBase=searchProductDossiers(semanticQuery,{limit:10,category:analysis?.category?.key||state?.category||""});
    const correctionTarget=cleanText(context?.meaning?.entities?.product_name||context?.semantic_core_v35?.active_entity?.name||active?.name||"",300);
    const priorStateV40=state?.intelligence_v33||{};
    const priorActiveV40=(priorStateV40.active_products||[]).find(x=>x.entity_id===priorStateV40.active_product_id)||(priorStateV40.active_products||[])[0]||null;
    const fuzzyRaw=applyVariantContinuityV40(resolveProductEntityFuzzy(correctionTarget||semanticQuery,{limit:8,descriptionChars:2600}),priorActiveV40);
    const fuzzy=fuzzyRaw.map(x=>({...x,v40_entity_lock_match:Boolean(correctionTarget),score:(Number(x.score)||0)+(correctionTarget?320:0)}));
    const retrieved=unionProductCandidatesV40(fuzzy,retrievedBase);
    const contextualFollowup=previous.length>0&&(relationship!=="new_topic"||uncertainNewTopic)&&(route.kind==="product_exact"||activeState.last_reference_resolution?.resolved||context.meaning?.reference?.requires_context);
    const previousScored=previous.map(x=>({...x,score:400}));
    const candidates=isCorrection?unionProductCandidatesV40(fuzzy,previous.map(x=>({...x,score:120})),retrieved):contextualFollowup?unionProductCandidatesV40(fuzzy,previousScored):retrieved;
    const dossiers=v40Context?rerankCandidatesV40({query:semanticQuery,candidates,conversationState:activeState,meaningFrame:context.meaning,semanticCore:context.semantic_core_v35||v40Context.semantic_core_v35||{},limit:6}):rerankCandidatesV33({query:semanticQuery,candidates,conversationState:activeState,meaningFrame:context.meaning,limit:6});
    const discoveryListIntent=["product_search","recommendation","compare","bundle"].includes(effectiveIntent);
    const resolvedFollowup=Boolean(active||context?.meaning?.reference?.requires_context||activeState?.last_reference_resolution?.resolved);
    if(route.kind==="product_discovery"&&discoveryListIntent&&!resolvedFollowup&&dossiers.length){
      const rows=dossiers.slice(0,4).map(item=>{const facts=getStructuredProductFacts(item.sku||item.external_id||item.name);return {item,facts,points:conciseVerifiedFacts(facts?.explicit_facts||[]).slice(0,2)};});
      const reply=`أقرب نتائج موثقة لطلبك من بيانات MIG FARM:\n${rows.map(({item,points},index)=>`${index+1}. ${item.name}${points.length?` — ${points.join("، ")}`:""}`).join("\n")}\n\nلو تقصد واحدًا منهم بالاسم، أكمل عليه مباشرة.`;
      const results=rows.map(({item})=>({name:item.name,sku:item.sku,external_id:item.external_id,category:item.category,description:conciseProductDescription(item.sales_description||item.ecommerce_description||""),source:"product_dossier_v20"}));
      return {payload:{reply,display_reply:reply,results},source:"unified_structured_product_degradation_v33",results,evidence:rows.map(({item,facts})=>({source_id:item.external_id,entity_id:item.external_id,entity_name:item.name,facts:facts?.explicit_facts||[],source:"product_dossier_v20"}))};
    }
    const directDossier=active?.sku||active?.external_id?getProductDossier(active.sku||active.external_id,{includeFull:false,includeHtml:false}):null;
    const dossier=(isCorrection&&dossiers[0])||(contextualFollowup&&dossiers[0])||directDossier||getProductDossier(identifier,{includeFull:false,includeHtml:false})||dossiers[0]||null;
    if(dossier){
      const facts=getStructuredProductFacts(dossier.sku||dossier.external_id||dossier.name),points=conciseVerifiedFacts(facts?.explicit_facts||[]);
      if(["price","availability","purchase"].includes(effectiveIntent))return null;
      const reply=effectiveIntent==="dosage"?`${dossier.name}: ما عنديش جرعة موثقة من ملصق مسجل أقدر أقولها بأمان. ابعت صورة واضحة للملصق عشان أراجعها من غير تخمين.`:points.length?`${dossier.name}${dossier.sku?` (${dossier.sku})`:""}\n• ${points.join("\n• ")}`:`لقيت ${dossier.name}، لكن التفصيلة اللي بتسأل عنها مش موجودة بشكل موثّق في بيانات المنتج. مش هخمّنها.`;
      const results=[{name:dossier.name,sku:dossier.sku,external_id:dossier.external_id,category:dossier.category,description:conciseProductDescription(dossier.sales_description||"")}];
      return {payload:{reply,display_reply:reply,results},source:"unified_structured_fact_degradation_v33",results,evidence:[{source_id:dossier.external_id,entity_id:dossier.external_id,entity_name:dossier.name,facts:facts?.explicit_facts||[],source:"product_dossier_v20"}]};
    }
  }
  if(route.kind==="technical"){
    const description=[activeState.active_crop?`المحصول ${activeState.active_crop}`:"",activeState.active_environment?`الزراعة ${activeState.active_environment}`:"",activeState.active_problem?.description||"",context.current_message].filter(Boolean).join(" — ");
    const diagnosis=diagnoseAgriculturalProblem(description,{analysis,state,profile:state?.customer_profile||{}});
    if(diagnosis?.handled){const hypotheses=(diagnosis.hypotheses||[]).slice(0,3).map((x,index)=>`${index+1}. ${x.hypothesis}`).join("\n"),checks=(diagnosis.first_steps||[]).slice(0,3).map(x=>`• ${x}`).join("\n"),question=cleanText((diagnosis.clarification_questions||[])[0]||"",300);const reply=`من الوصف، الاحتمالات الأقرب هي:\n${hypotheses||"محتاج معلومة إضافية قبل ترتيب الأسباب."}${checks?`\n\nافحص أولًا:\n${checks}`:""}${question?`\n\n${question}`:""}`;return {payload:{reply,display_reply:reply},source:"unified_differential_degradation_v33",results:[],evidence:diagnosis.hypotheses||[]};}
  }
  return null;
}


async function tryV22NeuralAgent({analysis,state,message,history,locale,profile,cognition,persistentSnapshot={},retrievalRoute=null,agriculturalContext=null,salesTurn=null,humanTurn=null,conversionDecision=null,currentProduct=null,sessionId="",images=[],visionFrame=null,semanticFrame=null,autonomousPlanV30=null,meaningFrameV31=null,force=false,unifiedContextV33=null,allowedToolsV33=null,validationRepairV33=null}){
  const plan=buildHybridPlan({message,analysis,cognition,state,profile});
  const mission=buildCommerceMission({message,analysis,cognition,state,profile,locale});
  if(!force&&!semanticFrame?.compound?.is_multi_intent && !shouldUseAdaptiveSalesAgent(message,salesTurn) && !shouldUseNeuralAgent({message,analysis,cognition,plan,salesTurn,image_count:images.length,semanticFrame}) && !["bundle","budget_optimize","solution_plan","compare","purchase"].includes(mission.kind)) return null;

  const isolated=humanTurn?.context_policy?.scope==="current_turn_isolated";
  const zeroTools=humanTurn?.tool_policy?.mode==="zero_tools";
  const recalled=(isolated||zeroTools)?{items:[],engine:"v18_current_turn_isolated"}:await semanticMemoryCandidatesAdaptive(message,state?.v11_memory||{},6);
  const persistentHits=(isolated||zeroTools)?[]:persistentMemoryCandidates(message,persistentSnapshot,6);
  const temporalHits=(isolated||zeroTools)?[]:temporalMemoryCandidates(message,persistentSnapshot,6);
  const seedGraph=(isolated||zeroTools)?{nodes:[],edges:[]}:buildKnowledgeGraph({message,analysis,state,profile,results:state?.visible_products||[],memory:[...(recalled.items||[]),...persistentHits]});
  const graphContext=(isolated||zeroTools)?[]:[...knowledgeGraphContext(persistentSnapshot?.graph||{}),...knowledgeGraphContext(seedGraph)].slice(0,20);
  const visionAudit={label_guard_results:[],visual_matches:[],live_visual_verifications:[],retake_advice:[],visual_action_plans:[]};

  const toolHandlers={
    search_catalog:async args=>{
      const query=cleanText(args?.query||message,700);
      const limit=Math.max(1,Math.min(8,Number(args?.limit)||6));
      const toolAnalysis=analyzeTurn(query,state,history,locale);
      if(!toolAnalysis.category&&analysis?.category) toolAnalysis.category=analysis.category;
      if(!toolAnalysis.crop&&analysis?.crop) toolAnalysis.crop=analysis.crop;
      if(!toolAnalysis.emirate&&analysis?.emirate) toolAnalysis.emirate=analysis.emirate;
      if(!toolAnalysis.cultivation&&analysis?.cultivation) toolAnalysis.cultivation=analysis.cultivation;
      const found=await searchCatalog(toolAnalysis,state,query,history);
      const live=clientProducts(found.products).slice(0,limit);
      return {query:found.query,category:found.categoryKey,products:enrichLiveProductsWithDossiers(live,{descriptionChars:1000})};
    },
    search_product_dossiers:async args=>{
      const query=fuzzyProductQueryV33(cleanText(args?.query||unifiedContextV33?.evolution_v40?.retrieval_v36?.query||unifiedContextV33?.rewritten_query||message,1600));
      const limit=Math.max(1,Math.min(10,Number(args?.limit)||6));
      const category=cleanText(args?.category||analysis?.category?.key||state?.category||"",120);
      const prior=(unifiedContextV33?.active_state?.visible_products||[]).map(item=>getProductDossier(item.sku||item.external_id||item.name,{includeFull:false,includeHtml:false})).filter(Boolean);
      const retrievedBase=searchProductDossiers(query,{limit:Math.min(12,limit*2),category,descriptionChars:2800});
      const activeStateV40=unifiedContextV33?.active_state||{};
      const activeV40=(activeStateV40.active_products||[]).find(x=>x.entity_id===activeStateV40.active_product_id)||(activeStateV40.active_products||[])[0]||null;
      const entityLockQuery=cleanText(unifiedContextV33?.evolution_v40?.semantic_core_v35?.active_entity?.name||activeV40?.name||"",300);
      const priorStateForVariant=state?.intelligence_v33||{};
      const priorActiveForVariant=(priorStateForVariant.active_products||[]).find(x=>x.entity_id===priorStateForVariant.active_product_id)||(priorStateForVariant.active_products||[])[0]||null;
      const fuzzyRaw=applyVariantContinuityV40(resolveProductEntityFuzzy(entityLockQuery||query,{limit:Math.min(8,limit),descriptionChars:2200}),priorActiveForVariant);
      const fuzzy=fuzzyRaw.map(x=>({...x,v40_entity_lock_match:Boolean(entityLockQuery),score:(Number(x.score)||0)+(entityLockQuery?320:0)}));
      const retrieved=unionProductCandidatesV40(fuzzy,retrievedBase);
      const relationship=cleanText(unifiedContextV33?.meaning?.topic_relationship||"",40),isCorrection=Boolean(unifiedContextV33?.active_state?.last_correction)||relationship==="correction";
      const contextual=prior.length>0&&relationship!=="new_topic"&&(unifiedContextV33?.meaning?.reference?.requires_context||unifiedContextV33?.route?.kind==="product_exact");
      const candidates=isCorrection?unionProductCandidatesV40(fuzzy,prior.map(x=>({...x,score:120})),retrieved):contextual?unionProductCandidatesV40(fuzzy,prior.map(x=>({...x,score:400}))):retrieved;
      const products=unifiedContextV33?.evolution_v40?rerankCandidatesV40({query,candidates,conversationState:unifiedContextV33?.active_state||{},meaningFrame:unifiedContextV33?.meaning||{},semanticCore:unifiedContextV33?.evolution_v40?.semantic_core_v35||{},limit}):rerankCandidatesV33({query,candidates,conversationState:unifiedContextV33?.active_state||{},meaningFrame:unifiedContextV33?.meaning||{},limit});
      return {query,product_intelligence:productIntelligenceHealth(),products,reranked:true};
    },
    get_product_dossier:async args=>{
      const identifier=cleanText(args?.identifier||message,900);
      const dossier=getProductDossier(identifier,{includeFull:Boolean(args?.include_full_description),includeHtml:false});
      return dossier?{identifier,product:dossier,policy:"Current price and availability must be checked with live Odoo before stating them as current."}:{identifier,error:"product_dossier_not_found"};
    },
    compare_product_dossiers:async args=>{
      const identifiers=Array.isArray(args?.identifiers)?args.identifiers.slice(0,6):[];
      const criteria=Array.isArray(args?.criteria)?args.criteria.slice(0,8):[];
      return compareProductDossiers(identifiers,criteria);
    },
    verify_live_product_truth:async args=>{
      const identifier=cleanText(args?.identifier||message,900);
      const query=cleanText(args?.query||identifier,900);
      const toolAnalysis=analyzeTurn(query,state,history,locale);
      const found=await searchCatalog(toolAnalysis,state,query,history);
      const live=enrichLiveProductsWithDossiers(clientProducts(found.products).slice(0,12),{descriptionChars:900});
      return {identifier,query,truth:buildProductTruth(identifier,live),live_candidates:live.slice(0,6),product_truth_os:productTruthHealth()};
    },
    get_product_relations:async args=>{
      const identifier=cleanText(args?.identifier||message,900);
      const relation=cleanText(args?.relation||"all",60);
      const limit=Math.max(1,Math.min(20,Number(args?.limit)||10));
      return getProductRelations(identifier,{relation,limit});
    },
    find_verified_alternatives:async args=>{
      const identifier=cleanText(args?.identifier||message,900);
      const limit=Math.max(1,Math.min(8,Number(args?.limit)||5));
      const target=getStructuredProductFacts(identifier);
      if(!target)return {identifier,error:"product_not_found_in_dossier"};
      const query=cleanText(`${target.category||""} ${Array.isArray(target.type)?target.type.join(" "):""}`,900)||target.name;
      let live=[];
      try{live=clientProducts(await searchProducts(query,history,36));}catch{}
      if(live.length<4){
        const toolAnalysis=analyzeTurn(query,state,history,locale);
        const found=await searchCatalog(toolAnalysis,state,query,history);
        live=clientProducts(mergeProducts(live,found.products||[]));
      }
      return {identifier,query,...rankLiveAlternatives(identifier,live,{limit}),live_checked:live.length};
    },
    build_verified_bundle:async args=>{
      const query=cleanText(args?.query||message,1000);
      const budget=Math.max(0,Number(args?.budget_aed)||0);
      const maxItems=Math.max(1,Math.min(6,Number(args?.max_items)||3));
      const toolAnalysis=analyzeTurn(query,state,history,locale);
      const found=await searchCatalog(toolAnalysis,state,query,history);
      const live=enrichLiveProductsWithDossiers(clientProducts(found.products),{descriptionChars:900});
      const bundleMission={...mission,kind:"bundle",budget_aed:budget||mission?.budget_aed||null,require_available:Boolean(args?.require_available),requested_count:maxItems};
      const portfolio=optimizeLivePortfolio({products:live,mission:bundleMission,maxItems});
      const verified=portfolio.products.map(p=>({product:p,truth:buildProductTruth(p.sku||p.name,[p])}));
      return {query,budget_aed:bundleMission.budget_aed,portfolio:{...portfolio,verified_products:verified},policy:"Bundle selection uses live Odoo price/availability. Product graph relationships do not prove compatibility."};
    },
    prepare_quote_draft:async args=>{
      const items=Array.isArray(args?.items)?args.items.slice(0,8):[];
      const allLive=[];
      for(const item of items){
        const identifier=cleanText(item?.identifier||"",500);if(!identifier)continue;
        try{const rows=clientProducts(await searchProducts(identifier,history,10));allLive.push(...rows);}catch{}
      }
      return buildVerifiedQuoteDraft(items,mergeProducts([],allLive));
    },
    match_visual_product:async args=>{
      const out=matchVisualProduct({...args,limit:Math.max(1,Math.min(10,Number(args?.limit)||6))});
      visionAudit.visual_matches.push(out);
      return out;
    },
    verify_visual_product_live:async args=>{
      const identifier=cleanText(args?.identifier||"",900);
      const query=cleanText(args?.query||identifier||message,900);
      if(!identifier)return {error:"visual_product_identifier_required"};
      const toolAnalysis=analyzeTurn(query,state,history,locale);
      const found=await searchCatalog(toolAnalysis,state,query,history);
      const live=enrichLiveProductsWithDossiers(clientProducts(found.products).slice(0,12),{descriptionChars:900});
      const out={identifier,query,truth:buildProductTruth(identifier,live),live_candidates:live.slice(0,6),policy:"Visual identity and live commerce are separate checks. Current price/availability require a verified live Odoo identity."};
      visionAudit.live_visual_verifications.push(out);
      return out;
    },
    guard_visual_label_claim:async args=>{
      const out=guardVisualLabelClaim(args||{});
      visionAudit.label_guard_results.push(out);
      return out;
    },
    search_visual_agronomy:async args=>{
      const query=cleanText(args?.query||message,1200);const crop=cleanText(args?.crop||analysis?.crop?.key||state?.crop||"",120);const limit=Math.max(1,Math.min(10,Number(args?.limit)||6));
      return {query,crop,items:searchVisualAgronomy(query,{crop,limit}),policy:"Visual triage only; combine with engineering differential diagnosis. Never infer pesticide dose from symptoms."};
    },
    get_retake_advice:async args=>{
      const latest=visionAudit.visual_matches.length?visionAudit.visual_matches[visionAudit.visual_matches.length-1]:null;
      const candidate=latest?.candidates?.[0]||state?.active_visual_context?.product_candidates?.[0]||null;
      const out=buildRetakeAdvice({...(visionFrame||{}),mode:cleanText(args?.mode||visionFrame?.mode||"",80)},{quality_issues:Array.isArray(args?.quality_issues)?args.quality_issues:[],previous_target:state?.active_visual_context?.last_retake_target||"",retake_count:Number(state?.active_visual_context?.retake_count||visionFrame?.prior_retake_count||0),candidate,identity_confidence:latest?.identity_confidence||state?.active_visual_context?.identity_confidence||""});
      visionAudit.retake_advice.push(out);
      return out;
    },
    plan_visual_product_action:async args=>{
      const latest=visionAudit.visual_matches.length?visionAudit.visual_matches[visionAudit.visual_matches.length-1]:null;
      const candidate=latest?.candidates?.[0]||state?.active_visual_context?.product_candidates?.[0]||null;
      const out=planVisualProductAction({intent:cleanText(args?.intent||visionFrame?.visual_intent||"general",40),identity_confidence:cleanText(latest?.identity_confidence||args?.identity_confidence||state?.active_visual_context?.identity_confidence||"",30),candidate_name:cleanText(candidate?.name||args?.candidate_name||"",500),candidate_sku:cleanText(candidate?.sku||args?.candidate_sku||"",200),live_verified:Boolean(args?.live_verified)||visionAudit.live_visual_verifications.some(x=>x?.truth?.identity?.live_verified===true),mode:cleanText(args?.mode||visionFrame?.mode||"",80),recognition_attempted:Boolean(latest?.recognition_attempted||latest?.query||Number(state?.active_visual_context?.recognition_attempts||0)>0),candidate_count:Number(latest?.candidate_count||latest?.candidates?.length||0),retake_count:Number(state?.active_visual_context?.retake_count||visionFrame?.prior_retake_count||0),new_image_evidence:Boolean(visionFrame?.new_image_evidence),top_margin:Number(latest?.top_margin||0)});
      visionAudit.visual_action_plans.push(out);
      return out;
    },
    search_knowledge:async args=>{
      const query=cleanText(args?.query||message,700);
      const limit=Math.max(1,Math.min(8,Number(args?.limit)||6));
      const toolAnalysis=analyzeTurn(query,state,history,locale);
      const managed=semanticKnowledgeCandidates(query,{locale,analysis:toolAnalysis,state,profile,cognition},limit);
      const deep=await retrieveEnterpriseKnowledgeV28(query,{limit,domain:semanticFrame?.entities?.categories?.[0]||agriculturalContext?.domain||"",frame:state?.__customer_brain_v27||null});
      const items=[...managed.map(x=>({id:x.id,title:x.title,answer:x.answer,verified:x.verified,source:x.source,score:x.score})),...deep.items].slice(0,limit);
      return {query,items,enterprise_knowledge:deep.trace};
    },
    search_uae_agriculture:async args=>{
      const query=cleanText(args?.query||message,700);
      const limit=Math.max(1,Math.min(8,Number(args?.limit)||6));
      const items=searchUaeAgriculture(query,{limit,regulationsOnly:false});
      return {query,verified_at:"2026-08-17",country:"UAE",items:items.map(x=>({id:x.id,title:x.topic,answer:x.answer_ar,authority:x.authority,source_url:x.source_url,verified_at:x.verified_at,kind:x.kind,score:x.score,warning:x.warning||undefined}))};
    },
    search_uae_regulations:async args=>{
      const query=cleanText(args?.query||message,700);
      const limit=Math.max(1,Math.min(8,Number(args?.limit)||6));
      const items=searchUaeAgriculture(query,{limit,regulationsOnly:true});
      return {query,verified_at:"2026-08-17",country:"UAE",freshness_warning:"Regulatory requirements, fees and implementing decisions can change; verify the cited official source before acting.",items:items.map(x=>({id:x.id,title:x.topic,answer:x.answer_ar,authority:x.authority,source_url:x.source_url,verified_at:x.verified_at,legal_reference:x.legal_reference||undefined,score:x.score,warning:x.warning||undefined}))};
    },
    search_site:async args=>{
      const query=cleanText(args?.query||message,700);
      const limit=Math.max(1,Math.min(8,Number(args?.limit)||6));
      const pages=await searchSitePages(query,limit);
      const items=semanticSiteCandidates(query,pages,limit);
      return {query,items:items.map(x=>({id:x.id,title:x.title,answer:x.answer,url:x.url,source:x.source,score:x.score}))};
    },
    recall_memory:async args=>{
      const query=cleanText(args?.query||message,700);
      const limit=Math.max(1,Math.min(8,Number(args?.limit)||6));
      const hit=await semanticMemoryCandidatesAdaptive(query,state?.v11_memory||{},limit);
      return {query,engine:hit.engine,items:(hit.items||[]).map(x=>({id:x.id,title:x.title,answer:x.answer,source:x.source,score:x.embedding_score??x.score}))};
    },
    recall_persistent_memory:async args=>{
      const query=cleanText(args?.query||message,700);
      const limit=Math.max(1,Math.min(8,Number(args?.limit)||6));
      const items=persistentMemoryCandidates(query,persistentSnapshot,limit);
      return {query,engine:"persistent_feature_hash",items};
    },
    search_temporal_memory:async args=>{
      const query=cleanText(args?.query||message,700);
      const limit=Math.max(1,Math.min(8,Number(args?.limit)||6));
      const items=temporalMemoryCandidates(query,persistentSnapshot,limit);
      return {query,warning:"historical_observations_not_current_truth",items};
    },
    search_agricultural_engineering:async args=>{
      const query=cleanText(args?.query||message,1000);
      const limit=Math.max(1,Math.min(12,Number(args?.limit)||8));
      const discipline=cleanText(args?.discipline||"",80);
      const crop=cleanText(args?.crop||agriculturalContext?.crop||"",80);
      const items=searchAgriculturalEngineering(query,{limit,discipline,crop});
      return {query,crop,discipline,items:items.map(x=>({id:x.id,title:x.topic,answer:x.body_ar,discipline:x.discipline,crop:x.crop||undefined,score:x.score,source:"agricultural_engineering_curriculum_v15"}))};
    },
    search_agricultural_master:async args=>{
      const query=cleanText(args?.query||message,1400);
      const limit=Math.max(1,Math.min(16,Number(args?.limit)||10));
      const domain=cleanText(args?.domain||"",100);
      const crop=cleanText(args?.crop||agriculturalContext?.crop||analysis?.crop?.key||"",100);
      const stage=cleanText(args?.stage||"",100);
      const items=searchAgriculturalMasterKnowledge(query,{limit,domain,crop,stage});
      return {query,crop,domain,stage,knowledge_pack:agriculturalMasterHealth(),items};
    },
    diagnose_crop_problem:async args=>{
      const description=cleanText(args?.description||message,1800);
      const result=diagnoseAgriculturalProblem(description,{analysis,state,profile});
      return {...result,source:"agricultural_differential_diagnosis_v15"};
    },
    agriculture_calculator:async args=>{
      const operation=cleanText(args?.operation||"",80);
      return agricultureCalculator(operation,args||{});
    },
    get_business_fact:async args=>{
      const topic=cleanText(args?.topic||"",80);
      const queryMap={shipping:"كم تكلفة الشحن؟",delivery_time:"كم مدة التوصيل؟",branches:"وين فروعكم؟",hours:"ما هي ساعات العمل؟",payment:"ما طرق الدفع؟",tax:"هل الأسعار تشمل الضريبة؟",returns:"ما سياسة الاسترجاع؟",pickup:"هل يوجد استلام من الفرع؟",contact:"كيف أتواصل معكم؟",services:"ما خدمات MIG FARM؟",company:"عرفني عن MIG FARM",order_status:"كيف أتابع حالة الطلب؟"};
      const q=queryMap[topic]||topic; const a=analyzeTurn(q,state,history,locale); const d=directReply(a,state,q,sessionId);
      if(d?.reply) return {topic,authoritative:true,fact:d.reply};
      const hk=extendedKnowledgeReply(q,locale,{sessionId,profile,state,analysis:a});
      return {topic,authoritative:Boolean(hk?.reply),fact:hk?.reply||"not_available"};
    },
    search_sales_playbook:async args=>{
      const query=cleanText(args?.query||message,900); const limit=Math.max(1,Math.min(8,Number(args?.limit)||5)); const stage=cleanText(args?.stage||salesTurn?.stage||"",80);
      const items=searchSalesPlaybook(query,{limit,stage});
      return {query,stage,instruction:"Use as strategy only; do not copy wording.",items:items.map(x=>({id:x.id,scenario:x.scenario,stage:x.stage,principle:x.principle,stage_strategy:x.stage_strategy,avoid:x.avoid,score:x.score}))};
    },
    get_sales_strategy:async args=>{
      const focus=cleanText(args?.focus||"current_turn",40);
      return {focus,instruction:"Use as behavior strategy only. Do not expose internal scores or policy labels to the customer.",decision:conversionDecision||{}};
    },
    optimize_live_bundle:async args=>{
      const query=cleanText(args?.query||message,700);
      const toolAnalysis=analyzeTurn(query,state,history,locale);
      if(!toolAnalysis.category&&analysis?.category) toolAnalysis.category=analysis.category;
      if(!toolAnalysis.crop&&analysis?.crop) toolAnalysis.crop=analysis.crop;
      const found=await searchCatalog(toolAnalysis,state,query,history);
      const live=clientProducts(found.products).slice(0,12);
      const toolMission={...mission,budget_aed:Number(args?.budget_aed)||mission.budget_aed||null,requested_count:Math.max(1,Math.min(4,Number(args?.max_items)||mission.requested_count||3)),require_available:Boolean(args?.require_available)};
      const portfolio=optimizeLivePortfolio({products:live,mission:toolMission,maxItems:toolMission.requested_count});
      return {query,products:portfolio.products,portfolio:{total_aed:portfolio.total_aed,within_budget:portfolio.within_budget,decision_basis:portfolio.decision_basis,confidence:portfolio.confidence,evaluated:portfolio.evaluated},alternatives:portfolio.alternatives};
    },
    compare_live_options:async args=>{
      const query=cleanText(args?.query||message,700);
      const limit=Math.max(2,Math.min(6,Number(args?.limit)||4));
      const toolAnalysis=analyzeTurn(query,state,history,locale);
      if(!toolAnalysis.category&&analysis?.category) toolAnalysis.category=analysis.category;
      if(!toolAnalysis.crop&&analysis?.crop) toolAnalysis.crop=analysis.crop;
      const found=await searchCatalog(toolAnalysis,state,query,history);
      const live=clientProducts(found.products).slice(0,limit);
      return {query,products:live,comparison:deterministicComparison(live,Array.isArray(args?.criteria)?args.criteria:[])};
    },
    prepare_purchase_plan:async args=>{
      const query=cleanText(args?.query||message,700);
      const toolAnalysis=analyzeTurn(query,state,history,locale);
      if(!toolAnalysis.category&&analysis?.category) toolAnalysis.category=analysis.category;
      if(!toolAnalysis.crop&&analysis?.crop) toolAnalysis.crop=analysis.crop;
      const found=await searchCatalog(toolAnalysis,state,query,history);
      const live=clientProducts(found.products).slice(0,12);
      const toolMission={...mission,kind:"purchase",budget_aed:Number(args?.budget_aed)||mission.budget_aed||null,requested_count:Math.max(1,Math.min(4,Number(args?.max_items)||mission.requested_count||3))};
      const portfolio=optimizeLivePortfolio({products:live,mission:toolMission,maxItems:toolMission.requested_count});
      return {query,products:portfolio.products,purchase_plan:{total_aed:portfolio.total_aed,within_budget:portfolio.within_budget,decision_basis:portfolio.decision_basis,order_placed:false,next_step:"customer_confirmation_or_cart"},alternatives:portfolio.alternatives};
    }
  };

  try{
    const result=await runNeuralAgent({
      message,locale,
      context:{unified_evolution_v40:unifiedContextV33?.evolution_v40||null,unified_intelligence_v33:unifiedContextV33,validation_repair_v33:validationRepairV33,final_production_contract:state?.__final_turn_contract||null,semantic_frame:semanticFrame,llm_first_meaning_v31:meaningFrameV31,analysis,state,profile:isolated?{}:profile,cognition,graph_context:graphContext,memory_hits:recalled.items||[],persistent_memory_hits:persistentHits,temporal_memory_hits:temporalHits,retrieval_route:retrievalRoute,journey:isolated?null:(persistentSnapshot?.journey||null),autonomous_customer_os_v30:autonomousPlanV30,autonomous_mission:{...mission,tool_budget:autonomousPlanV30?.tool_budget||semanticFrame?.plan?.tool_budget||mission?.tool_budget},agricultural_context:isolated?null:(agriculturalContext||analyzeAgriculturalRequest(message,{analysis,state,profile})),sales_turn:salesTurn,human_conversation:humanTurn,conversion_decision:isolated?null:conversionDecision,vision_context:visionFrame,recent_dialogue:isolated?[]:history.slice(-Math.max(0,Number(humanTurn?.context_policy?.history_turns??8))),current_product:isolated?null:currentProduct},
      toolHandlers,images,allowedTools:Array.isArray(allowedToolsV33)?allowedToolsV33:constrainToolsWithPlanV30(humanTurn?.tool_policy?.allowed,autonomousPlanV30||{})
    });
    if(!result?.handled||!result.reply) return null;
    const products=enrichLiveProductsWithDossiers(clientProducts(result.products||[]).slice(0,8),{descriptionChars:900});
    const portfolio=optimizeLivePortfolio({products,mission,maxItems:mission.requested_count||undefined});
    const verification=verifyCommerceResponse({reply:result.reply,products,mission,portfolio});
    const commerceCritical=Boolean(mission?.needs_live_catalog&&["recommend","compare","bundle","budget_optimize","solution_plan","purchase"].includes(mission.kind));
    let safeReply=(verification.ok||!commerceCritical)?result.reply:groundedCommerceFallback({mission,portfolio,products,locale});
    let conversationQuality=salesReplyQuality(safeReply,{...(salesTurn||{}),raw:message,history});
    let conversionQuality=evaluateConversionReply(safeReply,conversionDecision||{},message);
    let naturalizerMeta={used:false};
    // V17: one bounded rewrite pass only when the reply is structurally robotic/repetitive.
    // The rewriter is explicitly forbidden from adding or changing facts; commerce verification runs again afterwards.
    if(!force&&(conversationQuality.score<86 || conversionQuality.score<86) && result?.reply){
      const rewritten=await rewriteNaturalSalesReply({reply:safeReply,message,locale,salesTurn,history,semanticFrame});
      if(rewritten?.handled&&rewritten.reply){
        const reverify=verifyCommerceResponse({reply:rewritten.reply,products,mission,portfolio});
        if(reverify.ok||!commerceCritical){
          safeReply=rewritten.reply;
          conversationQuality=salesReplyQuality(safeReply,{...(salesTurn||{}),raw:message,history});
          conversionQuality=evaluateConversionReply(safeReply,conversionDecision||{},message);
          naturalizerMeta={used:true,response_id:rewritten.response_id||"",score:Math.min(conversationQuality.score,conversionQuality.score)};
        }
      }
    }
    // V18 semantic alignment guard: if an isolated/social/browse-only turn still leaks old agronomy or sales context, discard it.
    if(conversationQuality?.semantic_alignment?.aligned===false){
      if(["social","browse_only_social"].includes(humanTurn?.mode)){
        safeReply=safeCurrentTurnFallback(message,humanTurn);
        conversationQuality=salesReplyQuality(safeReply,{...(salesTurn||{}),raw:message,history});
        conversionQuality=evaluateConversionReply(safeReply,conversionDecision||{},message);
        naturalizerMeta={...naturalizerMeta,semantic_repair:"deterministic_current_turn_fallback"};
      }
    }
    // V22 deterministic visual safety gate runs after neural generation and naturalization.
    // It can veto unverified dosage or live-commerce claims even if the model attempted to answer them.
    const visualSafety=enforceVisualReplySafety({reply:safeReply,frame:visionFrame,trace:result.trace||[],audit:visionAudit});
    if(!visualSafety.ok){
      safeReply=visualSafety.reply;
      conversationQuality=salesReplyQuality(safeReply,{...(salesTurn||{}),raw:message,history});
      conversionQuality=evaluateConversionReply(safeReply,conversionDecision||{},message);
      naturalizerMeta={...naturalizerMeta,visual_safety_repair:visualSafety.reason};
    }
    const evidenceItems=(result.evidence||[]).map((x,i)=>({
      id:String(x?.id||`neural-${i}`),title:String(x?.title||""),answer:String(x?.answer||""),url:String(x?.url||""),
      source:String(x?.source||"neural_tool"),verified:Boolean(x?.verified),score:Number(x?.score||0)
    }));
    const structuredEvidence=(result.structured_evidence||[]).map((x,i)=>({
      id:`structured-${i}`,title:String(x?.tool||"verified_tool_output"),source:String(x?.tool||"structured_tool"),verified:true,data:x?.data||{}
    }));
    evidenceItems.push(...structuredEvidence);
    const retrieval=fuseRetrieval({message,products,knowledge:evidenceItems.filter(x=>x.source==="github_knowledge"),pages:evidenceItems.filter(x=>x.source==="site_page"),memory:recalled.items||[]});
    return {
      payload:{
        reply:safeReply,display_reply:safeReply,results:products,
        autonomous_plan:mission.tasks,autonomous_mission:mission.kind,autonomous_verification:verification,
        autonomous_portfolio:portfolio.handled?{total_aed:portfolio.total_aed,within_budget:portfolio.within_budget,decision_basis:portfolio.decision_basis,confidence:portfolio.confidence}:undefined,
        quick_replies:products.length?salesQuickReplies({category:analysis?.category?.key||state?.category,stage:"consider",results:products,profile}):[],
        neural_trace:result.trace||[],neural_model:result.model||"",neural_response_id:result.response_id||"",
        sales_conversation:{...conversationQuality,plan:salesTurn?.conversation_plan||null,human_turn:humanTurn||null,naturalizer:naturalizerMeta,conversion_quality:conversionQuality},
        conversion_decision:conversionDecision?{version:conversionDecision.version,stage:conversionDecision.stage,next_best_action:conversionDecision.next_best_action,friction:conversionDecision.friction,question_budget:conversionDecision.question_policy?.budget,close_allowed:conversionDecision.close_policy?.allowed}:undefined,
        human_conversation:humanTurn||null,
        vision:visionFrame?.has_visual_context?{...visionFrame,engine:visionHealth(),safety_gate:visualSafety,recognition_preflight_used:Boolean(result?.visual_recognition_preflight)}:undefined,
        visual_evidence:visionFrame?.has_visual_context?{visual_matches:visionAudit.visual_matches.slice(-3),live_visual_verifications:visionAudit.live_visual_verifications.slice(-3),label_guard_results:visionAudit.label_guard_results.slice(-3),retake_advice:visionAudit.retake_advice.slice(-2),visual_action_plans:visionAudit.visual_action_plans.slice(-2)}:undefined,
        visual_guidance:visionFrame?.has_visual_context?buildVisualGuidance({frame:visionFrame,activeContext:state?.active_visual_context||{},audit:visionAudit}):undefined
      },
      source:force?"unified_neural_generation_v33":"neural_multimodal_visual_recognition_sales_v22_5",results:products,evidence:evidenceItems,retrieval,plan
    };
  }catch(error){
    console.error("V22.5 multimodal neural fallback:",error?.message);
    return null;
  }
}


function productFactText(fact={}){
  return cleanText(fact?.label?`${fact.label}: ${fact.value}`:(fact?.text||fact?.value||""),260);
}
function naturalFactLabel(kind=""){
  const labels={seed_count:"عدد البذور",germination:"نسبة الإنبات",purity:"النقاوة",fruit_length:"طول الثمرة",color:"اللون",maturity:"النضج",resistance:"المقاومة",origin:"بلد المنشأ",storage:"التخزين",treatment:"المعاملة"};
  return labels[String(kind||"").toLowerCase()]||"معلومة موثقة";
}
function conciseVerifiedFacts(facts=[]){
  const grouped=new Map();
  for(const fact of Array.isArray(facts)?facts:[]){
    const kind=cleanText(fact?.kind||fact?.label||"fact",60),value=productFactText(fact);if(!value)continue;
    const previous=grouped.get(kind);const hasArabic=/[\u0600-\u06ff]/.test(value);
    if(!previous||hasArabic&&!/[\u0600-\u06ff]/.test(previous.value))grouped.set(kind,{kind,value});
  }
  return [...grouped.values()].slice(0,4).map(x=>`${naturalFactLabel(x.kind)}: ${x.value}`);
}
function naturalCategory(category=""){
  const value=cleanText(category,180);if(/cucumber seeds/i.test(value))return "بذور خيار";if(/tomato seeds/i.test(value))return "بذور طماطم";if(/pepper seeds/i.test(value))return "بذور فلفل";if(/seeds/i.test(value))return "بذور";return value;
}
function conciseProductDescription(value=""){
  let text=cleanText(value,1800).replace(/^[🥒🌱🍅🌶️\s]+/u,"").replace(/\s*المميزات الفنية[\s\S]*$/," ").replace(/\s*بيانات المنتج[\s\S]*$/," ");
  const marker=text.indexOf("الوصف العام");if(marker>=0)text=text.slice(marker+"الوصف العام".length).trim();
  return conciseText(text,460);
}
function verifiedFactsForBoundProduct(ctx={}){
  const identifier=cleanText(ctx.sku||ctx.external_id||ctx.name||"",500);if(!identifier)return null;
  const facts=getStructuredProductFacts(identifier);if(!facts)return null;
  const externalMatch=Boolean(ctx.external_id&&facts.external_id&&String(ctx.external_id)===String(facts.external_id));
  const skuMatch=Boolean(ctx.sku&&facts.sku&&normalizeAr(ctx.sku)===normalizeAr(facts.sku));
  const requestedName=normalizeAr(ctx.name||""),factName=normalizeAr(facts.name||"");
  const exactName=Boolean(requestedName&&factName&&requestedName===factName);
  const strongName=Boolean(requestedName.length>=10&&factName.length>=10&&(requestedName.includes(factName)||factName.includes(requestedName)));
  return externalMatch||skuMatch||exactName||strongName?facts:null;
}
function verifiedUseEvidence(dossier={},message=""){
  const targetMatch=normalizeAr(message).match(/(طماطم|بندور(?:ه|ة)?|خيار|فلفل|باذنجان|كوس(?:ه|ة)?|بطيخ|شمام|باميه|بامية|بصل|خس|سبانخ|ملفوف|ذره|ذرة|نخيل|بيت محمي|زراعه مكشوفه|زراعة مكشوفة|تربه|تربة|هيدروبونيك|زراعه مائيه|زراعة مائية|tomato|cucumber|pepper|eggplant|zucchini|watermelon|melon|okra|onion|lettuce|greenhouse|hydroponic)/i);
  if(!targetMatch)return {target:"",matches:[]};
  const target=normalizeAr(targetMatch[0]);
  const facts=(Array.isArray(dossier?.explicit_facts)?dossier.explicit_facts:[]).map(productFactText).filter(Boolean);
  const reliableDescription=dossier?.description_provenance==="generated_202"?"":cleanText(dossier?.sales_description||dossier?.ecommerce_description||"",5000);
  const sentences=[...facts,...reliableDescription.split(/(?<=[.!؟])\s+|\n+/)].map(x=>cleanText(x,420)).filter(x=>x&&normalizeAr(x).includes(target));
  return {target:targetMatch[0],matches:[...new Set(sentences)].slice(0,3)};
}

async function tryBoundProductContextReply({message="",selectedProduct=null,state={},history=[],locale="ar",intent=""}={}){
  const ctx=selectedProduct||null;
  if(!ctx) return null;
  const identifier=cleanText(ctx.sku||ctx.external_id||ctx.name||"",500);
  if(!identifier) return null;
  const verifiedFacts=verifiedFactsForBoundProduct(ctx);
  const wantsPrice=["price","price_and_availability"].includes(intent)||BOUND_PRODUCT_PRICE_RX.test(message);
  const wantsAvail=["availability","price_and_availability"].includes(intent)||BOUND_PRODUCT_AVAIL_RX.test(message);
  const wantsDetails=intent==="details"||BOUND_PRODUCT_DETAIL_RX.test(message);
  const wantsDose=intent==="dosage";
  const wantsSuitability=intent==="suitability";
  if(!wantsPrice&&!wantsAvail&&!wantsDetails&&!wantsDose&&!wantsSuitability) return null;

  if(wantsPrice||wantsAvail){
    if(!verifiedFacts)return {reply:`مش قادر أثبت هوية المنتج المحدد من كود أو ملف منتج مطابق، لذلك مش هربطه بسعر أو مخزون منتج تاني. اختاره من الكارت مرة ثانية أو اكتب SKU الصحيح.`,source:"v23_bound_product_identity_guard",bound_product:{sku:cleanText(ctx.sku||"",160)},intent:wantsPrice&&wantsAvail?"price_and_availability":wantsPrice?"price":"availability"};
    try{
      const verifiedIdentifier=verifiedFacts.sku||verifiedFacts.external_id||verifiedFacts.name;
      const live=clientProducts(await searchProducts(verifiedIdentifier,history,12));
      const truth=buildProductTruth(verifiedIdentifier,live);
      if(truth?.identity?.live_verified){
        const name=truth.identity.name||ctx.name||identifier;
        const parts=[];
        if(wantsPrice){
          const price=truth?.current?.price_aed;
          parts.push(price!==null&&price!==undefined?`السعر الحالي لـ ${name}: ${price} ${truth.current.currency||"AED"}.`:`السعر الحالي لـ ${name} مش ظاهر في Odoo دلوقتي، ومش هستخدم سعر قديم.`);
        }
        if(wantsAvail){
          const av=cleanText(truth?.current?.availability||"",160);
          parts.push(av?`حالة التوفر الحالية: ${av}.`:`Odoo مش مظهر حالة مخزون واضحة للمنتج دلوقتي، فمش هخمن.`);
        }
        return {reply:parts.join(" "),results:live.slice(0,4),source:"v23_bound_product_live_truth",bound_product:{name:truth.identity.name,sku:truth.identity.sku,external_id:truth.identity.external_id},intent:wantsPrice&&wantsAvail?"price_and_availability":wantsPrice?"price":"availability"};
      }
    }catch(error){console.error("V23 bound product live lookup failed",error?.message);}
    const requested=wantsPrice&&wantsAvail?"السعر والتوفر":wantsPrice?"السعر الحالي":"التوفر الحالي";
    return {reply:`أنا ما زلت مربوط بـ ${verifiedFacts.name||identifier}، لكن تعذر التحقق من ${requested} من Odoo Live الآن، لذلك مش هستخدم بيانات قديمة أو أخمن. جرّب بعد لحظات أو افتح صفحة المنتج.`,source:"v23_bound_product_live_unavailable",bound_product:{name:verifiedFacts.name,sku:verifiedFacts.sku,external_id:verifiedFacts.external_id},intent:wantsPrice&&wantsAvail?"price_and_availability":wantsPrice?"price":"availability"};
  }

  if(wantsDetails||wantsDose||wantsSuitability){
    const facts=verifiedFacts;
    const dossier=facts||null;
    if(!dossier) return {reply:`ملف المنتج المحدد مش متاح عندي بهوية مؤكدة. اختاره من كارت المنتج أو اكتب الاسم وSKU الصحيحين وأنا أراجعه بدون تخمين.`,source:"v23_bound_product_missing_dossier",bound_product:{sku:cleanText(ctx.sku||"",160)},intent:intent||"details"};
    const name=dossier.name||ctx.name||identifier;
    const sku=dossier.sku||ctx.sku||"";
    const category=naturalCategory(dossier.category||"");
    const provenance=dossier.description_provenance||"";
    const explicit=Array.isArray(dossier.explicit_facts)?dossier.explicit_facts.slice(0,10):[];
    const description=conciseProductDescription(dossier.sales_description||dossier.ecommerce_description||"");

    if(wantsDose){
      const doseFacts=explicit.map(productFactText).filter(x=>/(جرعه|جرعة|معدل|خلط|ملي|مل|لتر|هكتار|فدان|dose|dosage|rate|mix)/i.test(x));
      if(doseFacts.length)return {reply:`${name}${sku?` (${sku})`:""}\n\nبيانات الجرعة المكتوبة صراحة في ملف المنتج:\n• ${doseFacts.join("\n• ")}\n\nاتبع ملصق العبوة المسجلة؛ الجرعة قد تختلف حسب المحصول وطريقة التطبيق.`,source:"v23_bound_product_verified_dosage",bound_product:{name,sku,external_id:dossier.external_id||ctx.external_id||""},intent:"dosage",quick_replies:["هل متوفر؟","بكام؟"]};
      return {reply:`أنا مثبت المنتج على ${name}${sku?` (${sku})`:""}، لكن ما عنديش جرعة موثقة مكتوبة صراحة في ملفه. مش هطلع رقم من وصف عام؛ ابعت صورة واضحة لملصق الجرعة أو راجع مهندس MIG FARM.`,source:"v23_bound_product_dosage_guard",bound_product:{name,sku,external_id:dossier.external_id||ctx.external_id||""},intent:"dosage",quick_replies:["أرسل صورة الملصق","كلم المهندس"]};
    }

    if(wantsSuitability){
      const evidence=verifiedUseEvidence(dossier,message);
      if(evidence.target&&evidence.matches.length)return {reply:`بالنسبة لـ ${name}${sku?` (${sku})`:""}، لقيت في البيانات الموثقة ما يتعلق بـ ${evidence.target}:\n• ${evidence.matches.join("\n• ")}\n\nده مبني على النص المسجل للمنتج، وأي جرعة أو طريقة تطبيق تظل حسب الملصق.`,source:"v23_bound_product_verified_suitability",bound_product:{name,sku,external_id:dossier.external_id||ctx.external_id||""},intent:"suitability",quick_replies:["التفاصيل والاستخدام","هل متوفر؟"]};
      const target=evidence.target?` لـ ${evidence.target}`:" لهذا الاستخدام";
      return {reply:`أنا مثبت المنتج على ${name}${sku?` (${sku})`:""}، لكن ملاءمته${target} مش مذكورة بشكل مؤكد في بياناته عندي. عشان ما أديكش ترشيح غلط، ابعت صورة الملصق أو اذكر المحصول والمرحلة والمشكلة للفريق الهندسي.`,source:"v23_bound_product_suitability_guard",bound_product:{name,sku,external_id:dossier.external_id||ctx.external_id||""},intent:"suitability",quick_replies:["أرسل صورة الملصق","كلم المهندس"]};
    }

    let reply=`${name}${sku?`\nSKU: ${sku}`:""}`;
    if(category) reply+=`\nالفئة: ${category}`;
    const rows=conciseVerifiedFacts(explicit);
    if(rows.length) reply+=`\n\nالمهم بسرعة:\n• ${rows.join("\n• ")}`;
    if(description) reply+=`\n\nالاستخدام والوصف:\n${description}`;
    if(provenance==="generated_202") reply+=`\n\nملاحظة: الوصف عام؛ المواصفات الفنية المؤكدة هي النقط المكتوبة فوق فقط.`;
    return {reply,source:"v23_bound_product_dossier",bound_product:{name,sku,external_id:dossier.external_id||ctx.external_id||""},intent:"details",quick_replies:["بكام؟","هل متوفر؟","ينفع لاستخدامي؟"]};
  }
  return null;
}

async function tryBoundProductComparisonReply({products=[],message="",history=[],locale="ar"}={}){
  const refs=products.map(normalizeProductReference).filter(Boolean).slice(0,4);if(refs.length<2)return null;
  const rows=[];const rendered=[];
  const needsLive=BOUND_PRODUCT_PRICE_RX.test(message)||BOUND_PRODUCT_AVAIL_RX.test(message);
  for(const ref of refs){
    const identifier=cleanText(ref.sku||ref.external_id||ref.name||"",500);
    const facts=verifiedFactsForBoundProduct(ref);
    if(!facts)continue;
    let liveTruth=null;
    if(needsLive){
      try{const live=clientProducts(await searchProducts(identifier,history,10));liveTruth=buildProductTruth(identifier,live);if(liveTruth?.identity?.live_verified)rendered.push(...live.slice(0,2));}catch{}
    }
    rows.push({ref,facts,liveTruth});
  }
  if(rows.length<2)return {reply:"ما قدرتش أثبت هوية المنتجين من ملفات MIG FARM، فمش هعمل مقارنة تخمينية. اختر المنتجين من الكروت مرة ثانية.",source:"v23_comparison_identity_guard",bound_products:refs,intent:"comparison"};
  const blocks=rows.map(({ref,facts,liveTruth})=>{
    const name=facts.name||ref.name;const sku=facts.sku||ref.sku||"";
    const explicit=conciseVerifiedFacts(Array.isArray(facts.explicit_facts)?facts.explicit_facts:[]).slice(0,3);
    const lines=[`${name}${sku?`\n  SKU: ${sku}`:""}`];
    if(facts.category)lines.push(`  الفئة: ${naturalCategory(facts.category)}`);
    if(explicit.length)lines.push(...explicit.map(x=>`  ${x}`));else lines.push("  المواصفات الفارقة غير موثقة بشكل كافٍ في الملف.");
    if(needsLive){
      if(liveTruth?.identity?.live_verified){
        const price=liveTruth.current?.price_aed;const av=cleanText(liveTruth.current?.availability||"",120);
        lines.push(`  Odoo Live: ${price!==null&&price!==undefined?`${price} ${liveTruth.current.currency||"AED"}`:"السعر غير ظاهر"}${av?` — ${av}`:" — التوفر غير واضح"}`);
      }else lines.push("  Odoo Live: تعذر تثبيت السعر والتوفر حاليًا.");
    }
    return lines.join("\n");
  });
  const reply=`مقارنة موثقة وسريعة:\n\n${blocks.join("\n\n")}\n\nقارنت البيانات المثبتة فقط؛ أي مواصفة مش ظاهرة تظل غير مؤكدة.`;
  return {reply,source:"v23_bound_product_comparison",bound_products:rows.map(x=>({name:x.facts.name||x.ref.name,sku:x.facts.sku||x.ref.sku||"",external_id:x.facts.external_id||x.ref.external_id||""})),results:rendered.slice(0,4),intent:"comparison",quick_replies:["قارن السعر","قارن التوفر","اختار منتج تاني"]};
}

async function tryDeterministicVisualCommerce({frame={},activeContext={},history=[],locale="ar"}={}){
  if(!frame?.requires_live_product_truth)return null;
  const candidates=Array.isArray(activeContext?.product_candidates)?activeContext.product_candidates:[];const top=candidates[0];
  if(!top||String(activeContext?.identity_confidence||"")!=="high")return null;
  const identifier=cleanText(top.sku||top.name||"",500);if(!identifier)return null;
  try{
    const live=clientProducts(await searchProducts(identifier,history,12));
    const truth=buildProductTruth(identifier,live);
    if(!truth?.identity?.live_verified)return null;
    if(frame?.visual_intent==="availability"){
      const av=cleanText(truth?.current?.availability||"",160);const cls=truth?.current?.availability_class||"unknown";
      const reply=locale==="en"?(av?`I verified ${truth.identity.name} live in Odoo. Current availability: ${av}.`:`I verified the product identity, but Odoo is not exposing a clear stock status right now.`):(av?`أيوه، ثبتّ المنتج كـ ${truth.identity.name} وراجعت Odoo Live. حالة التوفر الحالية: ${av}.`:`ثبتّ المنتج كـ ${truth.identity.name}، لكن Odoo مش مظهر حالة مخزون واضحة حاليًا، فمش هخمن.`);
      return {reply,truth,results:live.slice(0,4),source:"v22_5_deterministic_visual_availability"};
    }
    if(frame?.visual_intent==="price"){
      const price=truth?.current?.price_aed;
      const reply=price!==null&&price!==undefined?(locale==="en"?`I verified ${truth.identity.name} live in Odoo. Current price: ${price} ${truth.current.currency||"AED"}.`:`ثبتّ المنتج كـ ${truth.identity.name} وراجعت Odoo Live. السعر الحالي ${price} ${truth.current.currency||"AED"}.`):(locale==="en"?`I verified the product identity, but a current price is not visible in Odoo right now.`:`ثبتّ المنتج، لكن السعر الحالي مش ظاهر في Odoo دلوقتي، فمش هستخدم سعر قديم.`);
      return {reply,truth,results:live.slice(0,4),source:"v22_5_deterministic_visual_price"};
    }
  }catch(error){console.error("V22.5 deterministic visual commerce failed",error?.message);}
  return null;
}

async function tryDeterministicAutonomousCommerce({analysis,state,message,history,locale,profile,cognition}){
  const mission=buildCommerceMission({message,analysis,cognition,state,profile,locale});
  if(!["compare","bundle","budget_optimize","solution_plan"].includes(mission.kind)) return null;
  if(mission.next_question){
    return {
      payload:{reply:mission.next_question.reply,quick_replies:mission.next_question.quick_replies||[],autonomous_plan:mission.tasks,autonomous_mission:mission.kind},
      source:"autonomous_clarification_v13",results:[],mission,portfolio:null,verification:null
    };
  }
  const found=await searchCatalog(analysis,state,message,history);
  const live=clientProducts(found.products||[]).slice(0,12);
  if(!live.length) return null;
  if(mission.kind==="compare"){
    const comparison=deterministicComparison(live,mission?.comparison_criteria||cognition?.constraints?.comparison_criteria||[]);
    const rows=comparison.products.slice(0,4);
    const cheapest=comparison.cheapest;
    const reply=locale==="en"
      ?`I verified ${rows.length} live options. ${cheapest?`The lowest visible price is ${cheapest.name} at ${cheapest.price} ${cheapest.currency||"AED"}.`:"Some prices are not visible, so I won't guess."}`
      :`راجعت ${rows.length} خيارات من المتجر الحي. ${cheapest?`أقل سعر ظاهر حاليًا هو ${cheapest.name} بسعر ${cheapest.price} ${cheapest.currency||"AED"}.`:"بعض الأسعار مش ظاهرة، فمش هخمن."}`;
    const verification=verifyCommerceResponse({reply,products:rows,mission});
    return {payload:{reply,display_reply:reply,results:rows,autonomous_plan:mission.tasks,autonomous_mission:mission.kind,autonomous_verification:verification},source:"autonomous_live_compare_v13",results:rows,mission,portfolio:null,verification};
  }
  const portfolio=optimizeLivePortfolio({products:live,mission,maxItems:mission.requested_count||undefined});
  if(!portfolio.handled) return null;
  const reply=groundedCommerceFallback({mission,portfolio,products:portfolio.products,locale});
  const verification=verifyCommerceResponse({reply,products:portfolio.products,mission,portfolio});
  return {
    payload:{
      reply,display_reply:reply,results:portfolio.products,
      autonomous_plan:mission.tasks,autonomous_mission:mission.kind,autonomous_verification:verification,
      autonomous_portfolio:{total_aed:portfolio.total_aed,within_budget:portfolio.within_budget,decision_basis:portfolio.decision_basis,confidence:portfolio.confidence,evaluated:portfolio.evaluated},
      decision_basis:portfolio.decision_basis
    },
    source:"autonomous_portfolio_v13",results:portfolio.products,mission,portfolio,verification
  };
}

function productNeedInTurn(analysis={}){
  return Boolean(analysis.category||analysis.crop||analysis.knownProduct||analysis.seedVarieties?.length);
}

async function multiIntentShippingProducts({analysis,state,message,history,locale,sessionId,profile,signals,cors,semanticFrame=null}){
  const semanticIntents=semanticFrame?.intents?.map(x=>x.name)||[];
  const shippingIntent=["delivery_time","shipping"].find(x=>semanticIntents.includes(x))||analysis.intent;
  const semanticProductNeed=semanticIntents.includes("product_search")&&Boolean(semanticFrame?.entities?.crops?.length||semanticFrame?.entities?.categories?.length);
  if(!["shipping","delivery_time"].includes(shippingIntent) || (!productNeedInTurn(analysis)&&!semanticProductNeed)) return null;
  const shippingAnalysis={...analysis,intent:shippingIntent};
  const shipping=directReply(shippingAnalysis,state,message,sessionId);
  const {products,categoryKey}=await searchCatalog(analysis,state,message,history);
  if(!shipping) return null;
  if(!products.length){
    return await makeResponse({
      payload:{reply:`${shipping.reply}\n\nوبالنسبة للمنتج: ما حصلت نتيجة مطابقة بشكل مؤكد في المتجر الحي.`,display_reply:shipping.reply,quick_replies:["دور بالاسم","كلم الفريق"],suggested_actions:shipping.actions||[]},
      cors,sessionId,state,analysis,signals,profile,message,source:"multi_shipping_no_product",locale
    });
  }
  const cleanResults=clientProducts(products);
  return await makeResponse({
    payload:{
      reply:`${shipping.reply}\n\n${formatProductsForMemory(products,locale,`${sessionId}:${message}`)}`,
      display_reply:`${shipping.reply}\nوبالنسبة للمنتج، حصلت لك ${products.length} خيارات مناسبة 👇`,
      results:cleanResults,
      quick_replies:salesQuickReplies({category:categoryKey,stage:"consider",results:cleanResults,profile}),
      suggested_actions:shipping.actions||[],
      multi_intent:true,
      brand_scope:categoryKey==="seeds"?"mig_farm_seeds_only":"category_filtered"
    },
    cors,sessionId,state,analysis,signals,profile,message,source:"multi_shipping_products",results:cleanResults,locale
  });
}

function compoundLabel(intent){
  return {branches:"الفروع",contact:"التواصل",hours:"الدوام",shipping:"التوصيل",payment:"الدفع",returns:"الاسترجاع",identity:"التعريف",social:"الرد",thanks:"الرد",price:"السعر",availability:"التوفر",product_details:"التفاصيل",product_search:"الاختيارات",purchase:"الطلب"}[intent]||intent;
}
function compactCompoundText(value="",intent=""){
  let text=cleanText(value,1200).replace(/\n{2,}/g,"\n");
  if(intent==="branches")text=text.replace(/\s*تحب بيانات (?:أنهي|أي) فرع[؟?.]*/i,"");
  return text.replace(/[؟?]+/g,".").trim();
}
function isExplicitActionCommandV27(message=""){return /(?:عرض سعر|كوتيشن|quotation|quote|جهز(?:لي| لي)? (?:عرض|الطلب|السله|السلة)|حضّر(?:لي| لي)? الطلب|prepare (?:a )?quote|عايز (?:اطلب|أطلب|اشتري|أشتري)|ابغي (?:اطلب|أطلب)|أبغي (?:اطلب|أطلب)|ابي (?:اطلب|أطلب)|أبي (?:اطلب|أطلب)|buy now|order this)/i.test(cleanText(message,1000));}
async function executeCustomerBrainCompoundV27({customerFrame,analysis,state,message,history,locale,sessionId}){
  if(!customerFrame?.can_execute_deterministically)return null;
  const tasks=customerFrame.tasks||[],lines=[],actions=[],handled=new Set();let liveResults=[];
  const business=new Set(["branches","contact","hours","shipping","payment","returns","identity","social","thanks"]);
  for(const task of tasks){
    if(!business.has(task.intent))continue;
    const direct=directReply({...analysis,intent:task.intent,semantic_intent:task.intent,semantic_intents:[task.intent]},quarantineCurrentTurnStateV27(state),message,sessionId);
    if(direct?.reply){lines.push(`**${compoundLabel(task.intent)}:** ${compactCompoundText(direct.reply,task.intent)}`);actions.push(...(direct.actions||[]));handled.add(task.intent);}
  }
  const productTasks=tasks.filter(x=>["price","availability","product_details","product_search","purchase"].includes(x.intent));
  if(productTasks.length){
    const identifier=cleanText(customerFrame.entities?.sku||customerFrame.entities?.product_reference||message,600);
    try{liveResults=clientProducts(await searchProducts(identifier||message,history,10)).slice(0,6);}catch(error){console.error("V27 compound live product lookup failed",error?.message);}
    const first=liveResults[0]||null,name=cleanText(first?.name||identifier||"المنتج",300);
    for(const task of productTasks){
      if(task.intent==="price")lines.push(`**السعر:** ${first?.price!==null&&first?.price!==undefined&&String(first.price)!==""?`${name}: ${first.price} ${first.currency||"AED"}.`:`السعر الحالي لـ ${name} محتاج مراجعة Odoo Live؛ مش هستخدم سعر قديم.`}`);
      else if(task.intent==="availability")lines.push(`**التوفر:** ${first?.availability?`${name}: ${cleanText(first.availability,140)}.`:`التوفر الحالي لـ ${name} محتاج مراجعة Odoo Live؛ مش هخمن المخزون.`}`);
      else if(task.intent==="product_details")lines.push(`**التفاصيل:** ${first?.description?`${name}: ${cleanText(first.description,650)}`:`ثبت اسم المنتج أو SKU أولًا عشان أجيب ملفه الصحيح بدون خلط.`}`);
      else if(task.intent==="product_search")lines.push(`**الاختيارات:** ${liveResults.length?`لقيت ${liveResults.length} خيارات من المتجر الحي وظهرتها تحت.`:`ما قدرتش أثبت نتيجة حية مطابقة، فمش هعرض منتج عشوائي.`}`);
      else if(task.intent==="purchase")lines.push(`**الطلب:** ${liveResults.length?`أقدر أكمّل اختيار ${name} بعد تحديد الكمية، لكن مش هقول إن الطلب تم قبل تأكيد التنفيذ.`:`لازم أثبت المنتج والكمية قبل تجهيز خطوة الشراء.`}`);
      handled.add(task.intent);
    }
  }
  if(handled.size!==tasks.length||!lines.length)return null;
  const reply=lines.join("\n\n");
  return {payload:{reply,display_reply:reply,results:liveResults,quick_replies:liveResults.length?salesQuickReplies({category:analysis?.category?.key||state?.category||"",stage:"consider",results:liveResults,profile:state?.customer_profile||{}}):[],suggested_actions:actions,multi_intent:true,customer_brain_execution:{version:"27.0",ordered_tasks:tasks.map(x=>x.intent),completed_tasks:[...handled],complete:true}},results:liveResults,source:"v27_customer_brain_compound"};
}

export async function OPTIONS(request){
  const origin=request.headers.get("origin")||"";
  if(!isAllowedOrigin(origin)) return new Response(null,{status:403});
  return new Response(null,{status:204,headers:corsHeaders(origin)});
}

export async function POST(request){
  const origin=request.headers.get("origin")||""; const cors=corsHeaders(origin);
  if(!isAllowedOrigin(origin)) return jsonResponse({error:"origin_not_allowed"},403,cors);
  let body; try{body=await request.json();}catch{return jsonResponse({error:"invalid_json"},400,cors);}
  const debugAuthorized=/^(?:1|true|yes|on)$/i.test(String(process.env.AI_DEBUG||""))&&Boolean(process.env.AI_DEBUG_TOKEN)&&body?.ai_debug===true&&secureEqualV33(request.headers.get("x-ai-debug-token")||"",process.env.AI_DEBUG_TOKEN);

  const images=normalizeVisionImages(body?.images||body?.attachments||body?.image_inputs||[]);
  const rawMessage=cleanText(body?.message,2500);
  const message=rawMessage || (images.length?"حلل الصور المرفقة وساعدني حسب اللي ظاهر فيها.":"");
  const sessionId=cleanText(body?.session_id,160)||crypto.randomUUID();
  const locale=safeLocale(body?.locale);
  const pageUrl=safePageUrl(body?.page_url);
  const pageTitle=cleanText(body?.page_title,500);
  const history=normalizeHistory(body?.history);
  const productContext=normalizeProductContext(body?.product_context);
  const selectedProductContext=normalizeSelectedProductContext(body?.selected_product_context||body?.chat_product_context);
  const selectedProductContexts=normalizeSelectedProductContexts(body?.selected_product_contexts||body?.comparison_product_contexts);
  const serverSession=await readServerSession(sessionId);
  const persistentRead=await readPersistentSnapshot(sessionId);
  const mergedIncomingState=mergeSessionState(serverSession,body?.conversation_state);
  const hydratedIncomingState=hydrateStateFromPersistent(mergedIncomingState,persistentRead.snapshot);
  const state=mergeState(hydratedIncomingState,history);
  state.__v28_request_started_at=Date.now();
  state.__persistent_snapshot=persistentRead.snapshot;
  state.__persistent_read={persisted:persistentRead.persisted,reason:persistentRead.reason};
  const activeVisualInput={...(state?.active_visual_context||{}),current_turn:Number(state?.turn||0)+1};
  const visionFrame=buildVisionFrame(message,images,activeVisualInput,{visual_context_reused:Boolean(body?.visual_context_reused)});
  state.__current_vision_frame=visionFrame;
  const mergedIncomingProfile=mergeSessionProfile(serverSession,body?.conversation_state?.customer_profile||body?.customer_profile);
  const persistentProfile=hydrateProfileFromPersistent(mergedIncomingProfile,persistentRead.snapshot);
  const existingProfile=sanitizeCustomerProfile(persistentProfile);
  const analysis=analyzeTurn(message,state,history,locale);
  let semanticFrame=buildSemanticFrame({message,analysis,state,history,selectedProduct:selectedProductContext,selectedProducts:selectedProductContexts});
  enrichAnalysisWithSemanticFrame(analysis,semanticFrame);
  const conversationalReasoning=reasonConversationTurnV29({message,state,history,analysis,semanticFrame});
  applyConversationReasoningV29(analysis,conversationalReasoning);
  Object.defineProperty(analysis,"__conversation_reasoning_v29",{value:conversationalReasoning,enumerable:false,configurable:true});
  semanticFrame=buildSemanticFrame({message,analysis,state,history,selectedProduct:selectedProductContext,selectedProducts:selectedProductContexts});
  enrichAnalysisWithSemanticFrame(analysis,semanticFrame);
  if(conversationalReasoning?.resolution?.resolved&&analysis.intent){
    semanticFrame.contextual_resolution_v29={kind:conversationalReasoning.resolution.kind,field:conversationalReasoning.resolution.field,confidence:conversationalReasoning.resolution.confidence};
    semanticFrame.primary_intent=analysis.intent;
    if(!semanticFrame.intents?.some(item=>item.name===analysis.intent))semanticFrame.intents=[{name:analysis.intent,confidence:conversationalReasoning.resolution.confidence,evidence:"v29_context_resolution"},...(semanticFrame.intents||[])];
  }
  const meaningFrameV31=await understandTurnV31({message,history,state,legacyAnalysis:analysis,legacySemanticFrame:semanticFrame,selectedProduct:selectedProductContext,selectedProducts:selectedProductContexts,hasImages:images.length>0,locale});
  applyMeaningFrameV31(analysis,semanticFrame,meaningFrameV31);
  Object.defineProperty(analysis,"__llm_first_meaning_v31",{value:meaningFrameV31,enumerable:false,configurable:true});
  state.__semantic_frame=semanticFrame;
  state.__conversation_reasoning_v29=conversationalReasoning;
  state.__llm_first_meaning_v31=meaningFrameV31;
  state.__final_turn_contract=createFinalTurnContract({message,meaningFrame:meaningFrameV31,analysis,state,hasImages:images.length>0});
  const customerFrame=buildCustomerBrainFrameV27({message,analysis,semanticFrame,state});
  state.__customer_brain_v27=customerFrame;
  const signals=extractCustomerSignals(message,analysis,state);
  const profile=mergeCustomerProfile(existingProfile,signals,analysis,state);
  const cognition=buildCognitiveFrame({message,analysis,state,profile,history});
  const retrievalRoute=buildRetrievalRoute({message,analysis,cognition,persistent:persistentRead.snapshot});
  const agriculturalContext=analyzeAgriculturalRequest(message,{analysis,state,profile});
  const legacyHumanTurn=analyzeHumanConversationTurn(message,{analysis,state,profile,history,agriculturalContext,visionContext:visionFrame});
  const humanTurn=mergeHumanTurnWithSemanticFrame(legacyHumanTurn,semanticFrame);
  const autonomousPlanV30=buildAutonomousCustomerPlanV30({message,analysis,semanticFrame,reasoning:conversationalReasoning,state,profile,cognition,hasImages:images.length>0,humanTurn});
  state.__autonomous_customer_os_v30=autonomousPlanV30;
  Object.defineProperty(analysis,"__autonomous_customer_os_v30",{value:autonomousPlanV30,enumerable:false,configurable:true});
  const turnState=shouldQuarantineContextV31(meaningFrameV31)?quarantineCurrentTurnStateV27(state):isolateStateForCurrentTurn(state,humanTurn);
  turnState.__customer_brain_v27=customerFrame;
  turnState.__semantic_frame=semanticFrame;
  turnState.__conversation_reasoning_v29=conversationalReasoning;
  turnState.__autonomous_customer_os_v30=autonomousPlanV30;
  turnState.__llm_first_meaning_v31=meaningFrameV31;
  turnState.__final_turn_contract=state.__final_turn_contract;
  turnState.__persistent_snapshot=state.__persistent_snapshot;
  turnState.__persistent_read=state.__persistent_read;
  turnState.__v28_request_started_at=state.__v28_request_started_at;
  const salesTurn=analyzeSalesConversation(message,{analysis,state:turnState,profile,history,agriculturalContext,humanTurn});
  const conversionDecision=buildConversionDecision({message,analysis,profile,state:turnState,history,humanTurn,salesTurn,agriculturalContext});
  salesTurn.conversion_decision=conversionDecision;
  if(conversionDecision?.question_policy) salesTurn.conversation_plan.question_budget=Math.min(Number(salesTurn.conversation_plan.question_budget??1),Number(conversionDecision.question_policy.budget??1));
  if(conversionDecision?.response_contract?.no_pressure){salesTurn.conversation_plan.should_sell=false;salesTurn.conversation_plan.micro_commitment=false;}
  salesTurn.history=history.slice(-Math.max(0,Number(humanTurn?.context_policy?.history_turns??8)));
  state.__v12_route=retrievalRoute;

  if(!message) return await makeResponse({payload:{reply:locale==="en"?"Write a message first.":"اكتب سؤالك أول."},status:400,cors,sessionId,state,analysis,signals,profile,message,source:"empty",locale});

  const ip=(request.headers.get("x-forwarded-for")||"unknown").split(",")[0].trim();
  if(!rateLimit(`${ip}:${sessionId}`)) return await makeResponse({payload:{reply:locale==="en"?"Too many messages. Try again in a minute.":"رسائل وايد بسرعة 😄 جرّب عقب دقيقة."},status:429,cors,sessionId,state,analysis,signals,profile,message,source:"rate_limit",locale});

  // V33.2 server-authoritative action-state priority. A confirmation/cancellation
  // for an already pending action is a state transition, not a conversational
  // intent. Resolve it before generation so clarification or stale context can
  // never override an explicit confirmation/cancellation. New actions are still
  // proposed by the normal semantic pipeline below.
  const earlyActionRequest=body?.autonomous_action_request||body?.action_request||null;
  const hasPendingServerAction=state?.autonomous_action?.active&&state.autonomous_action.status==="awaiting_confirmation";
  if(earlyActionRequest||hasPendingServerAction){
    const earlyActionOutcome=await handleAutonomousAction({
      message,semanticFrame,state,locale,
      selectedProduct:selectedProductContext||null,
      selectedProducts:selectedProductContexts,
      actionRequest:earlyActionRequest,
      resolvePendingOnly:true
    });
    if(earlyActionOutcome?.state)state.autonomous_action=earlyActionOutcome.state;
    if(earlyActionOutcome?.handled)return await makeResponse({
      payload:earlyActionOutcome.payload||{},cors,sessionId,state,analysis,signals,profile,message,
      source:earlyActionOutcome.source||"v25_autonomous_action",results:earlyActionOutcome.state?.lines||[],locale,cognition
    });
  }

  // V40 is the single user-facing evolution pipeline by default. It extends the
  // proven V33.2 semantic core with V35–V40 capabilities while keeping V33 as
  // an explicit rollback path when AI_PIPELINE_V40=false.
  if(isUnifiedEvolutionEnabledV40()){
    try{
      const evolutionTurnState={...state};
      const unified=await runUnifiedEvolutionV40({
        message,conversationId:sessionId,state:evolutionTurnState,history,meaningFrame:meaningFrameV31,semanticFrame,analysis,
        selectedProduct:selectedProductContext,selectedProducts:selectedProductContexts,visionFrame,
        salesTurn,conversionDecision,autonomousPlan:autonomousPlanV30,
        generate:async context=>tryV22NeuralAgent({
          analysis,state:{...evolutionTurnState,intelligence_v33:context.active_state},message,history,locale,profile,cognition,
          persistentSnapshot:persistentRead.snapshot,retrievalRoute,agriculturalContext,salesTurn,humanTurn,conversionDecision,
          currentProduct:selectedProductContext||null,sessionId,images,visionFrame,semanticFrame,autonomousPlanV30,meaningFrameV31,
          force:true,unifiedContextV33:context,allowedToolsV33:[...new Set([...(context.route?.allowed_tools||[]),...(context.diagnostic_v39?.allowed_tools||[])])],validationRepairV33:context.validation_repair
        }),
        fallback:async context=>groundedUnifiedFallbackV33({context,analysis,state:evolutionTurnState,history,locale,visionFrame})
      });
      if(debugAuthorized)unified.payload.ai_debug={version:"40.0.0",trace_id:unified.trace_v40?.trace_id||unified.trace?.trace_id||null,meaning:{provider:meaningFrameV31?.provider||null,primary_intent:meaningFrameV31?.primary_intent||"unknown",intents:meaningFrameV31?.intents||[],domain:meaningFrameV31?.domain||"unclear",topic_relationship:meaningFrameV31?.topic_relationship||"unclear",reference:meaningFrameV31?.reference||null},active_state:unified.conversation_state,route:unified.route,rewritten_query:unified.evolution_v40?.retrieval_v36?.query||unified.rewritten_query,retrieval:{result_count:unified.results?.length||0,evidence_count:unified.evidence?.length||0,assessment:unified.evolution_v40?.evidence_v36||null},validation:unified.validation_v40||unified.validation,layers:unified.evolution_v40||null,source:unified.source};
      evolutionTurnState.intelligence_v33=unified.conversation_state;
      evolutionTurnState.intelligence_v40=unified.conversation_state;
      evolutionTurnState.persistent_memory_v37=unified.conversation_state?.persistent_memory_v37||evolutionTurnState.persistent_memory_v37;
      return await makeResponse({payload:unified.payload,cors,sessionId,state:evolutionTurnState,analysis,signals,profile,message,source:unified.source,results:unified.results,locale,cognition,retrieval:unified.retrieval,plan:unified.plan});
    }catch(error){
      console.error("V40 unified evolution failed",error?.message);
      const reply=locale==="en"?"I received your message, but the intelligence service is temporarily unavailable. Please retry in a moment.":"وصلتني رسالتك، لكن خدمة الفهم الذكي متوقفة مؤقتًا. جرّب إعادة المحاولة بعد لحظة بدل ما أرد عليك بتخمين.";
      return await makeResponse({payload:{reply,display_reply:reply,__unified_v40:true,unified_evolution_v40:{version:"40.0.0",route:"safe_failure",validation:{accepted:true,score:100},fallback_reason:"pipeline_exception"}},cors,sessionId,state:turnState,analysis,signals,profile,message,source:"unified_pipeline_safe_failure_v40",locale,cognition});
    }
  }

  // V33 is the only user-facing intelligence pipeline by default. Older V15–V32
  // routes below are retained solely as an explicit rollback path when
  // AI_PIPELINE_V33=false; they never compete with V33 for the final answer.
  if(isUnifiedIntelligenceEnabledV33()){
    try{
      // V33 owns context priority, correction handling and topic isolation. Do not
      // feed it the legacy V31 quarantine result, because that can erase the very
      // candidate set a correction or pronoun needs before V33 resolves meaning.
      const unifiedTurnState={...state};
      const unified=await runUnifiedIntelligenceV33({
        message,conversationId:sessionId,state:unifiedTurnState,history,meaningFrame:meaningFrameV31,semanticFrame,analysis,
        selectedProduct:selectedProductContext,selectedProducts:selectedProductContexts,visionFrame,
        generate:async context=>tryV22NeuralAgent({
          analysis,state:{...unifiedTurnState,intelligence_v33:context.active_state},message,history,locale,profile,cognition,
          persistentSnapshot:persistentRead.snapshot,retrievalRoute,agriculturalContext,salesTurn,humanTurn,conversionDecision,
          currentProduct:selectedProductContext||null,sessionId,images,visionFrame,semanticFrame,autonomousPlanV30,meaningFrameV31,
          force:true,unifiedContextV33:context,allowedToolsV33:context.route?.allowed_tools||[],validationRepairV33:context.validation_repair
        }),
        fallback:async context=>groundedUnifiedFallbackV33({context,analysis,state:unifiedTurnState,history,locale,visionFrame})
      });
      if(debugAuthorized)unified.payload.ai_debug={version:"33.2.0",trace_id:unified.trace?.trace_id||null,stages:unified.trace?.stages||[],meaning:{provider:meaningFrameV31?.provider||null,primary_intent:meaningFrameV31?.primary_intent||"unknown",intents:meaningFrameV31?.intents||[],domain:meaningFrameV31?.domain||"unclear",topic_relationship:meaningFrameV31?.topic_relationship||"unclear",reference:meaningFrameV31?.reference||null},active_state:unified.conversation_state,route:unified.route,rewritten_query:unified.rewritten_query,retrieval:{result_count:unified.results?.length||0,evidence_count:unified.evidence?.length||0},validation:unified.validation,source:unified.source};
      unifiedTurnState.intelligence_v33=unified.conversation_state;
      return await makeResponse({payload:unified.payload,cors,sessionId,state:unifiedTurnState,analysis,signals,profile,message,source:unified.source,results:unified.results,locale,cognition,retrieval:unified.retrieval,plan:unified.plan});
    }catch(error){
      console.error("V33 unified intelligence failed",error?.message);
      const reply=locale==="en"?"I received your message, but the intelligence service is temporarily unavailable. Please retry in a moment.":"وصلتني رسالتك، لكن خدمة الفهم الذكي متوقفة مؤقتًا. جرّب إعادة المحاولة بعد لحظة بدل ما أرد عليك بتخمين.";
      return await makeResponse({payload:{reply,display_reply:reply,__unified_v33:true,unified_intelligence_v33:{trace_id:`ai_${Date.now()}`,route:"safe_failure",validation:{accepted:true,score:100,grounded:true,entity_consistent:true,current_message_used:true},fallback_reason:"pipeline_exception"}},cors,sessionId,state:turnState,analysis,signals,profile,message,source:"unified_pipeline_safe_failure_v33",locale,cognition});
    }
  }

  // V31: the full-utterance LLM interpretation is authoritative. Generate the
  // natural answer with bounded tools before any keyword/template route runs.
  if(meaningFrameV31?.authoritative){
    try{
      const primary=await tryV22NeuralAgent({analysis,state:turnState,message,history,locale,profile,cognition,persistentSnapshot:persistentRead.snapshot,retrievalRoute,agriculturalContext,salesTurn,humanTurn,conversionDecision,currentProduct:selectedProductContext||null,sessionId,images,visionFrame,semanticFrame,autonomousPlanV30,meaningFrameV31});
      if(primary)return await makeResponse({payload:{...primary.payload,llm_first_v31:true},cors,sessionId,state:turnState,analysis,signals,profile,message,source:"neural_llm_first_primary_v31",results:primary.results,locale,cognition,retrieval:primary.retrieval,plan:primary.plan});
    }catch(error){console.error("V31 LLM-first primary answer failed",error?.message);}
  }

  // V27: execute supported compound business + product questions in the user's
  // original order before a single-intent router or a stale product lock can win.
  const compound=isExplicitActionCommandV27(message)||!allowLegacyCompoundV31(meaningFrameV31)?null:await executeCustomerBrainCompoundV27({customerFrame,analysis,state:turnState,message,history,locale,sessionId});
  if(compound)return await makeResponse({payload:compound.payload,cors,sessionId,state:turnState,analysis,signals,profile,message,source:compound.source,results:compound.results,locale,cognition});

  // Visual evidence priority: an image-only turn or genuine visual follow-up must
  // stay on the visual pipeline. Generic help/ack/frustration language is often
  // produced around image interaction and must not preempt the image. Explicit
  // social/business topic changes (identity, human handoff, branches, etc.) still
  // keep current-message sovereignty.
  const visualPriorityTurn=Boolean(visionFrame?.has_visual_context&&(images.length>0||visionFrame?.has_fresh_images||visionFrame?.visual_followup||body?.visual_context_reused));
  const visualDeferrableIntents=new Set(["help_request","frustration","general_conversation","acknowledgment","negative_ack"]);

  // V27 current-turn sovereignty: explicit social and business questions are answered
  // before product locks, dosage guards, neural tools, or stale agricultural memory.
  const priorityTurn=detectCurrentTurnPriorityV27({message,analysis,semanticFrame,hasImages:images.length>0});
  if(priorityTurn&&!(visualPriorityTurn&&visualDeferrableIntents.has(priorityTurn.intent))&&allowLegacyRouteV31(priorityTurn.intent,meaningFrameV31)){
    const priorityAnalysis={...analysis,intent:priorityTurn.intent,semantic_intent:priorityTurn.intent,semantic_intents:[priorityTurn.intent]};
    const priorityState=quarantineCurrentTurnStateV27(turnState);
    const priorityDirect=directReply(priorityAnalysis,priorityState,message,sessionId);
    if(priorityDirect)return await makeResponse({
      payload:{reply:priorityDirect.reply,display_reply:priorityDirect.reply,quick_replies:priorityDirect.quick_replies||[],suggested_actions:priorityDirect.actions||[],escalation:priorityDirect.escalation,current_turn_router:priorityTurn,human_conversation:{...humanTurn,stale_context_quarantine:true}},
      cors,sessionId,state:priorityState,analysis:priorityAnalysis,signals,profile,message,source:priorityDirect.source,locale,cognition
    });
  }

  // V25: short human/social questions are deterministic and current-turn only.
  // They must never enter neural/agronomy routing with an old product or dose context.
  if(["greeting","wellbeing","thanks","goodbye","acknowledgment","negative_ack","identity","human","help_request","frustration","general_conversation"].includes(analysis.intent)&&!(visualPriorityTurn&&visualDeferrableIntents.has(analysis.intent))&&allowLegacyRouteV31(analysis.intent,meaningFrameV31)){
    const protectedDirect=directReply(analysis,turnState,message,sessionId);
    if(protectedDirect)return await makeResponse({payload:{reply:protectedDirect.reply,quick_replies:protectedDirect.quick_replies||[],suggested_actions:protectedDirect.actions||[],escalation:protectedDirect.escalation,human_conversation:humanTurn,sales_conversation:{human_turn:humanTurn}},cors,sessionId,state:turnState,analysis,signals,profile,message,source:protectedDirect.source,locale,cognition});
  }

  // V29: when a short or referential answer is genuinely ambiguous, ask the
  // exact missing question once instead of falling back to generic categories.
  const v29Clarification=contextualClarificationV29(conversationalReasoning);
  if(v29Clarification&&(!meaningFrameV31?.authoritative||meaningFrameV31?.ambiguity?.required||meaningFrameV31?.topic_relationship!=="new_topic"))return await makeResponse({
    payload:{reply:v29Clarification.reply,display_reply:v29Clarification.display_reply,quick_replies:v29Clarification.quick_replies||[],conversation_reasoning:v29Clarification},
    cors,sessionId,state:turnState,analysis,signals,profile,message,source:v29Clarification.source,locale,cognition
  });

  // V23 Product Context Intelligence: the server resolves card selection, persisted focus,
  // explicit product mentions, visible ordinals and multi-product comparisons before any agronomy/RAG route.
  const productFocus=resolveProductContext({message,selectedProduct:selectedProductContext,selectedProducts:selectedProductContexts,state:turnState,analysis,semanticFrame});
  const actionOutcome=await handleAutonomousAction({
    message,semanticFrame,state,locale,
    selectedProduct:productFocus.product||selectedProductContext,
    selectedProducts:productFocus.products?.length?productFocus.products:selectedProductContexts,
    actionRequest:body?.autonomous_action_request||body?.action_request||null
  });
  if(actionOutcome?.state)state.autonomous_action=actionOutcome.state;
  if(actionOutcome?.handled)return await makeResponse({
    payload:actionOutcome.payload||{},cors,sessionId,state,analysis,signals,profile,message,
    source:actionOutcome.source||"v25_autonomous_action",results:actionOutcome.state?.lines||[],locale,cognition
  });
  if(productFocus.action==="clear"){
    delete state.active_product_context;
    delete state.comparison_context;
  }
  if(productFocus.action==="compare"){
    const comparison=await tryBoundProductComparisonReply({products:productFocus.products,message,history,locale});
    if(comparison){
      return await makeResponse({payload:{reply:comparison.reply,display_reply:comparison.reply,results:comparison.results||[],quick_replies:comparison.quick_replies||[],bound_products:comparison.bound_products||productFocus.products,comparison_context_lock:true,product_context_intent:"comparison",product_context_reason:productFocus.reason,product_context_confidence:productFocus.confidence},cors,sessionId,state,analysis,signals,profile,message,source:comparison.source,results:comparison.results||[],locale,cognition});
    }
  }
  if(["bind","reuse"].includes(productFocus.action)&&productFocus.product){
    const bound=await tryBoundProductContextReply({message,selectedProduct:productFocus.product,state,history,locale,intent:productFocus.intent});
    if(bound){
      return await makeResponse({payload:{reply:bound.reply,display_reply:bound.reply,results:bound.results||[],quick_replies:bound.quick_replies||[],bound_product:bound.bound_product||productFocus.product,product_context_lock:true,product_context_intent:bound.intent||productFocus.intent,product_context_reason:productFocus.reason,product_context_confidence:productFocus.confidence},cors,sessionId,state,analysis,signals,profile,message,source:bound.source,results:bound.results||[],locale,cognition});
    }
  }
  if(productFocus.action==="ambiguous"||isGenericProductDetailRequest(message)){
    const candidates=(productFocus.products?.length?productFocus.products:(Array.isArray(state?.last_products)?state.last_products:[])).filter(x=>x?.name).slice(0,4);
    const reply=candidates.length>1?`حدد أي منتج تقصد من النتائج الظاهرة؛ كل إجابة لازم تظل مربوطة بهوية منتج واحدة عشان ما أخلطش السعر أو الاستخدام أو المواصفات.`:`اكتب اسم المنتج أو اضغط زر «التفاصيل والاستخدام» داخل كارت المنتج، وأنا أراجع ملفه نفسه بدون تخمين.`;
    const quickReplies=candidates.map(x=>({label:`تفاصيل ${x.name}`,message:"تفاصيل المنتج واستخدامه",product:x})).slice(0,4);
    return await makeResponse({payload:{reply,display_reply:reply,quick_replies:quickReplies,product_context_lock:true,product_context_intent:productFocus.intent,product_context_reason:productFocus.reason},cors,sessionId,state,analysis,signals,profile,message,source:"v23_unbound_product_context_guard",locale,cognition});
  }

  // V23: recognition-first multimodal vision + server-side product context + current-turn conversion control the neural sales employee.
  // All deterministic FAQ/agronomy/commerce layers below remain safety fallbacks if the neural employee is unavailable.
  if(visionFrame?.has_visual_context || !isClearlyOffDomain(message)){
    try{
      const currentProductEarly=await resolveCurrentProduct(pageUrl,productContext);
      const adaptive=await tryV22NeuralAgent({analysis,state:turnState,message,history,locale,profile,cognition,persistentSnapshot:persistentRead.snapshot,retrievalRoute,agriculturalContext,salesTurn,humanTurn,conversionDecision,currentProduct:currentProductEarly,sessionId,images,visionFrame,semanticFrame,autonomousPlanV30,meaningFrameV31});
      if(adaptive) return await makeResponse({
        payload:adaptive.payload,cors,sessionId,state,analysis,signals,profile,message,source:adaptive.source,
        results:adaptive.results,locale,cognition,retrieval:adaptive.retrieval,plan:adaptive.plan
      });
    }catch(error){ console.error("V22.5 multimodal vision sales employee failed",error?.message); }
  }

  // V22.1 hard visual fallback: never drop an attached/active image into generic social/category clarification.
  if(visionFrame?.has_visual_context){
    const deterministicLive=await tryDeterministicVisualCommerce({frame:visionFrame,activeContext:state?.active_visual_context||{},history,locale});
    if(deterministicLive){
      return await makeResponse({payload:{reply:deterministicLive.reply,display_reply:deterministicLive.reply,results:deterministicLive.results||[],vision:{...visionFrame,engine:visionHealth(),fallback:true,deterministic_live:true},visual_guidance:buildVisualGuidance({frame:visionFrame,activeContext:state?.active_visual_context||{},audit:{}}),human_conversation:humanTurn},cors,sessionId,state,analysis,signals,profile,message,source:deterministicLive.source,results:deterministicLive.results||[],locale,cognition});
    }
    const guidance=buildVisualGuidance({frame:visionFrame,activeContext:state?.active_visual_context||{},audit:{}});
    const visualReply=guidance?.retake?.ask_one||visualContextFallback({frame:visionFrame,activeContext:state?.active_visual_context||{}});
    return await makeResponse({payload:{reply:visualReply,display_reply:visualReply,vision:{...visionFrame,engine:visionHealth(),fallback:true},visual_evidence:{visual_matches:[],live_visual_verifications:[],label_guard_results:[]},visual_guidance:guidance,human_conversation:humanTurn},cors,sessionId,state,analysis,signals,profile,message,source:"v22_5_visual_recognition_safe_fallback",locale,cognition});
  }

  // V18 hard guard: isolated casual/browse-only turns never fall through into stale FAQ/agronomy/product routing.
  if(["social","browse_only_social"].includes(humanTurn?.mode)){
    const humanReply=safeCurrentTurnFallback(message,humanTurn);
    return await makeResponse({payload:{reply:humanReply,display_reply:humanReply,human_conversation:humanTurn,sales_conversation:{human_turn:humanTurn}},cors,sessionId,state,analysis,signals,profile,message,source:"v22_5_current_turn_safe_fallback",locale,cognition});
  }

  // V8 Phase 3 GitHub Edition: repository-managed verified knowledge can override generic rules.
  // It is deliberately checked after core request validation/rate limiting and before static FAQ routing.
  if(analysis.v31_primary_intent!=="diagnosis"&&analysis.intent!=="diagnosis")try{
    const managed=answerGitHubKnowledge(message,{locale,analysis,state,profile});
    if(managed){
      return await makeResponse({
        payload:{
          reply:managed.reply,
          display_reply:managed.reply,
          quick_replies:managed.quick_replies||[],
          knowledge_matches:managed.entries||[],
          knowledge_revision:managed.revision
        },
        cors,sessionId,state,analysis,signals,profile,message,
        source:"github_knowledge",locale
      });
    }
  }catch(error){
    console.error("github knowledge failed",error?.message);
  }

  // V14 UAE Agriculture Intelligence: deterministic, source-stamped answer layer for UAE agronomy and regulations.
  // Regulatory answers are intentionally checked before generic FAQ/human-knowledge routing to avoid stale or invented legal claims.
  if(analysis.v31_primary_intent!=="diagnosis"&&analysis.intent!=="diagnosis")try{
    const uaeKnowledge=answerUaeAgricultureKnowledge(message,locale);
    if(uaeKnowledge){
      return await makeResponse({
        payload:{
          reply:uaeKnowledge.reply,display_reply:uaeKnowledge.reply,
          uae_knowledge_matches:uaeKnowledge.entries||[],
          uae_regulatory:Boolean(uaeKnowledge.regulatory),
          uae_knowledge_verified_at:uaeKnowledge.verified_at,
          quick_replies:uaeKnowledge.regulatory?["الجهة المختصة؟","المستندات المطلوبة؟","الخطوات؟"]:["حسب الإمارة","حسب المحصول","نظام الري المناسب"]
        },
        cors,sessionId,state,analysis,signals,profile,message,source:uaeKnowledge.source,locale,cognition
      });
    }
  }catch(error){ console.error("UAE agriculture intelligence failed",error?.message); }

  // Repair misunderstandings before routing a vague "wrong / I mean..." message.
  const repair=allowLegacyRouteV31("correction",meaningFrameV31)?customerRepairReply(signals,analysis,profile):null;
  if(repair) return await makeResponse({payload:{reply:repair.reply,quick_replies:repair.quick_replies||[]},cors,sessionId,state,analysis,signals,profile,message,source:repair.source,locale});

  // A ready customer who already has products should not be sent back to generic ordering instructions.
  const purchase=allowLegacyRouteV31("purchase",meaningFrameV31)?purchaseContinuation({profile,state:turnState,analysis,message}):null;
  if(purchase) return await makeResponse({payload:{reply:purchase.reply,quick_replies:purchase.quick_replies||[],suggested_actions:purchase.actions||[]},cors,sessionId,state,analysis,signals,profile,message,source:purchase.source,locale});

  // Natural multi-intent: "عندكم بذور طماطم وتوصلون العين؟"
  const multi=allowLegacyCompoundV31(meaningFrameV31)?await multiIntentShippingProducts({analysis,state:turnState,message,history,locale,sessionId,profile,signals,cors,semanticFrame}):null;
  if(multi) return multi;

  const direct=allowLegacyRouteV31(analysis.v31_primary_intent||analysis.intent,meaningFrameV31)?directReply(analysis,turnState,message,sessionId):null;
  if(direct) return await makeResponse({payload:{reply:direct.reply,quick_replies:direct.quick_replies||[],suggested_actions:direct.actions||[],escalation:direct.escalation},cors,sessionId,state,analysis,signals,profile,message,source:direct.source,locale});

  // V15 deterministic engineering facts remain fallback when the V17 conversational employee is unavailable.
  try{
    const expertSimple=answerAgriculturalEngineerKnowledge(message,locale,{analysis,state,profile});
    if(expertSimple){
      return await makeResponse({
        payload:{reply:expertSimple.reply,display_reply:expertSimple.reply,agricultural_knowledge_matches:expertSimple.entries||[],agricultural_context:expertSimple.frame},
        cors,sessionId,state,analysis,signals,profile,message,source:expertSimple.source,locale,cognition
      });
    }
  }catch(error){ console.error("V15 agricultural engineer simple answer failed",error?.message); }

  // Keep legacy FAQ knowledge for non-engineering turns; agricultural free-form language goes to the V15 expert engine instead of phrase matching.
  if(!agriculturalContext.is_agricultural){
    const humanKnowledge=extendedKnowledgeReply(message,locale,{sessionId,profile,state,analysis});
    if(humanKnowledge) return await makeResponse({payload:{reply:humanKnowledge.reply,quick_replies:humanKnowledge.quick_replies||[]},cors,sessionId,state,analysis,signals,profile,message,source:humanKnowledge.source,locale});
  }

  const cognitiveMemoryDecision=cognitiveVisibleSetDecision({state,frame:cognition,locale});
  if(cognitiveMemoryDecision.handled){
    const cResults=clientProducts(cognitiveMemoryDecision.results||[]);
    return await makeResponse({
      payload:{
        reply:cognitiveMemoryDecision.memory_reply||cognitiveMemoryDecision.display_reply,
        display_reply:cognitiveMemoryDecision.display_reply,
        results:cResults,
        quick_replies:salesQuickReplies({category:state.category,stage:"compare",results:cResults,profile})
      },
      cors,sessionId,state,analysis,signals,profile,message,
      source:"cognitive_visible_set_decision",results:cResults,locale,cognition,decision:cognitiveMemoryDecision
    });
  }

  const memory=productMemoryReply(analysis,state,locale);
  if(memory) return await makeResponse({payload:{reply:memory.reply,quick_replies:salesQuickReplies({category:state.category,stage:"compare",results:state.last_products||[],profile})},cors,sessionId,state,analysis,signals,profile,message,source:memory.source,locale,cognition});

  const currentProduct=await resolveCurrentProduct(pageUrl,productContext);
  const current=currentProductReply(message,currentProduct,locale);
  if(current) return await makeResponse({payload:{reply:current,suggested_actions:pageUrl?[{type:"page",label:"افتح المنتج",url:pageUrl}]:[]},cors,sessionId,state,analysis,signals,profile,message,source:"current_product",results:currentProduct?[currentProduct]:[],locale});

  const contextual=ambiguousContextReply(message,turnState,analysis);
  if(contextual) return await makeResponse({payload:{reply:contextual.reply,quick_replies:contextual.quick_replies||[]},cors,sessionId,state,analysis,signals,profile,message,source:contextual.source,locale});

  if((meaningFrameV31?.authoritative?meaningFrameV31.domain==="off_domain":isClearlyOffDomain(message))) return await makeResponse({payload:{reply:"أنا مخصص لـ MIG FARM والزراعة والمنتجات والشحن وخدمات الموقع. إذا سؤالك متعلق بهالمجال عطِني التفاصيل وأنا أساعدك."},cors,sessionId,state:turnState,analysis,signals,profile,message,source:"off_domain",locale});

  // Greenhouse = project qualification, not a random product dump.
  if((analysis.category?.key||state.category||profile.category)==="greenhouse" && ["product_search","recommendation","unknown"].includes(analysis.intent)){
    const stage=journeyStage({analysis,profile,state,message});
    const gh=greenhouseLeadReply({profile,state,analysis,stage});
    return await makeResponse({payload:{reply:gh.reply,quick_replies:gh.quick_replies||[],suggested_actions:gh.actions||[]},cors,sessionId,state,analysis,signals,profile,message,source:gh.source,locale});
  }

  // V18 fallback retry: retained for resilience after deterministic context routing.
  const neural=await tryV22NeuralAgent({analysis,state:turnState,message,history,locale,profile,cognition,persistentSnapshot:persistentRead.snapshot,retrievalRoute,agriculturalContext,salesTurn,humanTurn,conversionDecision,currentProduct:await resolveCurrentProduct(pageUrl,productContext),sessionId,images,visionFrame,semanticFrame,autonomousPlanV30,meaningFrameV31});
  if(neural){
    return await makeResponse({
      payload:neural.payload,cors,sessionId,state,analysis,signals,profile,message,
      source:neural.source,results:neural.results,locale,cognition,retrieval:neural.retrieval,plan:neural.plan
    });
  }

  // V15 deterministic expert fallback: if the neural provider is unavailable/timeout, never route a crop symptom into a product dump.
  if(agriculturalContext?.is_agricultural && agriculturalContext.intent==="diagnosis"){
    try{
      const problem=parseAgriculturalProblemV31(message,state),stored=state?.diagnostic_context_v31||{};
      const cropLabel=cleanText(analysis.crop?.labelAr||problem.crop||stored.crop_label||"",80);
      const symptoms=[...new Set([...(Array.isArray(stored.symptoms)?stored.symptoms:[]),...(Array.isArray(analysis.symptoms)?analysis.symptoms:[]),...problem.symptoms].map(x=>cleanText(String(x),80)).filter(Boolean))].slice(0,8);
      const diagnosticMessage=[cropLabel?`المحصول ${cropLabel}`:"",symptoms.length?`الأعراض ${symptoms.join("، ")}`:"",message].filter(Boolean).join(" — ");
      const diag=diagnoseAgriculturalProblem(diagnosticMessage,{analysis,state,profile});
      if(diag?.handled){
        const hypotheses=(diag.hypotheses||[]).slice(0,4).map((x,i)=>`${i+1}. ${x.hypothesis}`).join("\n");
        const checks=(diag.first_steps||[]).slice(0,3).map(x=>`• ${x}`).join("\n");
        const question=cleanText(analysis.diagnosticQuestion||meaningFrameV31?.ambiguity?.question||(diag.clarification_questions||[])[0]||problem.question||"",300);
        const acknowledgment=cropLabel?`فهمت إن عندك ${cropLabel}${symptoms.length?` وفيه ${symptoms.join(" و")}`:" وفيه مشكلة نباتية"}. `:"";
        const reply=`${acknowledgment}من الوصف وحده ما ينفعش أقفل التشخيص على سبب واحد. أقرب الاحتمالات:
${hypotheses||"محتاج تفاصيل أكثر قبل ترتيب الاحتمالات."}${checks?`

أول فحوص آمنة:
${checks}`:""}${question?`

أهم سؤال يفرق بين الاحتمالات: ${question}`:""}`;
        return await makeResponse({
          payload:{reply,display_reply:reply,agricultural_diagnosis:{status:diag.diagnosis_status,hypotheses:diag.hypotheses||[],urgency:diag.urgency,safety:diag.safety}},
          cors,sessionId,state,analysis,signals,profile,message,source:"agricultural_differential_fallback_v15",locale,cognition
        });
      }
    }catch(error){ console.error("V15 deterministic diagnosis fallback failed",error?.message); }
  }

  const autonomous=await tryDeterministicAutonomousCommerce({analysis,state,message,history,locale,profile,cognition});
  if(autonomous){
    return await makeResponse({
      payload:autonomous.payload,cors,sessionId,state,analysis,signals,profile,message,source:autonomous.source,
      results:autonomous.results,locale,cognition
    });
  }

  const productLike=["product_search","recommendation"].includes(analysis.intent) || Boolean(analysis.category) || Boolean(analysis.crop);
  if(productLike){
    // If the customer asked for a recommendation and we still miss one key detail,
    // ask ONE question instead of dumping products.
    if(analysis.intent==="recommendation"){
      const stage=journeyStage({analysis,profile,state,message});
      const next=nextBestQuestion({analysis,profile,state,stage});
      if(next){
        return await makeResponse({payload:{reply:next.reply,quick_replies:next.quick_replies||[]},cors,sessionId,state,analysis,signals,profile,message,source:`sales_qualify_${next.field}`,locale});
      }
    }

    const {products,categoryKey}=await searchCatalog(analysis,state,message,history);
    if(products.length){
      let cleanResults=clientProducts(products);
      const decision=cognitiveProductDecision({products:cleanResults,frame:cognition,locale});
      const stage=journeyStage({analysis,profile,state,message,results:cleanResults});
      let reply=formatProductsForMemory(products,locale,`${sessionId}:${message}`);
      let displayReply="";
      if(decision.handled){
        cleanResults=clientProducts(decision.results||[]);
        reply=decision.memory_reply||decision.display_reply||reply;
        displayReply=decision.display_reply||"";
      }
      const quick=salesQuickReplies({category:categoryKey,stage,results:cleanResults,profile});
      return await makeResponse({
        payload:{
          reply,
          ...(displayReply?{display_reply:displayReply}:{}),
          results:cleanResults,
          quick_replies:quick.length?quick:productSearchQuickReplies(categoryKey,locale,true),
          brand_scope:categoryKey==="seeds"?"mig_farm_seeds_only":"category_filtered",
          ...(decision.handled?{decision_basis:decision.decision_basis,knowledge_gaps:decision.knowledge_gaps}: {})
        },
        cors,sessionId,state,analysis,signals,profile,message,
        source:decision.handled?"cognitive_product_decision":(categoryKey==="seeds"?"live_migfarm_seeds":"live_category_products"),
        results:cleanResults,locale,cognition,decision:decision.handled?decision:null
      });
    }

    if(categoryKey==="seeds"){
      const fallback=knownSeedFallback(analysis.crop?.key||state.crop,locale);
      return await makeResponse({payload:{reply:fallback||pick(TONE.noProductAr,`${sessionId}:${message}`),quick_replies:productSearchQuickReplies("seeds",locale,false)},cors,sessionId,state,analysis,signals,profile,message,source:"seed_knowledge_no_live_match",locale});
    }
    const knownFallback=knownCategoryFallback(categoryKey,locale);
    return await makeResponse({payload:{reply:knownFallback||`${pick(TONE.noProductAr,`${sessionId}:${message}`)} اكتب اسم المنتج أو استخدامه بشكل أدق، أو أقدر أوصلك بالفريق.`,quick_replies:["دور بالاسم","كلم الفريق"],suggested_actions:[buildWhatsAppHandoff({profile,state,analysis,message})]},cors,sessionId,state,analysis,signals,profile,message,source:knownFallback?"known_category_no_live_match":"no_live_product_match",locale});
  }

  // V10 Hybrid RAG: fuse managed knowledge, site retrieval and episodic memory.
  let pages=[];
  try{ pages=await searchSitePages(message,7); }catch(error){ console.error("site search failed",error?.message); }
  const knowledgeCandidates=semanticKnowledgeCandidates(message,{locale,analysis,state,profile,cognition},6);
  const siteCandidates=semanticSiteCandidates(message,pages,7);
  const memoryCandidates=[...episodicMemoryCandidates(state?.hybrid_memory||{}),...persistentMemoryCandidates(message,persistentRead.snapshot,6)];
  const hybridRetrieval=fuseRetrieval({message,knowledge:knowledgeCandidates,pages:siteCandidates,memory:memoryCandidates});
  const hybridAnswer=composeHybridKnowledgeAnswer(hybridRetrieval,locale);
  if(hybridAnswer){
    const topPage=hybridAnswer.citations?.find(x=>x.url);
    return await makeResponse({
      payload:{
        reply:hybridAnswer.reply,display_reply:hybridAnswer.display_reply,confidence:hybridAnswer.confidence,
        hybrid_citations:hybridAnswer.citations||[],
        suggested_actions:topPage?[{type:"page",label:"افتح المصدر",url:topPage.url}]:[]
      },
      cors,sessionId,state,analysis,signals,profile,message,source:hybridAnswer.source,locale,retrieval:hybridRetrieval
    });
  }

  const pAnswer=pageAnswer(pages,message,locale);
  if(pAnswer) return await makeResponse({payload:{reply:pAnswer.reply,confidence:pAnswer.confidence,suggested_actions:pAnswer.page?.url?[{type:"page",label:"افتح الصفحة",url:pAnswer.page.url}]:[]},cors,sessionId,state,analysis,signals,profile,message,source:"confidence_site_rag",locale,retrieval:hybridRetrieval});

  return await makeResponse({payload:{reply:pick(TONE.fallbackAr,`${sessionId}:${message}`),quick_replies:["منتج","شحن","فرع","خدمة"],suggested_actions:[buildWhatsAppHandoff({profile,state,analysis,message})],escalation:true,page_context:{page_title:pageTitle,page_url:pageUrl},knowledge_stats:knowledgeStats()},cors,sessionId,state,analysis,signals,profile,message,source:"safe_human_fallback",locale,retrieval:hybridRetrieval});
}
