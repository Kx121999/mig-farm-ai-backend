import { normalizeAr } from "./utils.js";
import { isCredibleProductReferenceV32 } from "./natural_conversation_v32.js";

const VERSION="27.0";
const INTENTS=[
  ["branches",/(?:مكانكم|موقعكم|عنوانكم|فين الفرع|وين الفرع|اقرب فرع|أقرب فرع|فروعكم|mkan(?:okom|kom|kum|km)?\s+(?:feen|fen|ween|wen)|(?:feen|fen|ween|wen)\s+mkan(?:okom|kom|kum|km)?|where (?:are you|is your (?:store|shop))|location|branch)/i],
  ["contact",/(?:رقمكم|واتسابكم|واتس|تواصل معكم|ايميلكم|إيميلكم|contact|phone|whatsapp)/i],
  ["hours",/(?:بتفتحوا|تفتحون|الدوام|ساعات العمل|فاتحين|open now|working hours)/i],
  ["shipping",/(?:توصيل|شحن|دليفري|توصلون|بتوصلوا|tawsil|sh7n|delivery|shipping)/i],
  ["payment",/(?:الدفع|كاش|فيزا|ماستر|بطاقه|بطاقة|payment|cash|visa|mastercard|cod)/i],
  ["returns",/(?:استرجاع|استبدال|ارجع المنتج|أرجع المنتج|refund|return|exchange)/i],
  ["order_status",/(?:طلبي فين|وين طلبي|تتبع الطلب|حاله الطلب|حالة الطلب|track (?:my )?order|order status)/i],
  ["identity",/(?:مين انت|مين إنت|انت مين|إنت مين|اسمك ايه|اسمك إيه|who are you|your name)/i],
  ["social",/(?:ازيك|إزيك|عامل ايه|عامل إيه|كيفك|شلونك|اخبارك|أخبارك|how are you)/i],
  ["thanks",/(?:شكرا|شكرًا|تسلم|مشكور|thank)/i],
  ["comparison",/(?:قارن|مقارنه|مقارنة|الفرق بين|compare|difference)/i],
  ["price",/(?:بكام|بكم|السعر|سعره|سعرها|كام سعر|كم سعر|bkam|bkam|price|how much|cost)/i],
  ["availability",/(?:متوفر|متاح|موجود|المخزون|mwgod|mwgood|stock|available|availability)/i],
  ["dosage",/(?:جرعه|جرعة|كم مل|كام مل|معدل الاستخدام|dose|dosage|mix rate)/i],
  ["purchase",/(?:عايز اطلب|عايز أطلب|ابغي اطلب|أبغي أطلب|ابي اطلب|أبي أطلب|اشتري|أشتري|buy|order this)/i],
  ["product_details",/(?:تفاصيل|مواصفات|استخدامه|استخدامها|فايدته|فائدته|details|specifications|used for)/i],
  ["product_search",/(?:عايز|أبغي|ابي|محتاج|أحتاج|دورلي|رشح|اقترح|recommend|looking for|need).{0,45}(?:بذور|سماد|مبيد|منتج|ري|صوبه|صوبة|بيت محمي|seed|fertili[sz]er|pesticide|irrigation|greenhouse)/i],
  ["agriculture_diagnosis",/(?:اصفرار|اصفر|ذبول|بقع|عفن|حشره|حشرة|اصابه|إصابة|جذور|ملوحه|ملوحة|مشكل[هة].{0,25}(?:زرع|نبات|محصول)|yellow|wilt|spots|root rot|diagnos)/i]
];
const PRODUCT_RX=/(?:بذور|سماد|مبيد|منتج|خيار|طماطم|فلفل|باذنجان|كوسه|كوسة|بطيخ|شمام|باميه|بامية|ذره|ذرة|بصل|ري|بيت محمي|greenhouse|seed|fertili[sz]er|pesticide|product)/i;
const EMIRATES=[
  ["dubai",/(?:دبي|dubai)/i],["sharjah",/(?:الشارقه|الشارقة|sharjah)/i],["ajman",/(?:عجمان|ajman)/i],
  ["abu_dhabi",/(?:ابوظبي|أبوظبي|abu dhabi)/i],["al_ain",/(?:العين|al ain)/i],["rak",/(?:راس الخيمه|رأس الخيمة|rak|ras al khaimah)/i],
  ["fujairah",/(?:الفجيره|الفجيرة|fujairah)/i],["uaq",/(?:ام القيوين|أم القيوين|umm al quwain|uaq)/i]
];
const CROPS=["طماطم","خيار","فلفل","باذنجان","كوسة","كوسه","بطيخ","شمام","بامية","باميه","ذرة","ذره","بصل","ملفوف","فجل","سبانخ","ملوخية","شومر"];
const CATEGORIES=[
  ["seeds",/(?:بذور|بذره|بذرة|seed)/i],["fertilizer",/(?:سماد|اسمده|أسمدة|مغذي|fertili[sz]er|nutrient)/i],
  ["pesticide",/(?:مبيد|حشري|فطري|pesticide|insecticide|fungicide)/i],["irrigation",/(?:ري|تنقيط|خرطوم|irrigation|drip)/i],
  ["greenhouse",/(?:بيت محمي|بيوت محميه|بيوت محمية|صوبه|صوبة|greenhouse)/i]
];

function clean(value="",max=3000){return String(value??"").replace(/[\u0000-\u001f]/g," ").replace(/\s+/g," ").trim().slice(0,max);}
function norm(value=""){return normalizeAr(clean(value,3500)).toLowerCase();}
function uniq(items=[]){return [...new Set(items.filter(Boolean))];}
function dialect(text){
  if(/[a-z]/i.test(text)&&/[\u0600-\u06ff]/.test(text))return "code_switch";
  if(/(?:3ayz|feen|ween|bkam|mwgod|mkan)/i.test(text))return "arabizi";
  if(/(?:أبغي|شو|مب |الحين|وين)/.test(text))return "emirati";
  if(/(?:أبي|وش|شلون)/.test(text))return "gulf";
  if(/(?:بدي|هلأ|شو)/.test(text))return "levantine";
  if(/(?:عايز|إيه|ازاي|إزاي|بكام)/.test(text))return "egyptian";
  if(/^[\x00-\x7f\s\p{P}\p{N}]+$/u.test(text))return "english";
  return "arabic";
}
function extractNumber(text,rx){const m=text.match(rx);return m?Number(String(m[1]).replace(/,/g,"")):null;}
function extractEntities(text,tasks=[]){
  const emirate=EMIRATES.find(([,rx])=>rx.test(text))?.[0]||"";
  const crop=CROPS.find(x=>norm(text).includes(norm(x)))||"";
  const category=CATEGORIES.find(([,rx])=>rx.test(text))?.[0]||"";
  const quantity=extractNumber(text,/(\d[\d,]*)\s*(?:عبوه|عبوة|كيس|باكت|packet|pack|قطعه|قطعة|حبه|حبة)/i);
  const budget=extractNumber(text,/(?:ميزانيتي|حدود|budget|معايا|معي)\s*(\d[\d,]*)/i);
  const sku=clean(text.match(/\b[A-Z]{1,5}[A-Z0-9_-]{3,20}\b/i)?.[0]||"",80);
  const candidate=clean(text.replace(/[؟?!.،]/g," ").replace(/(?:مكانكم|موقعكم|فين|وين|هل|هو|السعر|بكام|بكم|متوفر|موجود|عايز|عايزة|عايزه|أبغي|ابي|أبي|محتاج|محتاجة|محتاجه|تفاصيل|توصيل|شحن|وال)/gi," "),260);
  const productTask=tasks.some(x=>["price","availability","comparison","dosage","purchase","product_details","product_search"].includes(x.intent));
  const productReference=isCredibleProductReferenceV32(candidate,{message:text,productTask})?candidate:"";
  return {emirate,crop,category,quantity,budget,sku,product_reference:productReference,product_reference_verified:Boolean(productReference)};
}
function clauses(message){
  return clean(message,3000).split(/(?:[؟?!؛;\n]+|\s+(?:وكمان|وبرضه|وبرضو|وبعدها|بالإضافة|كمان|also|and also)\s+|\s+و(?=(?:هل|عايز|أبغي|ابي|أبي|محتاج|السعر|متوفر|بكام|بكم|فين|وين|كيف|متى|الدفع|التوصيل)))/i).map(x=>clean(x,700)).filter(Boolean).slice(0,8);
}
function taskList(message){
  const text=norm(message),found=[];
  for(const [intent,rx] of INTENTS){const m=rx.exec(text);if(m)found.push({intent,index:m.index,confidence:"high",evidence:clean(m[0],120)});}
  const shippingPrice=/(?:الشحن|التوصيل|توصيل|shipping|delivery).{0,18}(?:بكام|بكم|كم|كام|cost|price)|(?:بكام|بكم|كم|كام).{0,18}(?:الشحن|التوصيل|shipping|delivery)/i.test(text);
  if(shippingPrice&&!PRODUCT_RX.test(text)){const i=found.findIndex(x=>x.intent==="price");if(i>=0)found.splice(i,1);}
  found.sort((a,b)=>a.index-b.index);
  return uniq(found.map(x=>x.intent)).map(intent=>found.find(x=>x.intent===intent)).slice(0,6);
}

export function buildCustomerBrainFrameV27({message="",analysis={},semanticFrame=null,state={}}={}){
  const text=norm(message),tasks=taskList(text);const semanticIntents=(semanticFrame?.intents||[]).map(x=>clean(x?.name,80)).filter(Boolean);
  for(const intent of semanticIntents){
    if(intent==="product_search"&&tasks.some(x=>["price","availability","product_details","dosage","comparison","purchase"].includes(x.intent)))continue;
    if(!tasks.some(x=>x.intent===intent)&&INTENTS.some(x=>x[0]===intent))tasks.push({intent,index:999,confidence:"medium",evidence:"semantic_frame"});
  }
  const shippingPrice=/(?:الشحن|التوصيل|توصيل|shipping|delivery).{0,18}(?:بكام|بكم|كم|كام|cost|price)|(?:بكام|بكم|كم|كام).{0,18}(?:الشحن|التوصيل|shipping|delivery)/i.test(text);
  if(shippingPrice&&!PRODUCT_RX.test(text)){const i=tasks.findIndex(x=>x.intent==="price");if(i>=0)tasks.splice(i,1);}
  const entities=extractEntities(text,tasks);const multi=tasks.length>1||Boolean(semanticFrame?.compound?.is_multi_intent);
  const productTask=tasks.some(x=>["price","availability","comparison","dosage","purchase","product_details","product_search"].includes(x.intent));
  const businessTask=tasks.some(x=>["branches","contact","hours","shipping","payment","returns","order_status"].includes(x.intent));
  const supported=new Set(["branches","contact","hours","shipping","payment","returns","identity","social","thanks","price","availability","product_details","product_search","purchase"]);
  const deterministic=multi&&tasks.every(x=>supported.has(x.intent))&&tasks.length<=4;
  const previousGoal=clean(state?.customer_brain_memory?.last_goal||state?.intent||"",80);
  return {
    version:VERSION,mode:"customer_message_decomposition",message:clean(message,2500),dialect:dialect(text),clauses:clauses(message),tasks,
    task_count:tasks.length,is_multi_intent:multi,entities,product_task:productTask,business_task:businessTask,
    can_execute_deterministically:deterministic,topic_switch:Boolean(previousGoal&&tasks.length&& !tasks.some(x=>x.intent===previousGoal)),
    answer_contract:{answer_in_message_order:true,answer_every_task:true,one_question_max:true,mirror_dialect:true,live_price_stock_only:true,no_stale_context_leak:true}
  };
}

export function customerBrainHealthV27(){
  return {version:VERSION,mode:"customer_brain_and_decision_os",features:["ordered_multi_intent_decomposition","egyptian_emirati_gulf_levantine_english_arabizi","business_product_agriculture_task_map","entity_and_constraint_extraction","topic_switch_detection","deterministic_compound_gate","one_question_answer_contract"]};
}
