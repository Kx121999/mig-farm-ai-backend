import { createHash } from "node:crypto";
import { normalizeAr } from "./utils.js";

const RELEASE="FINAL_PRODUCTION_OS";
const VERSION="FINAL.1";
const MAX_LATENCIES=240;

const runtime=globalThis.__migFinalProductionOS||{
  started_at:new Date().toISOString(),turns:0,passed:0,repaired:0,blocked:0,
  neural_reviews:0,neural_repairs:0,provider_failures:0,provider_open_until:0,
  latencies:[],flags:{},intents:{},last_updated_at:null
};
globalThis.__migFinalProductionOS=runtime;

const PROMPT_REGISTRY=Object.freeze({
  meaning:{id:"meaning-first",version:"31.0",purpose:"full_utterance_interpretation",active:true},
  answer:{id:"grounded-natural-answer",version:"FINAL.1",purpose:"natural_tool_grounded_response",active:true},
  critic:{id:"pre-send-critic",version:"FINAL.1",purpose:"coverage_truth_safety_repair",active:true}
});

const SOCIAL=new Set(["greeting","wellbeing","thanks","goodbye","acknowledgment","negative_ack","identity","human"]);
const BUSINESS=new Set(["branches","shipping","delivery_time","contact","hours","payment","returns","pickup","services","company","order_status"]);
const PRODUCT=new Set(["product_search","product_details","known_product_info","product_memory","price","availability","recommendation","compare","purchase","bundle"]);
const AGRICULTURE=new Set(["agriculture_general","diagnosis","dosage","calculation","greenhouse_project","image_analysis"]);

function clean(value="",max=6000){return String(value??"").replace(/[\u0000-\u001f]/g," ").replace(/[ \t]+/g," ").replace(/\n{3,}/g,"\n\n").trim().slice(0,max);}
function arr(value){return Array.isArray(value)?value:[];}
function clamp(value,min=0,max=100){return Math.max(min,Math.min(max,Math.round(Number(value)||0)));}
function hash(value=""){return createHash("sha256").update(String(value)).digest("hex").slice(0,24);}
function boolEnv(name,def=true){const value=process.env[name];return value===undefined?def:/^(1|true|yes|on)$/i.test(String(value));}
function configured(){return Boolean(clean(process.env.OPENAI_API_KEY,30));}
function model(){
  const requested=clean(process.env.OPENAI_CRITIC_MODEL||process.env.OPENAI_MODEL||"gpt-5-mini",100);
  return /^gpt-5\.6$/i.test(requested)?"gpt-5-mini":requested;
}
function timeoutMs(){return Math.max(2200,Math.min(9000,Number(process.env.FINAL_CRITIC_TIMEOUT_MS)||5200));}
function uniq(values){return [...new Set(arr(values).map(x=>clean(x,120)).filter(Boolean))];}
function increment(bucket,key){const safe=clean(key||"unknown",100)||"unknown";bucket[safe]=(bucket[safe]||0)+1;}
function percentile(values,p=.95){if(!values.length)return 0;const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.min(sorted.length-1,Math.max(0,Math.ceil(sorted.length*p)-1))];}

function intentList(meaningFrame={},analysis={}){
  const values=arr(meaningFrame?.intents).map(x=>clean(x?.name||x,60));
  const primary=clean(meaningFrame?.primary_intent||analysis?.v31_primary_intent||analysis?.intent||"unknown",60);
  return uniq([primary,...values]).filter(x=>x!=="unknown").slice(0,6);
}
function intentDomain(intents=[]){
  const set=new Set(intents);
  if(intents.some(x=>SOCIAL.has(x)))return intents.some(x=>!SOCIAL.has(x))?"mixed":"social";
  if(intents.some(x=>BUSINESS.has(x)))return intents.some(x=>!BUSINESS.has(x))?"mixed":"business";
  if(intents.some(x=>PRODUCT.has(x)))return intents.some(x=>AGRICULTURE.has(x))?"mixed":"products";
  if(intents.some(x=>AGRICULTURE.has(x)))return "agriculture";
  return "unclear";
}
function riskProfile(intents=[]){
  const dosage=intents.includes("dosage");
  const diagnosis=intents.includes("diagnosis")||intents.includes("image_analysis");
  const live=intents.some(x=>["price","availability","purchase","order_status"].includes(x));
  const mutation=intents.includes("purchase")||intents.includes("order_status");
  return {level:dosage||mutation?"high":diagnosis||live?"medium":"low",dosage,diagnosis,live_facts:live,mutation};
}

export function createFinalTurnContract({message="",meaningFrame={},analysis={},state={},hasImages=false}={}){
  const intents=intentList(meaningFrame,analysis),risk=riskProfile(intents);
  const relationship=clean(meaningFrame?.topic_relationship||analysis?.v31_topic_relationship||"unclear",40);
  const maxQuestions=Math.max(0,Math.min(1,Number(meaningFrame?.response_plan?.max_questions??1)));
  const contextPolicy={
    relationship,
    use_recent_context:Boolean(meaningFrame?.context_policy?.use_recent_context),
    quarantine_old_product:Boolean(meaningFrame?.context_policy?.ignore_old_product),
    quarantine_old_agriculture:Boolean(meaningFrame?.context_policy?.ignore_old_agriculture),
    active_product_allowed:relationship!=="new_topic"||!meaningFrame?.context_policy?.ignore_old_product
  };
  return {
    release:RELEASE,version:VERSION,request_fingerprint:hash(clean(message,2600).toLowerCase()),
    primary_intent:intents[0]||"unknown",intents,domain:clean(meaningFrame?.domain||intentDomain(intents),40),
    compound:Boolean(meaningFrame?.compound||intents.length>1),speech_act:clean(meaningFrame?.speech_act||"statement",30),
    answer_order:uniq(meaningFrame?.response_plan?.answer_order?.length?meaningFrame.response_plan.answer_order:intents).slice(0,6),
    ambiguity:{required:Boolean(meaningFrame?.ambiguity?.required),question:clean(meaningFrame?.ambiguity?.question,500)||null},
    response:{natural:true,canned_templates:"emergency_only",same_language:true,max_questions:maxQuestions,answer_before_question:true},
    context_policy:contextPolicy,risk,has_images:Boolean(hasImages||state?.__current_vision_frame?.has_visual_context),
    privacy:{raw_message_stored:false,raw_history_stored:false,fingerprint_only:true}
  };
}

function productTruth(item={}){
  const truth=item?.truth&&typeof item.truth==="object"?item.truth:{};
  const observed=Date.parse(truth.observed_at||truth.fetched_at||"");
  const ttl=Math.max(60,Number(truth.ttl_seconds)||600)*1000;
  const fresh=Boolean(observed&&Date.now()-observed<=ttl);
  const current=Boolean(truth.current&&fresh&&/odoo|live_product_page|product_page/i.test(String(truth.source||"")));
  return {name:clean(item?.name,260),sku:clean(item?.sku,100),source:clean(truth.source,80)||"unspecified",observed_at:observed?new Date(observed).toISOString():null,fresh,current,price:clean(item?.price,80),currency:clean(item?.currency||"AED",20),availability:clean(item?.availability,100),price_verified:Boolean(current&&item?.price!==undefined&&item?.price!==null&&String(item.price)!==""),availability_verified:Boolean(current&&clean(item?.availability,100))};
}
export function buildFinalTruthEnvelope({payload={},results=[],evidence={},source=""}={}){
  const products=arr(results).slice(0,10).map(productTruth);
  const labelResults=arr(payload?.visual_evidence?.label_guard_results);
  const action=payload?.autonomous_action||{};
  const businessVerified=BUSINESS.has(clean(payload?.meaning_alignment_v31?.intent,60))||/^(?:branches|shipping|delivery_time|contact|hours|payment|returns|pickup|services|company|order_status)$/.test(String(source));
  return {
    version:VERSION,source:clean(source,120),products,
    live:{products:products.filter(x=>x.current).length,price_verified:products.some(x=>x.price_verified),availability_verified:products.some(x=>x.availability_verified)},
    label:{verified:labelResults.some(x=>x?.ok===true||x?.verified===true),checks:labelResults.length},
    action:{verified:Boolean(action?.verified&&action?.receipt),status:clean(action?.status,40)||"none"},
    business:{verified:Boolean(businessVerified)},evidence_present:Boolean(evidence&&Object.keys(evidence).length),
    policy:{live_price_stock_only:true,label_only_dosage:true,verified_action_receipt_only:true,archived_knowledge_never_proves_live_facts:true}
  };
}

function responseText(payload={}){return clean(payload?.display_reply||payload?.reply,9000);}
function questionCount(text=""){return (String(text).match(/[؟?]/g)||[]).length;}
function hasDoseQuantity(text=""){return /\b\d+(?:[.,]\d+)?\s*(?:مل|سم3|سم³|جرام|غم|كجم|لتر)/i.test(normalizeAr(text));}
function hasNumericDose(text=""){return /\b\d+(?:[.,]\d+)?\s*(?:مل|سم3|سم³|جرام|غم|كجم|لتر)\s*(?:لكل|في|per|لتر|ماء|\d)/i.test(normalizeAr(text));}
function hasPriceClaim(text=""){return /(?:\bAED\b|د\.?\s*إ|درهم|السعر\s*(?:هو|:)?\s*\d|\d+(?:[.,]\d+)?\s*(?:درهم|AED))/i.test(text);}
function priceClaims(text=""){
  const values=[];for(const match of String(text).matchAll(/(?:السعر\s*(?:هو|:)?\s*(\d+(?:[.,]\d+)?)|(\d+(?:[.,]\d+)?)\s*(?:AED|درهم|د\.?\s*إ))/gi)){const n=Number(String(match[1]||match[2]).replace(",","."));if(Number.isFinite(n))values.push(n);}
  return values;
}
function hasAvailabilityClaim(text=""){return /(?:متوفر|متاح|في المخزون|in stock|available|غير متوفر|نفد المخزون)/i.test(normalizeAr(text));}
function hasExecutedActionClaim(text=""){return /(?:تم\s*(?:تنفيذ|تاكيد|انشاء|اتمام)\s*(?:الطلب|الدفع|البيع)|تم\s+الدفع|طلبك\s*(?:اتنفذ|تاكد)|payment\s+completed|order\s+confirmed)/i.test(normalizeAr(text));}
function agronomyLeak(text=""){return /(?:الجرع|المبيد|المحصول|صوره الملصق|تعليمات الملصق|مرحله الاستخدام|سماد|اصفرار|ذبول)/i.test(normalizeAr(text));}
function paragraphDuplicates(text=""){
  const seen=new Set();let duplicates=0;
  for(const part of String(text).split(/\n{2,}/).map(x=>normalizeAr(clean(x,1200))).filter(x=>x.length>18)){const key=part.slice(0,180);if(seen.has(key))duplicates+=1;else seen.add(key);}
  return duplicates;
}
function coverageSignal(intent,text=""){
  const t=normalizeAr(text);
  const map={
    identity:/(?:mig farm ai|مساعد|اسمي|انا)/i,branches:/(?:فرع|الشارق|العين|مكان|موجود)/,contact:/(?:اتصال|تواصل|هاتف|واتساب|رقم|ايميل)/,
    shipping:/(?:شحن|توصيل)/,delivery_time:/(?:مده|وقت|يوم|توصيل)/,hours:/(?:ساعات|دوام|يفتح|يغلق)/,payment:/(?:دفع|بطاق|نقد|تحويل)/,
    returns:/(?:استرجاع|استبدال|ارجاع)/,price:/(?:سعر|درهم|aed)/i,availability:/(?:متوفر|متاح|مخزون|نفد)/,
    compare:/(?:قارن|مقارنه|افضل|فرق)/,product_search:/(?:منتج|خيارات|لقيت|متجر)/,product_details:/(?:تفاصيل|مواصف|استخدام)/,
    diagnosis:/(?:احتمال|فحص|عرض|تشخيص|سبب)/,dosage:/(?:جرع|ملصق|معدل استخدام)/,calculation:/(?:حساب|ناتج|مساح|كمي)/,
    order_status:/(?:طلب|حاله|تتبع|مرجع)/,purchase:/(?:طلب|سله|شراء|كمي)/
  };
  return map[intent]?map[intent].test(t):true;
}

export function auditFinalResponse({message="",payload={},contract={},truth={},source=""}={}){
  const reply=responseText(payload),flags=[];const hard=[];
  const verifiedBusinessAmount=Boolean(truth?.business?.verified&&BUSINESS.has(clean(contract?.primary_intent,60)));
  if(!reply){flags.push("empty_response");hard.push("empty_response");}
  if(reply&&paragraphDuplicates(reply)>0)flags.push("duplicate_paragraphs");
  if(questionCount(reply)>Number(contract?.response?.max_questions??1))flags.push("question_budget_exceeded");
  if(/(?:وضح لي المقصود|ممكن توضح|كيف أقدر أساعدك|فهمت سؤالك، لكن الرد الحالي)/.test(normalizeAr(reply))&&!contract?.ambiguity?.required&&clean(message).split(/\s+/).length>2)flags.push("generic_canned_fallback");
  const newSocialOrBusiness=contract?.context_policy?.relationship==="new_topic"&&["social","business","mig_farm_business"].includes(contract?.domain);
  if(newSocialOrBusiness&&agronomyLeak(reply)&&!agronomyLeak(message)){flags.push("stale_context_leak");hard.push("stale_context_leak");}
  if((hasNumericDose(reply)||(contract?.risk?.dosage&&hasDoseQuantity(reply)))&&!truth?.label?.verified){flags.push("unverified_dosage");hard.push("unverified_dosage");}
  if(hasExecutedActionClaim(reply)&&!truth?.action?.verified){flags.push("unverified_action_execution");hard.push("unverified_action_execution");}
  // A verified delivery fee is a business-policy amount, not an unverified
  // product price. Keep the product-price guard strict without deleting trusted shipping facts.
  if(hasPriceClaim(reply)&&!truth?.live?.price_verified&&!verifiedBusinessAmount){flags.push("unverified_live_price");hard.push("unverified_live_price");}
  if(hasPriceClaim(reply)&&truth?.live?.price_verified){
    const claims=priceClaims(reply),verified=arr(truth?.products).filter(x=>x.price_verified).map(x=>Number(String(x.price).replace(",","."))).filter(Number.isFinite);
    if(claims.length&&verified.length&&!claims.some(value=>verified.some(price=>Math.abs(price-value)<.005))){flags.push("live_price_value_conflict");hard.push("live_price_value_conflict");}
  }
  if(hasAvailabilityClaim(reply)&&!truth?.live?.availability_verified&&!truth?.business?.verified){flags.push("unverified_live_availability");hard.push("unverified_live_availability");}
  if(hasAvailabilityClaim(reply)&&truth?.products?.filter(x=>x.availability_verified).length===1){
    const saidUnavailable=/(?:غير متوفر|نفد|out of stock|unavailable)/i.test(normalizeAr(reply));
    const verifiedText=normalizeAr(truth.products.find(x=>x.availability_verified)?.availability||"");
    const verifiedUnavailable=/(?:غير متوفر|نفد|out of stock|unavailable)/i.test(verifiedText);
    if(saidUnavailable!==verifiedUnavailable){flags.push("live_availability_value_conflict");hard.push("live_availability_value_conflict");}
  }
  const missing=arr(contract?.intents).filter(intent=>!coverageSignal(intent,reply));
  if(contract?.compound)for(const intent of missing)flags.push(`missing_intent:${intent}`);
  let score=100;
  for(const flag of flags){
    if(hard.includes(flag))score-=34;
    else if(flag.startsWith("missing_intent:"))score-=14;
    else score-=10;
  }
  if(reply.length>5200){flags.push("response_too_long");score-=8;}
  return {release:RELEASE,version:VERSION,passed:hard.length===0&&score>=78,score:clamp(score),flags:uniq(flags).slice(0,20),hard_blocks:uniq(hard),missing_intents:missing,question_count:questionCount(reply),source:clean(source,120),truth:{price_verified:Boolean(truth?.live?.price_verified),availability_verified:Boolean(truth?.live?.availability_verified),label_verified:Boolean(truth?.label?.verified),action_verified:Boolean(truth?.action?.verified)},privacy:{raw_reply_stored:false,raw_message_stored:false}};
}

function dedupeParagraphs(text=""){
  const seen=new Set(),out=[];
  for(const part of String(text).split(/\n{2,}/).map(x=>clean(x,1800)).filter(Boolean)){const key=normalizeAr(part).slice(0,180);if(!seen.has(key)){seen.add(key);out.push(part);}}
  return out.join("\n\n");
}
function enforceQuestionBudget(text="",max=1){let count=0;return String(text).replace(/[؟?]/g,m=>{count+=1;return count<=max?m:".";});}
function directSafeReply(contract={}){
  const intent=contract?.primary_intent;
  if(intent==="identity")return "أنا MIG FARM AI، مساعدك لمنتجات MIG FARM والزراعة وخدمات المتجر. قول لي محتاج إيه وأنا أساعدك مباشرة.";
  if(intent==="branches")return "إحنا موجودين في الشارقة والعين. تحب بيانات أي فرع؟";
  if(intent==="shipping"||intent==="delivery_time")return "اكتب الإمارة المطلوبة عشان أتحقق لك من الشحن ومدة التوصيل الصحيحة.";
  if(intent==="contact")return "تقصد بيانات التواصل لفرع الشارقة ولا فرع العين؟";
  return contract?.ambiguity?.question||"فهمت طلبك، لكن محتاج معلومة واحدة محددة عشان أرد بدقة ومن غير تخمين.";
}
function enforceDeterministic({payload={},contract={},audit={}}={}){
  const out={...payload};let reply=dedupeParagraphs(responseText(out));
  if(audit?.hard_blocks?.includes("empty_response"))reply=directSafeReply(contract);
  if(audit?.hard_blocks?.includes("unverified_dosage"))reply="مش هخمن جرعة. ابعت اسم المنتج والمحصول ومرحلة الاستخدام وصورة واضحة للملصق، وأنا أراجع المعدل المكتوب بأمان.";
  if(audit?.hard_blocks?.includes("unverified_action_execution"))reply="ما أقدرش أقول إن الطلب أو الدفع اتنفّذ من غير إيصال تنفيذ موثّق. أقدر أجهز الخطوة الآمنة التالية أو أحوّلك للفريق.";
  if(audit?.hard_blocks?.includes("unverified_live_price"))reply="السعر الحالي محتاج تحقق مباشر من صفحة المنتج الحية؛ مش هستخدم سعر قديم أو أخمّن. ابعت اسم المنتج أو رابطه وأنا أراجعه.";
  if(audit?.hard_blocks?.includes("live_price_value_conflict"))reply="السعر المذكور لا يطابق السعر الحي الذي تم التحقق منه، لذلك مش هعرض رقم متعارض. افتح بطاقة المنتج الظاهرة للسعر الحالي.";
  if(audit?.hard_blocks?.includes("unverified_live_availability"))reply="التوفر الحالي محتاج تحقق مباشر من المتجر؛ مش هخمن المخزون. ابعت اسم المنتج أو رابطه وأنا أراجعه.";
  if(audit?.hard_blocks?.includes("live_availability_value_conflict"))reply="حالة التوفر المذكورة لا تطابق المتجر الحي، لذلك مش هأكد مخزونًا متعارضًا. راجع بطاقة المنتج الظاهرة للحالة الحالية.";
  // The latest topic owns the turn. If an old agricultural answer leaked into a
  // new social/business topic, the aligned direct reply must win over every old risk.
  if(audit?.hard_blocks?.includes("stale_context_leak"))reply=directSafeReply(contract);
  reply=enforceQuestionBudget(reply,Number(contract?.response?.max_questions??1));
  out.reply=reply;out.display_reply=reply;
  return out;
}

function extractOutputText(response={}){
  if(typeof response?.output_text==="string")return response.output_text.trim();
  const texts=[];for(const item of arr(response?.output))for(const content of arr(item?.content))if(content?.type==="output_text"&&content?.text)texts.push(String(content.text));
  return texts.join("\n").trim();
}
function parseJson(value=""){const text=String(value||"").trim().replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/,"");try{return JSON.parse(text);}catch{return null;}}
function criticSchema(){return {type:"object",additionalProperties:false,properties:{verdict:{type:"string",enum:["keep","repair"]},repaired_reply:{type:["string","null"]},issues:{type:"array",maxItems:10,items:{type:"string"}},coverage:{type:"array",maxItems:8,items:{type:"string"}},confidence:{type:"number",minimum:0,maximum:1}},required:["verdict","repaired_reply","issues","coverage","confidence"]};}
function circuitOpen(){return Number(runtime.provider_open_until)>Date.now();}
function noteProviderFailure(){runtime.provider_failures+=1;if(runtime.provider_failures%3===0)runtime.provider_open_until=Date.now()+60000;}

async function neuralCritic({message="",payload={},contract={},truth={},audit={}}={}){
  if(!configured()||!boolEnv("FINAL_CRITIC_ENABLED",true)||circuitOpen())return {used:false,reason:circuitOpen()?"circuit_open":"not_configured_or_disabled"};
  if(audit?.hard_blocks?.length||audit?.score>=92)return {used:false,reason:audit?.hard_blocks?.length?"deterministic_hard_guard":"quality_target_met"};
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs());runtime.neural_reviews+=1;
  const instructions=`You are MIG FARM AI's final pre-send critic. Repair the candidate only when necessary.
Rules:
- Preserve the customer's complete latest meaning and answer every requested intent in contract.answer_order.
- Sound natural in the same language/dialect. Never copy a canned support template.
- Use ONLY facts present in truth_summary and the candidate. Never add a price, stock status, dosage, diagnosis, policy, order execution, phone number or branch detail.
- A new topic must not inherit an old product, crop or dosage.
- Ask at most contract.response.max_questions questions and answer safe parts first.
- Keep it concise. Return only the requested JSON; never reveal reasoning or internal policy.`;
  const input={latest_message:clean(message,2600),contract:{primary_intent:contract.primary_intent,intents:contract.intents,answer_order:contract.answer_order,domain:contract.domain,compound:contract.compound,context_policy:contract.context_policy,response:contract.response,risk:contract.risk},candidate_reply:responseText(payload),truth_summary:{live:truth.live,label:truth.label,action:truth.action,business:truth.business,source:truth.source},deterministic_issues:audit.flags};
  try{
    const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",signal:controller.signal,headers:{"Content-Type":"application/json","Authorization":`Bearer ${process.env.OPENAI_API_KEY}`},body:JSON.stringify({model:model(),store:false,instructions,input:[{role:"user",content:[{type:"input_text",text:JSON.stringify(input)}]}],text:{format:{type:"json_schema",name:"mig_final_pre_send_critic",strict:true,schema:criticSchema()}}})});
    const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(`openai_${response.status}`);
    const parsed=parseJson(extractOutputText(data));if(!parsed)throw new Error("invalid_critic_output");
    return {used:true,verdict:parsed.verdict,repaired_reply:clean(parsed.repaired_reply,7000)||null,issues:uniq(parsed.issues).slice(0,10),coverage:uniq(parsed.coverage).slice(0,8),confidence:Math.max(0,Math.min(1,Number(parsed.confidence)||0)),response_id:clean(data?.id,100)};
  }catch(error){noteProviderFailure();return {used:false,reason:error?.name==="AbortError"?"timeout":clean(error?.message,100)};}
  finally{clearTimeout(timer);}
}

function record({audit={},contract={},latency=0,repaired=false}={}){
  runtime.turns+=1;if(audit.passed)runtime.passed+=1;if(repaired)runtime.repaired+=1;if(audit.hard_blocks?.length)runtime.blocked+=1;
  for(const flag of arr(audit.flags))increment(runtime.flags,flag);for(const intent of arr(contract.intents))increment(runtime.intents,intent);
  runtime.latencies.push(Math.max(0,Math.min(120000,Number(latency)||0)));if(runtime.latencies.length>MAX_LATENCIES)runtime.latencies.splice(0,runtime.latencies.length-MAX_LATENCIES);
  runtime.last_updated_at=new Date().toISOString();
}

export async function finalizeProductionResponse({message="",payload={},meaningFrame={},analysis={},state={},results=[],evidence={},source="",hasImages=false,startedAt=Date.now()}={}){
  const contract=createFinalTurnContract({message,meaningFrame,analysis,state,hasImages});
  const truth=buildFinalTruthEnvelope({payload,results,evidence,source});
  let audit=auditFinalResponse({message,payload,contract,truth,source});
  let finalPayload=enforceDeterministic({payload,contract,audit});
  let critic=await neuralCritic({message,payload:finalPayload,contract,truth,audit});let repaired=false;
  if(critic.used&&critic.verdict==="repair"&&critic.repaired_reply){
    const candidate={...finalPayload,reply:critic.repaired_reply,display_reply:critic.repaired_reply};
    const candidateAudit=auditFinalResponse({message,payload:candidate,contract,truth,source});
    if(candidateAudit.score>=auditFinalResponse({message,payload:finalPayload,contract,truth,source}).score&&!candidateAudit.hard_blocks.length){finalPayload=candidate;audit=candidateAudit;repaired=true;runtime.neural_repairs+=1;}
  }
  finalPayload=enforceDeterministic({payload:finalPayload,contract,audit});
  audit=auditFinalResponse({message,payload:finalPayload,contract,truth,source});
  const latency=Math.max(0,Date.now()-Number(startedAt||Date.now()));record({audit,contract,latency,repaired});
  return {payload:{...finalPayload,final_production_os:true},contract,truth,audit,critic:{...critic,response_id:critic.response_id||undefined},latency_ms:latency};
}

export function finalPromptRegistry(){return Object.fromEntries(Object.entries(PROMPT_REGISTRY).map(([key,value])=>[key,{...value,fingerprint:hash(JSON.stringify(value))}]));}
export function finalProductionSnapshot(){
  const turns=Math.max(1,runtime.turns),latencies=runtime.latencies;
  return {release:RELEASE,version:VERSION,started_at:runtime.started_at,last_updated_at:runtime.last_updated_at,totals:{turns:runtime.turns,passed:runtime.passed,repaired:runtime.repaired,blocked:runtime.blocked,pass_rate:Number((runtime.passed/turns*100).toFixed(1)),repair_rate:Number((runtime.repaired/turns*100).toFixed(1)),provider_failures:runtime.provider_failures},latency:{p50_ms:percentile(latencies,.5),p95_ms:percentile(latencies,.95),max_ms:latencies.length?Math.max(...latencies):0},top:{flags:Object.entries(runtime.flags).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([label,count])=>({label,count})),intents:Object.entries(runtime.intents).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([label,count])=>({label,count}))},provider:{configured:configured(),model:model(),critic_enabled:boolEnv("FINAL_CRITIC_ENABLED",true),circuit_open:circuitOpen(),neural_reviews:runtime.neural_reviews,neural_repairs:runtime.neural_repairs},privacy:{aggregate_only:true,raw_messages:false,raw_replies:false,direct_identifiers:false}};
}
export function finalProductionHealth(){return {release:RELEASE,version:VERSION,ready:true,architecture:"meaning_first_truth_grounded_self_reviewed",prompt_registry:finalPromptRegistry(),capabilities:["whole_utterance_contract","multi_intent_completion","topic_switch_quarantine","truth_freshness_envelope","live_price_stock_guard","label_only_dosage_guard","verified_action_receipt_guard","adaptive_pre_send_critic","deterministic_hard_safety","natural_response_repair","provider_circuit_breaker","privacy_safe_failure_learning","latency_percentiles","prompt_versioning"],targets:{semantic_accuracy:">=95%",product_business_facts:">=98%",stale_context_leak:"<1%",unverified_dosage_price_stock_action:0,multi_step_success:">=90%"},provider:{configured:configured(),model:model(),critic_enabled:boolEnv("FINAL_CRITIC_ENABLED",true),circuit_open:circuitOpen()},privacy:{store:false,raw_transcripts_in_metrics:false}};}
