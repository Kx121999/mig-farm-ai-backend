import { cleanText, normalizeAr, tokenize, fuzzyWordMatch } from "./utils.js";

const SITE_ORIGIN=(process.env.ODOO_SITE_URL || "https://edu-mig-for-agriculture.odoo.com").replace(/\/+$/,"");
const CACHE_TTL=10*60*1000;
const SEARCH_TTL=3*60*1000;

const globalCache=globalThis.__migSiteWideCache || {
  sitemap:{time:0,urls:[]},
  pages:new Map(),
  products:new Map(),
  searches:new Map()
};
globalThis.__migSiteWideCache=globalCache;

const AR_EN = new Map(Object.entries({
  "طماطم":"tomato","طماطه":"tomato","بندوره":"tomato",
  "خيار":"cucumber","خيارا":"cucumber",
  "باذنجان":"eggplant","باذنجانن":"eggplant",
  "فلفل":"pepper","فليفله":"pepper",
  "بطيخ":"watermelon","رقي":"watermelon",
  "شمام":"melon","كنتالوب":"cantaloupe",
  "كوسا":"zucchini","كوسه":"zucchini",
  "باميه":"okra","بامية":"okra",
  "بصل":"onion","ذره":"corn","ذرة":"corn",
  "فجل":"radish","شمندر":"beetroot","سبانخ":"spinach","ملوخيه":"molokhia","ملوخية":"molokhia",
  "سماد":"fertilizer","اسمده":"fertilizer","اسمدة":"fertilizer",
  "ري":"irrigation","تنقيط":"drip irrigation",
  "ادوات":"tools","أدوات":"tools","معدات":"equipment",
  "بذور":"seeds","بذره":"seeds","بذرة":"seeds",
  "مبيد":"pesticide","مبيدات":"pesticides",
  "بيت محمي":"greenhouse","بيوت محميه":"greenhouse","بيوت محمية":"greenhouse",
  "زراعه مائيه":"hydroponics","زراعة مائية":"hydroponics",
  "جرين هاوس":"greenhouse","دفيئه":"greenhouse","دفيئة":"greenhouse",
  "مقص":"pruning","منشار":"saw","دريل":"drill","تايمر":"timer","مؤقت":"timer",
  "ماده ناشره":"surfactant","مادة ناشرة":"surfactant"
}));

const STOP=new Set([
  "في","فيه","فيكم","عندكم","عندك","هل","ابي","ابغي","ابغى","ابا","عايز","عاوز","محتاج","هلا","مرحبا","سلام","السلام","عليكم","غير","غيرها","بدون","سواها",
  "موجود","متوفر","شي","شيء","لو","ممكن","قولي","قول","عطني","اعطني","وين","شو","شنو","ايش",
  "هو","هي","هذا","هذي","هاد","ده","دي","عن","من","على","علي","الى","إلى",
  "المنتج","منتج","المنتجات","منتجات","السعر","سعر","اسعار","الاسعار","تفاصيل","تفاصيله",
  "please","have","do","you","is","are","what","where","show","me","price","prices","details"
]);

function decodeHtml(value=""){
  return String(value)
    .replace(/&nbsp;/gi," ")
    .replace(/&amp;/gi,"&")
    .replace(/&quot;/gi,'"')
    .replace(/&#39;|&#x27;/gi,"'")
    .replace(/&lt;/gi,"<")
    .replace(/&gt;/gi,">")
    .replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCharCode(parseInt(n,16)));
}

function stripHtml(value=""){
  return decodeHtml(
    String(value)
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi," ")
      .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi," ")
      .replace(/<[^>]+>/g," ")
  ).replace(/\s+/g," ").trim();
}

function cleanHtml(value="",max=8000){
  return stripHtml(value).slice(0,max);
}

async function fetchText(url,timeoutMs=12000){
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const response=await fetch(url,{
      signal:controller.signal,
      redirect:"follow",
      headers:{
        "User-Agent":"MIG-FARM-Sitewide-Assistant/4.0",
        "Accept":"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      }
    });
    if(!response.ok) throw new Error(`fetch ${response.status}`);
    return await response.text();
  }finally{
    clearTimeout(timeout);
  }
}

async function mapLimit(items,limit,worker){
  const results=new Array(items.length);
  let cursor=0;

  async function run(){
    while(true){
      const index=cursor++;
      if(index>=items.length) return;
      try{
        results[index]=await worker(items[index],index);
      }catch{
        results[index]=null;
      }
    }
  }

  const workers=Array.from(
    {length:Math.min(Math.max(1,limit),items.length)},
    ()=>run()
  );
  await Promise.all(workers);
  return results;
}

function absoluteUrl(href=""){
  try{return new URL(decodeHtml(href),SITE_ORIGIN).toString();}
  catch{return "";}
}

function sameSiteUrl(value=""){
  try{
    return new URL(value,SITE_ORIGIN).origin===new URL(SITE_ORIGIN).origin;
  }catch{
    return false;
  }
}

function metaContent(html,key,attribute="property"){
  const escaped=key.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  const patterns=[
    new RegExp(`<meta[^>]+${attribute}=["']${escaped}["'][^>]+content=["']([^"']*)["'][^>]*>`,"i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+${attribute}=["']${escaped}["'][^>]*>`,"i")
  ];
  for(const pattern of patterns){
    const match=html.match(pattern);
    if(match) return decodeHtml(match[1]).trim();
  }
  return "";
}

function titleText(html){
  return cleanHtml(
    (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1] || "",
    500
  );
}

function h1Text(html){
  return cleanHtml(
    (html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)||[])[1] || "",
    500
  );
}

function mainText(html){
  const main=html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  return cleanHtml(main ? main[1] : html,10000);
}

function findJsonLdProduct(html){
  const scripts=[...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];

  function find(node){
    if(!node) return null;
    if(Array.isArray(node)){
      for(const item of node){ const x=find(item); if(x) return x; }
      return null;
    }
    if(typeof node==="object"){
      const type=node["@type"];
      if(type==="Product" || (Array.isArray(type)&&type.includes("Product"))) return node;
      if(node["@graph"]){ const x=find(node["@graph"]); if(x) return x; }
      for(const value of Object.values(node)){ const x=find(value); if(x) return x; }
    }
    return null;
  }

  for(const script of scripts){
    try{
      const parsed=JSON.parse(decodeHtml(script[1]).trim());
      const found=find(parsed);
      if(found) return found;
    }catch{}
  }
  return null;
}

function firstOffer(offers){
  if(!offers) return null;
  if(Array.isArray(offers)) return offers[0]||null;
  if(offers.offers && Array.isArray(offers.offers)) return offers.offers[0]||null;
  return offers;
}

function visiblePrice(html){
  const patterns=[
    /(?:AED|د\.?\s*إ\.?)\s*([0-9][0-9,.]*)/i,
    /([0-9][0-9,.]*)\s*(?:AED|د\.?\s*إ\.?)/i,
    /class=["'][^"']*(?:oe_price|product_price)[^"']*["'][^>]*>[\s\S]{0,250}?([0-9][0-9,.]*)/i
  ];
  for(const pattern of patterns){
    const match=html.match(pattern);
    if(match) return String(match[1]||"").replace(/,/g,"").trim();
  }
  return "";
}

function availabilityText(value=""){
  const n=String(value).toLowerCase();
  if(n.includes("instock")) return "متوفر";
  if(n.includes("outofstock")) return "غير متوفر";
  if(n.includes("preorder")) return "طلب مسبق";
  return cleanText(value,100);
}

export async function getSitemapUrls(){
  const now=Date.now();
  if(globalCache.sitemap.urls.length && now-globalCache.sitemap.time<CACHE_TTL){
    return globalCache.sitemap.urls;
  }

  const candidates=[`${SITE_ORIGIN}/sitemap.xml`,`${SITE_ORIGIN}/sitemap.xml.gz`];
  let xml="";
  for(const url of candidates){
    try{ xml=await fetchText(url); if(xml) break; }catch{}
  }

  const urls=[];
  for(const match of xml.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)){
    const url=decodeHtml(match[1]).trim();
    if(url.startsWith("http") && sameSiteUrl(url)) urls.push(url.split("#")[0]);
  }

  globalCache.sitemap={time:now,urls:[...new Set(urls)]};
  return globalCache.sitemap.urls;
}

export async function fetchProduct(url){
  const cached=globalCache.products.get(url);
  const now=Date.now();
  if(cached && now-cached.time<CACHE_TTL) return cached.value;

  const html=await fetchText(url);
  const ld=findJsonLdProduct(html);
  if(!ld) return null;

  const offer=firstOffer(ld.offers);
  const product={
    name:cleanText(ld.name || metaContent(html,"og:title") || h1Text(html),500),
    price:String(offer?.price ?? offer?.lowPrice ?? "").trim()
      || metaContent(html,"product:price:amount")
      || visiblePrice(html),
    currency:String(offer?.priceCurrency || "").trim()
      || metaContent(html,"product:price:currency")
      || "AED",
    sku:cleanText(ld.sku || ld.mpn || "",200),
    availability:availabilityText(offer?.availability || ""),
    description:cleanText(ld.description || metaContent(html,"og:description") || "",2200),
    url
  };

  globalCache.products.set(url,{time:now,value:product});
  return product;
}

function queryTerms(value=""){
  const normalized=normalizeAr(value);
  const expanded=[];

  for(const [ar,en] of AR_EN.entries()){
    if(normalized.includes(normalizeAr(ar))){
      expanded.push(...tokenize(en));
    }
  }

  const words=tokenize(normalized)
    .filter(x=>!STOP.has(x))
    .filter(x=>x.length>1);

  return [...new Set([...words,...expanded])];
}

function historyUserMessages(history=[]){
  return history
    .filter(x=>x && x.role==="user" && typeof x.content==="string")
    .map(x=>x.content)
    .slice(-6);
}

const GENERIC_FOLLOWUPS=[
  "ارخص","الارخص","اغلى","الاغلى","بكم","بكام","كام","سعره","سعرها","السعر",
  "تفاصيله","تفاصيلها","تفاصيل","متوفر","موجود","الحار","الحلو","الاصغر","الكبير"
];

export function buildQuery(message,history=[]){
  let terms=queryTerms(message);
  const normalized=normalizeAr(message);

  const generic=terms.length===0 || GENERIC_FOLLOWUPS.some(x=>normalized===normalizeAr(x));

  if(!generic) return terms.slice(0,8).join(" ");

  for(const previous of historyUserMessages(history).reverse()){
    const prior=queryTerms(previous);
    if(prior.length) return prior.slice(0,8).join(" ");
  }

  return terms.join(" ");
}

function productUrlCandidate(url){
  try{
    const u=new URL(url);
    if(!sameSiteUrl(u.toString())) return false;
    const path=u.pathname;
    if(!path.startsWith("/shop/")) return false;
    if(path.startsWith("/shop/category/")) return false;
    if([
      "/shop/cart","/shop/checkout","/shop/payment","/shop/confirmation",
      "/shop/wishlist","/shop/compare"
    ].some(x=>path.startsWith(x))) return false;
    return true;
  }catch{return false;}
}

function scoreText(text,terms){
  const tokens=tokenize(text);
  let score=0;

  for(const term of terms){
    for(const token of tokens){
      if(token===term) score+=8;
      else if(token.includes(term) || term.includes(token)) score+=4;
      else if(fuzzyWordMatch(token,term)) score+=2;
    }
  }

  return score;
}

async function productCandidatesFromShopSearch(query){
  try{
    const url=`${SITE_ORIGIN}/shop?search=${encodeURIComponent(query)}`;
    const html=await fetchText(url);
    const urls=[];

    for(const match of html.matchAll(/href=["']([^"']*\/shop\/[^"'?#]+)["']/gi)){
      const abs=absoluteUrl(match[1]);
      if(abs && productUrlCandidate(abs)) urls.push(abs);
    }

    return [...new Set(urls)].slice(0,20);
  }catch{
    return [];
  }
}

export async function searchProducts(message,history=[],limit=8){
  const query=buildQuery(message,history);
  if(!query) return [];

  const cacheKey=`p:${normalizeAr(query)}`;
  const now=Date.now();
  const cached=globalCache.searches.get(cacheKey);
  if(cached && now-cached.time<SEARCH_TTL) return cached.value.slice(0,limit);

  const terms=queryTerms(query);
  const direct=await productCandidatesFromShopSearch(query);

  let candidates=[...direct];

  if(candidates.length<8){
    const sitemap=await getSitemapUrls();
    const scoredUrls=sitemap
      .filter(productUrlCandidate)
      .map(url=>({url,score:scoreText(decodeURIComponent(url),terms)}))
      .filter(x=>x.score>0)
      .sort((a,b)=>b.score-a.score)
      .slice(0,30)
      .map(x=>x.url);

    candidates=[...new Set([...candidates,...scoredUrls])];
  }

  const productUrls=candidates.slice(0,24);
  const products=(
    await mapLimit(productUrls,6,async url=>await fetchProduct(url))
  ).filter(Boolean);

  const ranked=products
    .map(product=>{
      const score=
        scoreText(product.name,terms)*4 +
        scoreText(product.sku,terms)*2 +
        scoreText(product.description,terms);
      return {product,score};
    })
    .filter(x=>x.score>0)
    .sort((a,b)=>b.score-a.score)
    .map(x=>x.product);

  globalCache.searches.set(cacheKey,{time:now,value:ranked});
  return ranked.slice(0,limit);
}

function isSitePage(url){
  try{
    const u=new URL(url);
    if(!sameSiteUrl(u.toString())) return false;
    const p=u.pathname;
    if(p.startsWith("/web/") || p.startsWith("/my/")) return false;
    if(p.startsWith("/shop/")) return false;
    if(/\.(png|jpg|jpeg|webp|gif|svg|pdf|xml)$/i.test(p)) return false;
    return true;
  }catch{return false;}
}

export async function fetchPage(url){
  const cached=globalCache.pages.get(url);
  const now=Date.now();
  if(cached && now-cached.time<CACHE_TTL) return cached.value;

  const html=await fetchText(url);
  const page={
    title:metaContent(html,"og:title") || h1Text(html) || titleText(html),
    description:metaContent(html,"og:description") || metaContent(html,"description","name"),
    text:mainText(html),
    url
  };

  globalCache.pages.set(url,{time:now,value:page});
  return page;
}

function keywordBoost(url,message){
  const n=normalizeAr(message);
  const p=normalizeAr(decodeURIComponent(new URL(url).pathname));

  const mappings=[
    [["خصوصيه","privacy"],["privacy"]],
    [["شروط","احكام","terms"],["terms"]],
    [["كوكي","كوكيز","ارتباط","cookie"],["cookie"]],
    [["تواصل","اتصال","contact"],["contact"]],
    [["خدمات","service"],["service"]],
    [["شحن","توصيل","delivery","shipping"],["shipping","delivery"]],
    [["من نحن","عن الشركه","about"],["about"]],
    [["دليل","زراعه","planting"],["planting","guide"]]
  ];

  let score=0;
  for(const [words,paths] of mappings){
    if(words.some(w=>n.includes(normalizeAr(w))) && paths.some(x=>p.includes(x))) score+=30;
  }
  return score;
}

export async function searchSitePages(message,limit=5){
  const terms=queryTerms(message);
  const sitemap=await getSitemapUrls();

  const knownRoutes=[
    "/","/shop","/contactus","/services","/terms","/privacy-policy","/cookie-policy"
  ].map(path=>`${SITE_ORIGIN}${path}`);

  const pool=[...new Set([...sitemap,...knownRoutes])];

  const candidates=pool
    .filter(isSitePage)
    .map(url=>{
      const raw=decodeURIComponent(url);
      return {
        url,
        score:scoreText(raw,terms)+keywordBoost(url,message)
      };
    })
    .sort((a,b)=>b.score-a.score)
    .slice(0,18);

  const pages=(
    await mapLimit(candidates,5,async x=>{
      const page=await fetchPage(x.url);
      return {
        page,
        score:x.score+scoreText(`${page.title} ${page.description} ${page.text.slice(0,5000)}`,terms)
      };
    })
  )
    .filter(Boolean)
    .filter(x=>x.score>0)
    .sort((a,b)=>b.score-a.score)
    .slice(0,limit)
    .map(x=>x.page);

  return pages;
}

export function siteOrigin(){
  return SITE_ORIGIN;
}
