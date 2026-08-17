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

const VERSION="7.0.0";
const MODE="free_sales_knowledge_agent_v7";
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

function makeResponse({payload={},status=200,cors={},sessionId,state,analysis,signals,profile,message,source="",results=[],locale="ar"}){
  const next=updateState(state,analysis,message,source,results);
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
    learning_event:sourceNeedsLearning(source)?learning:undefined,
    source
  },status,cors);
}

async function searchCatalog(analysis,state,message,history){
  const query=buildSearchQuery(analysis,state,message);
  let products=[];
  try{ products=await searchProducts(query,history,24); }
  catch(error){ console.error("product search failed",error?.message); }
  products=filterRankProducts(products,analysis,state,message);
  const categoryKey=analysis.category?.key||state.category||"";
  if(categoryKey==="seeds" && products.length<4){
    try{
      const extra=await discoverMigFarmSeeds(analysis.crop?.key||state.crop||"",8);
      products=mergeProducts(products,extra);
    }catch(error){ console.error("seed sitemap discovery failed",error?.message); }
  }
  return {products,categoryKey,query};
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
    return makeResponse({
      payload:{reply:`${shipping.reply}\n\nوبالنسبة للمنتج: ما حصلت نتيجة مطابقة بشكل مؤكد في المتجر الحي.`,display_reply:shipping.reply,quick_replies:["دور بالاسم","كلم الفريق"],suggested_actions:shipping.actions||[]},
      cors,sessionId,state,analysis,signals,profile,message,source:"multi_shipping_no_product",locale
    });
  }
  const cleanResults=products.map(p=>({name:p.name,price:p.price,currency:p.currency,availability:p.availability,sku:p.sku,url:p.url}));
  return makeResponse({
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
  const state=mergeState(body?.conversation_state,history);
  const existingProfile=sanitizeCustomerProfile(body?.conversation_state?.customer_profile||body?.customer_profile);
  const analysis=analyzeTurn(message,state,history,locale);
  const signals=extractCustomerSignals(message,analysis,state);
  const profile=mergeCustomerProfile(existingProfile,signals,analysis,state);

  if(!message) return makeResponse({payload:{reply:locale==="en"?"Write a message first.":"اكتب سؤالك أول."},status:400,cors,sessionId,state,analysis,signals,profile,message,source:"empty",locale});

  const ip=(request.headers.get("x-forwarded-for")||"unknown").split(",")[0].trim();
  if(!rateLimit(`${ip}:${sessionId}`)) return makeResponse({payload:{reply:locale==="en"?"Too many messages. Try again in a minute.":"رسائل وايد بسرعة 😄 جرّب عقب دقيقة."},status:429,cors,sessionId,state,analysis,signals,profile,message,source:"rate_limit",locale});

  // Repair misunderstandings before routing a vague "wrong / I mean..." message.
  const repair=customerRepairReply(signals,analysis,profile);
  if(repair) return makeResponse({payload:{reply:repair.reply,quick_replies:repair.quick_replies||[]},cors,sessionId,state,analysis,signals,profile,message,source:repair.source,locale});

  // A ready customer who already has products should not be sent back to generic ordering instructions.
  const purchase=purchaseContinuation({profile,state,analysis,message});
  if(purchase) return makeResponse({payload:{reply:purchase.reply,quick_replies:purchase.quick_replies||[],suggested_actions:purchase.actions||[]},cors,sessionId,state,analysis,signals,profile,message,source:purchase.source,locale});

  // Natural multi-intent: "عندكم بذور طماطم وتوصلون العين؟"
  const multi=await multiIntentShippingProducts({analysis,state,message,history,locale,sessionId,profile,signals,cors});
  if(multi) return multi;

  const direct=directReply(analysis,state,message,sessionId);
  if(direct) return makeResponse({payload:{reply:direct.reply,quick_replies:direct.quick_replies||[],suggested_actions:direct.actions||[],escalation:direct.escalation},cors,sessionId,state,analysis,signals,profile,message,source:direct.source,locale});

  const humanKnowledge=extendedKnowledgeReply(message,locale,{sessionId,profile,state,analysis});
  if(humanKnowledge) return makeResponse({payload:{reply:humanKnowledge.reply,quick_replies:humanKnowledge.quick_replies||[]},cors,sessionId,state,analysis,signals,profile,message,source:humanKnowledge.source,locale});

  const memory=productMemoryReply(analysis,state,locale);
  if(memory) return makeResponse({payload:{reply:memory.reply,quick_replies:salesQuickReplies({category:state.category,stage:"compare",results:state.last_products||[],profile})},cors,sessionId,state,analysis,signals,profile,message,source:memory.source,locale});

  const currentProduct=await resolveCurrentProduct(pageUrl,productContext);
  const current=currentProductReply(message,currentProduct,locale);
  if(current) return makeResponse({payload:{reply:current,suggested_actions:pageUrl?[{type:"page",label:"افتح المنتج",url:pageUrl}]:[]},cors,sessionId,state,analysis,signals,profile,message,source:"current_product",locale});

  const contextual=ambiguousContextReply(message,state,analysis);
  if(contextual) return makeResponse({payload:{reply:contextual.reply,quick_replies:contextual.quick_replies||[]},cors,sessionId,state,analysis,signals,profile,message,source:contextual.source,locale});

  if(isClearlyOffDomain(message)) return makeResponse({payload:{reply:"أنا مخصص لـ MIG FARM والزراعة والمنتجات والشحن وخدمات الموقع. إذا سؤالك متعلق بهالمجال عطِني التفاصيل وأنا أساعدك."},cors,sessionId,state,analysis,signals,profile,message,source:"off_domain",locale});

  // Greenhouse = project qualification, not a random product dump.
  if((analysis.category?.key||state.category||profile.category)==="greenhouse" && ["product_search","recommendation","unknown"].includes(analysis.intent)){
    const stage=journeyStage({analysis,profile,state,message});
    const gh=greenhouseLeadReply({profile,state,analysis,stage});
    return makeResponse({payload:{reply:gh.reply,quick_replies:gh.quick_replies||[],suggested_actions:gh.actions||[]},cors,sessionId,state,analysis,signals,profile,message,source:gh.source,locale});
  }

  const productLike=["product_search","recommendation"].includes(analysis.intent) || Boolean(analysis.category) || Boolean(analysis.crop);
  if(productLike){
    // If the customer asked for a recommendation and we still miss one key detail,
    // ask ONE question instead of dumping products.
    if(analysis.intent==="recommendation"){
      const stage=journeyStage({analysis,profile,state,message});
      const next=nextBestQuestion({analysis,profile,state,stage});
      if(next){
        return makeResponse({payload:{reply:next.reply,quick_replies:next.quick_replies||[]},cors,sessionId,state,analysis,signals,profile,message,source:`sales_qualify_${next.field}`,locale});
      }
    }

    const {products,categoryKey}=await searchCatalog(analysis,state,message,history);
    if(products.length){
      const cleanResults=products.map(p=>({name:p.name,price:p.price,currency:p.currency,availability:p.availability,sku:p.sku,url:p.url}));
      const reply=formatProductsForMemory(products,locale,`${sessionId}:${message}`);
      const stage=journeyStage({analysis,profile,state,message,results:cleanResults});
      const quick=salesQuickReplies({category:categoryKey,stage,results:cleanResults,profile});
      return makeResponse({payload:{reply,results:cleanResults,quick_replies:quick.length?quick:productSearchQuickReplies(categoryKey,locale,true),brand_scope:categoryKey==="seeds"?"mig_farm_seeds_only":"category_filtered"},cors,sessionId,state,analysis,signals,profile,message,source:categoryKey==="seeds"?"live_migfarm_seeds":"live_category_products",results:cleanResults,locale});
    }

    if(categoryKey==="seeds"){
      const fallback=knownSeedFallback(analysis.crop?.key||state.crop,locale);
      return makeResponse({payload:{reply:fallback||pick(TONE.noProductAr,`${sessionId}:${message}`),quick_replies:productSearchQuickReplies("seeds",locale,false)},cors,sessionId,state,analysis,signals,profile,message,source:"seed_knowledge_no_live_match",locale});
    }
    const knownFallback=knownCategoryFallback(categoryKey,locale);
    return makeResponse({payload:{reply:knownFallback||`${pick(TONE.noProductAr,`${sessionId}:${message}`)} اكتب اسم المنتج أو استخدامه بشكل أدق، أو أقدر أوصلك بالفريق.`,quick_replies:["دور بالاسم","كلم الفريق"],suggested_actions:[buildWhatsAppHandoff({profile,state,analysis,message})]},cors,sessionId,state,analysis,signals,profile,message,source:knownFallback?"known_category_no_live_match":"no_live_product_match",locale});
  }

  // Site-wide retrieval only after verified knowledge and product routing fail.
  let pages=[];
  try{ pages=await searchSitePages(message,5); }catch(error){ console.error("site search failed",error?.message); }
  const pAnswer=pageAnswer(pages,message,locale);
  if(pAnswer) return makeResponse({payload:{reply:pAnswer.reply,confidence:pAnswer.confidence,suggested_actions:pAnswer.page?.url?[{type:"page",label:"افتح الصفحة",url:pAnswer.page.url}]:[]},cors,sessionId,state,analysis,signals,profile,message,source:"confidence_site_rag",locale});

  return makeResponse({payload:{reply:pick(TONE.fallbackAr,`${sessionId}:${message}`),quick_replies:["منتج","شحن","فرع","خدمة"],suggested_actions:[buildWhatsAppHandoff({profile,state,analysis,message})],escalation:true,page_context:{page_title:pageTitle,page_url:pageUrl},knowledge_stats:knowledgeStats()},cors,sessionId,state,analysis,signals,profile,message,source:"safe_human_fallback",locale});
}
