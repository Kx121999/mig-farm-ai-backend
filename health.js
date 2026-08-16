import {
  buildCatalogQuery,
  searchProducts,
  relevantPageText,
  siteOrigin
} from "../lib/site.js";
import {
  cleanText,
  safeLocale,
  safePageUrl,
  detectIntent,
  jsonResponse
} from "../lib/utils.js";

const DEFAULT_ORIGINS = [
  "https://www.migfarm.com",
  "https://migfarm.com",
  "https://edu-mig-for-agriculture.odoo.com"
];

const rateBuckets = globalThis.__migFreeRateBuckets || new Map();
globalThis.__migFreeRateBuckets = rateBuckets;

function allowedOrigins(){
  const configured=String(process.env.ALLOWED_ORIGINS||"")
    .split(",")
    .map(x=>x.trim())
    .filter(Boolean);

  return [...new Set([...DEFAULT_ORIGINS,...configured])];
}

function corsHeaders(origin){
  const approved=origin&&allowedOrigins().includes(origin);

  return {
    ...(approved?{"Access-Control-Allow-Origin":origin}:{}),
    "Access-Control-Allow-Methods":"POST, OPTIONS",
    "Access-Control-Allow-Headers":"Content-Type",
    "Vary":"Origin"
  };
}

function isAllowedOrigin(origin){
  if(!origin)return true;
  return allowedOrigins().includes(origin);
}

function rateLimit(key){
  const now=Date.now();
  const windowMs=60000;
  const max=30;
  const current=rateBuckets.get(key);

  if(!current||now-current.startedAt>windowMs){
    rateBuckets.set(key,{startedAt:now,count:1});
    return true;
  }

  current.count+=1;
  rateBuckets.set(key,current);
  return current.count<=max;
}

function normalizeArabic(value=""){
  return String(value)
    .toLowerCase()
    .replace(/[أإآ]/g,"ا")
    .replace(/ى/g,"ي")
    .replace(/[ًٌٍَُِّْ]/g,"")
    .replace(/\s+/g," ")
    .trim();
}

function productLine(product, locale){
  const price = product.price
    ? `${product.price} ${product.currency || "AED"}`
    : locale === "en"
      ? "price not shown"
      : "السعر غير ظاهر";

  const availability = product.availability
    ? ` - ${product.availability}`
    : "";

  return `• ${product.name} — ${price}${availability}`;
}

function productDetailBlock(product, locale){
  const lines = [productLine(product, locale)];

  if(product.sku){
    lines.push(locale==="en" ? `SKU: ${product.sku}` : `الكود: ${product.sku}`);
  }

  if(product.brand){
    lines.push(locale==="en" ? `Brand: ${product.brand}` : `العلامة: ${product.brand}`);
  }

  if(product.description){
    lines.push(product.description.slice(0,700));
  }

  return lines.join("\n");
}

function requestedDetail(message){
  const t=normalizeArabic(message);
  return /(تفاصيل|مواصفات|وصف|الفرق|details|spec|description)/i.test(t);
}

function requestedPrice(message){
  const t=normalizeArabic(message);
  return /(سعر|بكام|اسعار|الاسعار|price|cost|aed|درهم)/i.test(t);
}

function requestedAvailability(message){
  const t=normalizeArabic(message);
  return /(متوفر|موجود|مخزون|available|stock)/i.test(t);
}

function humanRequested(message){
  return /(موظف|انسان|إنسان|واتساب|اتصل|human|agent|whatsapp)/i.test(String(message));
}

function pageAnswer(page, locale){
  if(!page?.text)return "";

  const text=page.text.slice(0,2200);

  return locale==="en"
    ? `${page.title}:\n${text}`
    : `${page.title}:\n${text}`;
}

function productAnswer(products, message, locale){
  if(!products.length)return "";

  if(requestedDetail(message) && products.length===1){
    return productDetailBlock(products[0], locale);
  }

  const max = requestedDetail(message) ? 4 : 7;
  const list = products.slice(0,max).map(p=>productLine(p,locale)).join("\n");

  if(locale==="en"){
    return `I found these products on the MIG FARM website:\n${list}`;
  }

  return `لقيت المنتجات دي على موقع MIG FARM:\n${list}`;
}

function actionsFor(products, pageUrl, intent, escalation, locale){
  const actions=[];

  if(products[0]?.url){
    actions.push({
      type:"page",
      label:locale==="en"?"Open first product":"فتح أول منتج",
      url:products[0].url
    });
  }else if(pageUrl){
    actions.push({
      type:"page",
      label:locale==="en"?"Open current page":"فتح الصفحة الحالية",
      url:pageUrl
    });
  }

  if(escalation || intent==="purchase" || intent==="availability"){
    actions.push({
      type:"whatsapp",
      label:locale==="en"?"WhatsApp MIG FARM":"تواصل واتساب",
      url:"https://wa.me/971581768215"
    });
  }

  return actions;
}

export async function OPTIONS(request){
  const origin=request.headers.get("origin")||"";

  if(!isAllowedOrigin(origin)){
    return new Response(null,{status:403});
  }

  return new Response(null,{
    status:204,
    headers:corsHeaders(origin)
  });
}

export async function POST(request){
  const origin=request.headers.get("origin")||"";
  const cors=corsHeaders(origin);

  if(!isAllowedOrigin(origin)){
    return jsonResponse({
      error:"origin_not_allowed",
      message:"This website is not allowed to use the MIG FARM assistant."
    },403,cors);
  }

  let body;

  try{
    body=await request.json();
  }catch{
    return jsonResponse({
      error:"invalid_json",
      message:"Invalid JSON request."
    },400,cors);
  }

  const message=cleanText(body?.message,2000);
  const sessionId=cleanText(body?.session_id,120)||crypto.randomUUID();
  const locale=safeLocale(body?.locale);
  const pageUrl=safePageUrl(body?.page_url);
  const history=Array.isArray(body?.history)
    ? body.history
        .filter(x=>x && ["user","assistant"].includes(x.role) && typeof x.content==="string")
        .slice(-8)
        .map(x=>({role:x.role,content:cleanText(x.content,1000)}))
    : [];

  if(!message){
    return jsonResponse({
      error:"message_required",
      message:"A message is required."
    },400,cors);
  }

  const forwardedFor=request.headers.get("x-forwarded-for")||"unknown";
  const rateKey=`${forwardedFor.split(",")[0].trim()}:${sessionId}`;

  if(!rateLimit(rateKey)){
    return jsonResponse({
      error:"rate_limited",
      message:locale==="en"
        ?"Too many messages. Please wait a minute."
        :"رسائل كتير في وقت قصير. استنى دقيقة وجرب تاني."
    },429,cors);
  }

  const intent=detectIntent(message);

  if(humanRequested(message)){
    return jsonResponse({
      reply:locale==="en"
        ?"You can contact the MIG FARM team directly on WhatsApp."
        :"تقدر تتواصل مباشرة مع فريق MIG FARM على واتساب.",
      session_id:sessionId,
      intent:"human_support",
      suggested_actions:[{
        type:"whatsapp",
        label:locale==="en"?"WhatsApp MIG FARM":"تواصل واتساب",
        url:"https://wa.me/971581768215"
      }],
      escalation:true,
      mode:"free_live_site"
    },200,cors);
  }

  let products=[];
  let page=null;
  let lookupError=false;

  try{
    const query=buildCatalogQuery(message,history);

    const results=await Promise.allSettled([
      query ? searchProducts(query,8) : Promise.resolve([]),
      relevantPageText(message)
    ]);

    if(results[0].status==="fulfilled")products=results[0].value||[];
    else lookupError=true;

    if(results[1].status==="fulfilled")page=results[1].value;
  }catch{
    lookupError=true;
  }

  let reply="";

  if(products.length){
    reply=productAnswer(products,message,locale);
  }else if(page?.text){
    reply=pageAnswer(page,locale);
  }else{
    reply=locale==="en"
      ?"I couldn't find confirmed information for that on the MIG FARM website right now. You can try the product name more specifically or contact the team on WhatsApp."
      :"ملقتش معلومة مؤكدة عن ده على موقع MIG FARM دلوقتي. جرّب تكتب اسم المنتج بشكل أوضح أو تواصل مع الفريق على واتساب.";
  }

  const escalation=!products.length&&!page?.text;
  const actions=actionsFor(products,pageUrl,intent,escalation,locale);

  return jsonResponse({
    reply,
    session_id:sessionId,
    intent,
    suggested_actions:actions,
    escalation,
    mode:"free_live_site",
    source:products.length?"live_shop":page?.text?"live_page":"none",
    catalog_count:products.length,
    site_origin:siteOrigin(),
    lookup_error:lookupError
  },200,cors);
}
