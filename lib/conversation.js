import { normalizeAr, tokenize } from "./utils.js";

const TOPICS = new Set([
  "shipping","branches","contact","payment","returns","privacy","terms","cookies","hours",
  "categories","services","greenhouse","irrigation","hydroponics","fertilizer","pesticide","product","company","order"
]);

const EMIRATES = [
  ["ابوظبي","أبوظبي"],["دبي","دبي"],["الشارقه","الشارقة"],["عجمان","عجمان"],
  ["ام القيوين","أم القيوين"],["راس الخيمه","رأس الخيمة"],["الفجيره","الفجيرة"],["العين","العين"]
];

function n(v){ return normalizeAr(v||""); }

export function detectEmirate(value=""){
  const t=n(value);
  for(const [key,label] of EMIRATES){
    const bare=key.replace(/^ال/,"");
    const variants=[key,`ل${key}`,`ب${key}`,`لل${bare}`,`بال${bare}`,`فال${bare}`];
    if(variants.some(v=>t.includes(v))) return label;
  }
  return "";
}

export function explicitTopic(message=""){
  const t=n(message);
  if(!t) return "";
  if(/(شحن|توصيل|دليفري|shipping|delivery|يوصل|توصلون)/.test(t)) return "shipping";
  if(/(فروع|فرع|وينكم|موقعكم|location|branches?)/.test(t)) return "branches";
  if(/(واتساب|هاتف|تواصل|اتصال|ايميل|البريد|phone|contact|email)/.test(t)) return "contact";
  if(/(دفع|كاش|نقدي|بطاقه|بطاقة|فيزا|ماستر|payment|cod)/.test(t)) return "payment";
  if(/(استرجاع|استبدال|ارجاع|إرجاع|refund|return|exchange)/.test(t)) return "returns";
  if(/(خصوصيه|خصوصية|privacy)/.test(t)) return "privacy";
  if(/(الشروط|شروط|احكام|أحكام|terms|conditions)/.test(t)) return "terms";
  if(/(كوكي|كوكيز|cookies?)/.test(t)) return "cookies";
  if(/(ساعات العمل|اوقات العمل|أوقات العمل|دوام|working hours)/.test(t)) return "hours";
  if(/(طلبي|طلبى|حاله الطلب|حالة الطلب|تتبع الطلب|order status|track order)/.test(t)) return "order";
  if(/(بيت محمي|بيوت محميه|بيوت محمية|جرين هاوس|greenhouse)/.test(t)) return "greenhouse";
  if(/(زراعه مائيه|زراعة مائية|هيدروبونيك|hydroponic)/.test(t)) return "hydroponics";
  if(/(شبكه ري|شبكة ري|تنقيط|تايمر ري|مؤقت ري|irrigation|drip)/.test(t)) return "irrigation";
  if(/(سماد|اسمده|اسمدة|تغذيه النبات|تغذية النبات|fertili[sz]er)/.test(t)) return "fertilizer";
  if(/(مبيد|مبيدات|حشرات|حشره|حشرة|pesticide|insecticide)/.test(t)) return "pesticide";
  if(/(بذور|بذره|بذرة|طماطم|خيار|باذنجان|فلفل|بطيخ|شمام|كوس|باميه|بامية|بصل|ذره|ذرة|فجل|شمندر|سبانخ|ملوخيه|ملوخية|seeds?|tomato|cucumber|eggplant|pepper|watermelon|zucchini|okra)/.test(t)) return "product";
  if(/(خدمات|استشارات|استشاره|استشارة|services?|consult)/.test(t)) return "services";
  if(/(شو عندكم|وش عندكم|ايش عندكم|اقسامكم|أقسامكم|شو تبيعون|categories|what do you sell)/.test(t)) return "categories";
  if(/(من نحن|منو انتم|مين انتم|عن الشركه|عن الشركة|about us|company info)/.test(t)) return "company";
  return "";
}

function sourceToTopic(source=""){
  const s=String(source||"");
  if(/shipping|delivery/.test(s)) return "shipping";
  if(/branch/.test(s)) return "branches";
  if(/contact|email|human/.test(s)) return "contact";
  if(/payment/.test(s)) return "payment";
  if(/return/.test(s)) return "returns";
  if(/privacy/.test(s)) return "privacy";
  if(/terms/.test(s)) return "terms";
  if(/cookie/.test(s)) return "cookies";
  if(/hour/.test(s)) return "hours";
  if(/greenhouse/.test(s)) return "greenhouse";
  if(/hydroponic/.test(s)) return "hydroponics";
  if(/irrigation/.test(s)) return "irrigation";
  if(/fertilizer/.test(s)) return "fertilizer";
  if(/pesticide/.test(s)) return "pesticide";
  if(/product|conversation_/.test(s)) return "product";
  if(/service/.test(s)) return "services";
  if(/categor/.test(s)) return "categories";
  if(/company/.test(s)) return "company";
  if(/order/.test(s)) return "order";
  return "";
}

export function sanitizeConversationState(value){
  if(!value || typeof value!=="object" || Array.isArray(value)) return {};
  const topic=TOPICS.has(String(value.topic||""))?String(value.topic):"";
  return {
    v:2,
    topic,
    emirate:String(value.emirate||"").slice(0,40),
    product_query:String(value.product_query||"").slice(0,300),
    selected_product:String(value.selected_product||"").slice(0,300),
    last_source:String(value.last_source||"").slice(0,100),
    last_user_message:String(value.last_user_message||"").slice(0,500)
  };
}

function assistantTopic(text=""){
  const t=n(text);
  if(/(التوصيل القياسي|الشحن القياسي|رسوم الشحن|داخل الامارات|داخل الإمارات)/.test(t)) return "shipping";
  if(/(فرع العين|فرع الشارقه|فرع الشارقة|عندنا فرعين)/.test(t)) return "branches";
  if(/(طرق الدفع|وقت اتمام الطلب|وقت إتمام الطلب)/.test(t)) return "payment";
  if(/(سياسه الخصوصيه|سياسة الخصوصية)/.test(t)) return "privacy";
  if(/(الشروط والاحكام|الشروط والأحكام)/.test(t)) return "terms";
  if(/(ملفات الارتباط|سياسه الكوكيز|سياسة الكوكيز)/.test(t)) return "cookies";
  if(/(حصلت لك .*منتج|حصلت لك .*منتجات|ارخص سعر|أرخص سعر|اعلى سعر|أعلى سعر)/.test(t)) return "product";
  if(/(حلول وتجهيز بيوت محميه|حلول وتجهيز بيوت محمية)/.test(t)) return "greenhouse";
  return "";
}

export function inferStateFromHistory(history=[]){
  const state={v:2,topic:"",emirate:"",product_query:"",selected_product:"",last_source:"",last_user_message:""};
  for(let i=history.length-1;i>=0;i--){
    const item=history[i];
    if(!item || typeof item.content!=="string") continue;
    if(item.role==="assistant" && !state.topic){
      state.topic=assistantTopic(item.content);
    }
    if(item.role==="user"){
      if(!state.last_user_message) state.last_user_message=item.content.slice(0,500);
      const topic=explicitTopic(item.content);
      if(!state.topic && topic) state.topic=topic;
      if(!state.emirate) state.emirate=detectEmirate(item.content);
      if(!state.product_query && topic==="product") state.product_query=item.content.slice(0,300);
    }
    if(state.topic && state.last_user_message && (state.emirate || state.topic!=="shipping")) break;
  }
  return state;
}

export function mergeConversationState(clientState={},history=[]){
  const a=sanitizeConversationState(clientState);
  const b=inferStateFromHistory(history);
  return {
    v:2,
    topic:a.topic||b.topic||"",
    emirate:a.emirate||b.emirate||"",
    product_query:a.product_query||b.product_query||"",
    selected_product:a.selected_product||b.selected_product||"",
    last_source:a.last_source||"",
    last_user_message:a.last_user_message||b.last_user_message||""
  };
}

function lowSpecificity(message=""){
  const t=n(message);
  const words=tokenize(t);
  if(words.length<=4) return true;
  return /^(طب|طيب|زين|اوكي|أوكي|و|بس|يعني|داخل|خارج|هناك|هنا|وهناك|وهني|بعد|اي|ايوه|هيه)/.test(t);
}

function hasFollowupCue(message=""){
  const t=n(message);
  return /(^(طب|طيب|زين|اوكي|أوكي|و)|داخل|هناك|هنا|نفسه|نفسها|فيها|فيه|عندهم|عندكم|بعد|طيب لو|والعين|ودبي|والشارقه|والشارقة|وكم|وبكم|ومتوفر|والحار|والحلو)/.test(t);
}

function topicAnchor(topic){
  const map={
    shipping:"شحن توصيل داخل الإمارات",
    branches:"فروع MIG FARM ومواقع الفروع",
    contact:"التواصل مع MIG FARM",
    payment:"طرق الدفع في MIG FARM",
    returns:"الاسترجاع والاستبدال في MIG FARM",
    privacy:"سياسة الخصوصية في MIG FARM",
    terms:"الشروط والأحكام في MIG FARM",
    cookies:"سياسة الكوكيز في MIG FARM",
    hours:"أوقات دوام فروع MIG FARM",
    categories:"أقسام ومنتجات MIG FARM",
    services:"خدمات MIG FARM الزراعية",
    greenhouse:"البيوت المحمية في MIG FARM",
    irrigation:"مستلزمات الري في MIG FARM",
    hydroponics:"الزراعة المائية في MIG FARM",
    fertilizer:"الأسمدة وتغذية النبات في MIG FARM",
    pesticide:"المبيدات في MIG FARM",
    product:"منتجات MIG FARM",
    company:"MIG FARM من نحن",
    order:"حالة طلب MIG FARM"
  };
  return map[topic]||"";
}

export function contextualRewrite(message,state={},history=[]){
  const raw=String(message||"").trim();
  if(!raw) return {query:"",used:false,topic:""};

  const explicit=explicitTopic(raw);
  if(explicit) return {query:raw,used:false,topic:explicit};

  const merged=mergeConversationState(state,history);
  if(!merged.topic) return {query:raw,used:false,topic:""};

  const shouldUse=lowSpecificity(raw) || hasFollowupCue(raw);
  if(!shouldUse) return {query:raw,used:false,topic:""};

  if(merged.topic==="product" && merged.product_query){
    return {query:`${merged.product_query} ${raw}`.trim(),used:true,topic:"product"};
  }

  const anchor=topicAnchor(merged.topic);
  return {query:`${anchor} ${raw}`.trim(),used:Boolean(anchor),topic:merged.topic};
}

export function ambiguityReply(message,state={},history=[],locale="ar"){
  const t=n(message);
  const merged=mergeConversationState(state,history);
  if(explicitTopic(message)) return null;

  // Example: a naked location fragment without a reliable previous topic.
  if(detectEmirate(t) && !merged.topic){
    return locale==="en"
      ? "Do you mean delivery to that area, or the nearest MIG FARM branch?"
      : "تقصد التوصيل لهالإمارة، ولا تبا أقرب فرع لـ MIG FARM؟";
  }

  if(lowSpecificity(message) && !merged.topic && tokenize(t).length<=3){
    return locale==="en"
      ? "I want to make sure I understand you. What is this about: a product, delivery, a branch, or a service?"
      : "أبغي أتأكد إني فاهمك صح: تقصد منتج، شحن، فرع، ولا خدمة؟";
  }
  return null;
}

export function isClearlyOffDomain(message=""){
  const t=n(message);
  if(!t) return false;
  const onDomain=explicitTopic(message) || /(زرع|زراعه|زراعة|نبات|محصول|مزرعه|مزرعة|تسميد|ري|حشرات|تربه|تربة|mig|farm)/.test(t);
  if(onDomain) return false;
  return /(ويندوز|كمبيوتر|برمجه|برمجة|سياسه|سياسة دولية|كره قدم|كرة قدم|فيلم|اغنيه|أغنية|طبخ|سياره|سيارة|موبايل|هاتف ايفون|iphone|windows|programming|football|movie|recipe|car)/.test(t);
}

export function nextConversationState({previous={},source="",message="",results=[],currentProduct=null}){
  const old=sanitizeConversationState(previous);
  const explicit=explicitTopic(message);
  const fromSource=sourceToTopic(source);
  const topic=explicit || fromSource || old.topic || "";
  const emirate=detectEmirate(message) || old.emirate || "";
  let productQuery=old.product_query||"";
  let selected=old.selected_product||"";

  if(topic==="product"){
    if(explicit==="product" && message) productQuery=String(message).slice(0,300);
    if(Array.isArray(results) && results.length===1) selected=String(results[0]?.name||"").slice(0,300);
    if(currentProduct?.name) selected=String(currentProduct.name).slice(0,300);
  }else if(explicit && explicit!=="product"){
    productQuery="";
    selected="";
  }

  return {
    v:2,topic,emirate,product_query:productQuery,selected_product:selected,
    last_source:String(source||"").slice(0,100),last_user_message:String(message||"").slice(0,500)
  };
}

export function quickRepliesFor(topic="",locale="ar",hasProducts=false){
  const en=locale==="en";
  if(hasProducts) return en?["Cheapest?","Available only","Compare them"]:["الأرخص فيهم؟","المتوفر منهم؟","قارن بينهم"];
  const map={
    shipping: en?["Delivery to Dubai?","Delivery fee?","Branches"]:["والتوصيل لدبي؟","رسوم الشحن كام؟","وين فروعكم؟"],
    branches: en?["Al Ain branch","Sharjah branch","WhatsApp"]:["فرع العين","فرع الشارقة","رقم الواتساب"],
    fertilizer: en?["Show fertilizers","Available only","WhatsApp"]:["اعرض الأسمدة","المتوفر فقط","كلم الفريق"],
    product: en?["Cheapest?","Available only","Other options"]:["الأرخص؟","المتوفر؟","خيارات ثانية"],
    categories: en?["Seeds","Fertilizers","Irrigation"]:["البذور","الأسمدة","الري"],
    greenhouse: en?["I need a greenhouse","WhatsApp"]:["أبغي بيت محمي","كلم الفريق"]
  };
  return map[topic]||[];
}
