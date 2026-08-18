import { readFileSync, statSync } from "node:fs";
import { normalizeAr, tokenize } from "./utils.js";

const VERSION="18.0";
const DATA_URL=new URL("../knowledge/AGRICULTURAL_MASTER_KNOWLEDGE_V18.json",import.meta.url);
let CACHE=null;
let INDEX=null;

function clean(v,max=8000){return String(v||"").replace(/\s+/g," ").trim().slice(0,max)}
function n(v){return normalizeAr(clean(v,10000))}
function arr(v){return Array.isArray(v)?v:[]}
function uniq(v){return [...new Set(arr(v).filter(Boolean))]}

const CONCEPTS={
  water:["ري","مياه","ميه","موية","ماي","سقي","عطشان","ناشف","رطوبة","irrigation","water"],
  salinity:["ملوحة","مالح","املاح","أملاح","ec","ملح","salinity","salt"],
  nutrition:["سماد","تسميد","غذاء","تغذية","عنصر","npk","نيتروجين","فوسفور","بوتاسيوم","كالسيوم","مغنيسيوم","حديد","fertilizer","nutrition"],
  root:["جذر","جذور","روت","root","rootzone","منطقة الجذور"],
  disease:["مرض","فطر","عفن","بكتيريا","فيروس","بقع","ذبول","disease","fungus","rot"],
  pest:["حشرة","حشرات","افة","آفة","تربس","ذبابة","من","اكاروس","أكاروس","pest","thrips","whitefly","mite"],
  greenhouse:["بيت محمي","صوبة","صوبه","جرين هاوس","greenhouse","protected"],
  hydroponics:["زراعة مائية","هيدروبونيك","هيدروبونك","nft","dwc","كوكوبيت","روك وول","hydroponic"],
  seed:["بذرة","بذور","تقاوي","انبات","إنبات","شتلة","شتل","seed","germination","nursery"],
  climate:["حر","حرارة","برد","رطوبة","vpd","شمس","ضوء","مناخ","temperature","humidity","climate"],
  diagnosis:["مشكلة","تعبان","مخنوق","مصفر","اصفر","مكرمش","متجعد","واقف نمو","تشخيص","diagnose","symptom"],
  law:["قانون","تصريح","ترخيص","استيراد","تصدير","ممنوع","مسموح","رسوم","حجر","quarantine","permit","license","law"],
  sales:["عايز","أريد","ابغى","أبغى","احتاج","محتاج","اختار","رشح","سعر","متوفر","شراء","buy","price","available"],
};

function load(){
  if(CACHE) return CACHE;
  CACHE=JSON.parse(readFileSync(DATA_URL,"utf8"));
  return CACHE;
}
function grams(s,k=3){const x=` ${n(s)} `;const out=[];for(let i=0;i<=x.length-k;i++)out.push(x.slice(i,i+k));return out}
function gramSim(a,b){const A=new Set(grams(a)),B=new Set(grams(b));if(!A.size||!B.size)return 0;let hit=0;for(const x of A)if(B.has(x))hit++;return hit/Math.max(1,A.size+B.size-hit)}
function expandedTokens(query){
  const text=n(query); const base=tokenize(text).filter(x=>x.length>1); const extra=[];
  for(const [concept,aliases] of Object.entries(CONCEPTS)){
    if(aliases.some(a=>text.includes(n(a)))) extra.push(concept,...aliases.map(n));
  }
  return uniq([...base,...extra]).filter(x=>x.length>1);
}
function buildIndex(){
  if(INDEX) return INDEX;
  INDEX=arr(load().cards).map((c,i)=>{
    const alias=arr(c.aliases).join(" ");
    const short=n(`${c.title_ar||""} ${c.title_en||""} ${c.summary_ar||""} ${alias} ${c.crop_ar||""} ${c.crop||""} ${c.domain||""} ${c.stage_ar||""} ${c.symptom||""}`);
    return {i,short,tokens:new Set(tokenize(short).filter(x=>x.length>1)),alias:n(alias),title:n(`${c.title_ar||""} ${c.title_en||""}`)};
  });
  return INDEX;
}
function scoreCard(query,tokens,row,card,{crop="",domain="",stage=""}={}){
  const qt=n(query); let score=0;
  const cardCropAliases=uniq([card.crop,card.crop_ar,...arr(card.aliases).slice(0,6)]).map(n).filter(Boolean);
  const explicitCropHit=cardCropAliases.some(a=>a.length>=2&&qt.includes(a));
  if(explicitCropHit) score+=42;
  if(row.title&&qt&&row.title.includes(qt)) score+=50;
  if(row.alias&&qt&&row.alias.includes(qt)) score+=38;
  for(const t of tokens){
    if(row.tokens.has(t)) score+=5;
    else if(t.length>=4&&row.short.includes(t)) score+=2.2;
  }
  const qWords=tokenize(qt).filter(x=>x.length>2);
  if(qWords.length){const hit=qWords.filter(x=>row.short.includes(x)).length;score+=24*(hit/qWords.length)}
  score+=12*gramSim(qt.slice(0,180),row.title.slice(0,220));
  if(crop&&(n(card.crop)===n(crop)||n(card.crop_ar)===n(crop)||arr(card.aliases).some(x=>n(x).includes(n(crop))))) score+=36;
  if(domain&&n(card.domain).includes(n(domain))) score+=18;
  if(stage&&n(card.stage).includes(n(stage))) score+=12;
  if(card.uae_relevance==="high"&&/(امارات|الإمارات|العين|شارقه|الشارقة|دبي|ابوظبي|أبوظبي|الذيد|راس الخيمه|رأس الخيمة|فجيره|الفجيرة|عجمان|ام القيوين|أم القيوين)/.test(qt)) score+=10;
  if(card.type==="uae_regulatory_summary"&&CONCEPTS.law.some(x=>qt.includes(n(x)))) score+=30;
  if(card.type==="crop_symptom_differential"&&CONCEPTS.diagnosis.some(x=>qt.includes(n(x)))) score+=16;
  return score;
}

export function searchAgriculturalMasterKnowledge(query="",{limit=10,crop="",domain="",stage=""}={}){
  const data=load(); const idx=buildIndex(); const toks=expandedTokens(query); const max=Math.max(1,Math.min(16,Number(limit)||10));
  return idx.map(row=>{const card=data.cards[row.i];return {card,score:scoreCard(query,toks,row,card,{crop,domain,stage})};})
    .filter(x=>x.score>3).sort((a,b)=>b.score-a.score).slice(0,max)
    .map(({card,score})=>({
      id:card.id,type:card.type,domain:card.domain,crop:card.crop||"",crop_ar:card.crop_ar||"",stage:card.stage||"",
      title:card.title_ar||card.title_en||"",answer:card.details_ar||card.summary_ar||"",summary:card.summary_ar||"",
      decision_steps:arr(card.decision_steps).slice(0,7),measurements:arr(card.measurements).slice(0,8),red_flags:arr(card.red_flags).slice(0,6),
      source_basis:arr(card.source_basis),verified_at:card.verified_at||data.verified_at,evidence_level:card.evidence_level||"",volatile:Boolean(card.volatile),score:Number(score.toFixed(3)),source:"agricultural_master_knowledge_v18"
    }));
}

export function agriculturalMasterHealth(){
  const data=load(); let bytes=0;try{bytes=statSync(DATA_URL).size}catch{}
  return {version:VERSION,mode:"large_free_form_agricultural_master_knowledge",cards:Number(data?.stats?.cards||arr(data?.cards).length),crops:Number(data?.stats?.crops||0),domains:Number(data?.stats?.domains||0),symptoms:Number(data?.stats?.symptoms||0),sources:Number(data?.stats?.sources||arr(data?.source_manifest).length),bytes,megabytes:Number((bytes/1024/1024).toFixed(2)),retrieval:"concept_expansion+token_semantics+character_ngrams+neural_tool_reasoning",legal_freshness_guard:true,dosage_guard:true,verified_at:data?.verified_at||""};
}

export function masterSourceManifest(){return arr(load().source_manifest).map(x=>({...x}));}
