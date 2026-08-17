import { normalizeAr, tokenize, fuzzyWordMatch } from "./utils.js";
import { getSitemapUrls, fetchProduct } from "./site.js";
import { rankCatalogProducts, explainProductScore } from "./ranker.js";

const INDEX_KEY=String(process.env.MIG_PRODUCT_INDEX_KEY||"mig:product-index:v2");
const INDEX_TTL_SECONDS=Math.max(900,Number(process.env.MIG_PRODUCT_INDEX_TTL_SECONDS||21600));
const MAX_PRODUCTS=Math.max(20,Math.min(500,Number(process.env.MIG_PRODUCT_INDEX_MAX||260)));

const runtime=globalThis.__migProductIndexV2 || {time:0,products:[],meta:{}};
globalThis.__migProductIndexV2=runtime;

function redisConfig(){
  const url=String(process.env.UPSTASH_REDIS_REST_URL||process.env.KV_REST_API_URL||"").replace(/\/+$/,"");
  const token=String(process.env.UPSTASH_REDIS_REST_TOKEN||process.env.KV_REST_API_TOKEN||"");
  return {url,token,enabled:Boolean(url&&token)};
}
async function redisCommand(parts=[]){
  const cfg=redisConfig();
  if(!cfg.enabled) return {ok:false,result:null};
  try{
    const response=await fetch(cfg.url,{method:"POST",headers:{"Authorization":`Bearer ${cfg.token}`,"Content-Type":"application/json"},body:JSON.stringify(parts)});
    if(!response.ok) return {ok:false,result:null};
    const data=await response.json();
    return {ok:true,result:data?.result??null};
  }catch{return {ok:false,result:null};}
}
function safeProductUrl(url=""){
  try{
    const u=new URL(url); const p=u.pathname;
    if(!p.startsWith("/shop/")||p.startsWith("/shop/category/")) return false;
    return !["/shop/cart","/shop/checkout","/shop/payment","/shop/confirmation","/shop/wishlist","/shop/compare"].some(x=>p.startsWith(x));
  }catch{return false;}
}
async function mapLimit(items,limit,worker){
  const out=new Array(items.length); let cursor=0;
  async function run(){
    while(true){
      const i=cursor++; if(i>=items.length) return;
      try{out[i]=await worker(items[i],i);}catch{out[i]=null;}
    }
  }
  await Promise.all(Array.from({length:Math.min(limit,Math.max(1,items.length))},()=>run()));
  return out;
}
function compactProduct(p={}){
  return {
    name:String(p.name||"").slice(0,500),
    price:String(p.price??"").slice(0,80),
    currency:String(p.currency||"AED").slice(0,20),
    sku:String(p.sku||"").slice(0,160),
    availability:String(p.availability||"").slice(0,100),
    description:String(p.description||"").slice(0,1600),
    url:String(p.url||"").slice(0,1000),
    image:String(p.image||"").slice(0,1000),
    product_template_id:Number(p.product_template_id)||null,
    product_id:Number(p.product_id)||null
  };
}
function dedupe(products=[]){
  const seen=new Set(); const out=[];
  for(const p of products){
    if(!p?.name||!p?.url) continue;
    const key=normalizeAr(p.url)||`${normalizeAr(p.name)}|${p.price||""}`;
    if(seen.has(key)) continue; seen.add(key); out.push(compactProduct(p));
  }
  return out;
}
function indexEnvelope(products=[],meta={}){
  return {v:2,built_at:new Date().toISOString(),expires_at:new Date(Date.now()+INDEX_TTL_SECONDS*1000).toISOString(),products:dedupe(products),meta:{...meta,count:dedupe(products).length}};
}
function saveRuntime(envelope){ runtime.time=Date.now(); runtime.products=envelope.products||[]; runtime.meta=envelope; }

export function productIndexPersistenceMode(){ return redisConfig().enabled?"redis":"runtime"; }
export function productIndexStatus(){
  const ageMs=runtime.time?Date.now()-runtime.time:null;
  return {ready:runtime.products.length>0,count:runtime.products.length,age_ms:ageMs,persistence:productIndexPersistenceMode(),built_at:runtime.meta?.built_at||null};
}

export async function loadProductIndex(){
  if(runtime.products.length && Date.now()-runtime.time<INDEX_TTL_SECONDS*1000) return runtime.meta;
  const cfg=redisConfig();
  if(cfg.enabled){
    const res=await redisCommand(["GET",INDEX_KEY]);
    if(res.ok&&typeof res.result==="string"){
      try{
        const parsed=JSON.parse(res.result);
        if(Array.isArray(parsed?.products)&&parsed.products.length){ saveRuntime(parsed); return parsed; }
      }catch{}
    }
  }
  return runtime.products.length?runtime.meta:null;
}

export async function primeProductIndex(products=[],meta={}){
  const envelope=indexEnvelope(products,meta); saveRuntime(envelope);
  const cfg=redisConfig();
  if(cfg.enabled) await redisCommand(["SET",INDEX_KEY,JSON.stringify(envelope),"EX",String(INDEX_TTL_SECONDS)]);
  return {count:envelope.products.length,persistence:productIndexPersistenceMode(),built_at:envelope.built_at};
}

export async function rebuildProductIndex({maxProducts=MAX_PRODUCTS,force=true}={}){
  const sitemap=await getSitemapUrls();
  const urls=sitemap.filter(safeProductUrl).slice(0,Math.max(1,Math.min(MAX_PRODUCTS,Number(maxProducts)||MAX_PRODUCTS)));
  const products=(await mapLimit(urls,6,async url=>await fetchProduct(url,{force:Boolean(force)}))).filter(Boolean);
  const saved=await primeProductIndex(products,{sitemap_count:sitemap.length,scanned_urls:urls.length});
  return {...saved,scanned_urls:urls.length,sitemap_count:sitemap.length};
}

function queryRelevant(product={},message=""){
  const q=tokenize(message).filter(x=>x.length>1).slice(0,12);
  if(!q.length) return true;
  const hay=tokenize([product.name,product.sku,product.description,product.url].filter(Boolean).join(" "));
  let matches=0;
  for(const token of q){
    if(hay.some(w=>w===token||w.includes(token)||token.includes(w)||fuzzyWordMatch(w,token))) matches++;
  }
  return matches>0;
}

export async function searchProductIndex(message="",analysis={},state={},limit=10){
  const envelope=await loadProductIndex();
  if(!envelope?.products?.length) return {products:[],used:false,stale:false};
  let candidates=envelope.products.filter(p=>queryRelevant(p,message));
  if(!candidates.length) candidates=envelope.products;
  const ranked=rankCatalogProducts(candidates,analysis,state,message,Math.min(24,Math.max(limit*2,12)));
  const scored=ranked.map(p=>({p,e:explainProductScore(p,analysis,state,message)})).filter(x=>x.e.score>=8).slice(0,limit);
  if(!scored.length) return {products:[],used:true,stale:false};

  // Refresh only the short-list so displayed price/availability comes from the current product page.
  const refreshed=(await mapLimit(scored.map(x=>x.p),5,async p=>{
    try{return (p.url&&await fetchProduct(p.url,{force:true}))||p;}catch{return p;}
  })).filter(Boolean);
  const final=rankCatalogProducts(refreshed,analysis,state,message,limit);
  return {products:final,used:true,stale:false};
}
