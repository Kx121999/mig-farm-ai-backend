import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeAr, tokenize } from "./utils.js";
import { buildCustomerBrainFrameV27 } from "./customer_brain_v27.js";

const VERSION="27.0",ROOT=join(dirname(fileURLToPath(import.meta.url)),"..","knowledge_v27");
const TASK_ALIASES={agriculture_diagnosis:["diagnosis","irrigation","nutrition","root_zone","climate","prevention","measurement"],product_search:["decision","suitability","alternative","details"],product_details:["details","decision"],price:["decision","comparison"],availability:["decision","alternative"]};
let manifestCache=null,routerCache=null;const packCache=new Map();
function clean(value="",max=6000){return String(value??"").replace(/[\u0000-\u001f]/g," ").replace(/\s+/g," ").trim().slice(0,max);}
function norm(value=""){return normalizeAr(clean(value,7000)).toLowerCase();}
function arr(value){return Array.isArray(value)?value:[];}
function uniq(value){return [...new Set(arr(value).filter(Boolean))];}
function readJson(path){try{return JSON.parse(readFileSync(path,"utf8"));}catch{return null;}}
function manifest(){return manifestCache||(manifestCache=readJson(join(ROOT,"manifest.json"))||{});}
function router(){return routerCache||(routerCache=readJson(join(ROOT,"router.json"))||{});}
function push(out,value){for(const file of arr(value))if(file&&!out.includes(file))out.push(file);}
function selectPacks(query,frame,domain=""){
  const r=router(),m=manifest(),text=norm(query),out=[],allowed=new Set(arr(m.packs).map(x=>x.file));
  for(const [key,files] of Object.entries(r.product_routes||{}))if(key.length>=3&&text.includes(key))push(out,files);
  const signature=(frame?.tasks||[]).map(x=>x.intent).sort().join("+");if(signature)push(out,r.signature_routes?.[signature]);
  for(const task of frame?.tasks||[]){push(out,r.intent_routes?.[norm(task.intent)]);for(const alias of TASK_ALIASES[task.intent]||[])push(out,r.intent_routes?.[norm(alias)]);}
  for(const [key,files] of Object.entries(r.topic_routes||{}))if(key.length>=3&&text.includes(key))push(out,files);
  if(domain)push(out,r.domain_routes?.[norm(domain)]);
  if(!out.length)push(out,arr(m.packs).slice(0,1).map(x=>x.file));
  return out.filter(x=>allowed.has(x)).slice(0,Math.max(1,Math.min(2,Number(process.env.MIG_V27_MAX_PACKS_PER_QUERY)||1)));
}
function loadPack(file){
  if(packCache.has(file))return packCache.get(file);const allowed=new Set(arr(manifest().packs).map(x=>x.file));if(!allowed.has(file))return [];
  const path=join(ROOT,"packs",file);if(!existsSync(path))return [];const rows=[];
  for(const line of readFileSync(path,"utf8").split("\n")){if(!line)continue;try{rows.push(JSON.parse(line));}catch{}}
  packCache.clear();packCache.set(file,rows);return rows;
}
function score(record,tokens,frame,text){
  const hay=norm([record.question,record.title,record.domain,record.intent,record.product?.name,record.product?.sku,record.crop,...arr(record.keywords)].filter(Boolean).join(" "));
  const set=new Set(tokenize(hay));let value=0;for(const token of tokens){if(set.has(token))value+=4;else if(token.length>=4&&hay.includes(token))value+=2;}
  const tasks=(frame?.tasks||[]).map(x=>x.intent);for(const task of tasks){const aliases=[task,...(TASK_ALIASES[task]||[])];if(aliases.some(x=>String(record.intent||"").includes(x)))value+=7;if(arr(record.expected_intents).some(x=>aliases.includes(x)))value+=9;}
  if(tasks.length>1&&arr(record.expected_intents).length>1)value+=12;
  if(record.product?.sku&&text.includes(norm(record.product.sku)))value+=18;if(record.product?.name&&text.includes(norm(record.product.name)))value+=15;
  if(record.dialect===frame?.dialect)value+=3;return value;
}
function publicItem(record,score,file){return {id:clean(record.id,120),type:clean(record.type,120),title:clean(record.title||record.question,500),question:clean(record.question,1000),answer:clean(record.answer,5000),intent:clean(record.intent,180),expected_intents:arr(record.expected_intents).slice(0,6),domain:clean(record.domain,120),dialect:clean(record.dialect,60),response_policy:record.response_policy||{},evidence:record.evidence||{},score,source:`github_customer_brain_v27:${file}`};}

export function searchCustomerKnowledgeV27(query="",{limit=6,domain="",frame=null}={}){
  const text=norm(query);if(!text||!customerKnowledgeHealthV27().ready)return {items:[],packs_scanned:[],reason:"not_ready"};
  const customerFrame=frame||buildCustomerBrainFrameV27({message:query});const tokens=uniq(tokenize(text).filter(x=>x.length>=2)),files=selectPacks(text,customerFrame,domain),hits=[];
  for(const file of files)for(const record of loadPack(file)){const value=score(record,tokens,customerFrame,text);if(value>=7)hits.push(publicItem(record,value,file));}
  hits.sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));const unique=[],seen=new Set();for(const hit of hits){const key=`${hit.type}:${hit.intent}:${hit.answer}`;if(seen.has(key))continue;seen.add(key);unique.push(hit);if(unique.length>=Math.max(1,Math.min(12,Number(limit)||6)))break;}
  return {items:unique,packs_scanned:files,frame:{dialect:customerFrame.dialect,tasks:customerFrame.tasks.map(x=>x.intent),multi_intent:customerFrame.is_multi_intent},engine:"v27_customer_brain_manifest_router_reranker"};
}

export function customerKnowledgeHealthV27(){
  const m=manifest(),total=Number(m.total_pack_bytes||0);return {version:VERSION,mode:"github_sharded_customer_brain_knowledge",ready:Boolean(m.version===VERSION&&arr(m.packs).length&&total),packs:arr(m.packs).length,records:Number(m.total_records||0),bytes:total,megabytes:Number((total/1048576).toFixed(2)),target_megabytes:Number(m.target_megabytes||400),max_pack_megabytes:Number(m.max_pack_megabytes||0),allocations:m.allocations||{},browser_upload_safe:Boolean(m.github?.browser_upload_safe),retrieval:"manifest_router+intent_signature+product_topic+bounded_rerank",cache:"one_pack_lru",policies:m.policies||{}};
}
