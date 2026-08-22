import { normalizeAr, tokenize } from "./utils.js";

const VERSION="32.0";

function clean(value="",max=1200){return String(value??"").replace(/[\u0000-\u001f]/g," ").replace(/\s+/g," ").trim().slice(0,max);}
function n(value=""){return normalizeAr(clean(value,1600)).toLowerCase().replace(/[؟?!.,،؛;]+/g," ").replace(/\s+/g," ").trim();}

const HELP_ONLY=[
  /^(?:انا\s+)?(?:محتاج|محتاجه|محتاجة|عايز|عايزه|عايزة|عاوز|عاوزه|عاوزة|ابي|ابغى|ابغي|احتاج|أحتاج|بدي)\s+(?:مساعده|مساعدة|مساعدتك|حد\s+يساعدني|حد\s+يساعدنى)$/,
  /^(?:ممكن|تقدر|تقدري|تقدرون|ينفع)\s+(?:تساعدني|تساعدنى|تساعديني|تساعدونا|تساعدني\s+شوي|تساعدني\s+شويه)$/,
  /^(?:ساعدني|ساعدنى|ساعديني|ساعدونا|help me|i need help)$/,
  /^(?:عندي|عندى|عندي\s+لو\s+سمحت)\s+(?:سؤال|استفسار)$/,
  /^(?:ممكن|ينفع|اقدر|أقدر)\s+(?:اسال|اسأل|اسالك|أسألك)\s+(?:سؤال|حاجه|حاجة|شي|شيء)?$/,
  /^(?:عايز|عايزه|عايزة|عاوز|عاوزه|عاوزة|ابي|ابغى|ابغي|بدي)\s+(?:اسالك|أسألك|اقولك|أقولك)\s+(?:حاجه|حاجة|شي|شيء|سؤال)$/,
  /^(?:مش|مو|مب)\s+(?:عارف|عارفه|عارفة)\s+(?:ابدأ|أبدأ|ابدا)\s+(?:منين|ازاي|إزاي|كيف|وين)$/,
  /^(?:انا\s+)?(?:تايه|تايهه|تايهة|محتار|محتاره|محتارة|مش\s+فاهم|مش\s+فاهمه|مش\s+فاهمة|مو\s+فاهم|مب\s+فاهم)$/
];

const FRUSTRATION=[
  /^(?:انا\s+)?(?:تعبت|زهقت|اتخنقت|خلاص\s+تعبت|مش\s+قادر|مش\s+قادره|مش\s+قادرة|مو\s+قادر|مب\s+قادر)$/,
  /(?:كل\s+مره|كل\s+مرة).{0,35}(?:نفس\s+المشكله|نفس\s+المشكلة|مش\s+فاهم|ما\s+يفهم)/,
  /(?:مش|مو|مب)\s+(?:فاهم|فاهمه|فاهمة).{0,30}(?:اعمل|أسوي|اسوي|الحل)/
];


const GREETING=[
  /^(?:السلام(?:\s+عليكم)?|سلام|اهلا|اهلين|مرحبا|هلا|هاي|hello|hi)(?:\s+.*)?$/i,
  /^(?:صباح|مساء)\s+(?:الخير|النور)(?:\s+.*)?$/
];
const WELLBEING=[
  /^(?:كيف|شلون|شخبار|اخبار|علوم)(?:ك|كم|كن)?(?:\s+.*)?$/u,
  /^(?:كيف\s+(?:حال|احوال|اخبار|علوم)(?:ك|كم|كن)?|شو\s+اخبار(?:ك|كم)?|وش\s+اخبار(?:ك|كم)?|عامل(?:ه|ة)?\s+(?:ايه|إيه|كيف)|ازيك(?:م|و)?|إزيك(?:م|و)?|how\s+are\s+you)(?:\s+.*)?$/iu
];

const FEMALE=/(?:محتاجه|محتاجة|عايزه|عايزة|عاوزه|عاوزة|عارفه|عارفة|فاهمه|فاهمة|قادره|قادرة|تايهه|تايهة|محتاره|محتارة|ساعديني)/;
const QUESTION_PERMISSION=/(?:عندي|عندى).*(?:سؤال|استفسار)|(?:ممكن|اقدر|أقدر|ينفع).*(?:اسال|اسأل|اسالك|أسألك)|(?:عايز|عايزه|عايزة|عاوز|عاوزه|عاوزة|ابي|ابغى|ابغي|بدي).*(?:اسالك|أسألك)/;
const LOST=/(?:مش|مو|مب)\s+(?:عارف|عارفه|عارفة|فاهم|فاهمه|فاهمة)|(?:تايه|تايهه|تايهة|محتار|محتاره|محتارة)/;

export function classifyNaturalConversationV32(message=""){
  const text=n(message);if(!text)return null;
  const female=FEMALE.test(text);
  if(FRUSTRATION.some(rx=>rx.test(text)))return {version:VERSION,intent:"frustration",confidence:.97,speech_act:"statement",subtype:"frustration",female,text};
  if(WELLBEING.some(rx=>rx.test(text)))return {version:VERSION,intent:"wellbeing",confidence:.98,speech_act:"question",subtype:"wellbeing",female,text};
  if(GREETING.some(rx=>rx.test(text)))return {version:VERSION,intent:"greeting",confidence:.98,speech_act:"greeting",subtype:"greeting",female,text};
  if(HELP_ONLY.some(rx=>rx.test(text))){
    const subtype=QUESTION_PERMISSION.test(text)?"question_permission":LOST.test(text)?"lost":"help";
    return {version:VERSION,intent:"help_request",confidence:.98,speech_act:"request",subtype,female,text};
  }
  return null;
}

export function composeNaturalConversationReplyV32(frame={},locale="ar"){
  if(!frame)return "";
  if(locale==="en"){
    if(frame.intent==="frustration")return "I understand this has been frustrating. Tell me the last thing you tried and what happened, and I'll work through it with you step by step.";
    if(frame.intent==="wellbeing")return "I'm doing well, thanks. How are you?";
    if(frame.intent==="greeting")return "Hi! How can I help you today?";
    if(frame.subtype==="question_permission")return "Of course—ask your question in your own words, and I'll answer what you actually wrote.";
    if(frame.subtype==="lost")return "No problem—we can start from the beginning. Tell me what you're trying to do or what is going wrong, and I'll take it one step at a time.";
    return "Of course, I'm with you. Tell me what you need help with in your own words, and we'll start from there.";
  }
  const withYou=frame.female?"معاكي":"معاك";
  const write=frame.female?"اكتبي":"اكتب";
  const tell=frame.female?"قولي":"قول";
  if(frame.intent==="frustration")return `فاهم إن الموضوع أتعبك، وأنا ${withYou}. ${tell} لي آخر حاجة عملتها وإيه اللي حصل بعدها، ونحلها خطوة خطوة.`;
  if(frame.intent==="wellbeing")return "تمام الحمد لله 😄 إنت عامل إيه؟";
  if(frame.intent==="greeting")return "أهلًا بيك 👋 قول لي محتاج إيه وأنا أساعدك.";
  if(frame.subtype==="question_permission")return `طبعًا، اسأل${frame.female?"ي":""} براحتك وبنفس طريقتك، وأنا هرد على اللي كتبته مباشرة.`;
  if(frame.subtype==="lost")return `ولا يهمك، نبدأ من الأول. ${write} لي إيه اللي بتحاول${frame.female?"ي":""} تعمله أو فين المشكلة، وأنا أمشي ${withYou} خطوة خطوة.`;
  return `أكيد، أنا ${withYou}. ${write} محتاج${frame.female?"ة":""} مساعدة في إيه بطريقتك؟ وأنا أبدأ من نفس النقطة.`;
}

const PRODUCT_STOP=new Set([
  "انا","انت","انتي","احنا","هو","هي","ده","دي","دا","هذا","هذه","هذي","في","من","على","علي","عن","مع","لو","بس","طب","طيب",
  "محتاج","محتاجه","محتاجة","عايز","عايزه","عايزة","عاوز","عاوزه","عاوزة","ابي","ابغى","ابغي","بدي","احتاج","اريد",
  "مساعده","مساعدة","مساعدتك","ساعدني","ساعدنى","ساعديني","تساعدني","تساعدنى","سؤال","استفسار","حاجه","حاجة","شي","شيء",
  "هل","ايه","إيه","شو","وش","كيف","ليه","لماذا","فين","وين","ممكن","ينفع","اقدر","أقدر","عندي","عندى","موجود","متوفر",
  "السعر","سعر","بكام","بكم","تفاصيل","استخدام","توصيل","شحن","سمحت","please","help","need","want"
]);
const PRODUCT_SIGNAL=/(?:منتج|بذور|بذره|بذرة|سماد|اسمده|أسمدة|مبيد|ري|خيار|طماطم|فلفل|باذنجان|كوسه|كوسة|بطيخ|شمام|باميه|بامية|ذره|ذرة|بصل|sku|seed|fertili[sz]er|pesticide|product|irrigation|\bf1\b|\b[A-Z]{1,5}[A-Z0-9_-]{3,20}\b|\d{2,3}\s*[-/]\s*\d{2,3})/i;
const PURE_CONVERSATION=/(?:مساعده|مساعدة|مساعدتك|ساعدني|تساعدني|عندي\s+سؤال|مش\s+فاهم|مو\s+فاهم|تعبت|زهقت|محتاج\s+حد)/;

export function isCredibleProductReferenceV32(value="",{message="",productTask=false,trusted=false}={}){
  const raw=clean(value,320),text=n(raw),source=n(message||raw);if(!raw||!text)return false;
  if(PURE_CONVERSATION.test(text)&&!PRODUCT_SIGNAL.test(text))return false;
  const meaningful=tokenize(text).filter(token=>token.length>=2&&!PRODUCT_STOP.has(token));
  if(!meaningful.length)return false;
  if(trusted)return true;
  if(PRODUCT_SIGNAL.test(source)||PRODUCT_SIGNAL.test(text))return true;
  if(!productTask)return false;
  return meaningful.length>=2||meaningful[0].length>=4;
}

export function naturalConversationHealthV32(){return {version:VERSION,ready:true,capabilities:["whole_help_request_detection","frustration_support","dialect_gender_agreement","non_factual_social_bypass","false_product_reference_guard"],rule:"conversation_is_never_treated_as_product_or_missing_business_truth"};}
