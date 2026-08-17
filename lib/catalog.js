import { normalizeAr, tokenize } from "./utils.js";
import { getSitemapUrls, fetchProduct } from "./site.js";
import { CATEGORIES, CROPS, MIG_SEED_CATALOG, KNOWN_PRODUCT_KNOWLEDGE, TONE } from "./brain.js";
import { pick } from "./dialogue.js";

function n(v=""){ return normalizeAr(String(v||"")); }
function productHay(p={}){ return n([p.name,p.sku,p.description,p.url].filter(Boolean).join(" ")); }
function dedupe(products=[]){
  const seen=new Set(); const out=[];
  for(const p of products){
    if(!p?.name) continue;
    const key=n(p.url)||`${n(p.name)}|${p.price??""}`;
    if(seen.has(key)) continue;
    seen.add(key); out.push(p);
  }
  return out;
}

export function migSeedMarkers(){
  const env=String(process.env.MIG_SEED_MARKERS||"").split(",").map(x=>x.trim()).filter(Boolean);
  const known=MIG_SEED_CATALOG.flatMap(item=>[item.nameAr,...(item.aliases||[])]);
  return [...new Set([...known,...env].map(n).filter(Boolean))];
}
export function isMigFarmSeed(p={}){
  const hay=productHay(p);
  if(/(mig\s*farm|migfarm|ميج\s*فارم|ميغ\s*فارم)/.test(hay)) return true;
  return migSeedMarkers().some(marker=>hay.includes(marker));
}
function cropMatches(p,cropKey){
  if(!cropKey) return true;
  const crop=CROPS[cropKey]; if(!crop) return true;
  const hay=productHay(p);
  const namedMarkers=MIG_SEED_CATALOG.filter(x=>x.crop===cropKey).flatMap(x=>[x.nameAr,...(x.aliases||[])]).map(n);
  if(namedMarkers.length && namedMarkers.some(m=>hay.includes(m))) return true;
  return crop.aliases.some(a=>hay.includes(n(a))) && /(mig\s*farm|migfarm|ميج\s*فارم|ميغ\s*فارم)/.test(hay);
}

function scoreCategory(p,categoryKey,query=""){
  const cat=CATEGORIES[categoryKey]; if(!cat) return 0;
  const hay=productHay(p); let score=0;
  for(const marker of cat.positive||[]) if(hay.includes(n(marker))) score+=3;
  for(const marker of cat.negative||[]) if(hay.includes(n(marker))) score-=5;
  const qTokens=tokenize(query).filter(x=>x.length>2);
  for(const token of qTokens) if(hay.includes(token)) score+=2;
  for(const known of KNOWN_PRODUCT_KNOWLEDGE.filter(x=>x.category===categoryKey)){
    if([known.titleAr,...known.names].some(name=>hay.includes(n(name)))) score+=6;
  }
  return score;
}

export function buildSearchQuery(analysis,state,message=""){
  const categoryKey=analysis.category?.key || state.category || "";
  const cropKey=analysis.crop?.key || state.crop || "";
  const parts=[message];
  if(categoryKey && CATEGORIES[categoryKey]) parts.push(...(CATEGORIES[categoryKey].queryHints||[]));
  if(cropKey && CROPS[cropKey]) parts.push(CROPS[cropKey].labelAr,...CROPS[cropKey].aliases.slice(0,2));
  if(analysis.pepperType==="hot") parts.push("hot حار");
  if(analysis.pepperType==="sweet") parts.push("sweet حلو");
  return [...new Set(parts.map(x=>String(x||"").trim()).filter(Boolean))].join(" ");
}

export function filterRankProducts(products=[],analysis,state,message=""){
  let list=dedupe(products);
  const categoryKey=analysis.category?.key || state.category || "";
  const cropKey=analysis.crop?.key || state.crop || "";

  if(categoryKey==="seeds"){
    list=list.filter(isMigFarmSeed).filter(p=>cropMatches(p,cropKey));
  }else if(categoryKey && CATEGORIES[categoryKey]){
    const scored=list.map(p=>({p,score:scoreCategory(p,categoryKey,message)})).sort((a,b)=>b.score-a.score);
    const positive=scored.filter(x=>x.score>0).map(x=>x.p);
    if(positive.length) list=positive;
    else list=scored.filter(x=>x.score>=-1).map(x=>x.p);
  }

  if(analysis.pepperType && categoryKey==="seeds"){
    const hot=["جمر","شهاب","شراره","شرارة","الكوس","jamra","shihab","sharara","kous"].map(n);
    const sweet=["جميرا","البرشا","jumeirah","barsha"].map(n);
    const wanted=analysis.pepperType==="hot"?hot:sweet;
    const filtered=list.filter(p=>wanted.some(x=>productHay(p).includes(x)));
    if(filtered.length) list=filtered;
  }

  if(analysis.budget){
    const filtered=list.filter(p=>Number(p.price)<=analysis.budget);
    if(filtered.length) list=filtered;
  }
  return list.slice(0,8);
}

export function formatProductsForMemory(products=[],locale="ar",sessionKey=""){
  const en=locale==="en";
  const head=en?`I found ${products.length} matching products:`:pick(TONE.productFoundAr,sessionKey);
  const rows=products.map(p=>{
    const price=p.price?`${p.price} ${p.currency||"AED"}`:(en?"price not shown":"السعر مب ظاهر");
    return `• ${p.name} — ${price}${p.availability?` - ${p.availability}`:""}`;
  });
  return `${head}\n${rows.join("\n")}`;
}

export function knownSeedFallback(cropKey="",locale="ar"){
  let items=MIG_SEED_CATALOG;
  if(cropKey) items=items.filter(x=>x.crop===cropKey);
  if(!items.length) return "";
  const names=items.slice(0,8).map(x=>x.nameAr);
  return locale==="en"
    ? `I couldn't verify live stock right now. Known MIG FARM varieties in this crop include: ${names.join(", ")}. Live availability still needs to be confirmed in the store.`
    : `ما قدرت أأكد التوفر الحي الآن، لكن من أصناف MIG FARM المعروفة عندي لهالفئة: ${names.join("، ")}. التوفر والسعر لازم نأكدهم من المتجر الحي.`;
}

export function productSearchQuickReplies(categoryKey,locale="ar",hasResults=true){
  if(locale==="en") return hasResults?["Cheapest?","Available?","Compare them"]:["Show products","WhatsApp team"];
  if(categoryKey==="seeds") return hasResults?["الأرخص فيهم؟","المتوفر منهم؟","قارن بينهم","بذور فلفل"]:["بذور طماطم","بذور خيار","بذور فلفل","بذور باذنجان"];
  return hasResults?["الأرخص فيهم؟","المتوفر منهم؟","قارن بينهم"]:["دور مرة ثانية","كلم الفريق"];
}


function safeProductUrl(url=""){
  try{
    const u=new URL(url);
    const p=u.pathname;
    if(!p.startsWith("/shop/") || p.startsWith("/shop/category/")) return false;
    return !["/shop/cart","/shop/checkout","/shop/payment","/shop/confirmation","/shop/wishlist","/shop/compare"].some(x=>p.startsWith(x));
  }catch{return false;}
}

function seedUrlScore(url="",cropKey=""){
  let path="";
  try{path=n(decodeURIComponent(new URL(url).pathname));}catch{return 0;}
  const markers=(cropKey?MIG_SEED_CATALOG.filter(x=>x.crop===cropKey):MIG_SEED_CATALOG)
    .flatMap(x=>[x.nameAr,...(x.aliases||[])]).map(n);
  let score=0;
  for(const marker of markers) if(marker && path.includes(marker)) score+=10;
  return score;
}

export async function discoverMigFarmSeeds(cropKey="",limit=12){
  let urls=[];
  try{urls=await getSitemapUrls();}catch{return [];}
  const candidates=urls.filter(safeProductUrl)
    .map(url=>({url,score:seedUrlScore(url,cropKey)}))
    .filter(x=>x.score>0)
    .sort((a,b)=>b.score-a.score)
    .slice(0,Math.min(24,limit*2));
  const products=(await Promise.all(candidates.map(async x=>{try{return await fetchProduct(x.url);}catch{return null;}}))).filter(Boolean);
  const fakeAnalysis={category:CATEGORIES.seeds,crop:cropKey?{key:cropKey}:null,pepperType:"",budget:null};
  return filterRankProducts(products,fakeAnalysis,{category:"seeds",crop:cropKey},cropKey||"بذور").slice(0,limit);
}

export function mergeProducts(a=[],b=[]){ return dedupe([...a,...b]).slice(0,8); }

export function knownCategoryFallback(categoryKey="",locale="ar"){
  if(categoryKey==="seeds") return "";
  const items=KNOWN_PRODUCT_KNOWLEDGE.filter(x=>x.category===categoryKey);
  if(!items.length) return "";
  const names=items.slice(0,8).map(x=>x.titleAr);
  return locale==="en"
    ? `I couldn't verify live stock right now. Known MIG FARM references in this section include: ${names.join(", ")}. Availability and price still need to be confirmed from the live store.`
    : `ما قدرت أأكد التوفر الحي الآن، لكن من المنتجات/المراجع المعروفة عند MIG FARM في هالقسم: ${names.join("، ")}. السعر والتوفر لازم نأكدهم من المتجر الحي.`;
}
