import { createHash } from "node:crypto";
import { normalizeAr } from "./utils.js";
import { CATEGORIES, CROPS } from "./brain.js";
import { classifyNaturalConversationV32, composeNaturalConversationReplyV32 } from "./natural_conversation_v32.js";

const VERSION="31.0";
const cache=globalThis.__migV31MeaningCache||new Map();
const stats=globalThis.__migV31MeaningStats||{turns:0,openai:0,cache_hits:0,fallbacks:0,failures:0,new_topics:0,followups:0,alignment_blocks:0};
globalThis.__migV31MeaningCache=cache;globalThis.__migV31MeaningStats=stats;

const INTENTS=new Set([
  "greeting","wellbeing","thanks","goodbye","acknowledgment","negative_ack","identity","human","help_request","frustration","general_conversation",
  "branches","shipping","delivery_time","contact","hours","payment","returns","pickup","services","company","order_status",
  "product_search","product_details","known_product_info","product_memory","price","availability","suitability","recommendation","compare","purchase","bundle","complaint",
  "agriculture_general","diagnosis","dosage","calculation","greenhouse_project","image_analysis","correction","off_domain","unknown"
]);
const SOCIAL=new Set(["greeting","wellbeing","thanks","goodbye","acknowledgment","negative_ack","identity","human","help_request","frustration","general_conversation"]);
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
function timeoutMs(){return Math.max(2500,Math.min(20000,Number(process.env.LLM_FIRST_TIMEOUT_MS)||12000));}
function normalizeIntent(value="unknown"){const intent=clean(value,60).toLowerCase();return INTENTS.has(intent)?intent:"unknown";}
function hash(value=""){return createHash("sha256").update(String(value)).digest("hex").slice(0,24);}
function safeProduct(value){
  if(!value||typeof value!=="object")return null;
  const out={name:clean(value.name||value.title,240),sku:clean(value.sku||value.default_code,100)};
  return out.name||out.sku?out:null;
}
function recentDialogue(history=[]){return arr(history).slice(-8).map(x=>({role:x?.role==="assistant"?"assistant":"user",content:clean(x?.content,900)}));}
function contextSnapshot({state={},history=[],selectedProduct=null,selectedProducts=[]}={}){
  const diagnostic=state?.diagnostic_context_v31&&typeof state.diagnostic_context_v31==="object"?state.diagnostic_context_v31:{};
  const unified=state?.intelligence_v33&&typeof state.intelligence_v33==="object"?state.intelligence_v33:{};
  const unifiedActive=arr(unified.active_products).find(x=>x?.entity_id===unified.active_product_id)||arr(unified.active_products)[0]||null;
  return {
    turn:Math.max(0,Number(state?.turn)||0),topic:clean(state?.topic,60),pending:clean(state?.pending,60),
    expected_question:clean(state?.dialogue_v29?.expected?.question,320),expected_field:clean(state?.dialogue_v29?.expected?.field,50),
    active_product:safeProduct(selectedProduct||unifiedActive||state?.active_product_context?.product||state?.active_product_context),
    visible_products:arr(selectedProducts?.length?selectedProducts:(unified.visible_products?.length?unified.visible_products:state?.visible_products)).slice(0,5).map(safeProduct).filter(Boolean),
    known_constraints:{emirate:clean(unified.active_location||state?.emirate,50),crop:clean(unified.active_crop||state?.crop,80),cultivation:clean(unified.active_environment||state?.cultivation,60),quantity:clean(unified.active_quantity||state?.quantity,60)},
    active_diagnostic_context:diagnostic?.active?{
      crop:clean(diagnostic.crop_label,80),symptoms:uniq(diagnostic.symptoms).slice(0,12),zone:clean(diagnostic.zone,40),
      spread:clean(diagnostic.spread,40),onset:clean(diagnostic.onset,40),cultivation:clean(diagnostic.cultivation,60),
      expected_field:clean(diagnostic.expected_field,60),expires_turn:Math.max(0,Number(diagnostic.expires_turn)||0)
    }:null,
    recent_dialogue:recentDialogue(history)
  };
}
function schema(){return {
  type:"object",additionalProperties:false,
  properties:{
    language:{type:"string"},dialect:{type:"string"},domain:{type:"string",enum:["social","mig_farm_business","products","agriculture","commerce","mixed","off_domain","unclear"]},
    primary_intent:{type:"string",enum:[...INTENTS]},corrected_goal_intent:{type:["string","null"],enum:[...INTENTS,null]},intents:{type:"array",maxItems:6,items:{type:"object",additionalProperties:false,properties:{name:{type:"string",enum:[...INTENTS]},confidence:{type:"number",minimum:0,maximum:1}},required:["name","confidence"]}},
    speech_act:{type:"string",enum:["question","request","answer","correction","confirmation","rejection","social","statement"]},
    topic_relationship:{type:"string",enum:["new_topic","followup","answer_to_assistant","correction","continuation","unclear"]},
    context_policy:{type:"object",additionalProperties:false,properties:{use_recent_context:{type:"boolean"},ignore_old_product:{type:"boolean"},ignore_old_agriculture:{type:"boolean"},requires_visible_choice:{type:"boolean"}},required:["use_recent_context","ignore_old_product","ignore_old_agriculture","requires_visible_choice"]},
    entities:{type:"object",additionalProperties:false,properties:{emirate:{type:["string","null"]},crop:{type:["string","null"]},cultivation:{type:["string","null"]},category:{type:["string","null"]},product_name:{type:["string","null"]},product_reference:{type:["string","null"]},quantity:{type:["number","null"]},budget_aed:{type:["number","null"]},symptoms:{type:"array",maxItems:8,items:{type:"string"}},decision_criteria:{type:"array",maxItems:8,items:{type:"string"}}},required:["emirate","crop","cultivation","category","product_name","product_reference","quantity","budget_aed","symptoms","decision_criteria"]},
    reference:{type:"object",additionalProperties:false,properties:{requires_context:{type:"boolean"},target:{type:"string",enum:["none","active_product","visible_product","previous_question","previous_answer","image"]},resolved_text:{type:["string","null"]},confidence:{type:"number",minimum:0,maximum:1}},required:["requires_context","target","resolved_text","confidence"]},
    ambiguity:{type:"object",additionalProperties:false,properties:{required:{type:"boolean"},missing_information:{type:["string","null"]},question:{type:["string","null"]}},required:["required","missing_information","question"]},
    response_plan:{type:"object",additionalProperties:false,properties:{mode:{type:"string",enum:["natural_direct","tool_grounded","advisory","clarify","social","safe_refusal"]},external_facts_required:{type:"boolean"},answer_order:{type:"array",maxItems:6,items:{type:"string"}},max_questions:{type:"integer",minimum:0,maximum:1},tone:{type:"string"}},required:["mode","external_facts_required","answer_order","max_questions","tone"]},
    compound:{type:"boolean"},safe_direct_reply:{type:["string","null"]},meaning_summary:{type:"string"},confidence:{type:"number",minimum:0,maximum:1}
  },
  required:["language","dialect","domain","primary_intent","corrected_goal_intent","intents","speech_act","topic_relationship","context_policy","entities","reference","ambiguity","response_plan","compound","safe_direct_reply","meaning_summary","confidence"]
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
    primary_intent:primary,corrected_goal_intent:raw?.corrected_goal_intent==null?null:normalizeIntent(raw.corrected_goal_intent),intents:intents.slice(0,6),speech_act:clean(raw?.speech_act||"statement",30),topic_relationship:clean(raw?.topic_relationship||"unclear",30),
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
const CROP_STOPWORDS=new Set(["الورق","ورق","الاوراق","اوراق","الجذور","جذور","الثمار","ثمار","الازهار","ازهار","الساق","ساق","مشكلتي","المشكله","مشكله","اصفرار","اصفر","مصفر","عندي","فيها","فيه","عليها","تعبان","مريض","بتقع","تسقط","سودا","صفراء","مصفره"]);
function includesTerm(text="",term=""){
  const value=normalizeAr(term);return Boolean(value&&new RegExp(`(?:^|\\s)${value.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}(?:$|\\s)`,"u").test(text));
}
function extractCrop(text=""){
  for(const [key,item] of Object.entries(CROPS)){
    const names=[key,item?.labelAr,...arr(item?.aliases)];if(names.some(name=>includesTerm(text,name)))return clean(item?.labelAr||key,80);
  }
  for(const [label,aliases] of COMMON_CROPS)if(aliases.some(name=>includesTerm(text,name)))return label;
  const matches=[
    text.match(/(?:شجره|شجر|نبات|محصول|زرعه|زرع|شتله|شتلات)\s+(?:ال)?([\p{L}][\p{L}-]{2,30})/u),
    text.match(/(?:اوراق|ورق|جذور|ثمار|ازهار|ساق|فروع)\s+ال([\p{L}][\p{L}-]{2,30})/u),
    text.match(/(?:عندي|عندنا)\s+(?:شجره|شجر|نبات|محصول|زرعه|شتله)?\s*(?:ال)?([\p{L}][\p{L}-]{2,30})\s+(?:فيه|فيها|عليه|عليها|اوراقه|اوراقها)/u)
  ];
  for(const match of matches){const candidate=clean(match?.[1]||"",80);if(candidate&&!CROP_STOPWORDS.has(candidate))return candidate;}
  return null;
}
function extractSymptoms(text=""){
  const symptoms=[];
  if(/(?:اصفرار|اصفر|مصفر|صفراء|صفرا|yellow|chlorosis)/.test(text))symptoms.push("اصفرار الأوراق");
  if(/(?:ذبول|ذابله|دابل|wilt)/.test(text))symptoms.push("ذبول");
  if(/(?:بقع|تبقع|لطع|spots?|lesions?)/.test(text))symptoms.push("بقع أو إصابات نسيجية");
  if(/(?:احتراق|حرق|محروقه|حواف ناشفه|حواف جافه|scorch|burn)/.test(text))symptoms.push("احتراق أو جفاف الحواف");
  if(/(?:تجعد|التفاف|مكرمش|تشوه|curl|twist|deform)/.test(text))symptoms.push("تجعد أو تشوه النمو");
  if(/(?:تعفن|عفن|طريه|طرية|جذور سودا|جذور سوداء|rot|mold)/.test(text))symptoms.push("تعفن أو تدهور الأنسجة");
  if(/(?:تساقط|بتقع|بيوقع|سقوط)\s*(?:الاوراق|الورق|الزهور|الازهار|الثمار)?|leaf drop|fruit drop|flower drop/.test(text))symptoms.push("تساقط أجزاء النبات");
  if(/(?:حشره|حشرات|دود|افه|افات|ذبابه|ذبابة|بق دقيقي|insect|pest|worms?)/.test(text)||/(?:^|\s)ال?من(?:$|\s)/.test(text))symptoms.push("وجود آفة حشرية");
  if(/(?:ماده لزجه|مادة لزجة|لزج|عسل ندى|ندوه عسليه|ندوة عسلية|sticky|honeydew)/.test(text))symptoms.push("إفرازات لزجة أو ندوة عسلية");
  if(/(?:هباب|عفن اسود|سناج|sooty)/.test(text))symptoms.push("عفن هبابي أسود");
  if(/(?:بياض دقيقي|مسحوق ابيض|بودره بيضا|بودرة بيضاء|white powder|powdery)/.test(text))symptoms.push("نمو أبيض دقيقي");
  if(/(?:زغب|بياض زغبي|downy)/.test(text))symptoms.push("نمو زغبي");
  if(/(?:موزايك|تبرقش|بقع متداخله|mosaic|mottling)/.test(text))symptoms.push("تبرقش أو موزايك");
  if(/(?:فضي|برونزي|silvering|bronzing)/.test(text))symptoms.push("تلون فضي أو برونزي");
  if(/(?:خروم|ثقوب|مقروض|ماكول|chew|holes?)/.test(text))symptoms.push("ثقوب أو قضم");
  if(/(?:خيوط|نسيج عنكبوت|شبك|webbing)/.test(text))symptoms.push("خيوط أو نسيج عنكبوتي");
  if(/(?:النمو واقف|النمو بطيء|تقزم|قزم|مش بيكبر|stunt|slow growth)/.test(text))symptoms.push("ضعف أو توقف النمو");
  if(/(?:مش بيزهر|ما يزهر|قلة التزهير|no flower|poor flowering)/.test(text))symptoms.push("ضعف التزهير");
  if(/(?:مش بيعقد|تساقط العقد|فشل العقد|no fruit set)/.test(text))symptoms.push("ضعف أو فشل عقد الثمار");
  if(/(?:الطرف الاسود|القاع اسود|اسود من تحت|black bottom|blossom end rot)/.test(text))symptoms.push("اسوداد الطرف الزهري للثمرة");
  if(/(?:تشقق|شقوق|متشقق|crack|split)/.test(text))symptoms.push("تشقق الثمار أو الأنسجة");
  if(/(?:صمغ|تصمغ|تقرح|كانكر|gumming|canker)/.test(text))symptoms.push("تقرح أو تصمغ الساق");
  if(/(?:ملوحه|ملوحة|قشره بيضا على التربه|قشرة بيضاء على التربة|salinity)/.test(text))symptoms.push("اشتباه إجهاد ملوحة");
  if(/(?:غرقانه|مياه راكده|ري كتير|سقي كتير|waterlog|overwater)/.test(text))symptoms.push("اشتباه زيادة ري أو سوء صرف");
  if(/(?:عطشانه|التربه ناشفه|التربة ناشفة|ري قليل|drought|dry soil)/.test(text))symptoms.push("اشتباه إجهاد مائي");
  return uniq(symptoms);
}
function extractProblemAttributes(text=""){
  let zone="",spread="",onset="";const criteria=[];
  if(/(?:الاوراق الجديده|اوراق جديده|النموات الجديده|القمم|(?:^|\s)(?:ال)?جديده(?:$|\s)|(?:^|\s)(?:ال)?جديدة(?:$|\s)|new leaves|new growth)/.test(text)){zone="new_leaves";criteria.push("الأوراق أو النموات الجديدة");}
  else if(/(?:الاوراق القديمه|اوراق قديمه|الورق القديم|السفليه|السفلية|(?:^|\s)(?:ال)?قديمه(?:$|\s)|(?:^|\s)(?:ال)?قديمة(?:$|\s)|old leaves|lower leaves)/.test(text)){zone="old_leaves";criteria.push("الأوراق القديمة أو السفلية");}
  else if(/(?:الجذور|جذور|جذر|roots?)/.test(text)){zone="roots";criteria.push("الجذور");}
  else if(/(?:الثمار|الثمر|الفاكهه|الفاكهة|fruits?)/.test(text)){zone="fruit";criteria.push("الثمار");}
  else if(/(?:الازهار|الزهور|الزهر|flowers?)/.test(text)){zone="flowers";criteria.push("الأزهار");}
  else if(/(?:الساق|الفروع|الجذع|stem|branches?)/.test(text)){zone="stem";criteria.push("الساق أو الفروع");}
  else if(/(?:كل الشجره|كل الشجرة|النبات كله|في الكل|whole plant)/.test(text)){zone="whole_plant";criteria.push("كل النبات");}
  if(/(?:بينتشر|بتنتشر|ينتشر|تنتشر|منتشر|منتشره|منتشرة|زاد بسرعه|spreading)/.test(text)){spread="spreading";criteria.push("العَرَض ينتشر");}
  else if(/(?:في مكان واحد|جزء واحد|ناحيه واحده|ناحية واحدة|localized)/.test(text)){spread="localized";criteria.push("العَرَض موضعي");}
  else if(/(?:في كل|على كله|عام في النبات|generalized)/.test(text)){spread="general";criteria.push("العَرَض عام");}
  if(/(?:فجاه|فجاة|فجأة|مره واحده|مرة واحدة|sudden)/.test(text)){onset="sudden";criteria.push("بدأ فجأة");}
  else if(/(?:تدريجي|بالتدريج|واحده واحده|واحدة واحدة|gradual)/.test(text)){onset="gradual";criteria.push("بدأ تدريجيًا");}
  return {zone,spread,onset,criteria:uniq(criteria)};
}
function activeDiagnostic(state={}){
  const value=state?.diagnostic_context_v31;
  if(!value||typeof value!=="object"||!value.active)return null;
  const turn=Math.max(0,Number(state?.turn)||0),expires=Math.max(0,Number(value.expires_turn)||0);
  return expires&&turn>expires?null:value;
}
function diagnosticQuestion(symptoms=[],attributes={}){
  if(!attributes.zone){
    if(symptoms.includes("اصفرار الأوراق"))return "الاصفرار ظاهر أكثر في الأوراق الجديدة ولا القديمة؟";
    if(symptoms.includes("ذبول"))return "وقت الذبول، التربة بتكون رطبة زيادة ولا ناشفة؟";
    if(symptoms.some(x=>/(بقع|دقيقي|زغبي|موزايك)/.test(x)))return "العَرَض بدأ في الأوراق الجديدة ولا القديمة، وبيظهر على الوجه العلوي ولا السفلي؟";
    if(symptoms.some(x=>/(آفة حشرية|لزجة|هبابي|خيوط|قضم)/.test(x)))return "شايف الحشرة أو الخيوط أو الإفرازات أكثر تحت الورقة ولا على النموات الجديدة؟";
    if(symptoms.some(x=>/(تعفن|جذور)/.test(x)))return "التربة بتفضل مبلولة قد إيه بعد الري، وهل فيه صرف جيد؟";
    if(symptoms.some(x=>/(تساقط)/.test(x)))return "اللي بيتساقط أوراق ولا أزهار ولا ثمار، وهل بدأ فجأة؟";
    return "العَرَض ظاهر في أي جزء من النبات؟";
  }
  if(!attributes.spread)return "العَرَض في جزء واحد ولا بينتشر في باقي النبات؟";
  if(!attributes.onset)return "بدأ فجأة ولا زاد بالتدريج؟";
  return "الزراعة مكشوفة ولا داخل بيت محمي، ونظام الري إيه؟";
}
function isAgriculturalProblemCue(text=""){
  const plant=/(?:نبات|شجر|شجره|محصول|زرع|زرعه|شتله|ورق|اوراق|جذور|ثمار|ازهار|ساق|نخله|نخيل)/.test(text);
  const problem=/(?:تعبان|مريض|مش طبيعي|مش بيكبر|مشكله|مشكلة|مرض|اصابه|اصابة|اعراض|أعراض|شخص|تشخيص|ايه السبب|ما السبب|حصل له|حصل فيها)/.test(text);
  const orderComplaint=/(?:طلب|شحن|توصيل|دفع|فاتوره|فاتورة|عبوه|عبوة|وصل متاخر|وصل متأخر|مكسور|تالف)/.test(text);
  return plant&&problem&&!orderComplaint;
}
function isDiagnosticFollowup(text="",state={}){
  if(!activeDiagnostic(state))return false;
  if(/(?:طلب|شحن|توصيل|دفع|سعر|متوفر|فرع|واتساب|فاتوره|فاتورة|عبوه|عبوة|مكسور)/.test(text))return false;
  return extractSymptoms(text).length>0||extractProblemAttributes(text).criteria.length>0||/(?:مكشوف|بيت محمي|تنقيط|رش|يومي|كل يوم|مرتين|رطبه|رطبة|ناشفه|ناشفة|قديمه|قديمة|جديده|جديدة|فجاه|فجأة|تدريجي|منتشر|جزء واحد)/.test(text);
}
export function parseAgriculturalProblemV31(message="",state={}){
  const text=normalizeAr(clean(message,2000)),stored=activeDiagnostic(state),attributes=extractProblemAttributes(text),followup=isDiagnosticFollowup(text,state);
  if(followup&&stored){attributes.zone=attributes.zone||clean(stored.zone,40);attributes.spread=attributes.spread||clean(stored.spread,40);attributes.onset=attributes.onset||clean(stored.onset,40);}
  const crop=extractCrop(text)||clean(stored?.crop_label,80)||null;
  const symptoms=uniq([...(followup?stored?.symptoms||[]:[]),...extractSymptoms(text)]).slice(0,12);
  return {crop,symptoms,zone:attributes.zone||"unknown",spread:attributes.spread||"unknown",onset:attributes.onset||"unknown",criteria:attributes.criteria,followup,is_problem:Boolean(symptoms.length||isAgriculturalProblemCue(text)||followup),question:diagnosticQuestion(symptoms,attributes)};
}
function semanticFallbackIntents(message="",legacySemanticFrame={},legacyAnalysis={}){
  const aliases={comparison:"compare",general_question:"unknown",social:"general_conversation"};
  const text=normalizeAr(clean(message,2000));
  const rows=arr(legacySemanticFrame?.intents).map((item,index)=>{
    const raw=clean(item?.name||item,60),mapped=aliases[raw]||raw,intent=normalizeIntent(mapped);
    const evidence=normalizeAr(clean(item?.evidence,120));
    const at=evidence?text.indexOf(evidence):-1;
    return {intent,at:at>=0?at:10000+index,index};
  }).filter(row=>row.intent!=="unknown").sort((a,b)=>a.at-b.at||a.index-b.index);
  const shippingFee=/(?:الشحن|التوصيل).{0,16}(?:بكام|بكم|كام|كم|سعر)|(?:بكام|بكم|كام|كم).{0,16}(?:الشحن|التوصيل)/.test(text);
  const intents=uniq(rows.map(row=>row.intent)).filter(intent=>!(shippingFee&&intent==="price"));
  if(intents.length)return intents;
  const primary=aliases[clean(legacySemanticFrame?.primary_intent,60)]||clean(legacySemanticFrame?.primary_intent,60);
  const semanticPrimary=normalizeIntent(primary);
  if(semanticPrimary!=="unknown"&&!(shippingFee&&semanticPrimary==="price"))return [semanticPrimary];
  const legacy=normalizeIntent(legacyAnalysis?.intent);
  if(legacy!=="unknown")return [legacy];
  return ["unknown"];
}

/*
 * This scorer is deliberately a bounded emergency path, not the production
 * language engine.  The provider-backed interpreter above remains the primary
 * semantic layer.  When the provider is unavailable, however, we still need to
 * reason over combinations of concepts instead of letting a single legacy
 * keyword or FAQ label decide the response.  A class is accepted only when
 * several independent signals agree and its score clears the runner-up.
 */
const LOCAL_SEMANTIC_CONCEPTS={
  correction:[/(?:^|\s)(?:لا|مش|مو|مب)(?:\s|$)/,/(?:^|\s)(?:اقصد|قصدي|قصدت|صحح|تصحيح|غير|غيّر|بدل|استبدل|استنى|انتظر|عدل|عدّل|راجع|تراجع)\p{L}*(?=\s|$)/u,/(?:الصح|الصحيح|مش\s+.+\s+(?:بل|لكن|انما))/],
  gratitude:[/(?:شكر\p{L}*|مشكور|تسلم|يعطي\p{L}*\s+(?:الف|ألف\s+)?العافيه|جزا\p{L}*|بارك\s+الله|ممنون|امتنان)\s*(?:خير|الله|العافيه|يا|الك|إلك)?/u,/(?:^|\s)(?:كثر|كتر)\s+خير|(?:ما\s+قصرت|ممتن|appreciate|thank)/u,/(?:ربنا|ربي|الله).{0,14}(?:كرم|جزي|حفظ|بارك|سعد)\p{L}*/u],
  identity:[/(?:مين|من|منو|ايه|ما|شو|وش)\s+(?:انت|أنت|انتا|دورك|وظيفتك|صاحب|وراء|ورا|مسؤول)/,/(?:عرف|تعرف|قدم)\p{L}*\s+(?:بنفسك|نفسك|عنك|عليك)/u,/(?:برنامج|بوت|روبوت|ذكاء|موظف|انسان|مساعد\s+(?:الي|آلي|ذكي)|المجيب|نظام\s+ذكي)(?:\s+(?:ولا|او|أو)|\s*$)/,/(?:اسمك|هويتك|دورك|وظيفتك)|(?:وظيفه|وظيفة|دور|مهمه|مهمة).{0,16}(?:المساعد|البوت|النظام|الذكاء)/,/(?:مين|من)\s+(?:اللي\s+)?\p{L}*(?:جاوب|رد)\p{L}*|(?:الرد|الاجابه|الاجابات)\s+.{0,16}(?:انسان|موظف|برنامج|بوت|مسؤول)/u,/(?:انت|أنت|انتا).{0,18}(?:بتعمل|تعمل|مهمتك).{0,10}(?:ايه|إيه|ماذا)|(?:انت|أنت)\s+(?:عباره|عبارة)\s+عن/],
  help:[/(?:ساعد|ارشاد|رشد|وجه|دل|امش|خليك|ابقى)\p{L}*\s*(?:معي|معايا|معاي|معنا|خطوه|خطوة|بدايه|بداية)?/u,/(?:محتاج|عايز|عاوز|ابي|ابغي)\s+(?:مساعد|ارشاد|توجيه|شرح)/,/(?:مش|مو|مب)\s+(?:عارف|فاهم|قادر)(?:\s|$)/,/(?:محتار|محتاس|تايه|ضايع|ملخبط|حاير)/,/(?:فهم|شرح|وضح)\p{L}*.{0,20}(?:ببساط|بسهول|الموضوع)?/u,/(?:اول|أول)\s+(?:خطوه|خطوة)|(?:منين|كيف).{0,12}(?:ابد|أبد|امسك)|(?:خطوه|خطوة)\s+(?:خطوه|خطوة)|(?:اوصل|أوصل|وصل)\p{L}*\s+(?:للحل|للنتيجه)|(?:واحده|واحدة)\s+(?:واحده|واحدة)|(?:بايدي|بإيدي|بيدي).{0,20}(?:اخلص|أخلص)/u],
  physical_place:[/(?:فرع|فروع|معرض|محل|متجر|نقطه(?:\s+(?:ال)?بيع)?|نقطة(?:\s+(?:ال)?بيع)?)/],
  location_request:[/(?:عنوان|لوكيشن|موقع|مكان|اقرب|أقرب|قريب|فين|وين|اين|أين)/,/(?:اجي|أجي|ازور|أزور|اروح|أروح|اوصل|أوصل|بنفس[يى])/,/(?:في|ب)\s*(?:الشارقه|العين|دبي|ابوظبي|الفجيره|عجمان|ام\s+القيوين|راس\s+الخيمه)/],
  shipping_action:[/(?:شحن|وصل|بعث|بعت|رسل|ارسال|جيب)\p{L}*/u],
  shipment_context:[/(?:طلب|شحنه|شحنة|اغراض|أغراض|مشتريات|طرد|للبيت|خارج|للاماره|للإمارة)/,/(?:راس\s+الخيمه|ام\s+القيوين|الفجيره|ابوظبي|دبي|العين|الشارقه)/],
  acquisition:[/(?:^|\s)(?:ابحث|أبحث|بدور|ادور|أدور|محتاج|احتاج|أحتاج|ابي|ابغي|عايز|عاوز|اريد|أريد|هات|وريني|اعرض|رشح)\p{L}*(?=\s|$)/u,/(?:عندكم|متاح|المتاح|خيارات|اصناف|أصناف|انواع|أنواع|هل\s+يوجد)/],
  product_object:[/(?:بذور|تقاوي|صنف|اصناف|سماد|مبيد|مغذي|تغذيه|اداه|أداة|جهاز|كنترولر|مؤقت|تايمر|خرطوم|خراطيم|شبك|شبكه|غطاء|تظليل|موتور|مضخه|مضخة|فلتر|رشاش|نقاط|تنقيط|مقياس|حساس)/,/(?:ري|زراعه|زراعة|سقي).{0,20}(?:اوتوماتيك|أوتوماتيك|تلقائي|لوحده|توقيت)/],
  plant_context:[/(?:نبات|نمو|نموات|شجر|شجره|محصول|زرع|زرعه|شتله|شتلات|ورق|ورقه|اوراق|جذور|ثمره|ثمار|ازهار|ساق|فروع|نخله|نخيل)/,/(?:طماطم|خيار|فلفل|باذنجان|بتنجان|كوسه|باميه|ليمون|عنب|زيتون|مانجو)/],
  abnormal_state:[/(?:باهت|بهتان|شاحب|فاتح|مصفر|اصفر|دبل|ذبل|ذاب|ميل|مائل|داكن|جف|نشف|ناشف|غامق|\p{L}*سود|بقع|نقط|مكرمش|ملتوي|متلخبط|تجعد|ملفوف)\p{L}*/u,/(?:ريح|رائح|طبق|غشاوه|مسحوق|بودر|دقيق|طحين|لزج|حشر|يطير|تحرك|يمشي|تقع|تساقط|تعفن|عفن|مش\s+طبيعي)\p{L}*/u],
  hours:[/(?:متي|متى|امتي|إمتى|اي\s+ساعه|وقت|ساعات?).{0,24}(?:فتح|غلق|سكر|قفل|دوام|مفتوح)\p{L}*|(?:فتح|غلق|سكر|قفل|مفتوح)\p{L}*.{0,24}(?:متي|متى|امتي|ساعه|ساعة|وقت)/u,/(?:مواعيد|اوقات|أوقات|ساعات)\s+(?:العمل|الدوام|الفتح)/],
  returns:[/(?:ارجع|أرجع|رد|استرجع|استبدل|استبدال|تبديل|ابدل|أبدل|بدل)\p{L}*.{0,32}(?:منتج|طلب|مشتريات|اشتريت)/u,/(?:منتج|طلب|مشتريات|اشتريت).{0,32}(?:ارجع|أرجع|رد|استرجع|استبدل|استبدال|تبديل|ابدل|أبدل|بدل)\p{L}*/u,/(?:سياسه|سياسة).{0,16}(?:الارجاع|الإرجاع|الاستبدال)|(?:تالف|معيب).{0,20}(?:ارجاع|إرجاع|استبدال)/],
  dosage:[/(?:جرع|معدل|نسبه|نسبة|تركيز|مقدار).{0,22}(?:استخدام|خلط|تخفيف|رش|لتر)|(?:اخلط|أخلط|استخدم).{0,18}(?:قد\s+ايه|كم|كام|مل)|(?:كم|كام|قد\s+ايه).{0,8}مل.{0,12}(?:لتر|اللتر)/],
  suitability:[/(?:ينفع|يناسب|مناسب|يصلح|يمشي).{0,24}(?:المنتج|الصنف|ده|هذا|الصوبه|البيت\s+المحمي|مكشوف)/,/(?:المنتج|الصنف|ده|هذا).{0,24}(?:ينفع|يناسب|مناسب|يصلح)/],
  order_status:[/(?:فين|وين|اين|أين|امتي|متى|تتبع).{0,24}(?:طلبي|طلبنا|شحنتي|شحنتنا|الشحنه\s+بتاعتي|الشحنة\s+بتاعتي|رقم\s+الطلب)|(?:طلبي|طلبنا|شحنتي|شحنتنا|الشحنه\s+بتاعتي|الشحنة\s+بتاعتي|رقم\s+الطلب).{0,24}(?:فين|وين|وصل|حاله|حالة)/u],
  availability:[/(?:منتج|صنف|اختيار|ده|هذا).{0,24}(?:موجود|متوفر|مخزون)|(?:موجود|متوفر|مخزون).{0,24}(?:حاليا|حاليًا|دلوقتي|الان|الآن)/],
  price:[/(?:سعر|ثمن|تكلفه|تكلفة|قيمه|قيمة).{0,24}(?:كام|كم|قد\s+ايه|حالي)|(?:كام|كم|قد\s+ايه).{0,18}(?:سعر|ثمن|تكلفه)/],
  payment:[/(?:دفع|سداد|سدد|تسديد).{0,24}(?:الكتروني|إلكتروني|بطاقه|بطاقة|كاش|نقد|تحويل)|(?:تقبل|متاح).{0,20}(?:الدفع|السداد)/]
};
function conceptCount(text="",patterns=[]){return patterns.reduce((score,pattern)=>score+(pattern.test(text)?1:0),0);}
function localSemanticIntentV31(message="",{state={},crop=null,symptoms=[]}={}){
  const text=normalizeAr(clean(message,2000)).replace(/[؟?!.,،؛;:]+/g," ").replace(/\s+/g," ").trim();
  const counts=Object.fromEntries(Object.entries(LOCAL_SEMANTIC_CONCEPTS).map(([name,patterns])=>[name,conceptCount(text,patterns)]));
  const hasProductContext=Boolean(state?.intelligence_v33?.active_product_id||state?.active_product_context||arr(state?.visible_products).length||arr(state?.intelligence_v33?.visible_products).length);
  const scores={
    correction:counts.correction?counts.correction*2.4+(hasProductContext?0.8:0):0,
    thanks:counts.gratitude*4.3,
    identity:counts.identity*3.5,
    help_request:counts.help*3.4,
    branches:(counts.physical_place&&counts.location_request)||counts.location_request>=2?3.8+Math.max(0,counts.location_request-1):0,
    shipping:counts.shipping_action&&counts.shipment_context?4+Math.max(0,counts.shipment_context-1):0,
    product_search:counts.acquisition*1.5+counts.product_object*2.2,
    diagnosis:counts.plant_context*1.6+counts.abnormal_state*2.2+(symptoms.length?1.2:0)+(crop?0.5:0),
    hours:counts.hours*4,
    returns:counts.returns*4,
    dosage:counts.dosage*4,
    suitability:counts.suitability*4+(hasProductContext&&counts.suitability?0.5:0),
    order_status:counts.order_status*4.8,
    availability:counts.availability*4.2,
    price:counts.price*4.2,
    payment:counts.payment*4.8
  };
  // Requests to buy/find an object outrank ambiguous symptom words such as
  // "شبك". Plant-health meaning requires both a plant anchor and an abnormal
  // state, so a single crop/product noun cannot turn into a diagnosis.
  if(!(counts.plant_context&&counts.abnormal_state))scores.diagnosis=0;
  if(counts.acquisition&&counts.product_object){scores.product_search+=2.2;scores.diagnosis=Math.max(0,scores.diagnosis-2);}
  if(counts.correction>=2)scores.correction+=2;
  else if(counts.correction&&hasProductContext)scores.correction+=1.4;
  if(counts.identity&&/(?:برنامج|بوت|روبوت|ذكاء|موظف|انسان|مساعد)/.test(text))scores.identity+=1.4;
  if(counts.help&&counts.product_object)scores.help_request=Math.max(0,scores.help_request-2.5);
  if(counts.order_status)scores.shipping=Math.max(0,scores.shipping-2.5);
  if(counts.returns)scores.shipping=Math.max(0,scores.shipping-2.5);
  // In a correction/follow-up with an established product, an exact-fact noun
  // ("the price", "the stock", "the dose") is itself a complete current goal.
  // This is bounded emergency semantics; provider-backed whole-utterance meaning
  // remains primary whenever available.
  if(hasProductContext&&counts.correction){
    if(/(?:^|\s)(?:السعر|سعره|سعرها|الثمن|التكلفه|التكلفة)(?:\s|$)/.test(text))scores.price=Math.max(scores.price,4.7);
    if(/(?:^|\s)(?:التوفر|المخزون|متوفر|موجود)(?:\s|$)/.test(text))scores.availability=Math.max(scores.availability,4.7);
    if(/(?:^|\s)(?:الجرعه|الجرعة|جرعته|جرعتها|المعدل|التركيز)(?:\s|$)/.test(text))scores.dosage=Math.max(scores.dosage,4.7);
  }
  // V33.2: when an active product is already established, a suitability verb
  // plus a crop/environment describes a constraint on that product. The crop
  // must not become a new product-search subject merely because it is named.
  const suitabilityVerb=/(?:ينفع|يناسب|مناسب|يصلح|يمشي|استخدمه|استخدمها|use it|suitable)/.test(text);
  if(hasProductContext&&suitabilityVerb&&(crop||counts.plant_context||/(?:بيت محمي|صوبه|صوبة|مكشوف|تربه|تربة|هيدروبونيك|زراعه مائيه|زراعة مائية)/.test(text))){
    scores.suitability=Math.max(scores.suitability,4.6);
    scores.product_search=Math.max(0,scores.product_search-1.4);
  }
  const ranked=Object.entries(scores).sort((a,b)=>b[1]-a[1]);
  const [best,runner]=ranked;
  if(!best||best[1]<3.2||best[1]-(runner?.[1]||0)<0.55)return {intent:"unknown",confidence:.45,scores,counts};
  return {intent:best[0],confidence:clamp(.66+Math.min(.29,(best[1]-3.2)*.045)),scores,counts};
}
export function inspectEmergencySemanticIntentV31(message="",context={}){
  const text=normalizeAr(clean(message,2000)),crop=extractCrop(text),symptoms=extractSymptoms(text);
  const result=localSemanticIntentV31(message,{state:context?.state||{},crop,symptoms});
  return {intent:result.intent,confidence:result.confidence,scores:result.scores,signal_counts:result.counts};
}
function deterministicFallback({message="",legacyAnalysis={},legacySemanticFrame={},state={}}={}){
  const text=normalizeAr(clean(message,2000)),trimmed=text.replace(/[؟?!.,،]/g,"").trim();
  let intentNames=semanticFallbackIntents(message,legacySemanticFrame,legacyAnalysis);
  let intent=intentNames[0]||"unknown",domain="unclear",safe=null,relationship="new_topic",guarded=false;
  const replaceIntent=value=>{
    intent=normalizeIntent(value);intentNames=[intent];
    return intent;
  }
  let crop=null,symptoms=[],ambiguity={required:false,missing_information:null,question:null},responseMode="natural_direct",maxQuestions=0,summary="",speechAct="question";
  const stored=activeDiagnostic(state),attributes=extractProblemAttributes(trimmed),followup=isDiagnosticFollowup(trimmed,state);
  if(followup&&stored){attributes.zone=attributes.zone||clean(stored.zone,40);attributes.spread=attributes.spread||clean(stored.spread,40);attributes.onset=attributes.onset||clean(stored.onset,40);}
  symptoms=extractSymptoms(trimmed);crop=extractCrop(trimmed);
  if(followup){crop=crop||clean(stored?.crop_label,80)||null;symptoms=uniq([...(stored?.symptoms||[]),...symptoms]);}
  const asksDose=/(?:جرع|مل لكل|سم3|معدل استخدام)/.test(trimmed);
  const naturalConversation=classifyNaturalConversationV32(message);
  const localSemantic=localSemanticIntentV31(message,{state,crop,symptoms});
  // V33.2 correction-goal supersession: "correction" describes the speech act.
  // If the same utterance contains a clear substantive goal, that goal becomes
  // the primary intent while the relationship remains correction. This prevents
  // "not X, I mean Y" from losing Y in provider-degraded mode.
  const correctionDetected=Number(localSemantic?.scores?.correction||0)>=3.2;
  const correctedRanked=Object.entries(localSemantic?.scores||{})
    .filter(([name,score])=>name!=="correction"&&Number(score)>=3.2)
    .sort((a,b)=>Number(b[1])-Number(a[1]));
  const correctedFallback=intentNames.find(name=>name!=="correction"&&name!=="unknown")||null;
  const semanticIntentForRouting=localSemantic.intent==="correction"?(correctedRanked[0]?.[0]||correctedFallback||"correction"):localSemantic.intent;
  if(naturalConversation){replaceIntent(naturalConversation.intent);domain="social";safe=composeNaturalConversationReplyV32(naturalConversation,legacyAnalysis?.locale||"ar");guarded=true;summary=naturalConversation.subtype;speechAct=naturalConversation.speech_act;maxQuestions=1;}
  else if(semanticIntentForRouting==="correction"){
    replaceIntent("correction");domain="mixed";guarded=true;relationship="correction";speechAct="correction";summary="تصحيح صريح من المستخدم يجب أن يلغي الافتراض السابق";
  }
  else if(semanticIntentForRouting==="help_request"){
    replaceIntent("help_request");domain="social";safe="أكيد، أنا معاك. قول لي بتحاول تعمل إيه أو إيه اللي واقف معاك، ونمشي فيها خطوة خطوة.";guarded=true;summary="طلب إرشاد أو شرح";speechAct="request";maxQuestions=1;
  }
  else if(semanticIntentForRouting==="identity"){
    replaceIntent("identity");domain="social";safe="أنا MIG FARM AI، مساعد ذكي للمنتجات والزراعة وخدمات MIG FARM، ولست موظفًا بشريًا. اكتب سؤالك بطريقتك وسأساعدك مباشرة.";guarded=true;summary="سؤال عن هوية المساعد أو دوره";
  }
  else if(semanticIntentForRouting==="thanks"){
    replaceIntent("thanks");domain="social";safe="العفو، تحت أمرك 🌱";guarded=true;summary="امتنان أو شكر";speechAct="social";
  }
  else if(semanticIntentForRouting==="branches"){
    replaceIntent("branches");domain="mig_farm_business";guarded=true;summary="طلب موقع أو عنوان نقطة بيع";
  }
  else if(semanticIntentForRouting==="shipping"){
    replaceIntent("shipping");domain="mig_farm_business";guarded=true;summary="استفسار عن الشحن إلى وجهة";
  }
  else if(semanticIntentForRouting==="hours"){
    replaceIntent("hours");domain="mig_farm_business";guarded=true;summary="استفسار عن مواعيد العمل";
  }
  else if(semanticIntentForRouting==="returns"){
    replaceIntent("returns");domain="mig_farm_business";guarded=true;summary="طلب إرجاع أو استبدال مشتريات";
  }
  else if(semanticIntentForRouting==="order_status"){
    replaceIntent("order_status");domain="mig_farm_business";guarded=true;summary="استفسار عن حالة طلب قائم";
  }
  else if(semanticIntentForRouting==="payment"){
    replaceIntent("payment");domain="mig_farm_business";guarded=true;summary="استفسار عن وسيلة دفع";
  }
  else if(semanticIntentForRouting==="dosage"){
    replaceIntent("dosage");domain="products";guarded=true;summary="طلب جرعة أو معدل خلط للمنتج";
  }
  else if(semanticIntentForRouting==="availability"){
    replaceIntent("availability");domain="products";guarded=true;summary="استفسار عن توفر المنتج أو المخزون";relationship=(state?.intelligence_v33?.active_product_id||state?.active_product_context)?"followup":"new_topic";
  }
  else if(semanticIntentForRouting==="price"){
    replaceIntent("price");domain="products";guarded=true;summary="استفسار عن السعر الحالي";relationship=(state?.intelligence_v33?.active_product_id||state?.active_product_context)?"followup":"new_topic";
  }
  else if(semanticIntentForRouting==="suitability"){
    replaceIntent("suitability");domain="products";guarded=true;summary="سؤال عن ملاءمة المنتج لظروف الاستخدام";relationship=(state?.intelligence_v33?.active_product_id||state?.active_product_context)?"followup":"new_topic";
  }
  else if(semanticIntentForRouting==="product_search"){
    replaceIntent("product_search");domain="products";guarded=true;summary="بحث عن منتج أو فئة تحقق احتياجًا";
  }
  else if(semanticIntentForRouting==="diagnosis"&&!asksDose){
    replaceIntent("diagnosis");domain="agriculture";guarded=true;responseMode="advisory";maxQuestions=1;
    ambiguity={required:true,missing_information:attributes.zone?attributes.spread?attributes.onset?"طريقة الزراعة والري":"وقت بداية العَرَض":"مدى انتشار العَرَض":"موضع ظهور العَرَض",question:diagnosticQuestion(symptoms,attributes)};
    summary=`طلب تشخيص زراعي عام${crop?` لمحصول ${crop}`:""}${symptoms.length?`: ${symptoms.join("، ")}`:""}`;
  }
  else if(/^(?:اسمك ايه|اسمك شو|شو اسمك|وش اسمك|ما اسمك|مين انت|مين انتا|من انت|منو انت|انت مين|انتا مين|who are you|what is your name)$/.test(trimmed)){replaceIntent("identity");domain="social";safe="أنا MIG FARM AI، مساعدك للمنتجات والزراعة وخدمات MIG FARM. قول لي محتاج إيه وأنا أساعدك.";guarded=true;}
  else if(/^(?:اهلا|اهلين|مرحبا|هلا|هاي|السلام عليكم|hello|hi)$/.test(trimmed)){replaceIntent("greeting");domain="social";safe="أهلًا وسهلًا 👋 أنا معاك. محتاج مساعدة في منتج، زراعة، ولا خدمة من MIG FARM؟";guarded=true;}
  else if(/^(?:شكرا|شكراً|مشكور|تسلم|thanks|thank you)$/.test(trimmed)){replaceIntent("thanks");domain="social";safe="العفو، تحت أمرك 🌱";guarded=true;}
  else if(/(?:فين مكانكم|وين مكانكم|اين فروعكم|وين فروعكم|مكان الفرع|فرع العين|فرع الشارقه|فرع الشارقة)/.test(trimmed)){replaceIntent("branches");domain="mig_farm_business";guarded=true;}
  else if(/(?:اسمك|مين انت|مين انتا|من انت|منو انت|انت مين|انتا مين)/.test(trimmed)){replaceIntent("identity");domain="social";safe="أنا MIG FARM AI، مساعدك للمنتجات والزراعة وخدمات MIG FARM.";guarded=true;}
  else if((symptoms.length||isAgriculturalProblemCue(trimmed)||followup)&&!asksDose){
    replaceIntent("diagnosis");domain="agriculture";guarded=true;responseMode="advisory";maxQuestions=1;
    ambiguity={required:true,missing_information:attributes.zone?attributes.spread?attributes.onset?"طريقة الزراعة والري":"وقت بداية العَرَض":"مدى انتشار العَرَض":"موضع ظهور العَرَض",question:diagnosticQuestion(symptoms,attributes)};
    summary=`طلب تشخيص زراعي عام${crop?` لمحصول ${crop}`:""}${symptoms.length?`: ${symptoms.join("، ")}`:""}`;
    relationship=followup?"answer_to_assistant":"new_topic";
  }
  else if(asksDose){replaceIntent("dosage");domain="products";}
  else if(/(?:سعر|بكام|بكم)/.test(trimmed)&&!/(?:الشحن|التوصيل).{0,16}(?:بكام|بكم|كام|كم|سعر)|(?:بكام|بكم|كام|كم).{0,16}(?:الشحن|التوصيل)/.test(trimmed)){replaceIntent("price");domain="products";}
  else if(/(?:متوفر|موجود عندكم|في المخزون)/.test(trimmed)){replaceIntent("availability");domain="products";}
  else if(["branches","shipping","delivery_time","contact","hours","payment","returns","pickup","services","company","order_status"].includes(intent))domain="mig_farm_business";
  else if(SOCIAL.has(intent))domain="social";
  else if(["agriculture_general","diagnosis","calculation","greenhouse_project"].includes(intent))domain="agriculture";
  else if(intentNames.length&&intentNames.every(name=>BUSINESS.has(name)))domain="mig_farm_business";
  else if(intentNames.some(name=>BUSINESS.has(name))&&intentNames.some(name=>!BUSINESS.has(name)))domain="mixed";
  else if(intent!=="unknown")domain="products";
  let correctedGoalIntent=null;
  if(correctionDetected){
    const target=normalizeIntent(intent!=="correction"&&intent!=="unknown"?intent:(semanticIntentForRouting!=="correction"?semanticIntentForRouting:(correctedRanked[0]?.[0]||correctedFallback||"unknown")));
    correctedGoalIntent=target!=="unknown"&&target!=="correction"?target:null;
    relationship="correction";
    speechAct="correction";
    summary=summary?`تصحيح المستخدم: ${summary}`:"تصحيح صريح يلغي الافتراض السابق";
    intent="correction";
    intentNames=uniq(["correction",...(correctedGoalIntent?[correctedGoalIntent]:[]),...intentNames.filter(name=>name!=="correction"&&name!==correctedGoalIntent)]);
  }
  const expected=Boolean(state?.dialogue_v29?.expected?.active),short=trimmed.split(/\s+/).length<=4;
  if(!correctionDetected&&!followup&&expected&&short&&!SOCIAL.has(intent)&&!BUSINESS.has(intent))relationship="answer_to_assistant";
  const confidence=guarded ? Math.max(correctedGoalIntent==="diagnosis"?.90:.88,localSemantic.confidence||0) : .55;
  if(!intentNames.includes(intent))intentNames.unshift(intent);
  const answerOrder=intentNames.filter(name=>name!=="unknown"&&name!=="correction");
  const correctionReference=relationship==="correction"&&Boolean(state?.intelligence_v33?.active_product_id||state?.active_product_context);
  return sanitizeFrame({language:"ar",dialect:"unknown",domain,primary_intent:intent,corrected_goal_intent:correctedGoalIntent,intents:intentNames.map(name=>({name,confidence})),speech_act:symptoms.length&&correctedGoalIntent==="diagnosis"?"correction":speechAct,topic_relationship:relationship,context_policy:{use_recent_context:relationship!=="new_topic",ignore_old_product:relationship==="new_topic"&&!/سعر|متوفر|منتج|استخدام|جرع/.test(trimmed),ignore_old_agriculture:relationship==="new_topic"&&(domain==="social"||domain==="mig_farm_business"),requires_visible_choice:false},entities:{emirate:null,crop,cultivation:null,category:null,product_name:null,product_reference:null,quantity:null,budget_aed:null,symptoms,decision_criteria:attributes.criteria},reference:{requires_context:followup||correctionReference,target:correctionReference?"active_product":followup?"previous_question":"none",resolved_text:followup?clean(stored?.last_question,300)||null:null,confidence:followup||correctionReference?0.96:0},ambiguity,response_plan:{mode:safe?"social":answerOrder.some(name=>BUSINESS.has(name))?"tool_grounded":responseMode,external_facts_required:answerOrder.some(name=>BUSINESS.has(name))||Boolean(answerOrder.length&&!answerOrder.every(name=>SOCIAL.has(name))),answer_order:answerOrder,max_questions:maxQuestions,tone:"natural"},compound:answerOrder.length>1,safe_direct_reply:safe,meaning_summary:summary||answerOrder.join(" + ")||intent,confidence},guarded?"deterministic_guard":"deterministic_fallback");
}

export async function understandTurnV31({message="",history=[],state={},legacyAnalysis={},legacySemanticFrame={},selectedProduct=null,selectedProducts=[],hasImages=false,locale="ar"}={}){
  stats.turns+=1;
  const snapshot=contextSnapshot({state,history,selectedProduct,selectedProducts});
  const key=hash(JSON.stringify({message:clean(message,2500),snapshot,hasImages,locale})),cached=cache.get(key);
  if(cached&&Date.now()-cached.at<120000){stats.cache_hits+=1;return cached.frame;}
  if(!enabled()||!configured()){
    stats.fallbacks+=1;return deterministicFallback({message,legacyAnalysis,legacySemanticFrame,state});
  }
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs());
  const instructions=`You are the first and authoritative meaning interpreter for MIG FARM AI. Understand the customer's COMPLETE latest utterance before any keyword router runs.

Rules:
- The latest customer sentence has priority over old product/agriculture context.
- A word match is never enough. Determine the meaning, speech act, topic relationship and all requested intents from the whole sentence.
- Use recent context only for a genuine short answer, pronoun, ordinal, correction or explicit continuation.
- If the customer starts a new social or business topic, set ignore_old_product and ignore_old_agriculture true.
- Do not answer product, price, stock, dosage, branch, shipping or policy facts here. Mark external_facts_required instead.
- A request such as "محتاجة مساعدة", "ممكن تساعدني", "عندي سؤال" or its dialect/typo variant is a help_request, not an unknown factual query. Acknowledge it naturally and ask what help is needed.
- Expressions of confusion or fatigue without a factual claim are frustration or help_request social turns, never product names and never missing-knowledge failures.
- safe_direct_reply is allowed only for greetings, thanks, identity, help_request, frustration and simple social turns; otherwise null.
- Never infer a product, dosage, disease or personal detail that was not stated or resolved by clear context.
- Treat any crop, tree, seedling or plant health description as a diagnosis turn regardless of whether the crop is in a fixed list. Extract the crop wording exactly, every stated symptom, affected plant part, spread and onset.
- When trusted_recent_context.active_diagnostic_context exists, resolve a genuine short answer such as old leaves, roots, spreading, sudden, greenhouse or irrigation details against that diagnostic thread; do not ask again for facts already supplied.
- Do not confuse an order, shipping, packaging or payment complaint with a plant-health problem.
- Ask at most one precise clarification only when the missing fact materially changes the answer.
- For a correction turn, keep primary_intent="correction" and speech_act/topic_relationship="correction". Put the user's NEW substantive goal (for example price, availability, identity, dosage, shipping, diagnosis) in corrected_goal_intent and also in intents. response_plan.answer_order must contain the corrected substantive goal, not the generic correction label. Preserve the target domain and safe_direct_reply/tool requirements for that corrected goal.
- If the turn is not a correction, corrected_goal_intent must be null.
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
    return {...deterministicFallback({message,legacyAnalysis,legacySemanticFrame,state}),provider_error:stats.last_error};
  }
  finally{clearTimeout(timer);}
}

function cropKey(value=""){const n=normalizeAr(clean(value,100));for(const [key,item] of Object.entries(CROPS))if(key===value||normalizeAr(item?.labelAr||"")===n||arr(item?.aliases).some(x=>normalizeAr(x)===n))return key;return "";}
function categoryKey(value=""){const n=normalizeAr(clean(value,100));for(const [key,item] of Object.entries(CATEGORIES))if(key===value||normalizeAr(item?.labelAr||"")===n||arr(item?.aliases).some(x=>normalizeAr(x)===n))return key;return "";}
function legacyIntent(intent){if(["product_details","price","availability","dosage"].includes(intent))return "known_product_info";if(intent==="compare")return "product_memory";if(intent==="bundle")return "recommendation";if(intent==="calculation")return "agriculture_general";return intent;}
export function applyMeaningFrameV31(analysis={},semanticFrame={},frame={}){
  if(!frame||frame.version!==VERSION)return {analysis,semanticFrame};
  const intent=frame.authoritative?frame.primary_intent:normalizeIntent(analysis.intent||frame.primary_intent);
  const effectiveIntent=frame.corrected_goal_intent&&frame.corrected_goal_intent!=="unknown"?frame.corrected_goal_intent:intent;
  if(frame.authoritative||analysis.intent==="unknown")analysis.intent=legacyIntent(effectiveIntent);
  analysis.v31_primary_intent=intent;analysis.v31_corrected_goal_intent=frame.corrected_goal_intent||null;analysis.v31_authoritative=Boolean(frame.authoritative);analysis.v31_topic_relationship=frame.topic_relationship;analysis.v31_confidence=frame.confidence;
  analysis.semantic_intent=effectiveIntent;analysis.semantic_intents=frame.intents.length?frame.intents.map(x=>x.name):[intent];
  const rawCrop=clean(frame.entities?.crop,80),crop=cropKey(rawCrop);
  if(crop&&CROPS[crop])analysis.crop={key:crop,labelAr:CROPS[crop].labelAr,aliases:CROPS[crop].aliases||[]};
  else if(rawCrop){
    const safeKey=normalizeAr(rawCrop).replace(/[^\p{L}\p{N}]+/gu,"_").replace(/^_+|_+$/g,"").slice(0,60)||"crop";
    analysis.crop={key:`custom_${safeKey}`,labelAr:rawCrop,aliases:[rawCrop],custom:true};
  }
  if(frame.entities?.symptoms?.length)analysis.symptoms=uniq(frame.entities.symptoms);
  if(frame.entities?.decision_criteria?.length)analysis.diagnosticCriteria=uniq(frame.entities.decision_criteria);
  if(frame.primary_intent==="diagnosis"){
    analysis.diagnosticQuestion=clean(frame.ambiguity?.question,240);
    analysis.diagnosticExpectedField=clean(frame.ambiguity?.missing_information,60);
  }
  const category=categoryKey(frame.entities?.category);if(category&&CATEGORIES[category])analysis.category=CATEGORIES[category];
  if(frame.entities?.emirate)analysis.emirate=frame.entities.emirate;
  if(frame.entities?.cultivation)analysis.cultivation=frame.entities.cultivation;
  if(frame.entities?.quantity!==null)analysis.quantity=frame.entities.quantity;
  if(frame.topic_relationship==="new_topic"&&frame.context_policy?.ignore_old_product){delete analysis.memoryAction;delete analysis.v29_reference_product;delete analysis.v29_reference_products;}
  semanticFrame.primary_intent=intent;semanticFrame.corrected_goal_intent=frame.corrected_goal_intent||null;semanticFrame.intents=(frame.intents.length?frame.intents:[{name:intent,confidence:frame.confidence}]).map(x=>({name:x.name,confidence:x.confidence,evidence:"v31_full_utterance"}));
  semanticFrame.compound={...(semanticFrame.compound||{}),is_multi_intent:Boolean(frame.compound),ordered_intents:semanticFrame.intents.map(x=>x.name)};
  semanticFrame.v31_meaning={version:VERSION,provider:frame.provider,authoritative:frame.authoritative,domain:frame.domain,corrected_goal_intent:frame.corrected_goal_intent||null,speech_act:frame.speech_act,topic_relationship:frame.topic_relationship,context_policy:frame.context_policy,response_plan:frame.response_plan,confidence:frame.confidence};
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
  const intent=frame.corrected_goal_intent||frame.primary_intent;
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
  const effectiveIntent=frame.corrected_goal_intent||frame.primary_intent;
  if(SOCIAL.has(effectiveIntent)&&/(?:السعر|متوفر|المنتج|الجرع|المحصول|الطلب)/.test(text)&&!/(?:mig farm ai|مساعد)/i.test(reply))flags.push("social_intent_hijacked");
  if(effectiveIntent==="identity"&&!/(?:mig farm|مساعد|assistant|اسمي|أنا)/i.test(reply))flags.push("identity_not_answered");
  if(BUSINESS.has(effectiveIntent)&&staleAgronomy&&!requestAgronomy)flags.push("business_intent_hijacked");
  const passed=flags.length===0;if(!passed)stats.alignment_blocks+=1;
  return {version:VERSION,passed,score:passed?96:18,flags,source:clean(source,100),enforced:!passed};
}
export function enforceMeaningAlignmentV31({payload={},frame={},audit={}}={}){
  if(audit?.passed!==false)return {...payload,meaning_alignment_v31:audit};
  const reply=safeReplacement(frame);return {...payload,reply,display_reply:reply,quick_replies:[],meaning_alignment_v31:audit};
}

export function meaningFrameClientV31(frame={}){return {version:VERSION,provider:frame.provider,fallback_reason:frame.provider_error||null,authoritative:Boolean(frame.authoritative),domain:frame.domain,primary_intent:frame.primary_intent,corrected_goal_intent:frame.corrected_goal_intent||null,intents:frame.intents,speech_act:frame.speech_act,topic_relationship:frame.topic_relationship,context_policy:frame.context_policy,entities:frame.entities,reference:frame.reference,ambiguity:frame.ambiguity,response_plan:frame.response_plan,meaning_summary:frame.meaning_summary,confidence:frame.confidence};}
export function llmFirstHealthV31(){return {version:VERSION,ready:true,enabled:enabled(),configured:configured(),provider:configured()?"openai_responses_api":"deterministic_emergency_fallback",model:model(),priority:"full_utterance_before_legacy_routes",structured_output:true,legacy_keyword_router:"fallback_only",cache:{max_entries:200,ttl_seconds:120},alignment_guard:true,stats:{...stats},privacy:{store:false,raw_messages_in_metrics:false,raw_history_in_metrics:false}};}
