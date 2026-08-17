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
  runNeuralAgent, shouldUseNeuralAgent, neuralBrainHealth
} from "../lib/neural_agent.js";

const VERSION="11.0.0";
const MODE="neural_hybrid_agent_vector_memory_graph_v11";
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
  next.v=11;
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

  let actions=uniqActions(payload.suggested_actions||payload.actions||[]);
  if((stage==="ready"||stage==="handoff"||lead.temperature==="hot") && !actions.some(a=>a.type==="whatsapp")){
    actions.push(buildWhatsAppHandoff({profile:nextProfile,state:next,analysis,message}));
  }

  const quality=conversationQualityMeta({previous:state,next,analysis,message,source,payload,results});

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
      product_index:productIndexStatus(),
      knowledge:githubKnowledgeStatus()
    },
    commerce:commerceCapabilities(),
    conversation_quality:quality,
    cognitive,
    evidence,
    hybrid_brain:hybrid,
    neural_brain:{
      ...neuralBrainHealth(),
      used:source==="neural_agent_v11",
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


async function tryV11NeuralAgent({analysis,state,message,history,locale,profile,cognition}){
  const plan=buildHybridPlan({message,analysis,cognition,state,profile});
  if(!shouldUseNeuralAgent({message,analysis,cognition,plan})) return null;

  const recalled=await semanticMemoryCandidatesAdaptive(message,state?.v11_memory||{},6);
  const seedGraph=buildKnowledgeGraph({message,analysis,state,profile,results:state?.visible_products||[],memory:recalled.items||[]});

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
    }
  };

  try{
    const result=await runNeuralAgent({
      message,locale,
      context:{analysis,state,profile,cognition,graph_context:knowledgeGraphContext(seedGraph),memory_hits:recalled.items||[]},
      toolHandlers
    });
    if(!result?.handled||!result.reply) return null;
    const products=clientProducts(result.products||[]).slice(0,8);
    const evidenceItems=(result.evidence||[]).map((x,i)=>({
      id:String(x?.id||`neural-${i}`),title:String(x?.title||""),answer:String(x?.answer||""),url:String(x?.url||""),
      source:String(x?.source||"neural_tool"),verified:Boolean(x?.verified),score:Number(x?.score||0)
    }));
    const retrieval=fuseRetrieval({message,products,knowledge:evidenceItems.filter(x=>x.source==="github_knowledge"),pages:evidenceItems.filter(x=>x.source==="site_page"),memory:recalled.items||[]});
    return {
      payload:{
        reply:result.reply,display_reply:result.reply,results:products,
        quick_replies:products.length?salesQuickReplies({category:analysis?.category?.key||state?.category,stage:"consider",results:products,profile}):[],
        neural_trace:result.trace||[],neural_model:result.model||"",neural_response_id:result.response_id||""
      },
      source:"neural_agent_v11",results,retrieval,plan
    };
  }catch(error){
    console.error("V11 neural agent fallback:",error?.message);
    return null;
  }
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
  const mergedIncomingState=mergeSessionState(serverSession,body?.conversation_state);
  const state=mergeState(mergedIncomingState,history);
  const mergedIncomingProfile=mergeSessionProfile(serverSession,body?.conversation_state?.customer_profile||body?.customer_profile);
  const existingProfile=sanitizeCustomerProfile(mergedIncomingProfile);
  const analysis=analyzeTurn(message,state,history,locale);
  const signals=extractCustomerSignals(message,analysis,state);
  const profile=mergeCustomerProfile(existingProfile,signals,analysis,state);
  const cognition=buildCognitiveFrame({message,analysis,state,profile,history});

  if(!message) return await makeResponse({payload:{reply:locale==="en"?"Write a message first.":"اكتب سؤالك أول."},status:400,cors,sessionId,state,analysis,signals,profile,message,source:"empty",locale});

  const ip=(request.headers.get("x-forwarded-for")||"unknown").split(",")[0].trim();
  if(!rateLimit(`${ip}:${sessionId}`)) return await makeResponse({payload:{reply:locale==="en"?"Too many messages. Try again in a minute.":"رسائل وايد بسرعة 😄 جرّب عقب دقيقة."},status:429,cors,sessionId,state,analysis,signals,profile,message,source:"rate_limit",locale});

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

  const humanKnowledge=extendedKnowledgeReply(message,locale,{sessionId,profile,state,analysis});
  if(humanKnowledge) return await makeResponse({payload:{reply:humanKnowledge.reply,quick_replies:humanKnowledge.quick_replies||[]},cors,sessionId,state,analysis,signals,profile,message,source:humanKnowledge.source,locale});

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

  // V11: bounded neural agent with tool calling. If it is not configured or fails,
  // the proven V10 deterministic/hybrid stack continues unchanged.
  const neural=await tryV11NeuralAgent({analysis,state,message,history,locale,profile,cognition});
  if(neural){
    return await makeResponse({
      payload:neural.payload,cors,sessionId,state,analysis,signals,profile,message,
      source:neural.source,results:neural.results,locale,cognition,retrieval:neural.retrieval,plan:neural.plan
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
  const memoryCandidates=episodicMemoryCandidates(state?.hybrid_memory||{});
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
