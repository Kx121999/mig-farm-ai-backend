import { normalizeAr } from "./utils.js";

function n(value=""){ return normalizeAr(String(value||"")); }
function clip(value,max=120){ return String(value||"").trim().slice(0,max); }
function unique(values=[]){ return [...new Set(values.map(x=>clip(x,120)).filter(Boolean))].slice(0,12); }

const PROJECT_TYPES=[
  ["commercial",/(مشروع|استثمار|تجاري|تجاريه|commercial|business|استثماري)/],
  ["farm",/(مزرعه|مزرعة|farm|مزرعتي)/],
  ["home",/(للبيت|في البيت|منزل|حديقه البيت|حديقة البيت|سطح|بلكونه|بلكونة|home|garden|balcony)/]
];

const GOALS=[
  ["early",/(انتاج مبكر|إنتاج مبكر|تبكير|early)/],
  ["continuous",/(انتاج مستمر|إنتاج مستمر|مستمر|continuous)/],
  ["quality",/(جوده|جودة|quality)/],
  ["home_use",/(للبيت|استهلاك شخصي|استهلاك منزلي|home use)/],
  ["commercial_yield",/(انتاج تجاري|إنتاج تجاري|محصول تجاري|commercial yield)/]
];

function detectArea(text=""){
  const t=String(text||"");
  const patterns=[
    /([0-9][0-9,.]*)\s*(?:متر مربع|متر\s*مربع|م2|م²|sqm|m2)(?:\s|$)/i,
    /([0-9][0-9,.]*)\s*(?:متر)(?:\s|$)/i,
    /([0-9][0-9,.]*)\s*(?:فدان|feddan|acre)(?:\s|$)/i,
    /([0-9][0-9,.]*)\s*(?:هكتار|hectare|ha)\b/i,
    /([0-9][0-9,.]*)\s*(?:دونم|دنم|dunum|donum)\b/i
  ];
  for(const pattern of patterns){
    const m=t.match(pattern);
    if(m) return clip(m[0],80);
  }
  return "";
}

function detectProjectType(text=""){
  const t=n(text);
  for(const [key,pattern] of PROJECT_TYPES){ if(pattern.test(t)) return key; }
  return "";
}

function detectGoal(text=""){
  const t=n(text);
  for(const [key,pattern] of GOALS){ if(pattern.test(t)) return key; }
  return "";
}

function detectUrgency(text=""){
  const t=n(text);
  if(/(الحين|الان|الآن|اليوم|بسرعه|بسرعة|عاجل|urgent|asap|دلوقتي)/.test(t)) return "high";
  if(/(هذا الاسبوع|هالاسبوع|هالأسبوع|this week)/.test(t)) return "medium";
  return "";
}

function detectPurchaseIntent(text=""){
  const t=n(text);
  if(/(ابغي اطلب|أبغي أطلب|ابي اطلب|أبي أطلب|عايز اطلب|عاوز اطلب|أريد أطلب|اريد اطلب|اشتري|أشتري|اخذه|آخذه|خلاص خذه|احجز|أحجز|اطلبه|أطلبه|buy|order now|place order)/.test(t)) return "buy";
  if(/(عرض سعر|كوتيشن|quotation|quote|سعر جمله|سعر جملة|bulk|wholesale|جمله|جملة)/.test(t)) return "quote";
  return "";
}

function detectPriceFocus(text=""){
  const t=n(text);
  if(/(ارخص|أرخص|اقل سعر|أقل سعر|رخيص|ميزانيه|ميزانية|budget|cheapest|lowest)/.test(t)) return "value";
  if(/(الافضل|الأفضل|جوده|جودة|premium|best quality)/.test(t)) return "quality";
  return "";
}

function detectExperience(text=""){
  const t=n(text);
  if(/(اول مره|أول مرة|مبتدئ|مبتدى|ما اعرف|ما أعرف|new to|beginner|first time)/.test(t)) return "beginner";
  if(/(خبره|خبرة|مهندس|مزارع|مزرعتي|سنوات|experienced|farmer)/.test(t)) return "experienced";
  return "";
}

function detectCorrection(text=""){
  const t=n(text);
  return /(غلط|خطا|خطأ|لا مش ده|لا مو هذا|مش قصدي|مو قصدي|قصدي|اقصد|أقصد|بدل|غير كده|غير كدا|wrong|i mean)/.test(t);
}

function detectFrustration(text=""){
  const t=n(text);
  return /(مش فاهم|ما فهمت|مش ده|مو هذا|بتكرر|تكرر|رد غلط|اجابتك غلط|إجابتك غلط|ضايع|لخبط|تلخبط|frustrat|annoyed)/.test(t);
}

function extractPreference(text="",negative=false){
  const raw=String(text||"").trim();
  const pattern=negative
    ? /(?:مش عايز|ما ابغي|ما أبغي|بدون|غير|لا اريد|لا أريد)\s+([^,.!?؟]{2,60})/i
    : /(?:ابغي|أبغي|ابي|أبي|عايز|عاوز|أفضل|افضل|يفضل|أفضل شي|prefer)\s+([^,.!?؟]{2,60})/i;
  const m=raw.match(pattern);
  return m ? clip(m[1],60) : "";
}

export function sanitizeCustomerProfile(value){
  const v=value&&typeof value==="object"&&!Array.isArray(value)?value:{};
  return {
    v:1,
    category:clip(v.category,60),
    crop:clip(v.crop,60),
    emirate:clip(v.emirate,60),
    cultivation:clip(v.cultivation,60),
    quantity:clip(v.quantity,80),
    budget:clip(v.budget,80),
    area:clip(v.area,80),
    project_type:clip(v.project_type,40),
    goal:clip(v.goal,60),
    pepper_type:clip(v.pepper_type,30),
    urgency:clip(v.urgency,20),
    purchase_intent:clip(v.purchase_intent,20),
    price_focus:clip(v.price_focus,20),
    experience:clip(v.experience,20),
    preferred_branch:clip(v.preferred_branch,40),
    positive_preferences:unique(v.positive_preferences||[]),
    negative_preferences:unique(v.negative_preferences||[]),
    answered_fields:unique(v.answered_fields||[]),
    corrections:Number(v.corrections)||0,
    frustration_count:Number(v.frustration_count)||0,
    turn:Number(v.turn)||0
  };
}

export function extractCustomerSignals(message,analysis={},state={}){
  const positive=extractPreference(message,false);
  const negative=extractPreference(message,true);
  const area=detectArea(message);
  const projectType=detectProjectType(message);
  const goal=detectGoal(message);
  const urgency=detectUrgency(message);
  const purchaseIntent=detectPurchaseIntent(message);
  const priceFocus=detectPriceFocus(message);
  const experience=detectExperience(message);
  const correction=detectCorrection(message);
  const frustration=detectFrustration(message);
  const budget=analysis.budget!==null&&analysis.budget!==undefined&&analysis.budget!=="" ? String(analysis.budget) : "";
  const signals={
    category:analysis.category?.key||"",
    crop:analysis.crop?.key||"",
    emirate:analysis.emirate||"",
    cultivation:analysis.cultivation||"",
    quantity:analysis.quantity||"",
    budget,
    area,
    project_type:projectType,
    goal,
    pepper_type:analysis.pepperType||"",
    urgency,
    purchase_intent:purchaseIntent,
    price_focus:priceFocus,
    experience,
    positive_preferences:positive?[positive]:[],
    negative_preferences:negative?[negative]:[],
    correction,
    frustration
  };
  if(!signals.emirate && state.emirate) signals.emirate="";
  return signals;
}

export function mergeCustomerProfile(current={},signals={},analysis={},state={}){
  const p=sanitizeCustomerProfile(current);
  const next={...p};
  const scalar=["category","crop","emirate","cultivation","quantity","budget","area","project_type","goal","pepper_type","urgency","purchase_intent","price_focus","experience"];
  for(const key of scalar){ if(signals[key]) next[key]=clip(signals[key], key==="quantity"||key==="budget"||key==="area"?80:60); }

  // Preserve useful context from the dialogue engine when the current turn is short.
  if(!next.category && state.category) next.category=clip(state.category,60);
  if(!next.crop && state.crop) next.crop=clip(state.crop,60);
  if(!next.emirate && state.emirate) next.emirate=clip(state.emirate,60);
  if(!next.cultivation && state.cultivation) next.cultivation=clip(state.cultivation,60);
  if(!next.quantity && state.quantity) next.quantity=clip(state.quantity,80);
  if(!next.pepper_type && state.pepper_type) next.pepper_type=clip(state.pepper_type,30);

  if(signals.positive_preferences?.length) next.positive_preferences=unique([...next.positive_preferences,...signals.positive_preferences]);
  if(signals.negative_preferences?.length) next.negative_preferences=unique([...next.negative_preferences,...signals.negative_preferences]);
  if(signals.correction) next.corrections+=1;
  if(signals.frustration) next.frustration_count+=1;

  const answered=[];
  for(const key of ["category","crop","emirate","cultivation","quantity","budget","area","project_type","goal","pepper_type","purchase_intent"]){
    if(next[key]) answered.push(key);
  }
  next.answered_fields=unique([...next.answered_fields,...answered]);
  next.turn=(p.turn||0)+1;
  return next;
}

export function profileLabel(profile={}){
  const p=sanitizeCustomerProfile(profile);
  const bits=[];
  if(p.crop) bits.push(`محصول:${p.crop}`);
  if(p.category) bits.push(`قسم:${p.category}`);
  if(p.emirate) bits.push(`إمارة:${p.emirate}`);
  if(p.cultivation) bits.push(`زراعة:${p.cultivation}`);
  if(p.quantity) bits.push(`كمية:${p.quantity}`);
  if(p.area) bits.push(`مساحة:${p.area}`);
  return bits.join(" | ");
}

export function hasAnswered(profile={},field=""){
  const p=sanitizeCustomerProfile(profile);
  return Boolean(p[field]) || p.answered_fields.includes(field);
}

export function customerRepairReply(signals={},analysis={},profile={}){
  if(!signals.correction && !signals.frustration) return null;
  const explicitNew=Boolean(analysis.category||analysis.crop||analysis.knownProduct||analysis.seedVarieties?.length);
  if(explicitNew) return null; // Let the new request route normally.

  const p=sanitizeCustomerProfile(profile);
  let context="";
  if(p.category) context=`آخر موضوع عندي كان ${p.category}`;
  else if(p.crop) context=`آخر محصول عندي كان ${p.crop}`;

  return {
    reply:`تمام، فهمت إن الرد اللي فات مش اللي تقصده${context?` — ${context}`:""}. صحح لي بكلمتين بس: تبا أي منتج أو أي قسم بالضبط؟`,
    quick_replies:["بذور","أسمدة","مبيدات","ري"],
    source:"conversation_repair"
  };
}
