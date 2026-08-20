import { isCredibleProductReferenceV32 } from "./natural_conversation_v32.js";

const VERSION="30.0";
const MAX_FACTS=16;
const ALLOWED=new Set(["dialect","emirate","crop","category","cultivation","quantity","budget_aed","goal","product_reference","decision_criterion","objection"]);

function clean(value="",max=260){return String(value??"").replace(/[\u0000-\u001f]/g," ").replace(/\s+/g," ").trim().slice(0,max);}
function clamp(value){return Math.max(0,Math.min(1,Number(value)||0));}
function safeValue(key,value){
  if(value===null||value===undefined||value==="")return null;
  if(["quantity","budget_aed"].includes(key)){const n=Number(value);return Number.isFinite(n)&&n>=0?Math.min(n,100000000):null;}
  const text=clean(typeof value==="object"?(value.key||value.label||value.name||value.value||""):value,key==="product_reference"?300:140);
  if(!text||/@|https?:\/\/|\b\d{8,}\b|(?:\d[ -]?){13,19}/.test(text))return null;
  if(key==="product_reference"&&!isCredibleProductReferenceV32(text,{productTask:true}))return null;
  return text;
}
function fact(key,value,{confidence=.75,source="explicit_turn",turn=0}={}){
  const safe=safeValue(key,value);if(safe===null)return null;
  return {key,value:safe,confidence:clamp(confidence),source:clean(source,50),updated_turn:Math.max(0,Number(turn)||0),expires_turn:Math.max(0,Number(turn)||0)+40};
}
export function sanitizeCustomerDigitalTwinV30(value={}){
  const raw=value&&typeof value==="object"&&!Array.isArray(value)?value:{};
  const facts=(Array.isArray(raw.facts)?raw.facts:[]).slice(-MAX_FACTS).map(item=>{
    const key=clean(item?.key,40);if(!ALLOWED.has(key))return null;
    return fact(key,item?.value,{confidence:item?.confidence,source:item?.source,turn:item?.updated_turn});
  }).filter(Boolean);
  const byKey=new Map();for(const item of facts)byKey.set(item.key,item);
  return {version:VERSION,facts:[...byKey.values()].slice(-MAX_FACTS),updated_turn:Math.max(0,Number(raw.updated_turn)||0),privacy:{raw_messages:false,direct_identifiers:false,sensitive_traits:false,payment_data:false}};
}
function candidates({frame={},analysis={},semanticFrame={},profile={},reasoning={},turn=0}={}){
  const entities=frame?.entities||{},resolved=reasoning?.resolution?.entities||{};
  const items=[
    ["dialect",frame?.dialect||semanticFrame?.dialect||profile?.preferred_dialect,.72,"language_signal"],
    ["emirate",resolved.emirate||analysis?.emirate||entities.emirate||profile?.emirate,.96,"explicit_entity"],
    ["crop",resolved.crop||analysis?.crop?.key||entities.crop||profile?.crop,.94,"explicit_entity"],
    ["category",analysis?.category?.key||entities.category||profile?.category,.9,"explicit_entity"],
    ["cultivation",resolved.cultivation||analysis?.cultivation||entities.cultivation||profile?.cultivation,.94,"explicit_entity"],
    ["quantity",entities.quantity??analysis?.quantity??profile?.quantity,.9,"explicit_entity"],
    ["budget_aed",entities.budget??profile?.budget_aed,.9,"explicit_entity"],
    ["goal",frame?.tasks?.[0]?.intent||semanticFrame?.primary_intent||analysis?.intent,.78,"turn_goal"],
    ["product_reference",(entities.product_reference_verified!==false?entities.product_reference:"")||(resolved.product?.sku||resolved.product?.name||analysis?.v29_reference_product?.sku||analysis?.v29_reference_product?.name),.92,"explicit_product_reference"]
  ];
  const message=clean(frame?.message,900);
  if(/(?:ارخص|اقل سعر|ميزاني)/i.test(message))items.push(["decision_criterion","price",.9,"explicit_preference"]);
  if(/(?:جوده|جودة|افضل نتيجه|أفضل نتيجة)/i.test(message))items.push(["decision_criterion","quality",.9,"explicit_preference"]);
  if(/(?:غالي|سعره عالي|expensive)/i.test(message))items.push(["objection","price",.9,"explicit_objection"]);
  if(/(?:مش واثق|متأكد|اضمن|أضمن|trust|sure)/i.test(message))items.push(["objection","trust",.9,"explicit_objection"]);
  return items.map(([key,value,confidence,source])=>fact(key,value,{confidence,source,turn})).filter(Boolean);
}
export function mergeCustomerDigitalTwinV30(previous={},context={}){
  const old=sanitizeCustomerDigitalTwinV30(previous),turn=Math.max(0,Number(context.turn)||0),byKey=new Map();
  for(const item of old.facts)if(!item.expires_turn||item.expires_turn>=turn)byKey.set(item.key,item);
  for(const item of candidates({...context,turn})){
    const prior=byKey.get(item.key);
    if(!prior||item.confidence>=prior.confidence||item.updated_turn>prior.updated_turn)byKey.set(item.key,item);
  }
  return sanitizeCustomerDigitalTwinV30({facts:[...byKey.values()].slice(-MAX_FACTS),updated_turn:turn});
}
export function customerDigitalTwinClientV30(value={}){
  const safe=sanitizeCustomerDigitalTwinV30(value);
  return {...safe,facts:safe.facts.map(({key,value,confidence,source})=>({key,value,confidence,source}))};
}
export function customerDigitalTwinHealthV30(){return {version:VERSION,ready:true,mode:"privacy_bounded_explicit_customer_twin",allowed:[...ALLOWED],excluded:["raw_chat","phone","email","order_private_data","payment_data","passwords","sensitive_traits","inferred_wealth"],max_facts:MAX_FACTS,ttl_turns:40};}
