import { searchProducts, searchSitePages, siteOrigin } from "../lib/site.js";
import { smallTalk, formatProducts, extractPageAnswer } from "../lib/emirati.js";
import { cleanText, normalizeAr, safeLocale, safePageUrl, jsonResponse } from "../lib/utils.js";

const DEFAULT_ORIGINS=[
  "https://www.migfarm.com",
  "https://migfarm.com",
  "https://edu-mig-for-agriculture.odoo.com"
];

const rateBuckets=globalThis.__migV3Rate || new Map();
globalThis.__migV3Rate=rateBuckets;

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
    "Vary":"Origin"
  };
}

function isAllowedOrigin(origin){
  if(!origin) return true;
  return allowedOrigins().includes(origin);
}

function rateLimit(key){
  const now=Date.now(),windowMs=60000,max=35,current=rateBuckets.get(key);
  if(!current || now-current.startedAt>windowMs){
    rateBuckets.set(key,{startedAt:now,count:1});
    return true;
  }
  current.count+=1;
  rateBuckets.set(key,current);
  return current.count<=max;
}

function asksForHuman(message){
  return /(موظف|انسان|إنسان|بني ادم|واتساب|اتصل|كلم حد|human|agent|whatsapp)/i.test(String(message));
}

function asksProductish(message){
  const t=normalizeAr(message);
  return /(بذور|طماطم|خيار|باذنجان|فلفل|بطيخ|شمام|كوس|باميه|بامية|بصل|ذره|ذرة|سماد|اسمده|اسمدة|ري|تنقيط|ادوات|معدات|مبيد|بيت محمي|زراعه مائيه|seeds|tomato|cucumber|eggplant|pepper|fertilizer|irrigation|greenhouse|hydroponic)/i.test(t);
}

function isPriceFollowup(message){
  const t=normalizeAr(message);
  return /(ارخص|الارخص|اغلى|الاغلى|بكام|بكم|سعر|السعر|كام)/.test(t);
}

function getLastAssistantProductRows(history=[]){
  for(let i=history.length-1;i>=0;i--){
    const item=history[i];
    if(!item || item.role!=="assistant") continue;
    const text=String(item.content||"");
    if(!text.includes("•") || !/AED/.test(text)) continue;

    const rows=[];
    const regex=/•\s*([^•\n]+?)\s*—\s*([0-9][0-9,.]*)\s*AED(?:\s*-\s*([^\n•]+))?/g;
    let match;

    while((match=regex.exec(text))!==null){
      const price=parseFloat(String(match[2]).replace(/,/g,""));

      if(!Number.isNaN(price)){
        rows.push({
          name:match[1].trim(),
          price,
          status:(match[3]||"").trim()
        });
      }
    }

    if(rows.length) return rows;
  }

  return [];
}

function priceFollowupAnswer(message,history=[],locale="ar"){
  if(!isPriceFollowup(message)) return "";

  const rows=getLastAssistantProductRows(history);

  if(!rows.length) return "";

  const t=normalizeAr(message);

  if(/ارخص|الارخص|اقل سعر/.test(t)){
    const min=Math.min(...rows.map(x=>x.price));
    const matches=rows.filter(x=>x.price===min);

    return locale==="en"
      ? `The lowest price is ${min} AED:\n${matches.map(x=>`• ${x.name}`).join("\n")}`
      : `أرخص سعر من اللي فوق هو ${min} درهم:\n${matches.map(x=>`• ${x.name}`).join("\n")}`;
  }

  if(/اغلى|الاغلى|اعلى سعر/.test(t)){
    const max=Math.max(...rows.map(x=>x.price));
    const matches=rows.filter(x=>x.price===max);

    return locale==="en"
      ? `The highest price is ${max} AED:\n${matches.map(x=>`• ${x.name}`).join("\n")}`
      : `أعلى سعر من اللي فوق هو ${max} درهم:\n${matches.map(x=>`• ${x.name}`).join("\n")}`;
  }

  return "";
}

function fallback(locale="ar"){
  return locale==="en"
    ? "I couldn't find confirmed information for that on the MIG FARM website. Try naming the product or page, or contact the team on WhatsApp."
    : "ما حصلت معلومة مؤكدة عن هالشي في موقع MIG FARM. جرّب تذكر اسم المنتج أو الصفحة بشكل أوضح، وإذا تبا أوصلك للفريق على واتساب.";
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
      error:"origin_not_allowed"
    },403,cors);
  }

  let body;

  try{
    body=await request.json();
  }catch{
    return jsonResponse({
      error:"invalid_json"
    },400,cors);
  }

  const message=cleanText(body?.message,2500);
  const sessionId=cleanText(body?.session_id,160)||crypto.randomUUID();
  const locale=safeLocale(body?.locale);
  const pageUrl=safePageUrl(body?.page_url);
  const pageTitle=cleanText(body?.page_title,400);

  const history=Array.isArray(body?.history)
    ? body.history
        .filter(
          x =>
            x &&
            ["user","assistant"].includes(x.role) &&
            typeof x.content==="string"
        )
        .slice(-10)
        .map(x=>({
          role:x.role,
          content:cleanText(x.content,2500)
        }))
    : [];

  if(!message){
    return jsonResponse({
      error:"message_required"
    },400,cors);
  }

  const ip=(request.headers.get("x-forwarded-for")||"unknown")
    .split(",")[0]
    .trim();

  if(!rateLimit(`${ip}:${sessionId}`)){
    return jsonResponse({
      reply:
        locale==="en"
          ? "Too many messages. Try again in a minute."
          : "رسائل وايد بسرعة 😄 جرّب عقب دقيقة.",
      session_id:sessionId,
      suggested_actions:[],
      escalation:false,
      mode:"free_sitewide_emirati_v3"
    },429,cors);
  }

  if(asksForHuman(message)){
    return jsonResponse({
      reply:
        locale==="en"
          ? "Sure. You can contact the MIG FARM team directly on WhatsApp."
          : "أكيد، حاضرين. تقدر تكلم فريق MIG FARM مباشرة على واتساب.",
      session_id:sessionId,
      suggested_actions:[
        {
          type:"whatsapp",
          label:
            locale==="en"
              ? "WhatsApp MIG FARM"
              : "كلمنا واتساب",
          url:"https://wa.me/971581768215"
        }
      ],
      escalation:true,
      mode:"free_sitewide_emirati_v3"
    },200,cors);
  }

  const followup=priceFollowupAnswer(
    message,
    history,
    locale
  );

  if(followup){
    return jsonResponse({
      reply:followup,
      session_id:sessionId,
      suggested_actions:[],
      escalation:false,
      mode:"free_sitewide_emirati_v3",
      source:"conversation_memory"
    },200,cors);
  }

  const casual=smallTalk(message,locale);

  if(casual){
    return jsonResponse({
      reply:casual,
      session_id:sessionId,
      suggested_actions:[],
      escalation:false,
      mode:"free_sitewide_emirati_v3",
      source:"smalltalk"
    },200,cors);
  }

  let products=[];
  let pages=[];

  try{
    if(
      asksProductish(message) ||
      history.some(
        x =>
          x.role==="user" &&
          asksProductish(x.content)
      )
    ){
      products=await searchProducts(
        message,
        history,
        8
      );
    }

    if(!products.length){
      pages=await searchSitePages(
        message,
        5
      );
    }
  }catch(error){
    console.error(
      "MIG assistant lookup failed",
      {
        name:error?.name,
        message:error?.message
      }
    );
  }

  if(products.length){
    const reply=formatProducts(
      products,
      locale
    );

    const actions=[];

    if(products[0]?.url){
      actions.push({
        type:"page",
        label:
          locale==="en"
            ? "Open first product"
            : "افتح أول منتج",
        url:products[0].url
      });
    }

    return jsonResponse({
      reply,
      session_id:sessionId,
      suggested_actions:actions,
      escalation:false,
      mode:"free_sitewide_emirati_v3",
      source:"live_products",
      results:products.map(p=>({
        name:p.name,
        price:p.price,
        currency:p.currency,
        availability:p.availability,
        sku:p.sku,
        url:p.url
      }))
    },200,cors);
  }

  const pageReply=extractPageAnswer(
    pages,
    message,
    locale
  );

  if(pageReply){
    return jsonResponse({
      reply:pageReply,
      session_id:sessionId,
      suggested_actions:
        pages[0]?.url
          ? [
              {
                type:"page",
                label:
                  locale==="en"
                    ? "Open page"
                    : "افتح الصفحة",
                url:pages[0].url
              }
            ]
          : [],
      escalation:false,
      mode:"free_sitewide_emirati_v3",
      source:"live_site_page"
    },200,cors);
  }

  return jsonResponse({
    reply:fallback(locale),
    session_id:sessionId,
    suggested_actions:[
      {
        type:"whatsapp",
        label:
          locale==="en"
            ? "WhatsApp MIG FARM"
            : "كلمنا واتساب",
        url:"https://wa.me/971581768215"
      }
    ],
    escalation:true,
    mode:"free_sitewide_emirati_v3",
    source:"fallback",
    page_context:{
      page_title:pageTitle,
      page_url:pageUrl
    },
    site_origin:siteOrigin()
  },200,cors);
}
