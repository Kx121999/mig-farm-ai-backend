import { normalizeAr, tokenize, fuzzyWordMatch } from "./utils.js";
import { CATEGORIES, CROPS, MIG_SEED_CATALOG, KNOWN_PRODUCT_KNOWLEDGE } from "./brain.js";

function n(value=""){ return normalizeAr(String(value||"")); }
function productText(product={}){
  return n([
    product.name||"",
    product.sku||"",
    product.description||"",
    product.url||""
  ].join(" "));
}
function productName(product={}){ return n(product.name||""); }
function isAvailable(product={}){
  const status=n(product.availability||"");
  if(!status) return null;
  if(/(غير متوفر|outofstock|out of stock|unavailable|نفد)/.test(status)) return false;
  if(/(متوفر|instock|in stock|available)/.test(status)) return true;
  return null;
}
function cleanQueryTokens(message=""){
  const stop=new Set([
    "عندكم","عندك","فيه","في","ابي","ابغي","ابغى","ابا","عايز","عاوز","محتاج",
    "متوفر","موجود","اريد","أريد","please","show","need","have","price","سعر","اسعار","الاسعار"
  ].map(n));
  return tokenize(message).filter(x=>x.length>1&&!stop.has(x)).slice(0,14);
}
function tokenScore(text,tokens=[]){
  const words=tokenize(text);
  let score=0;
  for(const q of tokens){
    for(const w of words){
      if(w===q) score=Math.max(score,14);
      else if(w.startsWith(q)||q.startsWith(w)) score=Math.max(score,9);
      else if(w.includes(q)||q.includes(w)) score=Math.max(score,6);
      else if(fuzzyWordMatch(w,q)) score=Math.max(score,3);
    }
  }
  return score;
}
function exactPhraseScore(product,message=""){
  const q=n(message);
  const name=productName(product);
  if(!q||!name) return 0;
  if(q===name) return 45;
  if(q.includes(name) || name.includes(q)) return 28;
  return 0;
}
function categoryScore(product,categoryKey=""){
  if(!categoryKey || !CATEGORIES[categoryKey]) return 0;
  const hay=productText(product);
  const cat=CATEGORIES[categoryKey];
  let score=0;
  for(const marker of cat.positive||[]) if(hay.includes(n(marker))) score+=8;
  for(const marker of cat.negative||[]) if(hay.includes(n(marker))) score-=16;
  return score;
}
function cropScore(product,cropKey=""){
  if(!cropKey || !CROPS[cropKey]) return 0;
  const hay=productText(product);
  const crop=CROPS[cropKey];
  let score=0;
  for(const alias of crop.aliases||[]) if(hay.includes(n(alias))) score+=8;
  const seedNames=MIG_SEED_CATALOG
    .filter(x=>x.crop===cropKey)
    .flatMap(x=>[x.nameAr,...(x.aliases||[])]);
  for(const marker of seedNames) if(hay.includes(n(marker))) score+=18;
  return score;
}
function knownProductScore(product,categoryKey=""){
  const hay=productText(product);
  let score=0;
  for(const item of KNOWN_PRODUCT_KNOWLEDGE||[]){
    if(categoryKey && item.category && item.category!==categoryKey) continue;
    const names=[item.titleAr,...(item.names||[])].filter(Boolean);
    if(names.some(name=>hay.includes(n(name)))) score+=14;
  }
  return score;
}
function brandScore(product,categoryKey=""){
  const hay=productText(product);
  let score=0;
  if(/(mig\s*farm|migfarm|ميج\s*فارم|ميغ\s*فارم)/.test(hay)) score+=16;
  if(categoryKey==="seeds"){
    const markers=MIG_SEED_CATALOG.flatMap(x=>[x.nameAr,...(x.aliases||[])]).map(n);
    if(markers.some(m=>m&&hay.includes(m))) score+=22;
  }
  return score;
}
function availabilityScore(product={}){
  const available=isAvailable(product);
  if(available===true) return 12;
  if(available===false) return -18;
  return 0;
}
function priceSignal(product={},analysis={}){
  const price=Number(product.price);
  if(!Number.isFinite(price)||price<0) return 0;
  if(Number.isFinite(Number(analysis?.budget))){
    const budget=Number(analysis.budget);
    if(price<=budget) return 10;
    const over=(price-budget)/Math.max(1,budget);
    return over>0.5?-15:-7;
  }
  return 0;
}
function queryCoverage(product,message=""){
  const tokens=cleanQueryTokens(message);
  if(!tokens.length) return 0;
  const hay=productText(product);
  let matched=0;
  for(const token of tokens){
    const words=tokenize(hay);
    if(words.some(w=>w===token||w.includes(token)||token.includes(w)||fuzzyWordMatch(w,token))) matched++;
  }
  return Math.round((matched/tokens.length)*20);
}

export function explainProductScore(product={},analysis={},state={},message=""){
  const categoryKey=analysis.category?.key||state.category||"";
  const cropKey=analysis.crop?.key||state.crop||"";
  const queryTokens=cleanQueryTokens(message);
  const parts={
    exact_phrase:exactPhraseScore(product,message),
    query_tokens:tokenScore(productText(product),queryTokens),
    query_coverage:queryCoverage(product,message),
    category:categoryScore(product,categoryKey),
    crop:cropScore(product,cropKey),
    known_product:knownProductScore(product,categoryKey),
    brand:brandScore(product,categoryKey),
    availability:availabilityScore(product),
    budget:priceSignal(product,analysis)
  };
  return {
    score:Object.values(parts).reduce((a,b)=>a+b,0),
    parts,
    available:isAvailable(product),
    category:categoryKey,
    crop:cropKey
  };
}

export function rankCatalogProducts(products=[],analysis={},state={},message="",limit=8){
  const seen=new Set();
  const scored=[];
  for(const product of products||[]){
    if(!product?.name) continue;
    const key=n(product.url||"")||`${n(product.name)}|${String(product.price??"")}`;
    if(seen.has(key)) continue;
    seen.add(key);
    const explain=explainProductScore(product,analysis,state,message);
    scored.push({product,score:explain.score,explain});
  }
  scored.sort((a,b)=>{
    if(b.score!==a.score) return b.score-a.score;
    const aa=a.explain.available, bb=b.explain.available;
    if(aa!==bb){
      if(bb===true) return 1;
      if(aa===true) return -1;
    }
    const ap=Number(a.product.price), bp=Number(b.product.price);
    if(Number.isFinite(ap)&&Number.isFinite(bp)) return ap-bp;
    return String(a.product.name).localeCompare(String(b.product.name),"ar");
  });
  return scored.slice(0,Math.max(1,limit)).map(x=>x.product);
}

export function rankingDiagnostics(products=[],analysis={},state={},message=""){
  return (products||[]).map(product=>({
    name:String(product?.name||"").slice(0,160),
    ...explainProductScore(product,analysis,state,message)
  })).sort((a,b)=>b.score-a.score);
}
