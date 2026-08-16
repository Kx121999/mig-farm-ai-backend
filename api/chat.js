import { searchProducts, searchSitePages, siteOrigin, fetchProduct } from "../lib/site.js";
import { formatProducts, extractPageAnswer } from "../lib/emirati.js";
import {
  BUSINESS,
  directKnowledgeReply,
  historyReply,
  isProductIntent,
  isProductFollowup,
  currentProductReply,
  productPostFilter,
  productClarificationReply
} from "../lib/knowledge.js";
import {
  sanitizeConversationState,
  mergeConversationState,
  contextualRewrite,
  ambiguityReply,
  isClearlyOffDomain,
  nextConversationState,
  quickRepliesFor
} from "../lib/conversation.js";
import { cleanText, safeLocale, safePageUrl, jsonResponse } from "../lib/utils.js";

const VERSION="5.0.0";
const MODE="free_contextual_rag_v5";
const DEFAULT_ORIGINS=[
  "https://www.migfarm.com",
  "https://migfarm.com",
  "https://edu-mig-for-agriculture.odoo.com"
];

const rateBuckets=globalThis.__migV5Rate || new Map();
globalThis.__migV5Rate=rateBuckets;

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
  const now=Date.now(),windowMs=60000,max=50,current=rateBuckets.get(key);
  if(rateBuckets.size>5000){
    for(const [bucketKey,bucket] of rateBuckets){ if(now-bucket.startedAt>windowMs*5) rateBuckets.delete(bucketKey); }
  }
  if(!current || now-current.startedAt>windowMs){rateBuckets.set(key,{startedAt:now,count:1});return true;}
  current.count+=1; rateBuckets.set(key,current); return current.count<=max;
}
function normalizeHistory(value){
  return Array.isArray(value)?value.filter(x=>x&&["user","assistant"].includes(x.role)&&typeof x.content==="string")
    .slice(-14).map(x=>({role:x.role,content:cleanText(x.content,3000)})):[];
}
function normalizeProductContext(value){
  if(!value||typeof value!=="object"||Array.isArray(value)) return null;
  return {name:cleanText(value.name||value.title||"",500),price:cleanText(String(value.price??""),100),currency:cleanText(value.currency||"AED",20),availability:cleanText(value.availability||value.stock||"",100),description:cleanText(value.description||"",1800),url:safePageUrl(value.url||"")};
}
function absoluteActionUrls(actions=[]){
  const origin=siteOrigin();
  return actions.map(a=>{
    if(a.type!=="page"||!a.url) return a;
    try{return {...a,url:new URL(a.url,origin).toString()};}catch{return a;}
  });
}
function trustedPageUrl(pageUrl){
  if(!pageUrl) return false;
  try{
    const u=new URL(pageUrl);
    return new Set([new URL(siteOrigin()).origin,"https://www.migfarm.com","https://migfarm.com"]).has(u.origin);
  }catch{return false;}
}
async function resolveCurrentProduct(pageUrl,productContext){
  if(!pageUrl||!trustedPageUrl(pageUrl)) return null;
  try{
    const u=new URL(pageUrl);
    if(!u.pathname.startsWith("/shop/")||u.pathname.startsWith("/shop/category/")) return null;
    try{const live=await fetchProduct(pageUrl);if(live?.name) return live;}catch{}
    return productContext?.name?productContext:null;
  }catch{return null;}
}

function defaultFallback(locale="ar"){
  return locale==="en"
    ? "I couldn't confirm that confidently from MIG FARM's website. Give me one more detail, or I can connect you with the team."
    : "ما قدرت أتأكد من هالمعلومة بثقة من موقع MIG FARM. عطِني تفصيل زيادة بسيط عشان أفهمك صح، أو أوصلك بالفريق.";
}
function offDomain(locale="ar"){
  return locale==="en"
    ? "I'm focused on MIG FARM, agriculture, products, delivery and website services. Ask me anything in that area and I'll help."
    : "أنا مخصص لـ MIG FARM والزراعة والمنتجات والشحن وخدمات الموقع. اسألني بأي شي بهالمجال وأنا أساعدك.";
}

function makeResponse({payload={},status=200,cors={},sessionId,state,source,message,results=[],currentProduct=null,locale="ar"}){
  const next=nextConversationState({previous:state,source,message,results,currentProduct});
  const topic=next.topic||"";
  return jsonResponse({
    session_id:sessionId,version:VERSION,mode:MODE,
    suggested_actions:absoluteActionUrls(payload.suggested_actions||payload.actions||[]),
    escalation:Boolean(payload.escalation),
    ...payload,
    suggested_actions:absoluteActionUrls(payload.suggested_actions||payload.actions||[]),
    conversation_state:next,
    quick_replies:payload.quick_replies||quickRepliesFor(topic,locale,Array.isArray(results)&&results.length>0),
    source:source||payload.source||""
  },status,cors);
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
  const clientState=sanitizeConversationState(body?.conversation_state);
  const state=mergeConversationState(clientState,history);

  if(!message){
    return makeResponse({payload:{reply:locale==="en"?"Write a message first.":"اكتب سؤالك أول."},status:400,cors,sessionId,state,source:"empty",message,locale});
  }

  const ip=(request.headers.get("x-forwarded-for")||"unknown").split(",")[0].trim();
  if(!rateLimit(`${ip}:${sessionId}`)){
    return makeResponse({payload:{reply:locale==="en"?"Too many messages. Try again in a minute.":"رسائل وايد بسرعة 😄 جرّب عقب دقيقة."},status:429,cors,sessionId,state,source:"rate_limit",message,locale});
  }

  // A) Current turn always wins. Never let old state trap the conversation.
  const direct=directKnowledgeReply(message,locale);
  if(direct){
    return makeResponse({payload:{reply:direct.reply,suggested_actions:direct.actions||[],escalation:Boolean(direct.escalation)},cors,sessionId,state,source:direct.source,message,locale});
  }

  // B) Resolve elliptical follow-ups using structured state + recent conversation.
  const rewrite=contextualRewrite(message,state,history);
  if(rewrite.used && rewrite.query!==message){
    const contextualDirect=directKnowledgeReply(rewrite.query,locale);
    if(contextualDirect){
      return makeResponse({payload:{reply:contextualDirect.reply,suggested_actions:contextualDirect.actions||[],escalation:Boolean(contextualDirect.escalation)},cors,sessionId,state,source:`context_${contextualDirect.source}`,message,locale});
    }
  }

  // C) Product-list memory (cheapest, highest, second item, available, compare...).
  const memory=historyReply(message,history,locale);
  if(memory){
    return makeResponse({payload:{reply:memory.reply,suggested_actions:memory.actions||[]},cors,sessionId,state,source:memory.source,message,locale});
  }

  // D) Current product page awareness.
  const currentProduct=await resolveCurrentProduct(pageUrl,productContext);
  const currentAnswer=currentProductReply(message,currentProduct,locale);
  if(currentAnswer){
    return makeResponse({payload:{reply:currentAnswer.reply,suggested_actions:pageUrl?[{type:"page",label:locale==="en"?"Open product":"افتح المنتج",url:pageUrl}]:[]},cors,sessionId,state,source:currentAnswer.source,message,currentProduct,locale});
  }

  // E) If the fragment is genuinely ambiguous, ask instead of guessing/searching a random page.
  const ambiguous=ambiguityReply(message,state,history,locale);
  if(ambiguous){
    return makeResponse({payload:{reply:ambiguous,quick_replies:locale==="en"?["Delivery","Nearest branch","Products"]:["أقصد الشحن","أقصد أقرب فرع","أقصد منتج"]},cors,sessionId,state,source:"clarify_context",message,locale});
  }

  // F) Obvious off-domain questions do not trigger fuzzy website retrieval.
  if(isClearlyOffDomain(message)){
    return makeResponse({payload:{reply:offDomain(locale)},cors,sessionId,state,source:"off_domain",message,locale});
  }

  const clarification=productClarificationReply(message,locale);
  if(clarification){
    return makeResponse({payload:{reply:clarification.reply},cors,sessionId,state,source:clarification.source,message,locale});
  }

  let products=[]; let pages=[];
  const effectiveQuery=rewrite.used?rewrite.query:message;
  try{
    const recentProductContext=isProductFollowup(message) && (state.topic==="product" || history.slice(-5).some(x=>x.role==="user"&&isProductIntent(x.content)));
    if(isProductIntent(message) || rewrite.topic==="product" || recentProductContext){
      products=await searchProducts(effectiveQuery,history,12);
      products=productPostFilter(products,message).slice(0,8);
    }
    if(!products.length) pages=await searchSitePages(effectiveQuery,5);
  }catch(error){
    console.error("MIG assistant lookup failed",{name:error?.name,message:error?.message,pageUrl,pageTitle,effectiveQuery});
  }

  if(products.length){
    const actions=products[0]?.url?[{type:"page",label:locale==="en"?"Open first product":"افتح أول منتج",url:products[0].url}]:[];
    const cleanResults=products.map(p=>({name:p.name,price:p.price,currency:p.currency,availability:p.availability,sku:p.sku,url:p.url}));
    return makeResponse({payload:{reply:formatProducts(products,locale),suggested_actions:actions,results:cleanResults},cors,sessionId,state,source:"live_products",message,results:cleanResults,locale});
  }

  const pageAnswer=extractPageAnswer(pages,effectiveQuery,locale);
  if(pageAnswer?.reply){
    return makeResponse({payload:{reply:pageAnswer.reply,confidence:pageAnswer.confidence,suggested_actions:pageAnswer.page?.url?[{type:"page",label:locale==="en"?"Open page":"افتح الصفحة",url:pageAnswer.page.url}]:[]},cors,sessionId,state,source:"live_site_page",message,locale});
  }

  return makeResponse({payload:{reply:defaultFallback(locale),suggested_actions:[{type:"whatsapp",label:locale==="en"?"WhatsApp MIG FARM":"كلمنا واتساب",url:BUSINESS.whatsapp}],escalation:true,page_context:{page_title:pageTitle,page_url:pageUrl}},cors,sessionId,state,source:"safe_fallback",message,locale});
}
