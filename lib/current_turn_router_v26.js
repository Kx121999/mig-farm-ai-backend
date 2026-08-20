import { normalizeAr } from "./utils.js";

const VERSION="26.0";
const BUSINESS_INTENTS=new Set([
  "branches","contact","hours","shipping","shipping_outside_uae","delivery_time","pickup",
  "payment","tax","returns","privacy","terms","cookies","company","categories",
  "categories_without_seeds","services","order_status"
]);
const SOCIAL_INTENTS=new Set([
  "greeting","wellbeing","thanks","goodbye","acknowledgment","negative_ack","identity","human","help_request","frustration","general_conversation"
]);

function clean(value="",max=2500){return String(value??"").replace(/[\u0000-\u001f]/g," ").replace(/\s+/g," ").trim().slice(0,max);}
function n(value=""){return normalizeAr(clean(value,2500)).toLowerCase();}

const PRODUCT_OR_TECHNICAL=/(?:بذور|بذره|سماد|اسمده|مبيد|جرعه|جرعة|رش|خلط|محصول|نبات|زراعه|زراعة|طماطم|خيار|فلفل|باذنجان|كوسه|كوسة|بطيخ|شمام|باميه|بامية|تربه|تربة|ري|مرض|اصابه|إصابة|سعره|سعرها|متوفر|منتج|sku|seed|fertili[sz]er|pesticide|dose|crop|plant|product|price|available)/i;
const CURRENT_REFERENCE=/(?:ده|دا|دي|دول|هذا|هذه|هذي|هالمنتج|المنتج ده|المنتج دا|سعره|سعرها|تفاصيله|استخدامه|الأول|الاول|الثاني|التاني|this one|that one|both|these)/i;

const EXPLICIT=[
  ["branches",/^(?:هو |هي |طب |طيب )?(?:مكانكم فين|فين مكانكم|مكانكم وين|وين مكانكم|وين موقعكم|فين موقعكم|موقعكم فين|موقعكم وين|عنوانكم ايه|عنوانكم إيه|ايه عنوانكم|إيه عنوانكم|وين عنوانكم|فين عنوانكم|عندكم فرع فين|اقرب فرع فين|أقرب فرع فين|اقرب فرع وين|أقرب فرع وين|وين فروعكم|فين فروعكم|mkan(?:kom|kum|km)?\s+(?:feen|fen|ween|wen)|(?:feen|fen|ween|wen)\s+mkan(?:kom|kum|km)?|where are you|where is your (?:shop|store)|your location|location|branches?)[\s.!؟?]*$/i],
  ["branches",/(?:هل |هو |انتو |انتم |إنتوا )?(?:عندكم|فيه|في)\s+(?:فرع|فروع)\s+(?:في|بـ)?\s*(?:العين|الشارقه|الشارقة|دبي|عجمان|ابوظبي|أبوظبي)/i],
  ["contact",/^(?:رقمكم ايه|رقمكم إيه|ايه رقمكم|إيه رقمكم|رقم التواصل|عايز رقمكم|ابغي رقمكم|ابي رقمكم|واتسابكم|ايميلكم|إيميلكم|كيف اتواصل|كيف أتواصل|ازاي اتواصل|إزاي أتواصل|contact|phone|whatsapp)[\s.!؟?]*$/i],
  ["hours",/^(?:بتفتحوا امتى|بتفتحوا إمتى|تفتحون متى|متى تفتحون|متي تفتحون|بتقفلوا امتى|الدوام امتى|الدوام متى|اوقات الدوام|أوقات الدوام|ساعات العمل|working hours|are you open|open now)[\s.!؟?]*$/i],
  ["pickup",/^(?:ينفع استلم من الفرع|اقدر استلم من الفرع|أقدر أستلم من الفرع|استلام من الفرع|استلام شخصي|pickup|click and collect)[\s.!؟?]*$/i],
  ["delivery_time",/^(?:التوصيل بياخد كام يوم|التوصيل ياخذ كم يوم|كم يوم التوصيل|كام يوم التوصيل|متى يوصل|متي يوصل|مدة التوصيل|وقت التوصيل|delivery time|how long does delivery take)[\s.!؟?]*$/i],
  ["shipping_outside_uae",/(?:تشحنون|شحن|توصيل).{0,30}(?:السعوديه|السعودية|عمان|قطر|الكويت|البحرين|مصر|خارج الامارات|خارج الإمارات|international|saudi|ksa|oman|qatar|kuwait|bahrain|egypt)/i],
  ["shipping",/^(?:فيه توصيل|عندكم توصيل|توصلون|بتوصلوا|الشحن بكام|التوصيل بكام|كام الشحن|كم الشحن|بتوصلوا فين|وين توصلون|shipping|delivery)[\s.!؟?]*$/i],
  ["payment",/^(?:الدفع ازاي|الدفع إزاي|كيف الدفع|طرق الدفع|ينفع كاش|دفع عند الاستلام|كاش عند الاستلام|فيزا|ماستر كارد|payment|cash on delivery|cod)[\s.!؟?]*$/i],
  ["tax",/^(?:السعر شامل الضريبه|السعر شامل الضريبة|في ضريبه|في ضريبة|فاتوره ضريبيه|فاتورة ضريبية|vat|tax)[\s.!؟?]*$/i],
  ["returns",/^(?:ينفع ارجع|ينفع أرجع|في استرجاع|في استبدال|سياسه الاسترجاع|سياسة الاسترجاع|refund|return|exchange)[\s.!؟?]*$/i],
  ["order_status",/^(?:طلبي فين|وين طلبي|الطلب فين|حاله طلبي|حالة طلبي|عايز اتتبع الطلب|أبغي أتتبع الطلب|تتبع الطلب|order status|track (?:my )?order)[\s.!؟?]*$/i],
  ["company",/^(?:مين ميج فارم|مين mig farm|عرفني عنكم|عن الشركه|عن الشركة|من نحن|who is mig farm|about (?:you|mig farm))[\s.!؟?]*$/i],
  ["categories",/^(?:بتبيعوا ايه|بتبيعوا إيه|شو تبيعون|وش تبيعون|عندكم ايه|عندكم إيه|شو عندكم|وش عندكم|اقسامكم|أقسامكم|what do you sell)[\s.!؟?]*$/i],
  ["services",/^(?:خدماتكم ايه|خدماتكم إيه|شو خدماتكم|وش خدماتكم|ايه الخدمات|إيه الخدمات|what services|your services)[\s.!؟?]*$/i],
  ["privacy",/^(?:سياسه الخصوصيه|سياسة الخصوصية|privacy policy|بياناتي)[\s.!؟?]*$/i],
  ["terms",/^(?:الشروط والاحكام|الشروط والأحكام|شروطكم|terms and conditions|terms)[\s.!؟?]*$/i],
  ["cookies",/^(?:سياسه الكوكيز|سياسة الكوكيز|كوكيز|ملفات الارتباط|cookies?)[\s.!؟?]*$/i]
];

function explicitIntent(text){for(const [intent,rx] of EXPLICIT)if(rx.test(text))return intent;return "";}

export function detectCurrentTurnPriorityV26({message="",analysis={},semanticFrame=null,hasImages=false}={}){
  if(hasImages)return null;
  const text=n(message);if(!text)return null;
  const explicit=explicitIntent(text);
  const semanticIntent=clean(semanticFrame?.primary_intent||"",80);
  const legacyIntent=clean(analysis?.intent||"",80);
  const compound=Boolean(semanticFrame?.compound?.is_multi_intent)||Number(semanticFrame?.compound?.intent_count||0)>1;
  const mentionsProduct=PRODUCT_OR_TECHNICAL.test(text)||CURRENT_REFERENCE.test(text);

  if(explicit&&!compound){
    return {version:VERSION,intent:explicit,kind:"business_fact",confidence:"high",isolate:true,reason:"explicit_current_turn_business_question"};
  }
  if(!compound&&!mentionsProduct&&BUSINESS_INTENTS.has(semanticIntent)){
    return {version:VERSION,intent:semanticIntent,kind:"business_fact",confidence:"high",isolate:true,reason:"semantic_business_fact"};
  }
  if(!compound&&!mentionsProduct&&BUSINESS_INTENTS.has(legacyIntent)){
    return {version:VERSION,intent:legacyIntent,kind:"business_fact",confidence:"high",isolate:true,reason:"legacy_business_fact"};
  }
  if(!compound&&SOCIAL_INTENTS.has(legacyIntent)){
    return {version:VERSION,intent:legacyIntent,kind:"social",confidence:"high",isolate:true,reason:"protected_social_turn"};
  }
  if(!compound&&["identity","social","greeting","help_request","frustration","general_conversation"].includes(semanticIntent)){
    const intent=semanticIntent==="social"?(SOCIAL_INTENTS.has(legacyIntent)?legacyIntent:"wellbeing"):semanticIntent;
    return {version:VERSION,intent,kind:"social",confidence:"high",isolate:true,reason:"semantic_social_turn"};
  }
  return null;
}

export function quarantineCurrentTurnStateV26(state={}){
  const next={...state};
  next.last_products=[];next.visible_products=[];next.selected_product="";next.product_query="";next.pending="";
  next.category="";next.crop="";next.pepper_type="";
  delete next.active_product_context;delete next.comparison_context;
  return next;
}

export function currentTurnRouterHealth(){
  return {version:VERSION,mode:"current_turn_sovereignty_router",features:["business_fact_before_product_context","explicit_location_language","stale_product_quarantine","no_image_override","single_intent_guard","dialect_business_phrases"]};
}
