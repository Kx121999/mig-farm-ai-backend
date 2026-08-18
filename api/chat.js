import { searchProducts, searchSitePages, siteOrigin, fetchProduct } from "../lib/site.js";
import { cleanText, safeLocale, safePageUrl, jsonResponse, normalizeAr, tokenize } from "../lib/utils.js";
import { BUSINESS, CATEGORIES, GREENHOUSE_KNOWLEDGE, TONE } from "../lib/brain.js";
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

const VERSION="17.0.0";
const MODE="adaptive_human_sales_conversation_os_v17";
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
    "Access-Control-Allow-Headers":"Content-Type",
    "Access-Control-Max-Age":"86400","Vary":"Origin"
  };
}
function isAllowedOrigin(origin){ return !origin || allowedOrigins().includes(origin); }
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
  return {name:cleanText(value.name||value.title||"",500),price:cleanText(String(value.price??""),100),currency:cleanText(value.currency||"AED",20),availability:cleanText(value.availability||value.stock||"",100),description:cleanText(value.description||"",1800),url:safePageUrl(value.url||"")};
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

async function makeResponse({payload={},status=200,cors={},sessionId,state,analysis,signals,profile,message,source="",results=[],locale="ar",cognition=null,decision=null,retrieval=null,plan=null}){
  payload=enforceResponseQuality(payload);
  const frame=cognition||buildCognitiveFrame({message,analysis,state,profile});
  const executionPlan=plan||buildHybridPlan({message,analysis,cognition:frame,state,profile});
  const retrievalBundle=retrieval||fuseRetrieval({
    message,
    products:Array.isArray(results)?results:[],
    memory:episodicMemoryCandidates(state?.hybrid_memory||{})
  });

  const evidence=evidenceSummary({source,payload,results,analysis});
  const review=criticReview({payload,source,results,evidence,cognition:frame,retrieval:retrievalBundle,plan:executionPlan});
  payload=enforceResponseQuality(applyCriticGuard(payload,review));

  const next=updateState(state,analysis,message,source,results,payload);
  next.v=16;
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
    delete payload.neural_trace; delete payload.neural_model; delete payload.neural_response_id;
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
  const autonomousMission=buildCommerceMission({message,analysis,cognition:frame,state:next,profile:nextProfile,locale});
  const autonomousMeta=autonomousCommerceMeta({mission:autonomousMission});

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
      knowledge:githubKnowledgeStatus()
    },
    commerce:commerceCapabilities(),
    conversation_quality:quality,
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


async function tryV17NeuralAgent({analysis,state,message,history,locale,profile,cognition,persistentSnapshot={},retrievalRoute=null,agriculturalContext=null,salesTurn=null,currentProduct=null,sessionId=""}){
  const plan=buildHybridPlan({message,analysis,cognition,state,profile});
  const mission=buildCommerceMission({message,analysis,cognition,state,profile,locale});
  if(!shouldUseAdaptiveSalesAgent(message,salesTurn) && !shouldUseNeuralAgent({message,analysis,cognition,plan,salesTurn}) && !["bundle","budget_optimize","solution_plan","compare","purchase"].includes(mission.kind)) return null;

  const recalled=await semanticMemoryCandidatesAdaptive(message,state?.v11_memory||{},6);
  const persistentHits=persistentMemoryCandidates(message,persistentSnapshot,6);
  const temporalHits=temporalMemoryCandidates(message,persistentSnapshot,6);
  const seedGraph=buildKnowledgeGraph({message,analysis,state,profile,results:state?.visible_products||[],memory:[...(recalled.items||[]),...persistentHits]});
  const graphContext=[...knowledgeGraphContext(persistentSnapshot?.graph||{}),...knowledgeGraphContext(seedGraph)].slice(0,20);

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
      return {query:found.query,category:found.categoryKey,products:clientProducts(found.products).slice(0,limit)};
    },
    search_knowledge:async args=>{
      const query=cleanText(args?.query||message,700);
      const limit=Math.max(1,Math.min(8,Number(args?.limit)||6));
      const toolAnalysis=analyzeTurn(query,state,history,locale);
      const items=semanticKnowledgeCandidates(query,{locale,analysis:toolAnalysis,state,profile,cognition},limit);
      return {query,items:items.map(x=>({id:x.id,title:x.title,answer:x.answer,verified:x.verified,source:x.source,score:x.score}))};
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
      context:{analysis,state,profile,cognition,graph_context:graphContext,memory_hits:recalled.items||[],persistent_memory_hits:persistentHits,temporal_memory_hits:temporalHits,retrieval_route:retrievalRoute,journey:persistentSnapshot?.journey||null,autonomous_mission:mission,agricultural_context:agriculturalContext||analyzeAgriculturalRequest(message,{analysis,state,profile}),sales_turn:salesTurn,recent_dialogue:history.slice(-8),current_product:currentProduct},
      toolHandlers
    });
    if(!result?.handled||!result.reply) return null;
    const products=clientProducts(result.products||[]).slice(0,8);
    const portfolio=optimizeLivePortfolio({products,mission,maxItems:mission.requested_count||undefined});
    const verification=verifyCommerceResponse({reply:result.reply,products,mission,portfolio});
    const commerceCritical=Boolean(mission?.needs_live_catalog&&["recommend","compare","bundle","budget_optimize","solution_plan","purchase"].includes(mission.kind));
    let safeReply=(verification.ok||!commerceCritical)?result.reply:groundedCommerceFallback({mission,portfolio,products,locale});
    let conversationQuality=salesReplyQuality(safeReply,{...(salesTurn||{}),raw:message,history});
    let naturalizerMeta={used:false};
    // V17: one bounded rewrite pass only when the reply is structurally robotic/repetitive.
    // The rewriter is explicitly forbidden from adding or changing facts; commerce verification runs again afterwards.
    if(conversationQuality.score<86 && result?.reply){
      const rewritten=await rewriteNaturalSalesReply({reply:safeReply,message,locale,salesTurn,history});
      if(rewritten?.handled&&rewritten.reply){
        const reverify=verifyCommerceResponse({reply:rewritten.reply,products,mission,portfolio});
        if(reverify.ok||!commerceCritical){
          safeReply=rewritten.reply;
          conversationQuality=salesReplyQuality(safeReply,{...(salesTurn||{}),raw:message,history});
          naturalizerMeta={used:true,response_id:rewritten.response_id||"",score:conversationQuality.score};
        }
      }
    }
    const evidenceItems=(result.evidence||[]).map((x,i)=>({
      id:String(x?.id||`neural-${i}`),title:String(x?.title||""),answer:String(x?.answer||""),url:String(x?.url||""),
      source:String(x?.source||"neural_tool"),verified:Boolean(x?.verified),score:Number(x?.score||0)
    }));
    const retrieval=fuseRetrieval({message,products,knowledge:evidenceItems.filter(x=>x.source==="github_knowledge"),pages:evidenceItems.filter(x=>x.source==="site_page"),memory:recalled.items||[]});
    return {
      payload:{
        reply:safeReply,display_reply:safeReply,results:products,
        autonomous_plan:mission.tasks,autonomous_mission:mission.kind,autonomous_verification:verification,
        autonomous_portfolio:portfolio.handled?{total_aed:portfolio.total_aed,within_budget:portfolio.within_budget,decision_basis:portfolio.decision_basis,confidence:portfolio.confidence}:undefined,
        quick_replies:products.length?salesQuickReplies({category:analysis?.category?.key||state?.category,stage:"consider",results:products,profile}):[],
        neural_trace:result.trace||[],neural_model:result.model||"",neural_response_id:result.response_id||"",
        sales_conversation:{...conversationQuality,plan:salesTurn?.conversation_plan||null,naturalizer:naturalizerMeta}
      },
      source:"neural_sales_conversation_os_v17",results,retrieval,plan
    };
  }catch(error){
    console.error("V17 sales conversation neural fallback:",error?.message);
    return null;
  }
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

async function multiIntentShippingProducts({analysis,state,message,history,locale,sessionId,profile,signals,cors}){
  if(!["shipping","delivery_time"].includes(analysis.intent) || !productNeedInTurn(analysis)) return null;
  const shipping=directReply(analysis,state,message,sessionId);
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

export async function OPTIONS(request){
  const origin=request.headers.get("origin")||"";
  if(!isAllowedOrigin(origin)) return new Response(null,{status:403});
  return new Response(null,{status:204,headers:corsHeaders(origin)});
}

export async function POST(request){
  const origin=request.headers.get("origin")||""; const cors=corsHeaders(origin);
  if(!isAllowedOrigin(origin)) return jsonResponse({error:"origin_not_allowed"},403,cors);
  let body; try{body=await request.json();}catch{return jsonResponse({error:"invalid_json"},400,cors);}

  const message=cleanText(body?.message,2500);
  const sessionId=cleanText(body?.session_id,160)||crypto.randomUUID();
  const locale=safeLocale(body?.locale);
  const pageUrl=safePageUrl(body?.page_url);
  const pageTitle=cleanText(body?.page_title,500);
  const history=normalizeHistory(body?.history);
  const productContext=normalizeProductContext(body?.product_context);
  const serverSession=await readServerSession(sessionId);
  const persistentRead=await readPersistentSnapshot(sessionId);
  const mergedIncomingState=mergeSessionState(serverSession,body?.conversation_state);
  const hydratedIncomingState=hydrateStateFromPersistent(mergedIncomingState,persistentRead.snapshot);
  const state=mergeState(hydratedIncomingState,history);
  state.__persistent_snapshot=persistentRead.snapshot;
  state.__persistent_read={persisted:persistentRead.persisted,reason:persistentRead.reason};
  const mergedIncomingProfile=mergeSessionProfile(serverSession,body?.conversation_state?.customer_profile||body?.customer_profile);
  const persistentProfile=hydrateProfileFromPersistent(mergedIncomingProfile,persistentRead.snapshot);
  const existingProfile=sanitizeCustomerProfile(persistentProfile);
  const analysis=analyzeTurn(message,state,history,locale);
  const signals=extractCustomerSignals(message,analysis,state);
  const profile=mergeCustomerProfile(existingProfile,signals,analysis,state);
  const cognition=buildCognitiveFrame({message,analysis,state,profile,history});
  const retrievalRoute=buildRetrievalRoute({message,analysis,cognition,persistent:persistentRead.snapshot});
  const agriculturalContext=analyzeAgriculturalRequest(message,{analysis,state,profile});
  const salesTurn=analyzeSalesConversation(message,{analysis,state,profile,history,agriculturalContext});
  salesTurn.history=history.slice(-8);
  state.__v12_route=retrievalRoute;

  if(!message) return await makeResponse({payload:{reply:locale==="en"?"Write a message first.":"اكتب سؤالك أول."},status:400,cors,sessionId,state,analysis,signals,profile,message,source:"empty",locale});

  const ip=(request.headers.get("x-forwarded-for")||"unknown").split(",")[0].trim();
  if(!rateLimit(`${ip}:${sessionId}`)) return await makeResponse({payload:{reply:locale==="en"?"Too many messages. Try again in a minute.":"رسائل وايد بسرعة 😄 جرّب عقب دقيقة."},status:429,cors,sessionId,state,analysis,signals,profile,message,source:"rate_limit",locale});

  // V17: Human Sales Conversation OS gets first chance to control the turn, preserve recent dialogue, and phrase the answer naturally.
  // All deterministic FAQ/agronomy/commerce layers below remain safety fallbacks if the neural employee is unavailable.
  if(!isClearlyOffDomain(message)){
    try{
      const currentProductEarly=await resolveCurrentProduct(pageUrl,productContext);
      const adaptive=await tryV17NeuralAgent({analysis,state,message,history,locale,profile,cognition,persistentSnapshot:persistentRead.snapshot,retrievalRoute,agriculturalContext,salesTurn,currentProduct:currentProductEarly,sessionId});
      if(adaptive) return await makeResponse({
        payload:adaptive.payload,cors,sessionId,state,analysis,signals,profile,message,source:adaptive.source,
        results:adaptive.results,locale,cognition,retrieval:adaptive.retrieval,plan:adaptive.plan
      });
    }catch(error){ console.error("V17 early sales conversation employee failed",error?.message); }
  }

  // V8 Phase 3 GitHub Edition: repository-managed verified knowledge can override generic rules.
  // It is deliberately checked after core request validation/rate limiting and before static FAQ routing.
  try{
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
  try{
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
  const repair=customerRepairReply(signals,analysis,profile);
  if(repair) return await makeResponse({payload:{reply:repair.reply,quick_replies:repair.quick_replies||[]},cors,sessionId,state,analysis,signals,profile,message,source:repair.source,locale});

  // A ready customer who already has products should not be sent back to generic ordering instructions.
  const purchase=purchaseContinuation({profile,state,analysis,message});
  if(purchase) return await makeResponse({payload:{reply:purchase.reply,quick_replies:purchase.quick_replies||[],suggested_actions:purchase.actions||[]},cors,sessionId,state,analysis,signals,profile,message,source:purchase.source,locale});

  // Natural multi-intent: "عندكم بذور طماطم وتوصلون العين؟"
  const multi=await multiIntentShippingProducts({analysis,state,message,history,locale,sessionId,profile,signals,cors});
  if(multi) return multi;

  const direct=directReply(analysis,state,message,sessionId);
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
  if(current) return await makeResponse({payload:{reply:current,suggested_actions:pageUrl?[{type:"page",label:"افتح المنتج",url:pageUrl}]:[]},cors,sessionId,state,analysis,signals,profile,message,source:"current_product",locale});

  const contextual=ambiguousContextReply(message,state,analysis);
  if(contextual) return await makeResponse({payload:{reply:contextual.reply,quick_replies:contextual.quick_replies||[]},cors,sessionId,state,analysis,signals,profile,message,source:contextual.source,locale});

  if(isClearlyOffDomain(message)) return await makeResponse({payload:{reply:"أنا مخصص لـ MIG FARM والزراعة والمنتجات والشحن وخدمات الموقع. إذا سؤالك متعلق بهالمجال عطِني التفاصيل وأنا أساعدك."},cors,sessionId,state,analysis,signals,profile,message,source:"off_domain",locale});

  // Greenhouse = project qualification, not a random product dump.
  if((analysis.category?.key||state.category||profile.category)==="greenhouse" && ["product_search","recommendation","unknown"].includes(analysis.intent)){
    const stage=journeyStage({analysis,profile,state,message});
    const gh=greenhouseLeadReply({profile,state,analysis,stage});
    return await makeResponse({payload:{reply:gh.reply,quick_replies:gh.quick_replies||[],suggested_actions:gh.actions||[]},cors,sessionId,state,analysis,signals,profile,message,source:gh.source,locale});
  }

  // V17 fallback retry: normally handled by the conversational employee earlier; retained for resilience after deterministic context routing.
  const neural=await tryV17NeuralAgent({analysis,state,message,history,locale,profile,cognition,persistentSnapshot:persistentRead.snapshot,retrievalRoute,agriculturalContext,salesTurn,currentProduct:await resolveCurrentProduct(pageUrl,productContext),sessionId});
  if(neural){
    return await makeResponse({
      payload:neural.payload,cors,sessionId,state,analysis,signals,profile,message,
      source:neural.source,results:neural.results,locale,cognition,retrieval:neural.retrieval,plan:neural.plan
    });
  }

  // V15 deterministic expert fallback: if the neural provider is unavailable/timeout, never route a crop symptom into a product dump.
  if(agriculturalContext?.is_agricultural && agriculturalContext.intent==="diagnosis"){
    try{
      const diag=diagnoseAgriculturalProblem(message,{analysis,state,profile});
      if(diag?.handled){
        const hypotheses=(diag.hypotheses||[]).slice(0,4).map((x,i)=>`${i+1}. ${x.hypothesis}`).join("\n");
        const checks=(diag.first_steps||[]).slice(0,3).map(x=>`• ${x}`).join("\n");
        const question=(diag.clarification_questions||[])[0];
        const reply=`من الوصف وحده ما ينفعش أقفل التشخيص على سبب واحد. أقرب الاحتمالات:
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
