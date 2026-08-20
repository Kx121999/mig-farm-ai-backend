import { createHash } from "node:crypto";
import { normalizeAr } from "./utils.js";
import { CATEGORIES, CROPS } from "./brain.js";

const VERSION="31.0";
const cache=globalThis.__migV31MeaningCache||new Map();
const stats=globalThis.__migV31MeaningStats||{turns:0,openai:0,cache_hits:0,fallbacks:0,failures:0,new_topics:0,followups:0,alignment_blocks:0};
globalThis.__migV31MeaningCache=cache;globalThis.__migV31MeaningStats=stats;

const INTENTS=new Set([
  "greeting","wellbeing","thanks","goodbye","acknowledgment","negative_ack","identity","human",
  "branches","shipping","delivery_time","contact","hours","payment","returns","pickup","services","company","order_status",
  "product_search","product_details","known_product_info","product_memory","price","availability","recommendation","compare","purchase","bundle","complaint",
  "agriculture_general","diagnosis","dosage","calculation","greenhouse_project","image_analysis","correction","off_domain","unknown"
]);
const SOCIAL=new Set(["greeting","wellbeing","thanks","goodbye","acknowledgment","negative_ack","identity","human"]);
const BUSINESS=new Set(["branches","shipping","delivery_time","contact","hours","payment","returns","pickup","services","company","order_status"]);

function clean(value="",max=2400){return String(value??"").replace(/[\u0000-\u001f]/g," ").replace(/\s+/g," ").trim().slice(0,max);}
function arr(value){return Array.isArray(value)?value:[];}
function clamp(value,min=0,max=1){return Math.max(min,Math.min(max,Number(value)||0));}
function uniq(values){return [...new Set(arr(values).map(x=>clean(x,80)).filter(Boolean))];}
function configured(){return Boolean(clean(process.env.OPENAI_API_KEY,20));}
function enabled(){return !/^(?:0|false|off|no)$/i.test(clean(process.env.LLM_FIRST_V31_ENABLED||"true",20));}
function model(){
  const requested=clean(process.env.OPENAI_INTENT_MODEL||process.env.OPENAI_MODEL||"gpt-5-mini",100);
  // Older MIG FARM packages used the non-portable alias `gpt-5.6`.
  // Keep deployments working even when that stale value still exists in Vercel.
  return /^gpt-5\.6$/i.test(requested)?"gpt-5-mini":requested;
}
function timeoutMs(){return Math.max(2500,Math.min(15000,Number(process.env.LLM_FIRST_TIMEOUT_MS)||7000));}
function normalizeIntent(value="unknown"){const intent=clean(value,60).toLowerCase();return INTENTS.has(intent)?intent:"unknown";}
function hash(value=""){return createHash("sha256").update(String(value)).digest("hex").slice(0,24);}
function safeProduct(value){
  if(!value||typeof value!=="object")return null;
  const out={name:clean(value.name||value.title,240),sku:clean(value.sku||value.default_code,100)};
  return out.name||out.sku?out:null;
}
function recentDialogue(history=[]){return arr(history).slice(-8).map(x=>({role:x?.role==="assistant"?"assistant":"user",content:clean(x?.content,900)}));}
function contextSnapshot({state={},history=[],selectedProduct=null,selectedProducts=[]}={}){
  return {
    turn:Math.max(0,Number(state?.turn)||0),topic:clean(state?.topic,60),pending:clean(state?.pending,60),
    expected_question:clean(state?.dialogue_v29?.expected?.question,320),expected_field:clean(state?.dialogue_v29?.expected?.field,50),
    active_product:safeProduct(selectedProduct||state?.active_product_context?.product||state?.active_product_context),
    visible_products:arr(selectedProducts?.length?selectedProducts:state?.visible_products).slice(0,5).map(safeProduct).filter(Boolean),
    known_constraints:{emirate:clean(state?.emirate,50),crop:clean(state?.crop,80),cultivation:clean(state?.cultivation,60),quantity:clean(state?.quantity,60)},
    recent_dialogue:recentDialogue(history)
  };
}
function schema(){return {
  type:"object",additionalProperties:false,
  properties:{
    language:{type:"string"},dialect:{type:"string"},domain:{type:"string",enum:["social","mig_farm_business","products","agriculture","commerce","mixed","off_domain","unclear"]},
    primary_intent:{type:"string",enum:[...INTENTS]},intents:{type:"array",maxItems:6,items:{type:"object",additionalProperties:false,properties:{name:{type:"string",enum:[...INTENTS]},confidence:{type:"number",minimum:0,maximum:1}},required:["name","confidence"]}},
    speech_act:{type:"string",enum:["question","request","answer","correction","confirmation","rejection","social","statement"]},
    topic_relationship:{type:"string",enum:["new_topic","followup","answer_to_assistant","correction","continuation","unclear"]},
    context_policy:{type:"object",additionalProperties:false,properties:{use_recent_context:{type:"boolean"},ignore_old_product:{type:"boolean"},ignore_old_agriculture:{type:"boolean"},requires_visible_choice:{type:"boolean"}},required:["use_recent_context","ignore_old_product","ignore_old_agriculture","requires_visible_choice"]},
    entities:{type:"object",additionalProperties:false,properties:{emirate:{type:["string","null"]},crop:{type:["string","null"]},cultivation:{type:["string","null"]},category:{type:["string","null"]},product_name:{type:["string","null"]},product_reference:{type:["string","null"]},quantity:{type:["number","null"]},budget_aed:{type:["number","null"]},symptoms:{type:"array",maxItems:8,items:{type:"string"}},decision_criteria:{type:"array",maxItems:8,items:{type:"string"}}},required:["emirate","crop","cultivation","category","product_name","product_reference","quantity","budget_aed","symptoms","decision_criteria"]},
    reference:{type:"object",additionalProperties:false,properties:{requires_context:{type:"boolean"},target:{type:"string",enum:["none","active_product","visible_product","previous_question","previous_answer","image"]},resolved_text:{type:["string","null"]},confidence:{type:"number",minimum:0,maximum:1}},required:["requires_context","target","resolved_text","confidence"]},
    ambiguity:{type:"object",additionalProperties:false,properties:{required:{type:"boolean"},missing_information:{type:["string","null"]},question:{type:["string","null"]}},required:["required","missing_information","question"]},
    response_plan:{type:"object",additionalProperties:false,properties:{mode:{type:"string",enum:["natural_direct","tool_grounded","advisory","clarify","social","safe_refusal"]},external_facts_required:{type:"boolean"},answer_order:{type:"array",maxItems:6,items:{type:"string"}},max_questions:{type:"integer",minimum:0,maximum:1},tone:{type:"string"}},required:["mode","external_facts_required","answer_order","max_questions","tone"]},
    compound:{type:"boolean"},safe_direct_reply:{type:["string","null"]},meaning_summary:{type:"string"},confidence:{type:"number",minimum:0,maximum:1}
  },
  required:["language","dialect","domain","primary_intent","intents","speech_act","topic_relationship","context_policy","entities","reference","ambiguity","response_plan","compound","safe_direct_reply","meaning_summary","confidence"]
};}
function extractOutputText(response={}){
  if(typeof response?.output_text==="string")return response.output_text.trim();
  const texts=[];for(const item of arr(response?.output))for(const content of arr(item?.content))if(content?.type==="output_text"&&content?.text)texts.push(String(content.text));
  return texts.join("\n").trim();
}
function parseJson(value=""){
  const text=String(value||"").trim().replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/,"");
  try{return JSON.parse(text);}catch{return null;}
}
function sanitizeFrame(raw={},provider="openai"){
  const primary=normalizeIntent(raw?.primary_intent),intents=arr(raw?.intents).slice(0,6).map(x=>({name:normalizeIntent(x?.name),confidence:clamp(x?.confidence)})).filter(x=>x.name!=="unknown");
  if(primary!=="unknown"&&!intents.some(x=>x.name===primary))intents.unshift({name:primary,confidence:clamp(raw?.confidence||.7)});
  const entities=raw?.entities&&typeof raw.entities==="object"?raw.entities:{};
  return {
    version:VERSION,engine:"llm_first_full_utterance_interpreter",provider,
    language:clean(raw?.language||"ar",20),dialect:clean(raw?.dialect||"unknown",40),domain:clean(raw?.domain||"unclear",40),
    primary_intent:primary,intents:intents.slice(0,6),speech_act:clean(raw?.speech_act||"statement",30),topic_relationship:clean(raw?.topic_relationship||"unclear",30),
    context_policy:{use_recent_context:Boolean(raw?.context_policy?.use_recent_context),ignore_old_product:Boolean(raw?.context_policy?.ignore_old_product),ignore_old_agriculture:Boolean(raw?.context_policy?.ignore_old_agriculture),requires_visible_choice:Boolean(raw?.context_policy?.requires_visible_choice)},
    entities:{emirate:clean(entities.emirate,60)||null,crop:clean(entities.crop,80)||null,cultivation:clean(entities.cultivation,60)||null,category:clean(entities.category,80)||null,product_name:clean(entities.product_name,260)||null,product_reference:clean(entities.product_reference,260)||null,quantity:entities.quantity!==null&&entities.quantity!==""&&Number.isFinite(Number(entities.quantity))?Math.max(0,Number(entities.quantity)):null,budget_aed:entities.budget_aed!==null&&entities.budget_aed!==""&&Number.isFinite(Number(entities.budget_aed))?Math.max(0,Number(entities.budget_aed)):null,symptoms:uniq(entities.symptoms).slice(0,8),decision_criteria:uniq(entities.decision_criteria).slice(0,8)},
    reference:{requires_context:Boolean(raw?.reference?.requires_context),target:clean(raw?.reference?.target||"none",30),resolved_text:clean(raw?.reference?.resolved_text,300)||null,confidence:clamp(raw?.reference?.confidence)},
    ambiguity:{required:Boolean(raw?.ambiguity?.required),missing_information:clean(raw?.ambiguity?.missing_information,180)||null,question:clean(raw?.ambiguity?.question,420)||null},
    response_plan:{mode:clean(raw?.response_plan?.mode||"natural_direct",30),external_facts_required:Boolean(raw?.response_plan?.external_facts_required),answer_order:uniq(raw?.response_plan?.answer_order).slice(0,6),max_questions:Math.max(0,Math.min(1,Number(raw?.response_plan?.max_questions)||0)),tone:clean(raw?.response_plan?.tone||"natural",80)},
    compound:Boolean(raw?.compound||intents.length>1),safe_direct_reply:clean(raw?.safe_direct_reply,500)||null,meaning_summary:clean(raw?.meaning_summary,300),confidence:clamp(raw?.confidence),
    authoritative:["openai","deterministic_guard"].includes(provider)&&clamp(raw?.confidence)>=.62,privacy:{raw_message_persisted:false,raw_history_persisted:false,stores_meaning_frame_only:true}
  };
}
const COMMON_CROPS=[
  ["زيتون",["زيتون","الزيتون","olive"]],["نخيل",["نخيل","النخيل","نخل","النخله","palm","date palm"]],
  ["مانجو",["مانجو","المانجو","mango"]],["حمضيات",["حمضيات","الحمضيات","citrus"]],
  ["ليمون",["ليمون","الليمون","lemon"]],["برتقال",["برتقال","البرتقال","orange"]],
  ["عنب",["عنب","العنب","grape"]],["تين",["تين","التين","fig"]],
  ["رمان",["رمان","الرمان","pomegranate"]],["تفاح",["تفاح","التفاح","apple"]],
  ["خوخ",["خوخ","الخوخ","peach"]],["مشمش",["مشمش","المشمش","apricot"]],
  ["لوز",["لوز","اللوز","almond"]],["سدر",["سدر","السدر","sidr"]],
  ["جوافة",["جوافه","الجوافه","guava"]],["طماطم",["طماطم","الطماطم","tomato"]],
  ["خيار",["خيار","الخيار","cucumber"]],["فلفل",["فلفل","الفلفل","pepper"]],
  ["باذنجان",["باذنجان","الباذنجان","eggplant"]],["بطيخ",["بطيخ","البطيخ","watermelon"]]
];
const CROP_STOPWORDS=new Set(["الورق","ورق","الاوراق","اوراق","مشكلتي","المشكله","مشكله","اصفرار","اصفر","مصفر","عندي","فيها","فيه"]);
function includesTerm(text="",term=""){
  const value=normalizeAr(term);return Boolean(value&&new RegExp(`(?:^|\\s)${value.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}(?:$|\\s)`,"u").test(text));
}
function extractCrop(text=""){
  for(const [key,item] of Object.entries(CROPS)){
    const names=[key,item?.labelAr,...arr(item?.aliases)];if(names.some(name=>includesTerm(text,name)))return clean(item?.labelAr||key,80);
  }
  for(const [label,aliases] of COMMON_CROPS)if(aliases.some(name=>includesTerm(text,name)))return label;
  const match=text.match(/(?:شجره|شجر|نبات|محصول|زرعه|زرع)\s+(?:ال)?([\p{L}][\p{L}-]{2,30})/u);
  const candidate=clean(match?.[1]||"",80);return candidate&&!CROP_STOPWORDS.has(candidate)?candidate:null;
}
function extractSymptoms(text=""){
  const symptoms=[];
  if(/(?:اصفرار|اصفر|مصفر|yellow|chlorosis)/.test(text))symptoms.push("اصفرار الأوراق");
  if(/(?:ذبول|ذابله|دابل|wilt)/.test(text))symptoms.push("ذبول");
  if(/(?:بقع|تبقع|spots?)/.test(text))symptoms.push("بقع على الأوراق");
  if(/(?:احتراق|حرق|محروقه|scorch|burn)/.test(text))symptoms.push("احتراق الأوراق");
  if(/(?:تجعد|التفاف|مكرمش|curl)/.test(text))symptoms.push("تجعد الأوراق");
  if(/(?:تعفن|عفن|rot)/.test(text))symptoms.push("تعفن");
  if(/(?:تساقط|سقوط الاوراق|leaf drop)/.test(text))symptoms.push("تساقط الأوراق");
  if(/(?:حشره|حشرات|افه|افات|insect|pest)/.test(text))symptoms.push("وجود آفة حشرية");
  return uniq(symptoms);
}
function deterministicFallback({message="",legacyAnalysis={},state={}}={}){
  const text=normalizeAr(clean(message,2000)),trimmed=text.replace(/[؟?!.,،]/g,"").trim();
  let intent=normalizeIntent(legacyAnalysis?.intent),domain="unclear",safe=null,relationship="new_topic",guarded=false;
  let crop=null,symptoms=[],ambiguity={required:false,missing_information:null,question:null},responseMode="natural_direct",maxQuestions=0,summary="";
  symptoms=extractSymptoms(trimmed);crop=extractCrop(trimmed);
  const asksDose=/(?:جرع|مل لكل|سم3|معدل استخدام)/.test(trimmed);
  if(/^(?:اسمك ايه|اسمك شو|شو اسمك|ما اسمك|مين انت|من انت|انت مين|who are you|what is your name)$/.test(trimmed)){intent="identity";domain="social";safe="أنا MIG FARM AI، مساعدك للمنتجات والزراعة وخدمات MIG FARM. قول لي محتاج إيه وأنا أساعدك.";guarded=true;}
  else if(/^(?:اهلا|اهلين|مرحبا|هلا|هاي|السلام عليكم|hello|hi)$/.test(trimmed)){intent="greeting";domain="social";safe="أهلًا وسهلًا 👋 أنا معاك. محتاج مساعدة في منتج، زراعة، ولا خدمة من MIG FARM؟";guarded=true;}
  else if(/^(?:شكرا|شكراً|مشكور|تسلم|thanks|thank you)$/.test(trimmed)){intent="thanks";domain="social";safe="العفو، تحت أمرك 🌱";guarded=true;}
  else if(/(?:فين مكانكم|وين مكانكم|اين فروعكم|وين فروعكم|مكان الفرع|فرع العين|فرع الشارقه|فرع الشارقة)/.test(trimmed)){intent="branches";domain="mig_farm_business";guarded=true;}
  else if(/(?:اسمك|مين انت|من انت)/.test(trimmed)){intent="identity";domain="social";safe="أنا MIG FARM AI، مساعدك للمنتجات والزراعة وخدمات MIG FARM.";guarded=true;}
  else if(symptoms.length&&!asksDose){
    intent="diagnosis";domain="agriculture";guarded=true;responseMode="advisory";maxQuestions=1;
    ambiguity={required:true,missing_information:"موضع ظهور الأعراض وشدة انتشارها",question:symptoms.includes("اصفرار الأوراق")?"الاصفرار ظاهر أكثر في الأوراق الجديدة ولا القديمة؟":"العَرَض بدأ في أي جزء من النبات وهل ينتشر بسرعة؟"};
    summary=`طلب تشخيص زراعي${crop?` لمحصول ${crop}`:""}: ${symptoms.join("، ")}`;
  }
  else if(asksDose){intent="dosage";domain="products";}
  else if(/(?:سعر|بكام|بكم)/.test(trimmed)){intent="price";domain="products";}
  else if(/(?:متوفر|موجود عندكم|في المخزون)/.test(trimmed)){intent="availability";domain="products";}
  else if(["branches","shipping","delivery_time","contact","hours","payment","returns","pickup","services","company","order_status"].includes(intent))domain="mig_farm_business";
  else if(SOCIAL.has(intent))domain="social";
  else if(["agriculture_general","diagnosis","calculation","greenhouse_project"].includes(intent))domain="agriculture";
  else if(intent!=="unknown")domain="products";
  const expected=Boolean(state?.dialogue_v29?.expected?.active),short=trimmed.split(/\s+/).length<=4;
  if(expected&&short&&!SOCIAL.has(intent)&&!BUSINESS.has(intent))relationship="answer_to_assistant";
  const confidence=guarded ? (intent==="diagnosis"?.92:.96) : .55;
  return sanitizeFrame({language:"ar",dialect:"unknown",domain,primary_intent:intent,intents:[{name:intent,confidence}],speech_act:symptoms.length?"statement":"question",topic_relationship:relationship,context_policy:{use_recent_context:relationship!=="new_topic",ignore_old_product:relationship==="new_topic"&&!/سعر|متوفر|منتج|استخدام|جرع/.test(trimmed),ignore_old_agriculture:relationship==="new_topic"&&(domain==="social"||domain==="mig_farm_business"),requires_visible_choice:false},entities:{emirate:null,crop,cultivation:null,category:null,product_name:null,product_reference:null,quantity:null,budget_aed:null,symptoms,decision_criteria:[]},reference:{requires_context:false,target:"none",resolved_text:null,confidence:0},ambiguity,response_plan:{mode:safe?"social":BUSINESS.has(intent)?"tool_grounded":responseMode,external_facts_required:BUSINESS.has(intent)||![...SOCIAL].includes(intent),answer_order:["acknowledge_entities",intent,"ask_one_discriminating_question"],max_questions:maxQuestions,tone:"natural"},compound:false,safe_direct_reply:safe,meaning_summary:summary||intent,confidence},guarded?"deterministic_guard":"deterministic_fallback");
}

export async function understandTurnV31({message="",history=[],state={},legacyAnalysis={},legacySemanticFrame={},selectedProduct=null,selectedProducts=[],hasImages=false,locale="ar"}={}){
  stats.turns+=1;
  const snapshot=contextSnapshot({state,history,selectedProduct,selectedProducts});
  const key=hash(JSON.stringify({message:clean(message,2500),snapshot,hasImages,locale})),cached=cache.get(key);
  if(cached&&Date.now()-cached.at<120000){stats.cache_hits+=1;return cached.frame;}
  if(!enabled()||!configured()){
    stats.fallbacks+=1;return deterministicFallback({message,legacyAnalysis,state});
  }
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs());
  const instructions=`You are the first and authoritative meaning interpreter for MIG FARM AI. Understand the customer's COMPLETE latest utterance before any keyword router runs.

Rules:
- The latest customer sentence has priority over old product/agriculture context.
- A word match is never enough. Determine the meaning, speech act, topic relationship and all requested intents from the whole sentence.
- Use recent context only for a genuine short answer, pronoun, ordinal, correction or explicit continuation.
- If the customer starts a new social or business topic, set ignore_old_product and ignore_old_agriculture true.
- Do not answer product, price, stock, dosage, branch, shipping or policy facts here. Mark external_facts_required instead.
- safe_direct_reply is allowed only for greetings, thanks, identity and simple social turns; otherwise null.
- Never infer a product, dosage, disease or personal detail that was not stated or resolved by clear context.
- Ask at most one precise clarification only when the missing fact materially changes the answer.
- Return only the requested structured JSON. Do not provide reasoning or chain-of-thought.`;
  const input={latest_customer_message:clean(message,2500),has_images:Boolean(hasImages),trusted_recent_context:snapshot,legacy_parser_hint_untrusted:{intent:clean(legacyAnalysis?.intent,60),semantic_intents:arr(legacySemanticFrame?.intents).map(x=>clean(x?.name||x,60)).slice(0,5)}};
  try{
    const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",signal:controller.signal,headers:{"Content-Type":"application/json","Authorization":`Bearer ${process.env.OPENAI_API_KEY}`},body:JSON.stringify({model:model(),store:false,instructions,input:[{role:"user",content:[{type:"input_text",text:JSON.stringify(input)}]}],text:{format:{type:"json_schema",name:"mig_farm_meaning_v31",strict:true,schema:schema()}}})});
    const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(`openai_${response.status}:${clean(data?.error?.message||"request_failed",180)}`);
    const raw=parseJson(extractOutputText(data));if(!raw)throw new Error("invalid_structured_meaning");
    const frame=sanitizeFrame(raw,"openai");stats.openai+=1;stats.last_error=null;if(frame.topic_relationship==="new_topic")stats.new_topics+=1;else stats.followups+=1;
    cache.set(key,{at:Date.now(),frame});while(cache.size>200)cache.delete(cache.keys().next().value);
    return frame;
  }catch(error){
    stats.failures+=1;stats.fallbacks+=1;
    const detail=clean(error?.name==="AbortError"?"timeout":error?.message,180);
    stats.last_error=detail==="timeout"?"timeout":detail.match(/^openai_\d+/)?.[0]||"provider_failure";
    return {...deterministicFallback({message,legacyAnalysis,state}),provider_error:stats.last_error};
  }
  finally{clearTimeout(timer);}
}

function cropKey(value=""){const n=normalizeAr(clean(value,100));for(const [key,item] of Object.entries(CROPS))if(key===value||normalizeAr(item?.labelAr||"")===n||arr(item?.aliases).some(x=>normalizeAr(x)===n))return key;return "";}
function categoryKey(value=""){const n=normalizeAr(clean(value,100));for(const [key,item] of Object.entries(CATEGORIES))if(key===value||normalizeAr(item?.labelAr||"")===n||arr(item?.aliases).some(x=>normalizeAr(x)===n))return key;return "";}
function legacyIntent(intent){if(["product_details","price","availability","dosage"].includes(intent))return "known_product_info";if(intent==="compare")return "product_memory";if(intent==="bundle")return "recommendation";if(intent==="calculation")return "agriculture_general";return intent;}
export function applyMeaningFrameV31(analysis={},semanticFrame={},frame={}){
  if(!frame||frame.version!==VERSION)return {analysis,semanticFrame};
  const intent=frame.authoritative?frame.primary_intent:normalizeIntent(analysis.intent||frame.primary_intent);
  if(frame.authoritative||analysis.intent==="unknown")analysis.intent=legacyIntent(intent);
  analysis.v31_primary_intent=intent;analysis.v31_authoritative=Boolean(frame.authoritative);analysis.v31_topic_relationship=frame.topic_relationship;analysis.v31_confidence=frame.confidence;
  analysis.semantic_intent=intent;analysis.semantic_intents=frame.intents.length?frame.intents.map(x=>x.name):[intent];
  const rawCrop=clean(frame.entities?.crop,80),crop=cropKey(rawCrop);
  if(crop&&CROPS[crop])analysis.crop={key:crop,labelAr:CROPS[crop].labelAr,aliases:CROPS[crop].aliases||[]};
  else if(rawCrop){
    const safeKey=normalizeAr(rawCrop).replace(/[^\p{L}\p{N}]+/gu,"_").replace(/^_+|_+$/g,"").slice(0,60)||"crop";
    analysis.crop={key:`custom_${safeKey}`,labelAr:rawCrop,aliases:[rawCrop],custom:true};
  }
  if(frame.entities?.symptoms?.length)analysis.symptoms=uniq(frame.entities.symptoms);
  const category=categoryKey(frame.entities?.category);if(category&&CATEGORIES[category])analysis.category=CATEGORIES[category];
  if(frame.entities?.emirate)analysis.emirate=frame.entities.emirate;
  if(frame.entities?.cultivation)analysis.cultivation=frame.entities.cultivation;
  if(frame.entities?.quantity!==null)analysis.quantity=frame.entities.quantity;
  if(frame.topic_relationship==="new_topic"&&frame.context_policy?.ignore_old_product){delete analysis.memoryAction;delete analysis.v29_reference_product;delete analysis.v29_reference_products;}
  semanticFrame.primary_intent=intent;semanticFrame.intents=(frame.intents.length?frame.intents:[{name:intent,confidence:frame.confidence}]).map(x=>({name:x.name,confidence:x.confidence,evidence:"v31_full_utterance"}));
  semanticFrame.compound={...(semanticFrame.compound||{}),is_multi_intent:Boolean(frame.compound),ordered_intents:semanticFrame.intents.map(x=>x.name)};
  semanticFrame.v31_meaning={version:VERSION,provider:frame.provider,authoritative:frame.authoritative,domain:frame.domain,speech_act:frame.speech_act,topic_relationship:frame.topic_relationship,context_policy:frame.context_policy,response_plan:frame.response_plan,confidence:frame.confidence};
  semanticFrame.confidence=Math.max(Number(semanticFrame.confidence)||0,Number(frame.confidence)||0);
  return {analysis,semanticFrame};
}

export function shouldQuarantineContextV31(frame={}){return Boolean(frame?.authoritative&&frame?.topic_relationship==="new_topic"&&(frame?.context_policy?.ignore_old_product||frame?.context_policy?.ignore_old_agriculture));}
export function allowLegacyRouteV31(routeIntent="",frame={}){
  if(!frame?.authoritative)return true;
  const route=normalizeIntent(routeIntent),allowed=new Set([frame.primary_intent,...arr(frame.intents).map(x=>x.name)]);
  if(route==="known_product_info"&&["product_details","price","availability","dosage"].some(x=>allowed.has(x)))return true;
  if(route==="product_memory"&&allowed.has("compare"))return true;
  if(route==="recommendation"&&allowed.has("bundle"))return true;
  return allowed.has(route);
}
export function allowLegacyCompoundV31(frame={}){return !frame?.authoritative||Boolean(frame?.compound&&arr(frame?.intents).length>1);}

function safeReplacement(frame={}){
  if(frame.safe_direct_reply&&!frame.response_plan?.external_facts_required)return frame.safe_direct_reply;
  if(frame.ambiguity?.required&&frame.ambiguity?.question)return frame.ambiguity.question;
  const intent=frame.primary_intent;
  if(intent==="identity")return "أنا MIG FARM AI، مساعدك للمنتجات والزراعة وخدمات MIG FARM. قول لي محتاج إيه وأنا أساعدك.";
  if(intent==="branches")return "إحنا موجودين في الشارقة والعين. تحب بيانات أي فرع؟";
  if(intent==="contact")return "تقصد بيانات التواصل لفرع الشارقة ولا فرع العين؟";
  if(["shipping","delivery_time"].includes(intent))return "اكتب الإمارة اللي تبي التوصيل لها، وأنا أحدد لك بيانات الشحن المناسبة.";
  return "فهمت سؤالك، لكن الرد الحالي مش متوافق مع قصدك. وضّح لي الجزء اللي تبيه في كلمة أو كلمتين وأنا أجاوبك مباشرة.";
}
export function auditMeaningAlignmentV31({message="",frame={},payload={},source=""}={}){
  const reply=clean(payload?.display_reply||payload?.reply,6000),text=normalizeAr(reply),request=normalizeAr(clean(message,2500));const flags=[];
  if(!frame?.authoritative||!reply)return {version:VERSION,passed:Boolean(reply),score:reply?86:0,flags,source:clean(source,100),enforced:false};
  const staleAgronomy=/(?:الجرع|المبيد|المحصول|صوره الملصق|تعليمات الملصق|مرحله الاستخدام|\b\d+(?:[.,]\d+)?\s*(?:مل|سم3|جرام|غم)\s*(?:لكل|\/|في))/i.test(text);
  const requestAgronomy=/(?:جرع|مبيد|محصول|زرع|نبات|ملصق|سماد|بذور)/.test(request);
  if(frame.topic_relationship==="new_topic"&&(frame.domain==="social"||frame.domain==="mig_farm_business")&&staleAgronomy&&!requestAgronomy)flags.push("stale_agriculture_context_leak");
  if(SOCIAL.has(frame.primary_intent)&&/(?:السعر|متوفر|المنتج|الجرع|المحصول|الطلب)/.test(text)&&!/(?:mig farm ai|مساعد)/i.test(reply))flags.push("social_intent_hijacked");
  if(frame.primary_intent==="identity"&&!/(?:mig farm|مساعد|assistant|اسمي|أنا)/i.test(reply))flags.push("identity_not_answered");
  if(BUSINESS.has(frame.primary_intent)&&staleAgronomy&&!requestAgronomy)flags.push("business_intent_hijacked");
  const passed=flags.length===0;if(!passed)stats.alignment_blocks+=1;
  return {version:VERSION,passed,score:passed?96:18,flags,source:clean(source,100),enforced:!passed};
}
export function enforceMeaningAlignmentV31({payload={},frame={},audit={}}={}){
  if(audit?.passed!==false)return {...payload,meaning_alignment_v31:audit};
  const reply=safeReplacement(frame);return {...payload,reply,display_reply:reply,quick_replies:[],meaning_alignment_v31:audit};
}

export function meaningFrameClientV31(frame={}){return {version:VERSION,provider:frame.provider,fallback_reason:frame.provider_error||null,authoritative:Boolean(frame.authoritative),domain:frame.domain,primary_intent:frame.primary_intent,intents:frame.intents,speech_act:frame.speech_act,topic_relationship:frame.topic_relationship,context_policy:frame.context_policy,entities:frame.entities,reference:frame.reference,ambiguity:frame.ambiguity,response_plan:frame.response_plan,meaning_summary:frame.meaning_summary,confidence:frame.confidence};}
export function llmFirstHealthV31(){return {version:VERSION,ready:true,enabled:enabled(),configured:configured(),provider:configured()?"openai_responses_api":"deterministic_emergency_fallback",model:model(),priority:"full_utterance_before_legacy_routes",structured_output:true,legacy_keyword_router:"fallback_only",cache:{max_entries:200,ttl_seconds:120},alignment_guard:true,stats:{...stats},privacy:{store:false,raw_messages_in_metrics:false,raw_history_in_metrics:false}};}
