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
import { cleanText, safeLocale, safePageUrl, jsonResponse } from "../lib/utils.js";

const VERSION="4.0.0";
const MODE="free_sitewide_emirati_v4";
const DEFAULT_ORIGINS=[
  "https://www.migfarm.com",
  "https://migfarm.com",
  "https://edu-mig-for-agriculture.odoo.com"
];

const rateBuckets=globalThis.__migV4Rate || new Map();
globalThis.__migV4Rate=rateBuckets;

function allowedOrigins(){
  const configured=String(process.env.ALLOWED_ORIGINS||"")
    .split(",").map(x=>x.trim()).filter(Boolean);
  return [...new Set([...DEFAULT_ORIGINS,...configured])];
}

function corsHeaders(origin){
  const approved=origin&&allowedOrigins().includes(origin);
  return {
    ...(approved?{"Access-Control-Allow-Origin":origin}:{}),
    "Access-Control-Allow-Methods":"POST, OPTIONS",
    "Access-Control-Allow-Headers":"Content-Type",
    "Access-Control-Max-Age":"86400",
    "Vary":"Origin"
  };
}

function isAllowedOrigin(origin){
  if(!origin) return true;
  return allowedOrigins().includes(origin);
}

function rateLimit(key){
  const now=Date.now(),windowMs=60000,max=45,current=rateBuckets.get(key);

  if(rateBuckets.size>5000){
    for(const [bucketKey,bucket] of rateBuckets){
      if(now-bucket.startedAt>windowMs*5) rateBuckets.delete(bucketKey);
    }
  }

  if(!current || now-current.startedAt>windowMs){
    rateBuckets.set(key,{startedAt:now,count:1});
    return {ok:true,remaining:max-1};
  }
  current.count+=1;
  rateBuckets.set(key,current);
  return {ok:current.count<=max,remaining:Math.max(0,max-current.count)};
}

function normalizeHistory(value){
  return Array.isArray(value)
    ? value
      .filter(x=>x && ["user","assistant"].includes(x.role) && typeof x.content==="string")
      .slice(-12)
      .map(x=>({role:x.role,content:cleanText(x.content,3000)}))
    : [];
}

function normalizeProductContext(value){
  if(!value || typeof value!=="object" || Array.isArray(value)) return null;
  return {
    name:cleanText(value.name||value.title||"",500),
    price:cleanText(String(value.price??""),100),
    currency:cleanText(value.currency||"AED",20),
    availability:cleanText(value.availability||value.stock||"",100),
    description:cleanText(value.description||"",1600),
    url:safePageUrl(value.url||"")
  };
}

function absoluteActionUrls(actions=[]){
  const origin=siteOrigin();
  return actions.map(a=>{
    if(a.type!=="page" || !a.url) return a;
    try{
      return {...a,url:new URL(a.url,origin).toString()};
    }catch{
      return a;
    }
  });
}

function respond(payload,status,cors,sessionId){
  return jsonResponse({
    session_id:sessionId,
    suggested_actions:[],
    escalation:false,
    version:VERSION,
    mode:MODE,
    ...payload,
    suggested_actions:absoluteActionUrls(payload.suggested_actions||payload.actions||[]),
    actions:undefined
  },status,cors);
}

function fallback(locale="ar"){
  return locale==="en"
    ? "I couldn't confirm that from the MIG FARM website. Try the exact product, category or service name, or contact the team on WhatsApp."
    : "ما قدرت أتأكد من هالمعلومة من موقع MIG FARM. جرّب تكتب اسم المنتج أو القسم أو الخدمة بشكل أوضح، أو كلم الفريق على واتساب.";
}

function trustedPageUrl(pageUrl){
  if(!pageUrl) return false;
  try{
    const u=new URL(pageUrl);
    const allowed=new Set([
      new URL(siteOrigin()).origin,
      "https://www.migfarm.com",
      "https://migfarm.com"
    ]);
    return allowed.has(u.origin);
  }catch{
    return false;
  }
}

async function resolveCurrentProduct(pageUrl,productContext){
  if(!pageUrl || !trustedPageUrl(pageUrl)) return null;
  try{
    const u=new URL(pageUrl);
    if(!u.pathname.startsWith("/shop/") || u.pathname.startsWith("/shop/category/")) return null;
    try{
      const live=await fetchProduct(pageUrl);
      if(live?.name) return live;
    }catch{}
    return productContext?.name ? productContext : null;
  }catch{
    return null;
  }
}

export async function OPTIONS(request){
  const origin=request.headers.get("origin")||"";
  if(!isAllowedOrigin(origin)) return new Response(null,{status:403});
  return new Response(null,{status:204,headers:corsHeaders(origin)});
}

export async function POST(request){
  const origin=request.headers.get("origin")||"";
  const cors=corsHeaders(origin);

  if(!isAllowedOrigin(origin)){
    return jsonResponse({error:"origin_not_allowed"},403,cors);
  }

  let body;
  try{ body=await request.json(); }
  catch{ return jsonResponse({error:"invalid_json"},400,cors); }

  const message=cleanText(body?.message,2500);
  const sessionId=cleanText(body?.session_id,160)||crypto.randomUUID();
  const locale=safeLocale(body?.locale);
  const pageUrl=safePageUrl(body?.page_url);
  const pageTitle=cleanText(body?.page_title,500);
  const history=normalizeHistory(body?.history);
  const productContext=normalizeProductContext(body?.product_context);

  if(!message){
    return respond({error:"message_required",reply:locale==="en"?"Write a message first.":"اكتب سؤالك أول."},400,cors,sessionId);
  }

  const ip=(request.headers.get("x-forwarded-for")||"unknown").split(",")[0].trim();
  const limit=rateLimit(`${ip}:${sessionId}`);
  if(!limit.ok){
    return respond({
      reply:locale==="en"?"Too many messages. Try again in a minute.":"رسائل وايد بسرعة 😄 جرّب عقب دقيقة.",
      source:"rate_limit"
    },429,cors,sessionId);
  }

  // 1) Deterministic site/business knowledge has priority over fuzzy page search.
  const direct=directKnowledgeReply(message,locale);
  if(direct){
    return respond({
      reply:direct.reply,
      source:direct.source,
      suggested_actions:direct.actions||[],
      escalation:Boolean(direct.escalation)
    },200,cors,sessionId);
  }

  // 2) Conversation memory: cheapest/highest/available/count/hot/sweet/price filters.
  const memory=historyReply(message,history,locale);
  if(memory){
    return respond({
      reply:memory.reply,
      source:memory.source,
      suggested_actions:memory.actions||[]
    },200,cors,sessionId);
  }

  // 3) Current product/page awareness for "this", "price?", "available?".
  const currentProduct=await resolveCurrentProduct(pageUrl,productContext);
  const currentAnswer=currentProductReply(message,currentProduct,locale);
  if(currentAnswer){
    return respond({
      reply:currentAnswer.reply,
      source:currentAnswer.source,
      suggested_actions:pageUrl?[{type:"page",label:locale==="en"?"Open product":"افتح المنتج",url:pageUrl}]:[]
    },200,cors,sessionId);
  }

  // 4) If the user asks for a recommendation but hasn't given enough context, ask concise questions.
  const clarification=productClarificationReply(message,locale);
  if(clarification){
    return respond({
      reply:clarification.reply,
      source:clarification.source,
      suggested_actions:[]
    },200,cors,sessionId);
  }

  let products=[];
  let pages=[];

  try{
    const recentProductContext=
      isProductFollowup(message) &&
      history.slice(-5).some(x=>x.role==="user" && isProductIntent(x.content));

    if(isProductIntent(message) || recentProductContext){
      products=await searchProducts(message,history,12);
      products=productPostFilter(products,message).slice(0,8);
    }

    if(!products.length){
      pages=await searchSitePages(message,5);
    }
  }catch(error){
    console.error("MIG assistant lookup failed",{
      name:error?.name,
      message:error?.message,
      pageUrl,
      pageTitle
    });
  }

  if(products.length){
    const actions=[];
    if(products[0]?.url){
      actions.push({
        type:"page",
        label:locale==="en"?"Open first product":"افتح أول منتج",
        url:products[0].url
      });
    }
    return respond({
      reply:formatProducts(products,locale),
      source:"live_products",
      suggested_actions:actions,
      results:products.map(p=>({
        name:p.name,
        price:p.price,
        currency:p.currency,
        availability:p.availability,
        sku:p.sku,
        url:p.url
      }))
    },200,cors,sessionId);
  }

  const pageReply=extractPageAnswer(pages,message,locale);
  if(pageReply){
    return respond({
      reply:pageReply,
      source:"live_site_page",
      suggested_actions:pages[0]?.url?[{
        type:"page",
        label:locale==="en"?"Open page":"افتح الصفحة",
        url:pages[0].url
      }]:[]
    },200,cors,sessionId);
  }

  return respond({
    reply:fallback(locale),
    source:"fallback",
    suggested_actions:[{
      type:"whatsapp",
      label:locale==="en"?"WhatsApp MIG FARM":"كلمنا واتساب",
      url:BUSINESS.whatsapp
    }],
    escalation:true,
    page_context:{page_title:pageTitle,page_url:pageUrl}
  },200,cors,sessionId);
}
