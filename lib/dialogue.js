import { normalizeAr, tokenize } from "./utils.js";
import {
  BUSINESS, UAE_EMIRATES, CATEGORIES, CROPS, MIG_SEED_CATALOG,
  KNOWN_PRODUCT_KNOWLEDGE, GREENHOUSE_KNOWLEDGE, SERVICES, SAFETY,
  TONE, HUMAN_FAQ
} from "./brain.js";

function n(value=""){ return normalizeAr(String(value||"")); }
function words(value=""){ return tokenize(n(value)); }
function hasAny(text,terms=[]){
  const t=n(text);
  return terms.some(term=>{
    const q=n(term);
    if(!q) return false;
    if(q.includes(" ")) return t.includes(q);
    const ws=words(t);
    return ws.includes(q) || (q.length>=4 && t.includes(q));
  });
}
function stableHash(value=""){
  let h=2166136261;
  const s=String(value);
  for(let i=0;i<s.length;i++){
    h^=s.charCodeAt(i);
    h=Math.imul(h,16777619);
  }
  return h>>>0;
}
export function pick(options=[],key=""){
  if(!Array.isArray(options)||!options.length) return "";
  return options[stableHash(key)%options.length];
}
function ar(locale){ return locale!=="en"; }

export function detectEmirate(message=""){
  const t=n(message);
  for(const emirate of UAE_EMIRATES){
    for(const alias of emirate.aliases){
      const q=n(alias);
      const bare=q.replace(/^ال/,"");
      const variants=[q,`ل${q}`,`ب${q}`,`لل${bare}`,`بال${bare}`,`فال${bare}`];
      if(variants.some(v=>t.includes(v))) return emirate.labelAr;
    }
  }
  return "";
}

export function detectCrop(message=""){
  const t=n(message);
  for(const [key,crop] of Object.entries(CROPS)){
    if(crop.aliases.some(alias=>t.includes(n(alias)))) return {key,labelAr:crop.labelAr};
  }
  return null;
}

export function detectCategory(message=""){
  const t=n(message);
  if(!t) return null;

  // Strong project phrases win before generic tool/category words.
  if(/(بيت محمي|بيوت محميه|بيوت محمية|جرين هاوس|greenhouse)/.test(t)) return CATEGORIES.greenhouse;
  if(/(شريط قياس|متر قياس|measuring tape)/.test(t)) return CATEGORIES.tools;

  // Explicit non-seed categories win even if a crop is also mentioned.
  const priority=["fertilizer","pesticide","irrigation","hydroponics","greenhouse","tools","services","seeds"];
  for(const key of priority){
    const cat=CATEGORIES[key];
    if(cat.aliases.some(alias=>{
      const q=n(alias);
      return q.includes(" ")?t.includes(q):words(t).includes(q) || (q.length>=5&&t.includes(q));
    })) return cat;
  }

  // A bare crop question usually means seed/product search unless another category is explicit.
  if(detectCrop(message)) return CATEGORIES.seeds;
  return null;
}

function detectCultivation(message=""){
  const t=n(message);
  if(/(مكشوف|ارض مكشوفه|أرض مكشوفة|حقل مفتوح|open field)/.test(t)) return "open_field";
  if(/(بيت محمي|بيوت محميه|بيوت محمية|greenhouse)/.test(t)) return "greenhouse";
  if(/(زراعه مائيه|زراعة مائية|هيدروبونيك|hydroponic)/.test(t)) return "hydroponic";
  return "";
}
function detectPepperType(message=""){
  const t=n(message);
  if(/(فلفل.{0,10}حار|الحار|hot pepper)/.test(t)) return "hot";
  if(/(فلفل.{0,10}حلو|الحلو|sweet pepper|bell pepper)/.test(t)) return "sweet";
  return "";
}
function detectQuantity(message=""){
  const t=n(message);
  // Require a unit, or an explicit quantity/buying cue before the number.
  // This prevents product codes such as F1 or 18-18-5 being stored as a customer quantity.
  const withUnit=t.match(/([0-9]+(?:\.[0-9]+)?)\s*(كرتون|كرتونه|كرتونة|عبوه|عبوة|باكيت|packet|pack|كيس|كيلو|kg|قطعه|قطعة|حبه|حبة)/);
  if(withUnit) return `${withUnit[1]} ${withUnit[2]}`.trim();
  const explicit=t.match(/(?:كميه|كمية|ابغي|أبغي|ابي|أبي|عايز|عاوز|احتاج|أحتاج|need|quantity)\s*([0-9]+(?:\.[0-9]+)?)/);
  return explicit?explicit[1]:"";
}
function detectBudget(message=""){
  const t=n(message);
  const m=t.match(/(?:ميزانيه|ميزانية|حدي|حدود|تحت|اقل من|أقل من|budget|under)\s*([0-9]+(?:\.[0-9]+)?)/);
  return m?Number(m[1]):null;
}

function onlyGreeting(t){ return /^(هلا(?: والله)?|مرحبا|السلام عليكم|سلام|هاي|hello|hi|hey|هلو|صباح الخير|مساء الخير|صباح النور|مساء النور)[\s.!؟]*$/.test(t); }
function asksWellbeing(t){ return /(شلونك|كيفك|كيف الحال|علومك|شو اخبارك|شو أخبارك|عامل ايه|عامل إيه)/.test(t); }
function asksThanks(t){ return /(شكرا|شكراً|مشكور|تسلم|يعطيك العافيه|يعطيك العافية|ثانكس|thanks|thank you)/.test(t); }
function asksGoodbye(t){ return /^(باي|مع السلامه|مع السلامة|سلام|اشوفك|أشوفك|bye|goodbye)[\s.!؟]*$/.test(t); }
function asksIdentity(t){ return /(منو انت|مين انت|انت مين|شو تسوي|شو وظيفتك|who are you|ايه انت|إيه انت|اسمك ايه|اسمك إيه|انت روبوت|أنت روبوت|bot)/.test(t); }
function asksAck(t){ return /^(تمام|اوكي|أوكي|اوك|زين|حلو|ماشي|تمام كده|تمام كدا|ok|okay)[\s.!؟]*$/.test(t); }
function asksNo(t){ return /^(لا|لأ|مش عايز|ما ابغي|ما أبغي|no|nope)[\s.!؟]*$/.test(t); }
function asksLaugh(t){ return /^(هه+|هاها+|هههه+|😂+|🤣+)[\s.!؟]*$/.test(t); }
function asksHuman(t){ return /(موظف|انسان|إنسان|بني ادم|بني آدم|خدمه العملاء|خدمة العملاء|مندوب|human|agent|اكلم حد|أكلم حد|كلم موظف|اتصل بموظف)/.test(t); }
function asksShipping(t){ return /(شحن|توصيل|دليفري|shipping|delivery|يوصل|توصلون|توصيلكم)/.test(t); }
function asksOutsideUAE(t){ return /(السعوديه|السعودية|عمان|سلطنه عمان|سلطنة عمان|قطر|الكويت|البحرين|مصر|خارج الامارات|خارج الإمارات|international|saudi|ksa|oman|qatar|kuwait|bahrain|egypt)/.test(t); }
function asksPickup(t){ return /(استلام من الفرع|استلم من الفرع|استلام شخصي|pickup|click and collect|click & collect)/.test(t); }
function asksDeliveryTime(t){ return /(كم يوم|كام يوم|متى يوصل|متي يوصل|وقت التوصيل|مده الشحن|مدة الشحن|delivery time|how long)/.test(t); }
function asksBranches(t){ return /(وينكم|وين موقعكم|فروع|الفروع|فرعكم|فرع|اقرب فرع|أقرب فرع|location|branches?)/.test(t); }
function asksContact(t){ return /(رقمكم|رقم التواصل|تواصل|اتصال|هاتف|واتساب|whatsapp|phone|contact|ايميل|الإيميل|البريد)/.test(t); }
function asksPayment(t){ return /(دفع|الدفع|كاش|نقدي|بطاقه|بطاقة|فيزا|ماستر|cod|cash on delivery|payment)/.test(t); }
function asksTax(t){ return /(ضريبه|ضريبة|vat|tax|شامل الضريبه|شامل الضريبة|فاتوره ضريبيه|فاتورة ضريبية)/.test(t); }
function asksReturns(t){ return /(استرجاع|استبدال|ارجاع|إرجاع|refund|return|exchange)/.test(t); }
function asksPrivacy(t){ return /(خصوصيه|خصوصية|privacy|بياناتي|البيانات الشخصيه|البيانات الشخصية)/.test(t); }
function asksTerms(t){ return /(الشروط|شروط|احكام|أحكام|terms|conditions)/.test(t); }
function asksCookies(t){ return /(كوكي|كوكيز|ملفات الارتباط|cookies?)/.test(t); }
function asksHours(t){ return /(ساعات العمل|اوقات العمل|أوقات العمل|متى تفتحون|متي تفتحون|متى تسكرون|متي تسكرون|دوام|working hours|open now)/.test(t); }
function asksCompany(t){ return /(من نحن|عن الشركه|عن الشركة|عن mig farm|عن ميج فارم|company info|about us)/.test(t); }
function asksCategories(t){ return /(شو عندكم|وش عندكم|ايش عندكم|ايه عندكم|إيه عندكم|شو تبيعون|وش تبيعون|اقسامكم|أقسامكم|what do you sell|categories)/.test(t); }
function asksBeyondSeeds(t){ return /(غير|بدون|ما عدا|بعيد عن).{0,22}(البذور|بذور|seed)/.test(t) || /(البذور|بذور).{0,22}(غيرها|غير|سواها|سوا)/.test(t); }
function asksOrderStatus(t){ return /(طلبي|الطلب حقي|حاله الطلب|حالة الطلب|وين الطلب|تتبع الطلب|order status|track order)/.test(t); }
function asksDose(t){ return /(جرعه|جرعة|كم ملي|كم مل|خلط|اخلط|نسبه الخلط|نسبة الخلط|dose|dosage|mix rate)/.test(t); }
function asksPlantProblem(t){ return /(النبات تعبان|النبات مريض|اصابه|إصابة|مرض نبات|اصفرار|ذبول|بقع|حشرات على|افات|آفات|مشكله في النبات|مشكلة في النبات|تشخيص|diagnos|plant problem)/.test(t); }
function asksRecommendation(t){ return /(انسب|أنسب|افضل|أفضل|اختار|اختيار|ترشح|رشح|تنصح|recommend|best|choose)/.test(t); }
function asksComparison(t){ return /(قارن|مقارنه|مقارنة|الفرق|compare|difference)/.test(t); }
function complaint(t){ return /(مش شغال|ما يشتغل|مشكله|مشكلة|غلط|خطا|خطأ|اتخصم|ما وصل|متأخر|زعلان|شكوى|complaint|problem)/.test(t); }

function memoryAction(t){
  if(/(ارخص|الأرخص|الارخص|cheapest|lowest)/.test(t)) return "cheapest";
  if(/(اغلى|الأغلى|الاغلى|highest|most expensive)/.test(t)) return "highest";
  if(/(المتوفر منهم|الموجود منهم|المتاح منهم|available from|in stock from)/.test(t) || /^(طب|طيب)?\s*(متوفر|موجود|المتوفر|الموجود|available|in stock)[\s؟?!.]*$/.test(t)) return "available";
  if(/(كم واحد|كام واحد|عددهم|how many)/.test(t)) return "count";
  if(/(رتبهم|رتب.*سعر|من الارخص|من الأرخص|sort.*price)/.test(t)) return "sort_price";
  if(/^(طب|طيب)?\s*(الحار|حار|hot)[\s؟?!.]*$/.test(t)) return "hot";
  if(/^(طب|طيب)?\s*(الحلو|حلو|sweet)[\s؟?!.]*$/.test(t)) return "sweet";
  if(asksComparison(t)) return "compare";
  const ord=[
    [/(الاول|الأول|اول|أول|first)/,0],
    [/(الثاني|التاني|ثاني|second)/,1],
    [/(الثالث|التالت|ثالث|third)/,2],
    [/(الرابع|رابع|fourth)/,3],
    [/(الخامس|خامس|fifth)/,4]
  ];
  for(const [re,index] of ord){ if(re.test(t)) return `ordinal:${index}`; }
  return "";
}

function explicitNewSubject(message=""){
  const category=detectCategory(message);
  const crop=detectCrop(message);
  const product=matchKnownProduct(message);
  return Boolean(category || crop || product);
}

export function matchKnownProduct(message=""){
  const t=n(message);
  const matches=[];
  for(const item of KNOWN_PRODUCT_KNOWLEDGE){
    let score=0;
    for(const name of [item.titleAr,...item.names]){
      const q=n(name);
      if(q && t.includes(q)) score+=Math.max(2,q.split(/\s+/).length*2);
    }
    if(score>0) matches.push({item,score});
  }
  matches.sort((a,b)=>b.score-a.score);
  return matches[0]?.item || null;
}

export function matchSeedVarieties(message=""){
  const t=n(message);
  const matches=[];
  for(const item of MIG_SEED_CATALOG){
    let score=0;
    for(const alias of [item.nameAr,...item.aliases]){
      const q=n(alias);
      if(q && t.includes(q)) score+=q.length>5?5:3;
    }
    if(score>0) matches.push({item,score});
  }
  return matches.sort((a,b)=>b.score-a.score).map(x=>x.item);
}

function FAQMatch(message=""){
  const t=n(message);
  for(const faq of HUMAN_FAQ){
    if(faq.patterns.some(p=>t.includes(n(p)))) return faq;
  }
  return null;
}

export function sanitizeState(value){
  const v=value&&typeof value==="object"&&!Array.isArray(value)?value:{};
  const products=Array.isArray(v.last_products)?v.last_products.slice(0,8).map(p=>({
    name:String(p?.name||"").slice(0,300),
    price:String(p?.price??"").slice(0,80),
    currency:String(p?.currency||"AED").slice(0,20),
    availability:String(p?.availability||"").slice(0,100),
    url:String(p?.url||"").slice(0,1000),
    sku:String(p?.sku||"").slice(0,120)
  })).filter(p=>p.name):[];
  return {
    v:6,
    topic:String(v.topic||"").slice(0,60),
    category:String(v.category||"").slice(0,60),
    crop:String(v.crop||"").slice(0,60),
    emirate:String(v.emirate||"").slice(0,60),
    cultivation:String(v.cultivation||"").slice(0,60),
    quantity:String(v.quantity||"").slice(0,80),
    pepper_type:String(v.pepper_type||"").slice(0,30),
    selected_product:String(v.selected_product||"").slice(0,300),
    product_query:String(v.product_query||"").slice(0,500),
    last_intent:String(v.last_intent||"").slice(0,80),
    last_source:String(v.last_source||"").slice(0,100),
    pending:String(v.pending||"").slice(0,80),
    last_products:products,
    turn:Number(v.turn)||0
  };
}

function inferHistoryContext(history=[]){
  const state=sanitizeState({});
  for(let i=history.length-1;i>=0;i--){
    const item=history[i];
    if(!item || item.role!=="user") continue;
    const cat=detectCategory(item.content);
    const crop=detectCrop(item.content);
    const emirate=detectEmirate(item.content);
    if(!state.category&&cat) state.category=cat.key;
    if(!state.crop&&crop) state.crop=crop.key;
    if(!state.emirate&&emirate) state.emirate=emirate;
    if(state.category || state.crop) break;
  }
  return state;
}

export function mergeState(clientState={},history=[]){
  const a=sanitizeState(clientState);
  const b=inferHistoryContext(history);
  return {...a,
    category:a.category||b.category,
    crop:a.crop||b.crop,
    emirate:a.emirate||b.emirate
  };
}

export function analyzeTurn(message,state={},history=[],locale="ar"){
  const t=n(message);
  let category=detectCategory(message);
  const crop=detectCrop(message);
  const knownProduct=matchKnownProduct(message);
  const seedVarieties=matchSeedVarieties(message);
  if(!category && seedVarieties.length) category=CATEGORIES.seeds;
  if(!category && knownProduct?.category && CATEGORIES[knownProduct.category]) category=CATEGORIES[knownProduct.category];
  const emirate=detectEmirate(message);
  const cultivation=detectCultivation(message);
  const quantity=detectQuantity(message);
  const budget=detectBudget(message);
  const pepperType=detectPepperType(message);
  const mem=memoryAction(t);

  let intent="unknown";
  if(onlyGreeting(t)) intent="greeting";
  else if(asksWellbeing(t)) intent="wellbeing";
  else if(asksThanks(t)) intent="thanks";
  else if(asksGoodbye(t)) intent="goodbye";
  else if(asksAck(t)||asksLaugh(t)) intent="acknowledgment";
  else if(asksNo(t)) intent="negative_ack";
  else if(asksIdentity(t)) intent="identity";
  else if(asksHuman(t)) intent="human";
  else if(asksOrderStatus(t)) intent="order_status";
  else if(asksPickup(t)) intent="pickup";
  else if(asksShipping(t)&&asksOutsideUAE(t)) intent="shipping_outside_uae";
  else if(asksShipping(t)&&asksDeliveryTime(t)) intent="delivery_time";
  else if(asksShipping(t)) intent="shipping";
  else if(asksHours(t)) intent="hours";
  else if(asksPayment(t)) intent="payment";
  else if(asksTax(t)) intent="tax";
  else if(asksReturns(t)) intent="returns";
  else if(asksPrivacy(t)) intent="privacy";
  else if(asksCookies(t)) intent="cookies";
  else if(asksTerms(t)) intent="terms";
  else if(asksBranches(t)) intent="branches";
  else if(asksContact(t)) intent="contact";
  else if(asksBeyondSeeds(t)) intent="categories_without_seeds";
  else if(asksCategories(t) && !category) intent="categories";
  else if(asksCompany(t)) intent="company";
  else if(complaint(t)) intent="complaint";
  else if(asksDose(t)&&(category?.key==="pesticide" || state.category==="pesticide" || knownProduct?.category==="pesticide")) intent="pesticide_dose";
  else if(asksDose(t)&&(category?.key==="fertilizer" || state.category==="fertilizer" || knownProduct?.category==="fertilizer")) intent="fertilizer_dose";
  else if(asksPlantProblem(t)) intent="plant_problem";
  else if(state.pending==="crop" && crop) intent="recommendation";
  else if(state.pending==="cultivation" && cultivation) intent="recommendation";
  else if(state.pending==="emirate" && emirate) intent="recommendation";
  else if(mem && !explicitNewSubject(message)) intent="product_memory";
  else if(seedVarieties.length && asksComparison(t)) intent="known_seed_comparison";
  else if(seedVarieties.length && /(تفاصيل|ايه هو|إيه هو|شو هو|وش هو|ما هو|مقاوم|مقاومه|مقاومة|شكل الثمر|لون الثمر|details|what is|resistan)/.test(t)) intent="known_seed_info";
  else if(knownProduct && (/(مكونات|مكوناته|تركيبه|تركيبة|تفاصيل|يعمل ايه|يعمل إيه|ايه هو|إيه هو|شو هو|وش هو|ما هو|استخدام|فايده|فائدة|فايدته|what is|details|spec)/.test(t) || asksComparison(t))) intent="known_product_info";
  else if(asksRecommendation(t)) intent="recommendation";
  else if(category?.key==="services") intent="services";
  else if(category || crop || knownProduct || seedVarieties.length) intent="product_search";
  else if(FAQMatch(message)) intent="faq";
  else if(/(خدمات|استشارات)/.test(t)) intent="services";
  else if((quantity||budget!==null) && state.topic==="product" && state.category) intent="product_search";
  else if(/(زرع|زراعه|زراعة|نبات|محصول|مزرعه|مزرعة|تربه|تربة|ري|تسميد)/.test(t)) intent="agriculture_general";

  return {intent,t,category,crop,knownProduct,seedVarieties,emirate,cultivation,quantity,budget,pepperType,memoryAction:mem,faq:FAQMatch(message),locale};
}

export function updateState(previous,analysis,message,source="",results=[]){
  const s=sanitizeState(previous);
  const explicitCategory=analysis.category?.key||"";
  const explicitCrop=analysis.crop?.key||"";

  // A fresh category/crop/product search breaks old product-list context.
  if(explicitCategory && explicitCategory!==s.category){
    s.last_products=[];
    s.selected_product="";
    s.product_query="";
    s.pending="";
  }
  if(explicitCrop && explicitCrop!==s.crop && analysis.intent!=="product_memory"){
    s.last_products=[];
    s.selected_product="";
    s.product_query="";
  }

  if(explicitCategory) s.category=explicitCategory;
  if(explicitCrop) s.crop=explicitCrop;
  if(analysis.emirate) s.emirate=analysis.emirate;
  if(analysis.cultivation) s.cultivation=analysis.cultivation;
  if(analysis.quantity) s.quantity=analysis.quantity;
  if(analysis.pepperType) s.pepper_type=analysis.pepperType;
  if(analysis.intent==="shipping"||analysis.intent==="delivery_time") s.topic="shipping";
  else if(analysis.intent==="branches"||analysis.intent==="contact") s.topic=analysis.intent;
  else if(["product_search","product_memory","known_product_info","known_seed_info","known_seed_comparison","recommendation"].includes(analysis.intent)) s.topic="product";
  else if(analysis.intent!=="unknown") s.topic=analysis.intent;

  if(analysis.intent==="product_search") s.product_query=String(message||"").slice(0,500);
  if(Array.isArray(results)&&results.length){
    s.last_products=results.slice(0,8).map(p=>({
      name:String(p.name||"").slice(0,300),price:String(p.price??"").slice(0,80),currency:String(p.currency||"AED").slice(0,20),
      availability:String(p.availability||"").slice(0,100),url:String(p.url||"").slice(0,1000),sku:String(p.sku||"").slice(0,120)
    }));
  }
  if(source==="recommend_seed_crop") s.pending="crop";
  else if(source==="recommend_seed_cultivation") s.pending="cultivation";
  else if(source==="recommend_seed_emirate") s.pending="emirate";
  else if(source && !source.startsWith("recommend_seed_")) s.pending="";

  s.last_intent=analysis.intent;
  s.last_source=source;
  s.turn=(s.turn||0)+1;
  return s;
}

export function directReply(analysis,state,message,sessionId=""){
  const key=`${sessionId}:${state.turn||0}:${analysis.intent}:${message}`;
  const locale=analysis.locale||"ar";
  const en=!ar(locale);
  const fee=BUSINESS.delivery.standardFee;

  if(analysis.intent==="greeting") return {reply:en?"Hi 👋 Welcome to MIG FARM. What can I help you with?":pick(TONE.greetingAr,key),source:"human_greeting"};
  if(analysis.intent==="wellbeing") return {reply:en?"Doing well, thanks. What can I help you with?":pick(TONE.wellbeingAr,key),source:"human_smalltalk"};
  if(analysis.intent==="thanks") return {reply:en?"You're welcome. I'm here if you need anything else.":pick(TONE.thanksAr,key),source:"human_thanks"};
  if(analysis.intent==="goodbye") return {reply:en?"See you soon. Have a great day.":pick(TONE.goodbyeAr,key),source:"human_goodbye"};
  if(analysis.intent==="acknowledgment") return {reply:en?"Got it. What would you like to do next?":pick(TONE.acknowledgmentAr,key),source:"human_ack"};
  if(analysis.intent==="negative_ack") return {reply:en?"No problem. Tell me what you want instead.":pick(TONE.negativeAr,key),source:"human_negative_ack"};
  if(analysis.intent==="identity") return {reply:en?"I'm MIG FARM's website assistant. I use the live store plus MIG FARM's verified business and product knowledge to help with products, availability, prices, delivery, branches and services.":"أنا مساعد MIG FARM للموقع. أشتغل على بيانات المتجر الحية ومعرفة MIG FARM الموثقة عشان أساعدك في المنتجات والأسعار والتوفر والشحن والفروع والخدمات. وإذا معلومة مش مؤكدة عندي، أقول لك بدل ما أخمّن.",source:"identity"};
  if(analysis.intent==="human") return {reply:en?"Sure. You can speak with the MIG FARM team directly on WhatsApp.":"أكيد، إذا تبا تكلم شخص من الفريق مباشرة أفتح لك واتساب MIG FARM.",source:"human_escalation",actions:[{type:"whatsapp",label:en?"WhatsApp MIG FARM":"كلمنا واتساب",url:BUSINESS.whatsapp}],escalation:true};

  if(analysis.intent==="shipping"){
    const place=analysis.emirate||state.emirate;
    const placeText=place?`، و${place} ضمن التوصيل`:"";
    const template=pick(TONE.shippingAr,key).replace("{fee}",String(fee)).replace("{place}",placeText);
    return {reply:en?`Standard delivery is configured within the UAE for ${fee} AED${place?` including ${place}`:""}.`:template,source:"shipping"};
  }
  if(analysis.intent==="shipping_outside_uae") return {reply:"الشحن القياسي المؤكد عندي حاليًا داخل الإمارات فقط. ما عندي تأكيد على الشحن الدولي/الخليجي، فالأفضل تذكر الدولة للفريق وهم يأكدون لك إذا متاح.",source:"shipping_outside_unconfirmed",actions:[{type:"whatsapp",label:"اسأل عن الشحن الخارجي",url:BUSINESS.whatsapp}]};
  if(analysis.intent==="pickup") return {reply:"خيار الاستلام من الفرع مش شيء أقدر أضمنه من الشات؛ المرجع هو خيارات الاستلام/التوصيل الظاهرة وقت الطلب. حاليًا التوصيل القياسي داخل الإمارات هو المعلومة المؤكدة عندي، ولو تبا استلام من فرع معيّن كلم الفريق قبل الطلب.",source:"pickup_unconfirmed",actions:[{type:"whatsapp",label:"اسأل عن الاستلام",url:BUSINESS.whatsapp}]};
  if(analysis.intent==="delivery_time") return {reply:en?`The exact delivery time isn't confirmed in my current data. Standard UAE delivery is ${fee} AED; the team can confirm timing for your area.`:`مدة التوصيل الدقيقة مب مؤكدة عندي، فما بعطيك مدة من عندي. التوصيل القياسي داخل الإمارات ${fee} درهم، وللمدة حسب منطقتك كلم الفريق.`,source:"delivery_time_unconfirmed",actions:[{type:"whatsapp",label:"كلمنا واتساب",url:BUSINESS.whatsapp}]};

  if(analysis.intent==="branches"){
    const place=analysis.emirate;
    if(place==="العين") return {reply:`فرع العين: ${BUSINESS.branches.alAin.phone}.`,source:"branch_alain"};
    if(place==="الشارقة") return {reply:`فرع الشارقة: ${BUSINESS.branches.sharjah.phone}.`,source:"branch_sharjah"};
    return {reply:`عندنا فرعين معروفين حاليًا: العين ${BUSINESS.branches.alAin.phone} والشارقة ${BUSINESS.branches.sharjah.phone}. إذا تقصد واحد منهم قل لي أي فرع.`,source:"branches"};
  }
  if(analysis.intent==="contact"){
    if(/ايميل|الإيميل|البريد|email/.test(analysis.t)) return {reply:`إيميل MIG FARM هو ${BUSINESS.email}.`,source:"email"};
    if(analysis.emirate==="العين") return {reply:`رقم فرع العين: ${BUSINESS.branches.alAin.phone}.`,source:"contact_alain"};
    if(analysis.emirate==="الشارقة") return {reply:`رقم فرع الشارقة: ${BUSINESS.branches.sharjah.phone}.`,source:"contact_sharjah"};
    return {reply:`تقدر تتواصل ويانا على العين ${BUSINESS.branches.alAin.phone} أو الشارقة ${BUSINESS.branches.sharjah.phone}، والإيميل ${BUSINESS.email}.`,source:"contact",actions:[{type:"whatsapp",label:"واتساب MIG FARM",url:BUSINESS.whatsapp}]};
  }
  if(analysis.intent==="hours") return {reply:"أوقات الدوام مب مؤكدة عندي من البيانات الحالية، وما أبغي أعطيك وقت غلط. تقدر تتأكد من الفريق مباشرة قبل ما تتحرك.",source:"hours_unconfirmed",actions:[{type:"whatsapp",label:"تأكد من الدوام",url:BUSINESS.whatsapp}]};
  if(analysis.intent==="payment") return {reply:"طرق الدفع المتاحة فعليًا تظهر لك في خطوة الدفع بالـCheckout. إذا ما ظهر لك خيار مناسب، لا تكمل على افتراض؛ كلم الفريق وهم يساعدونك.",source:"payment_checkout_truth",actions:[{type:"page",label:"افتح المتجر",url:"/shop"},{type:"whatsapp",label:"كلم الفريق",url:BUSINESS.whatsapp}]};
  if(analysis.intent==="tax") return {reply:"ما عندي تأكيد حاليًا إن كل سعر ظاهر شامل الضريبة أو لا، لذلك المرجع النهائي هو إجمالي الـCheckout. ولو تحتاج فاتورة ضريبية أو تفاصيل VAT كلم الفريق.",source:"vat_unconfirmed",actions:[{type:"whatsapp",label:"اسأل عن الضريبة",url:BUSINESS.whatsapp}]};
  if(analysis.intent==="returns") return {reply:"بالنسبة للاسترجاع أو الاستبدال، الأفضل نعتمد الشروط الحالية بالموقع بدل ما أقول شرط من الذاكرة. أقدر أفتح لك صفحة الشروط أو أوصلك بالفريق.",source:"returns_policy",actions:[{type:"page",label:"الشروط والأحكام",url:BUSINESS.policies.terms},{type:"whatsapp",label:"كلم الفريق",url:BUSINESS.whatsapp}]};
  if(analysis.intent==="privacy") return {reply:"تقدر تراجع سياسة الخصوصية الحالية لـ MIG FARM من صفحة الخصوصية.",source:"privacy",actions:[{type:"page",label:"سياسة الخصوصية",url:BUSINESS.policies.privacy}]};
  if(analysis.intent==="terms") return {reply:"تقدر تراجع الشروط والأحكام الحالية للموقع من صفحة الشروط.",source:"terms",actions:[{type:"page",label:"الشروط والأحكام",url:BUSINESS.policies.terms}]};
  if(analysis.intent==="cookies") return {reply:"تفاصيل ملفات الارتباط والتتبع موجودة في سياسة الكوكيز بالموقع.",source:"cookies",actions:[{type:"page",label:"سياسة الكوكيز",url:BUSINESS.policies.cookies}]};
  if(analysis.intent==="order_status") return {reply:"ما عندي وصول لبيانات الطلبات الخاصة من شات الموقع العام. كلم الفريق برقم الطلب وهم يشيكون لك على الحالة.",source:"order_private",actions:[{type:"whatsapp",label:"تتبع مع الفريق",url:BUSINESS.whatsapp}],escalation:true};

  if(analysis.intent==="categories_without_seeds"){
    const names=Object.values(CATEGORIES).filter(c=>c.key!=="seeds"&&c.key!=="services").map(c=>c.labelAr);
    return {reply:`هيه أكيد 🌱 غير البذور عندنا ${names.join("، ")}، ومعاها ${CATEGORIES.services.labelAr}. قل لي أي قسم منهم وتبا منتجات متوفرة ولا معلومات عنه.`,source:"categories_without_seeds"};
  }
  if(analysis.intent==="categories") return {reply:`عند MIG FARM نغطي ${Object.values(CATEGORIES).map(c=>c.labelAr).join("، ")}. إذا تبا، اكتب القسم مباشرة مثل «بذور طماطم» أو «أسمدة متوفرة» وأنا أدور لك في المتجر.`,source:"categories"};
  if(analysis.intent==="company") return {reply:`MIG FARM متخصصة في مستلزمات وحلول الزراعة في الإمارات. شغلنا يشمل ${SERVICES.join("، ")}. والمساعد هنا يربط بين معلومات الشركة والمنتجات الحية في المتجر.`,source:"company"};
  if(analysis.intent==="services") return {reply:`عند MIG FARM خدمات ودعم زراعي بجانب المنتجات، وتشمل ${SERVICES.slice(3).join("، ")}. إذا تبا خدمة محددة مثل بيت محمي أو استشارة، قل لي نوع المشروع والإمارة وأنا أرتب لك الخطوة الجاية.`,source:"services",actions:[{type:"page",label:"الخدمات",url:"/services"},{type:"whatsapp",label:"كلم الفريق",url:BUSINESS.whatsapp}]};

  if(analysis.intent==="pesticide_dose") return {reply:SAFETY.pesticide,source:"pesticide_safety",actions:[{type:"whatsapp",label:"أرسل اسم المبيد للفريق",url:BUSINESS.whatsapp}]};
  if(analysis.intent==="fertilizer_dose") return {reply:SAFETY.fertilizer,source:"fertilizer_safety"};
  if(analysis.intent==="plant_problem") return {reply:"أقدر أساعدك نرتب التشخيص، بس ما أبغي أرمي لك مبيد عشوائي. عطِني اسم المحصول، صورة واضحة للإصابة، الأعراض، ومكشوف ولا بيت محمي. بعدها نحدد الخطوة الصح.",source:"plant_diagnosis",actions:[{type:"whatsapp",label:"أرسل صورة الإصابة",url:BUSINESS.whatsapp}]};

  if(analysis.intent==="known_product_info" && analysis.knownProduct){
    const p=analysis.knownProduct;
    const facts=p.facts?.length?`\n• ${p.facts.join("\n• ")}`:"";
    return {reply:`${p.titleAr}:${facts}${p.safety?`\n\nمهم: ${p.safety}`:""}`,source:`knowledge_${p.key}`};
  }
  if(analysis.intent==="known_seed_comparison" && analysis.seedVarieties.length){
    const lines=analysis.seedVarieties.slice(0,4).map(item=>`• ${item.nameAr}${item.facts?.length?` — ${item.facts.join("، ")}`:""}`);
    return {reply:`المعلومات المؤكدة عندي عن الأصناف اللي ذكرتها:\n${lines.join("\n")}\nإذا تبا مقارنة على الإنتاج أو الموسم أو المقاومة، لازم تكون المعلومة موجودة على العبوة/صفحة المنتج عشان ما نخمن.`,source:"seed_knowledge_compare"};
  }
  if(analysis.intent==="known_seed_info" && analysis.seedVarieties.length){
    const item=analysis.seedVarieties[0];
    const facts=item.facts?.length ? `\n• ${item.facts.join("\n• ")}` : "";
    const extra=!item.facts?.length
      ? "\nالتفاصيل الزراعية الإضافية مثل الموسم والمقاومات لازم أتأكد منها من صفحة المنتج أو العبوة قبل ما أقولها."
      : "";
    return {
      reply:`${item.nameAr} من أصناف بذور MIG FARM المعروفة عندي.${facts}${extra}`,
      source:"seed_knowledge_info"
    };
  }


  if(analysis.intent==="faq" && analysis.faq){
    return {reply:pick(analysis.faq.answersAr,key),source:`faq_${analysis.faq.key}`,
      actions:["bulk","cancel_order","order_status"].includes(analysis.faq.key)?[{type:"whatsapp",label:"كلم الفريق",url:BUSINESS.whatsapp}]:[]};
  }

  if(analysis.intent==="complaint") return {reply:"فاهم عليك. خلنا نحددها بدون ما نلف: المشكلة في طلب، دفع، شحن، ولا منتج؟ إذا عندك رقم طلب ما أقدر أفتحه من الشات، لكن أوصلك بالفريق مباشرة.",source:"complaint_triage",quick_replies:["مشكلة في طلب","مشكلة دفع","مشكلة شحن","مشكلة منتج"]};

  if(analysis.intent==="recommendation"){
    const cat=analysis.category?.key||state.category;
    const crop=analysis.crop?.key||state.crop;
    if(cat==="seeds" || crop){
      if(!crop) return {reply:"أكيد أساعدك تختار بذور. أول شي: شو المحصول اللي تبا تزرعه؟",source:"recommend_seed_crop",quick_replies:["طماطم","خيار","فلفل","باذنجان"]};
      if(!analysis.cultivation&&!state.cultivation) return {reply:`تمام، ${CROPS[crop]?.labelAr||"المحصول"}. زراعتك مكشوفة ولا بيت محمي؟`,source:"recommend_seed_cultivation",quick_replies:["مكشوف","بيت محمي"]};
      if(!analysis.emirate&&!state.emirate) return {reply:"وفي أي إمارة؟ هالمعلومة تساعدنا ما نعطيك اختيار عام من غير سياق.",source:"recommend_seed_emirate"};
      return null; // let live product search run with collected context.
    }
    if(cat==="fertilizer") return {reply:"أقدر أضيّق لك اختيار السماد، بس أحتاج أعرف المحصول والمرحلة أو المشكلة اللي تحاول تعالجها. ما أبغي أرشح تركيبة بشكل عام وتطلع مب مناسبة.",source:"recommend_fertilizer_clarify"};
    if(cat==="pesticide") return {reply:"قبل اختيار المبيد نحتاج نعرف الإصابة نفسها والمحصول. أرسل صورة واضحة أو اسم الآفة والأعراض؛ اختيار مبيد من غير تشخيص ممكن يكون غلط.",source:"recommend_pesticide_clarify",actions:[{type:"whatsapp",label:"أرسل صورة الإصابة",url:BUSINESS.whatsapp}]};
  }

  if(analysis.intent==="agriculture_general") return {reply:"أقدر أساعدك في الاختيار والمعلومات الموجودة عند MIG FARM، بس السؤال الزراعي العام يفرق حسب المحصول والإمارة وطريقة الزراعة. اكتب لي المحصول والمشكلة أو الهدف وأنا أرتب لك الموضوع بدون تخمين.",source:"agriculture_clarify"};

  return null;
}

function numericPrice(p){ const x=Number(String(p?.price??"").replace(/,/g,"")); return Number.isFinite(x)?x:null; }
function available(p){ return !/(غير متوفر|out of stock|unavailable)/.test(n(p?.availability)); }
export function productMemoryReply(analysis,state,locale="ar"){
  if(analysis.intent!=="product_memory") return null;
  const rows=Array.isArray(state.last_products)?state.last_products:[];
  if(!rows.length) return {reply:"ما عندي قائمة منتجات سابقة واضحة أقارن عليها. اكتب اسم القسم أو المنتج وأنا أبدأ لك بحث جديد.",source:"memory_empty"};
  const action=analysis.memoryAction;
  const arMode=locale!=="en";
  if(action==="cheapest"){
    const priced=rows.map(p=>({...p,_price:numericPrice(p)})).filter(p=>p._price!==null);
    if(!priced.length) return {reply:"الأسعار في القائمة السابقة مب واضحة بشكل يسمح لي أحدد الأرخص بثقة.",source:"memory_no_prices"};
    const min=Math.min(...priced.map(p=>p._price)); const hits=priced.filter(p=>p._price===min);
    return {reply:`أرخص خيار من القائمة السابقة ${min} AED:\n${hits.map(p=>`• ${p.name}`).join("\n")}`,source:"memory_cheapest"};
  }
  if(action==="highest"){
    const priced=rows.map(p=>({...p,_price:numericPrice(p)})).filter(p=>p._price!==null);
    if(!priced.length) return {reply:"ما قدرت أحدد الأغلى لأن الأسعار السابقة مش كاملة.",source:"memory_no_prices"};
    const max=Math.max(...priced.map(p=>p._price)); const hits=priced.filter(p=>p._price===max);
    return {reply:`أعلى سعر في القائمة السابقة ${max} AED:\n${hits.map(p=>`• ${p.name}`).join("\n")}`,source:"memory_highest"};
  }
  if(action==="available"){
    const hits=rows.filter(available);
    return {reply:hits.length?`المتوفر من اللي عرضتهم لك:\n${hits.map(p=>`• ${p.name}${p.price?` — ${p.price} ${p.currency||"AED"}`:""}`).join("\n")}`:"ما ظهر لي منتج مؤكد متوفر من القائمة السابقة.",source:"memory_available"};
  }
  if(action==="count") return {reply:`عرضت لك ${rows.length} منتجات في آخر قائمة.`,source:"memory_count"};
  if(action==="compare") return {reply:`من ناحية السعر والتوفر في آخر قائمة:\n${rows.map(p=>`• ${p.name}${p.price?` — ${p.price} ${p.currency||"AED"}`:""}${p.availability?` - ${p.availability}`:""}`).join("\n")}\nإذا تبا مقارنة مواصفات، اكتب اسم المنتجين لأن المواصفات لازم تكون مؤكدة من بياناتهم.`,source:"memory_compare"};
  if(action?.startsWith("ordinal:")){
    const index=Number(action.split(":")[1]); const p=rows[index];
    return p?{reply:`${p.name}${p.price?` — ${p.price} ${p.currency||"AED"}`:""}${p.availability?` - ${p.availability}`:""}`,source:"memory_ordinal"}:null;
  }
  return null;
}

export function ambiguousContextReply(message,state,analysis){
  if(analysis.intent!=="unknown") return null;
  const t=n(message);
  if(state.topic==="shipping" && (analysis.emirate || /^(داخل|خارج|هناك|هنا|و?دبي|و?العين|و?الشارقه|و?الشارقة)/.test(t))){
    const place=analysis.emirate||state.emirate;
    return {reply:`إذا تقصد التوصيل${place?` لـ ${place}`:""}: التوصيل القياسي داخل الإمارات متوفر بـ ${BUSINESS.delivery.standardFee} درهم.`,source:"context_shipping"};
  }
  if(words(t).length<=3){
    return {reply:pick(TONE.fallbackAr,`${state.turn}:${message}`),source:"clarify_unknown",quick_replies:["منتج","شحن","فرع","خدمة"]};
  }
  return null;
}

export function isClearlyOffDomain(message=""){
  const t=n(message);
  const onDomain=detectCategory(message)||detectCrop(message)||matchKnownProduct(message)||/(زرع|زراعه|زراعة|نبات|محصول|مزرعه|مزرعة|تسميد|ري|حشرات|تربه|تربة|mig|farm|شحن|فرع|طلب|منتج)/.test(t);
  if(onDomain) return false;
  return /(ويندوز|كمبيوتر|برمجه|برمجة|كود بايثون|سياره|سيارة|كوره|كرة القدم|سياسه|سياسة|bitcoin|بتكوين|movie|فيلم سينما|طب بشري)/.test(t);
}
