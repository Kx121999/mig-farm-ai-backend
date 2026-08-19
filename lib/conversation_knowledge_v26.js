import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeAr, tokenize } from "./utils.js";

const VERSION="26.0";
const ROOT=join(dirname(fileURLToPath(import.meta.url)),"..","knowledge_v26");
const MANIFEST_PATH=join(ROOT,"manifest.json");
const ROUTER_PATH=join(ROOT,"router.json");
let manifestCache=null,routerCache=null;
const packCache=new Map();

function clean(value="",max=6000){return String(value??"").replace(/[\u0000-\u001f]/g," ").replace(/\s+/g," ").trim().slice(0,max);}
function n(value=""){return normalizeAr(clean(value,7000)).toLowerCase();}
function arr(value){return Array.isArray(value)?value:[];}
function uniq(value){return [...new Set(arr(value).filter(Boolean))];}
function readJson(path){try{return JSON.parse(readFileSync(path,"utf8"));}catch{return null;}}
function manifest(){if(manifestCache)return manifestCache;manifestCache=readJson(MANIFEST_PATH)||{};return manifestCache;}
function router(){if(routerCache)return routerCache;routerCache=readJson(ROUTER_PATH)||{};return routerCache;}

function queryIntent(text){
  if(/(?:جرعه|جرعة|كم مل|كم ملي|خلط|dose|dosage|mix rate)/.test(text))return "dosage";
  if(/(?:سعر|بكام|بكم|price|how much|cost)/.test(text))return "price";
  if(/(?:متوفر|موجود|متاح|stock|available)/.test(text))return "availability";
  if(/(?:قارن|الفرق|مقارنه|compare|difference)/.test(text))return "comparison";
  if(/(?:ينفع|يناسب|مناسب|suitable|fit|use for)/.test(text))return "suitability";
  if(/(?:اصفر|ذبول|بقع|عفن|حشر|مرض|تشخيص|symptom|diagnos)/.test(text))return "diagnosis";
  if(/(?:تفاصيل|مواصفات|استخدام|فايده|فائدة|details|spec|what is)/.test(text))return "details";
  if(/(?:بديل|غيره|alternative|similar)/.test(text))return "alternatives";
  return "general";
}

function pushRoutes(out,value){for(const name of arr(value))if(name&&!out.includes(name))out.push(name);}
function selectPacks(query,domain=""){
  const r=router(),m=manifest(),text=n(query),out=[];
  const allowed=new Set(arr(m.packs).map(x=>x.file));
  for(const [key,packs] of Object.entries(r.product_routes||{}))if(key.length>=3&&text.includes(key))pushRoutes(out,packs);
  for(const [key,packs] of Object.entries(r.topic_routes||{}))if(key.length>=2&&text.includes(key))pushRoutes(out,packs);
  const intent=queryIntent(text);pushRoutes(out,r.intent_routes?.[intent]);
  if(domain)pushRoutes(out,r.domain_routes?.[n(domain)]);
  if(!out.length)pushRoutes(out,r.intent_routes?.general);
  if(!out.length)pushRoutes(out,arr(m.packs).slice(0,1).map(x=>x.file));
  return out.filter(name=>allowed.has(name)).slice(0,Math.max(1,Math.min(2,Number(process.env.MIG_V26_MAX_PACKS_PER_QUERY)||1)));
}

function loadPack(file){
  if(packCache.has(file))return packCache.get(file);
  const allowed=new Set(arr(manifest().packs).map(x=>x.file));if(!allowed.has(file))return [];
  const path=join(ROOT,"packs",file);if(!existsSync(path))return [];
  const rows=[];for(const line of readFileSync(path,"utf8").split("\n")){
    if(!line)continue;try{rows.push(JSON.parse(line));}catch{}
  }
  packCache.clear();packCache.set(file,rows);return rows;
}

function scoreRecord(record,queryTokens,intent,text){
  const hay=n([record.question,record.title,record.product?.name,record.product?.sku,record.crop,record.domain,...arr(record.keywords)].filter(Boolean).join(" "));
  const hayTokens=new Set(tokenize(hay));let score=0;
  for(const token of queryTokens){if(hayTokens.has(token))score+=4;else if(token.length>=4&&hay.includes(token))score+=2;}
  if(record.intent===intent)score+=8;
  if(record.product?.sku&&text.includes(n(record.product.sku)))score+=16;
  if(record.product?.name&&text.includes(n(record.product.name)))score+=14;
  if(record.domain&&text.includes(n(record.domain)))score+=3;
  return score;
}

function publicItem(record,score,file){
  return {
    id:clean(record.id,120),title:clean(record.title||record.product?.name||record.question,500),question:clean(record.question,900),
    answer:clean(record.answer,5000),response_policy:record.response_policy||{},evidence:record.evidence||{},
    intent:clean(record.intent,80),domain:clean(record.domain,120),dialect:clean(record.dialect,80),
    score,source:`github_knowledge_pack_v26:${file}`
  };
}

export function searchConversationKnowledgeV26(query="",{limit=6,domain=""}={}){
  const text=n(query);if(!text||!conversationKnowledgeHealth().ready)return {items:[],packs_scanned:[],reason:"not_ready"};
  const queryTokens=uniq(tokenize(text).filter(x=>x.length>=2));const intent=queryIntent(text);const files=selectPacks(text,domain);const hits=[];
  for(const file of files)for(const record of loadPack(file)){
    const score=scoreRecord(record,queryTokens,intent,text);if(score>=6)hits.push(publicItem(record,score,file));
  }
  hits.sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
  const unique=[];const seen=new Set();for(const hit of hits){const key=`${hit.intent}:${hit.title}:${hit.answer}`;if(seen.has(key))continue;seen.add(key);unique.push(hit);if(unique.length>=Math.max(1,Math.min(12,Number(limit)||6)))break;}
  return {items:unique,packs_scanned:files,intent,engine:"v26_sharded_jsonl_retrieval"};
}

export function conversationKnowledgeHealth(){
  const m=manifest();const total=Number(m.total_pack_bytes||0);
  return {version:VERSION,mode:"github_sharded_conversation_knowledge",ready:Boolean(m.version===VERSION&&arr(m.packs).length&&total),packs:arr(m.packs).length,records:Number(m.total_records||0),bytes:total,megabytes:Number((total/1048576).toFixed(2)),target_megabytes:Number(m.target_megabytes||400),max_pack_megabytes:Number(m.max_pack_megabytes||0),browser_upload_safe:Boolean(m.github?.browser_upload_safe),retrieval:"manifest_router+intent_product_crop_routes+bounded_pack_scan",cache:"one_pack_lru",price_stock_policy:"live_odoo_only",dosage_policy:"official_label_or_verified_product_data_only"};
}
