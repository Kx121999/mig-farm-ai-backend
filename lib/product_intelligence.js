import { readFileSync, statSync } from "node:fs";
import { normalizeAr, tokenize } from "./utils.js";

const VERSION="22.1";
const DOSSIER_URL=new URL("../knowledge/MIG_FARM_PRODUCT_DOSSIERS_V20.json",import.meta.url);
const RETRIEVAL_URL=new URL("../knowledge/MIG_FARM_PRODUCT_RETRIEVAL_V20.json",import.meta.url);
let DOSSIERS=null;
let RETRIEVAL=null;
let PRODUCT_INDEX=null;
let CHUNK_INDEX=null;
let BY_ID=null;
let BY_NAME=null;
let BY_SKU=null;

function arr(v){return Array.isArray(v)?v:[];}
function clean(v,max=24000){return String(v||"").replace(/\s+/g," ").trim().slice(0,max);}
function n(v){return normalizeAr(clean(v,20000));}
function uniq(xs){return [...new Set(arr(xs).filter(Boolean))];}
function toks(v){return tokenize(n(v)).filter(x=>x.length>1);}
function safeNum(v){const x=Number(v);return Number.isFinite(x)?x:null;}

const PRODUCT_CONCEPTS=[
  {triggers:["مبيد","حشره","حشرة","حشرات","افه","آفة","صراصير","صرصور","ذباب","بعوض","ناموس","تربس","اكاروس","أكاروس","insect","pest"],targets:["pesticide","insecticide","acaricide","public health","crop protection","cockroach","fly","mosquito","cypermethrin","acetamiprid","abamectin"]},
  {triggers:["فطري","فطر","عفن","fungicide"],targets:["fungicide","fungal","copper","mancozeb","crop protection"]},
  {triggers:["سماد","تسميد","تغذيه","تغذية","npk","fertilizer","nutrition"],targets:["fertilizer","plant nutrition","npk","micronutrient","chelated","humic","fulvic","calcium","magnesium","potassium","iron","zinc"]},
  {triggers:["بذور","بذره","بذرة","تقاوي","seed","seeds"],targets:["seeds","seed","f1 hybrid","tomato","cucumber","pepper","eggplant","okra","melon","watermelon","onion","leafy"]},
  {triggers:["ري","نقاط","تنقيط","خرطوم","رشاش","مضخه","مضخة","مياه","irrigation","dripper","hose","pump"],targets:["irrigation","hydroponics","dripper","hose","pump","sprinkler","fitting","connector","timer"]},
  {triggers:["اداه","أداة","مقص","منشار","دريل","متر","جهاز","tool","tools"],targets:["tools","equipment","hand tools","power tools","meters","testers","pruning","saw","drill"]},
  {triggers:["بيت محمي","صوبه","صوبة","جرين هاوس","شبك","غطاء","greenhouse","shade"],targets:["greenhouse","nets","covers","shade","plastic","rope","support"]},
  {triggers:["حديد","iron","fe eddha","eddha"],targets:["iron","fe eddha","eddha","microplus fe","microfal fe","حديد"]},
  {triggers:["زنك","zinc","zn edta"],targets:["zinc","zn edta","microplus zn","زنك"]},
  {triggers:["بوريك","بورون","boric","boron"],targets:["boric acid","boron","microplus boric","بوريك"]},
  {triggers:["ضغط عالي","high pressure","هاي برشر"],targets:["high pressure","high-pressure","5 layers","6 layers","hose","spray hose"]},
  {triggers:["خيار","cucumber"],targets:["cucumber","خيار"]},
  {triggers:["طماطم","طماطم","tomato"],targets:["tomato","طماطم","طماطم"]},
  {triggers:["فلفل","pepper"],targets:["pepper","فلفل"]},
  {triggers:["باذنجان","eggplant"],targets:["eggplant","باذنجان"]}
];

function conceptBoost(query,row){
  const q=n(query);const qTokens=new Set(tokenize(q));const hay=`${row.short} ${row.description}`;const hayTokens=new Set(tokenize(hay));let score=0;
  const hit=(set,text,value)=>{const v=n(value);if(!v)return false;return v.includes(" ")?text.includes(v):set.has(v);};
  for(const c of PRODUCT_CONCEPTS){
    if(c.triggers.some(x=>hit(qTokens,q,x))&&c.targets.some(x=>hit(hayTokens,hay,x))) score+=58;
  }
  return score;
}

function loadDossiers(){
  if(DOSSIERS) return DOSSIERS;
  DOSSIERS=JSON.parse(readFileSync(DOSSIER_URL,"utf8"));
  return DOSSIERS;
}
function loadRetrieval(){
  if(RETRIEVAL) return RETRIEVAL;
  RETRIEVAL=JSON.parse(readFileSync(RETRIEVAL_URL,"utf8"));
  return RETRIEVAL;
}
function grams(s,k=3){const x=` ${n(s)} `;const out=[];for(let i=0;i<=x.length-k;i++)out.push(x.slice(i,i+k));return out;}
function gramSim(a,b){const A=new Set(grams(a)),B=new Set(grams(b));if(!A.size||!B.size)return 0;let hit=0;for(const x of A)if(B.has(x))hit++;return hit/Math.max(1,A.size+B.size-hit);}
function tokenOverlap(qTokens,set){if(!qTokens.length||!set?.size)return 0;let hit=0;for(const t of qTokens)if(set.has(t))hit++;return hit/qTokens.length;}

function buildIndexes(){
  if(PRODUCT_INDEX) return;
  const data=loadDossiers();
  BY_ID=new Map();BY_NAME=new Map();BY_SKU=new Map();
  PRODUCT_INDEX=arr(data.products).map((p,i)=>{
    const alias=arr(p?.retrieval?.aliases).join(" ");
    const short=n(`${p.name||""} ${p.sku||""} ${p?.taxonomy?.category||""} ${p?.taxonomy?.tags_raw||""} ${alias}`);
    const description=n(`${p?.descriptions?.sales_exact||""} ${p?.descriptions?.ecommerce_text_exact||""}`);
    const row={i,short,description,title:n(p.name),sku:n(p.sku),tokens:new Set(toks(`${short} ${description.slice(0,9000)}`))};
    BY_ID.set(String(p.external_id||""),p);
    if(row.title&&!BY_NAME.has(row.title)) BY_NAME.set(row.title,p);
    if(row.sku&&!BY_SKU.has(row.sku)) BY_SKU.set(row.sku,p);
    return row;
  });
  CHUNK_INDEX=arr(loadRetrieval().chunks).map((c,i)=>({i,external_id:c.external_id,text:n(c.text),title:n(c.name),sku:n(c.sku),category:n(c.category),tokens:new Set(toks(`${c.name||""} ${c.sku||""} ${c.category||""} ${c.tags||""} ${c.text||""}`))}));
}

function productScore(query,qTokens,row,p,{category="",supplier="",type=""}={}){
  const qt=n(query);let score=0;
  if(!qt)return 0;
  if(row.title===qt) score+=240;
  else if(row.title.includes(qt)||qt.includes(row.title)) score+=120;
  if(row.sku&&row.sku===qt) score+=250;
  if(row.sku&&qt.includes(row.sku)) score+=100;
  const aliases=arr(p?.retrieval?.aliases).map(n);
  if(aliases.some(a=>a===qt)) score+=130;
  if(aliases.some(a=>a&&qt.includes(a))) score+=45;
  score+=95*tokenOverlap(qTokens,row.tokens);
  score+=conceptBoost(query,row);
  score+=45*gramSim(qt.slice(0,220),row.title.slice(0,220));
  if(row.description.includes(qt)&&qt.length>=4) score+=55;
  const cat=n(p?.taxonomy?.category||"");
  if(category&&cat.includes(n(category))) score+=30;
  if(/(^|\s)(سماد|تسميد|fertilizer|nutrition)(\s|$)/.test(qt)&&cat.includes("fertilizers plant nutrition")) score+=62;
  if(/(^|\s)(بذور|بذره|seed|seeds)(\s|$)/.test(qt)&&cat.startsWith("seeds")) score+=62;
  if(/(^|\s)(مبيد|حشرات|حشره|pesticide|insecticide)(\s|$)/.test(qt)&&(cat.includes("insecticides")||cat.includes("plant protection"))) score+=62;
  if(/(^|\s)(خرطوم|hose)(\s|$)/.test(qt)&&cat.includes("hoses")) score+=72;
  if(/(^|\s)(مضخه|مضخة|pump)(\s|$)/.test(qt)&&cat.includes("pumps")) score+=72;
  const suppliers=arr(p?.taxonomy?.supplier).map(n);
  if(supplier&&suppliers.some(x=>x.includes(n(supplier)))) score+=22;
  const types=arr(p?.taxonomy?.type).map(n);
  if(type&&types.some(x=>x.includes(n(type)))) score+=24;
  if(p?.commerce_snapshot?.published) score+=2;
  return score;
}

function chunkScore(query,qTokens,row){
  const qt=n(query);let score=0;
  if(row.title===qt)score+=180;
  if(row.sku&&row.sku===qt)score+=220;
  if(row.text.includes(qt)&&qt.length>=4)score+=70;
  score+=100*tokenOverlap(qTokens,row.tokens);
  score+=conceptBoost(query,row);
  score+=25*gramSim(qt.slice(0,220),row.text.slice(0,420));
  return score;
}

function compactProduct(p,{descriptionChars=2200,includeHtml=false,chunkHits=[]}={}){
  if(!p)return null;
  const sales=clean(p?.descriptions?.sales_exact||"",descriptionChars);
  const ecom=clean(p?.descriptions?.ecommerce_text_exact||"",descriptionChars);
  const result={
    external_id:p.external_id,name:p.name,sku:p.sku,
    category:p?.taxonomy?.category||"",supplier:arr(p?.taxonomy?.supplier),type:arr(p?.taxonomy?.type),feature:arr(p?.taxonomy?.feature),
    description_provenance:p?.descriptions?.provenance||"",
    description_reliability:(p?.descriptions?.provenance==="generated_202"?"generated_catalog_copy_not_technical_spec":"stored_original_catalog_text"),
    sales_description:sales,ecommerce_description:ecom,
    archived_commerce:{price_aed:safeNum(p?.commerce_snapshot?.price_aed),published:Boolean(p?.commerce_snapshot?.published),stock_snapshot:safeNum(p?.commerce_snapshot?.stock_snapshot),weight_kg:safeNum(p?.commerce_snapshot?.weight_kg),qa_notes:p?.commerce_snapshot?.qa_notes||""},
    live_data_policy:"Current price and availability must be verified from live Odoo catalog before telling the customer.",
    dosage_policy:p?.field_policy?.pesticide_fertilizer_dosage||"official_label_or_verified_product_data_only",
    technical_spec_policy:(p?.descriptions?.provenance==="generated_202"?"Do not treat generated completion copy as a product-specific technical specification.":"Use explicit stored text only; missing specification stays unknown."),
    matched_description_chunks:arr(chunkHits).slice(0,4)
  };
  if(includeHtml) result.ecommerce_html=String(p?.descriptions?.ecommerce_html_exact||"").slice(0,9000);
  return result;
}

export function searchProductDossiers(query="",{limit=6,category="",supplier="",type="",descriptionChars=2200}={}){
  buildIndexes();
  const qt=clean(query,1200);const qTokens=toks(qt);const max=Math.max(1,Math.min(12,Number(limit)||6));
  const scored=PRODUCT_INDEX.map(row=>{const p=loadDossiers().products[row.i];return {p,score:productScore(qt,qTokens,row,p,{category,supplier,type})};})
    .filter(x=>x.score>4).sort((a,b)=>b.score-a.score).slice(0,Math.max(max*3,12));
  const chunkHits=CHUNK_INDEX.map(row=>({row,score:chunkScore(qt,qTokens,row)})).filter(x=>x.score>18).sort((a,b)=>b.score-a.score).slice(0,Math.max(max*4,20));
  const chunksById=new Map();
  for(const hit of chunkHits){
    if(!chunksById.has(hit.row.external_id))chunksById.set(hit.row.external_id,[]);
    chunksById.get(hit.row.external_id).push({text:loadRetrieval().chunks[hit.row.i].text,score:Number(hit.score.toFixed(3))});
  }
  const merged=[];const seen=new Set();
  for(const x of scored){
    seen.add(x.p.external_id);
    merged.push({p:x.p,score:x.score+(chunksById.has(x.p.external_id)?20:0)});
  }
  for(const hit of chunkHits){
    if(seen.has(hit.row.external_id))continue;
    const p=BY_ID.get(hit.row.external_id);if(!p)continue;
    seen.add(hit.row.external_id);merged.push({p,score:hit.score});
  }
  return merged.sort((a,b)=>b.score-a.score).slice(0,max).map(x=>({
    ...compactProduct(x.p,{descriptionChars,chunkHits:chunksById.get(x.p.external_id)||[]}),
    score:Number(x.score.toFixed(3)),source:"mig_farm_product_dossiers_v20"
  }));
}

export function getProductDossier(identifier="",{includeFull=true,includeHtml=false}={}){
  buildIndexes();
  const raw=clean(identifier,900);const key=n(raw);let p=BY_ID.get(raw)||BY_SKU.get(key)||BY_NAME.get(key)||null;
  if(!p){const hits=searchProductDossiers(raw,{limit:1,descriptionChars:includeFull?9000:2600});p=hits[0]?BY_ID.get(hits[0].external_id):null;}
  if(!p)return null;
  return compactProduct(p,{descriptionChars:includeFull?9000:2600,includeHtml});
}

export function enrichLiveProductsWithDossiers(products=[],{descriptionChars=1100}={}){
  buildIndexes();
  return arr(products).map(item=>{
    const name=n(item?.name||item?.title||"");const sku=n(item?.sku||item?.default_code||"");
    let p=(sku&&BY_SKU.get(sku))||(name&&BY_NAME.get(name))||null;
    if(!p&&name){
      let best=null,bestScore=0;
      for(const row of PRODUCT_INDEX){const s=gramSim(name,row.title);if(s>bestScore){bestScore=s;best=row;}}
      if(best&&bestScore>=0.72)p=loadDossiers().products[best.i];
    }
    if(!p)return item;
    return {...item,product_dossier:{external_id:p.external_id,sku:p.sku,category:p?.taxonomy?.category||"",supplier:arr(p?.taxonomy?.supplier),type:arr(p?.taxonomy?.type),feature:arr(p?.taxonomy?.feature),description_provenance:p?.descriptions?.provenance||"",description_reliability:(p?.descriptions?.provenance==="generated_202"?"generated_catalog_copy_not_technical_spec":"stored_original_catalog_text"),description:clean(p?.descriptions?.sales_exact||p?.descriptions?.ecommerce_text_exact||"",descriptionChars)}};
  });
}

export function compareProductDossiers(identifiers=[],criteria=[]){
  const items=arr(identifiers).slice(0,6).map(x=>getProductDossier(x,{includeFull:false})).filter(Boolean);
  const wanted=arr(criteria).map(n);
  return {items,criteria:wanted,policy:"Only compare attributes explicitly present in stored dossier text or live Odoo data. If an attribute is absent for a product, say it is not documented rather than inferring it."};
}

export function productIntelligenceHealth(){
  const data=loadDossiers();const ret=loadRetrieval();let dossierBytes=0,retrievalBytes=0;
  try{dossierBytes=statSync(DOSSIER_URL).size}catch{}
  try{retrievalBytes=statSync(RETRIEVAL_URL).size}catch{}
  return {version:VERSION,mode:"full_product_dossier_intelligence",products:Number(data?.stats?.products||arr(data?.products).length),descriptions:Number(data?.stats?.descriptions_total||0),original_descriptions:Number(data?.stats?.original_descriptions||0),generated_completed_descriptions:Number(data?.stats?.generated_missing_descriptions||0),retrieval_chunks:Number(ret?.stats?.chunks||arr(ret?.chunks).length),dossier_bytes:dossierBytes,retrieval_bytes:retrievalBytes,total_megabytes:Number(((dossierBytes+retrievalBytes)/1024/1024).toFixed(2)),fields:["name","sku","category","supplier","type","features","exact_sales_description","exact_ecommerce_description","archived_price","archived_stock","weight","qa","price_audit"],live_precedence:"current Odoo price/stock > archived dossier snapshot",description_policy:"exact stored text; generated completion copy is not technical-spec evidence; no invented product specification"};
}
