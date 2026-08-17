import { BUSINESS, CATEGORIES, CROPS, GREENHOUSE_KNOWLEDGE } from "./brain.js";
import { sanitizeCustomerProfile, hasAnswered } from "./customer.js";
import { normalizeAr } from "./utils.js";

function n(v=""){ return normalizeAr(String(v||"")); }
function clip(v,max=300){ return String(v||"").trim().slice(0,max); }

function hasBuyingWords(message=""){
  return /(ابغي اطلب|أبغي أطلب|ابي اطلب|أبي أطلب|عايز اطلب|عاوز اطلب|اشتري|أشتري|اخذه|آخذه|اطلبه|أطلبه|احجز|أحجز|buy|order now|place order)/.test(n(message));
}
function hasQuoteWords(message=""){
  return /(عرض سعر|كوتيشن|quotation|quote|سعر جمله|سعر جملة|bulk|wholesale|جمله|جملة)/.test(n(message));
}
function hasCompareWords(message=""){
  return /(قارن|مقارنه|مقارنة|الفرق|ارخص|أرخص|اغلى|أغلى|compare|difference|cheapest)/.test(n(message));
}
function hasHumanWords(message=""){
  return /(موظف|مندوب|كلم الفريق|واتساب|اكلم حد|أكلم حد|human|agent|sales)/.test(n(message));
}

export function leadScore({analysis={},profile={},state={},message="",source="",results=[]}={}){
  const p=sanitizeCustomerProfile(profile);
  let score=0;
  const reasons=[];
  const add=(points,reason)=>{ score+=points; reasons.push(reason); };

  if(p.category) add(4,"category_known");
  if(p.crop) add(5,"crop_known");
  if(p.emirate) add(5,"emirate_known");
  if(p.cultivation) add(4,"cultivation_known");
  if(p.quantity) add(10,"quantity_known");
  if(p.area) add(12,"area_known");
  if(p.budget) add(8,"budget_known");
  if(p.project_type) add(6,"project_type_known");
  if(p.goal) add(4,"goal_known");
  if(p.urgency==="high") add(8,"urgent");
  if(p.purchase_intent==="buy" || hasBuyingWords(message)) add(22,"buy_intent");
  if(p.purchase_intent==="quote" || hasQuoteWords(message)) add(20,"quote_intent");
  if(hasHumanWords(message) || analysis.intent==="human") add(16,"human_handoff_requested");
  if((analysis.category?.key||state.category||p.category)==="greenhouse") add(16,"greenhouse_project");
  if(Array.isArray(results)&&results.length) add(4,"products_viewed");
  if(source.includes("memory_compare") || hasCompareWords(message)) add(6,"comparison_behavior");
  if(source.includes("complaint")) score=Math.max(0,score-5);

  score=Math.max(0,Math.min(100,score));
  const temperature=score>=55?"hot":score>=28?"warm":"cold";
  return {score,temperature,reasons:[...new Set(reasons)]};
}

export function journeyStage({analysis={},profile={},state={},message="",results=[]}={}){
  const p=sanitizeCustomerProfile(profile);
  const category=analysis.category?.key||state.category||p.category||"";
  if(analysis.intent==="complaint" || analysis.intent==="order_status") return "support";
  if(hasHumanWords(message) || analysis.intent==="human") return "handoff";
  if(p.purchase_intent || hasBuyingWords(message) || hasQuoteWords(message)) return "ready";
  if(hasCompareWords(message) || analysis.intent==="product_memory") return "compare";
  if(Array.isArray(results)&&results.length) return "consider";
  if(analysis.intent==="recommendation") return "qualify";
  if(category || p.crop) return "explore";
  return "discover";
}

function labelCrop(key=""){
  return CROPS[key]?.labelAr || key;
}
function labelCategory(key=""){
  return CATEGORIES[key]?.labelAr || key;
}
function projectLabel(key=""){
  return ({home:"منزلي",farm:"مزرعة",commercial:"مشروع تجاري"})[key]||key;
}

export function nextBestQuestion({analysis={},profile={},state={},stage=""}={}){
  const p=sanitizeCustomerProfile(profile);
  const category=analysis.category?.key||state.category||p.category||"";
  const crop=analysis.crop?.key||state.crop||p.crop||"";

  if(["support","handoff","ready"].includes(stage)) return null;

  if(category==="seeds" || crop){
    if(!hasAnswered(p,"crop")) return {field:"crop",reply:"تمام، شو المحصول اللي تبا تزرعه؟",quick_replies:["طماطم","خيار","فلفل","باذنجان"]};
    if(!hasAnswered(p,"cultivation")) return {field:"cultivation",reply:`تمام، ${labelCrop(crop)}. زراعتك مكشوفة ولا بيت محمي؟`,quick_replies:["مكشوف","بيت محمي"]};
    if(!hasAnswered(p,"emirate")) return {field:"emirate",reply:"وفي أي إمارة؟",quick_replies:["العين","الشارقة","دبي","أبوظبي"]};
    if(!hasAnswered(p,"quantity")) return {field:"quantity",reply:"تبا كمية تجربة صغيرة ولا كمية للمزرعة/المشروع؟",quick_replies:["كمية صغيرة","للمزرعة","للمشروع"]};
    return null;
  }

  if(category==="fertilizer"){
    if(!hasAnswered(p,"crop")) return {field:"crop",reply:"شو المحصول اللي تبا تستخدم له السماد؟"};
    if(!hasAnswered(p,"goal")) return {field:"goal",reply:"وش الهدف منه: نمو، تزهير/إثمار، ولا عندك نقص أو مشكلة معينة؟",quick_replies:["نمو","تزهير وإثمار","نقص عناصر","مشكلة بالنبات"]};
    if(!hasAnswered(p,"cultivation")) return {field:"cultivation",reply:"الزراعة مكشوفة ولا بيت محمي/زراعة مائية؟",quick_replies:["مكشوف","بيت محمي","زراعة مائية"]};
    return null;
  }

  if(category==="pesticide"){
    if(!hasAnswered(p,"crop")) return {field:"crop",reply:"قبل نختار مبيد، شو المحصول أو المكان اللي عندك فيه المشكلة؟"};
    return {field:"diagnosis",reply:"أرسل صورة واضحة للإصابة أو اكتب اسم الحشرة/العَرَض، لأن اختيار مبيد من غير تشخيص ممكن يكون غلط.",quick_replies:["حشرات طائرة","حشرات زاحفة","قراد/عث","إصابة نبات"]};
  }

  if(category==="greenhouse"){
    if(!hasAnswered(p,"project_type")) return {field:"project_type",reply:"البيت المحمي تبيه للمنزل، لمزرعة، ولا مشروع تجاري؟",quick_replies:["للمنزل","لمزرعة","مشروع تجاري"]};
    if(!hasAnswered(p,"emirate")) return {field:"emirate",reply:"في أي إمارة بيكون المشروع؟",quick_replies:["العين","الشارقة","دبي","أبوظبي"]};
    if(!hasAnswered(p,"area")) return {field:"area",reply:"كم المساحة التقريبية؟ حتى رقم تقريبي بالمتر المربع يكفيني."};
    if(!hasAnswered(p,"crop")) return {field:"crop",reply:"وش المحصول أو الاستخدام الأساسي للبيت المحمي؟"};
    return null;
  }

  if(category==="irrigation" || category==="hydroponics"){
    if(!hasAnswered(p,"project_type")) return {field:"project_type",reply:"الاستخدام للبيت، لمزرعة، ولا مشروع؟",quick_replies:["للبيت","لمزرعة","مشروع"]};
    if(!hasAnswered(p,"area")) return {field:"area",reply:"إذا تعرف المساحة أو عدد المناطق/الخطوط اكتبها، عشان نضيّق الخيارات."};
    return null;
  }

  if(category==="tools"){
    if(!hasAnswered(p,"goal")) return {field:"goal",reply:"شو الشغلة اللي تبا الأداة لها بالضبط: حفر، قص، تقليم، ولا قياس؟",quick_replies:["حفر","تقليم","قص","قياس"]};
    return null;
  }

  return null;
}

function waBase(){
  try{
    const u=new URL(BUSINESS.whatsapp);
    u.search="";
    return u.toString();
  }catch{
    return BUSINESS.whatsapp;
  }
}

export function buildHandoffSummary({profile={},state={},analysis={},message=""}={}){
  const p=sanitizeCustomerProfile(profile);
  const lines=["طلب من مساعد MIG FARM"];
  const category=analysis.category?.key||state.category||p.category;
  const crop=analysis.crop?.key||state.crop||p.crop;
  if(category) lines.push(`القسم: ${labelCategory(category)}`);
  if(crop) lines.push(`المحصول: ${labelCrop(crop)}`);
  if(p.emirate||state.emirate) lines.push(`الإمارة: ${p.emirate||state.emirate}`);
  if(p.cultivation||state.cultivation) lines.push(`طريقة الزراعة: ${p.cultivation||state.cultivation}`);
  if(p.quantity||state.quantity) lines.push(`الكمية: ${p.quantity||state.quantity}`);
  if(p.area) lines.push(`المساحة: ${p.area}`);
  if(p.project_type) lines.push(`نوع المشروع: ${projectLabel(p.project_type)}`);
  if(p.goal) lines.push(`الهدف: ${p.goal}`);
  if(p.budget) lines.push(`الميزانية المذكورة: ${p.budget}`);
  if(p.pepper_type||state.pepper_type) lines.push(`نوع الفلفل: ${p.pepper_type||state.pepper_type}`);
  if(p.positive_preferences.length) lines.push(`يفضل: ${p.positive_preferences.join("، ")}`);
  if(p.negative_preferences.length) lines.push(`لا يفضل: ${p.negative_preferences.join("، ")}`);
  if(state.selected_product) lines.push(`المنتج المحدد: ${state.selected_product}`);
  if(message && hasQuoteWords(message)) lines.push("الطلب: عرض سعر");
  else if(message && hasBuyingWords(message)) lines.push("الطلب: جاهز للشراء");
  return lines.slice(0,12).join("\n");
}

export function buildWhatsAppHandoff(context={}){
  const summary=buildHandoffSummary(context);
  const base=waBase();
  const sep=base.includes("?")?"&":"?";
  return {
    type:"whatsapp",
    label:"كمل مع فريق MIG FARM",
    url:`${base}${sep}text=${encodeURIComponent(summary)}`
  };
}

export function salesQuickReplies({category="",stage="",results=[],profile={}}={}){
  const p=sanitizeCustomerProfile(profile);
  if(stage==="ready" || stage==="handoff") return ["كلم الفريق","أبغي عرض سعر"];
  if(category==="seeds" && results.length) return ["الأرخص فيهم؟","المتوفر منهم؟","قارن بينهم","أبغي أطلب"];
  if(category==="fertilizer" && results.length) return ["المتوفر منهم؟","الأرخص فيهم؟","وش الفرق؟","أبغي أطلب"];
  if(category==="pesticide" && results.length) return ["المتوفر منهم؟","تفاصيل المنتج","أرسل صورة الإصابة","كلم الفريق"];
  if(category==="tools" && results.length) return ["الأرخص فيهم؟","المتوفر؟","قارن بينهم","أبغي أطلب"];
  if(category==="irrigation" && results.length) return ["المتوفر؟","قارن بينهم","أبغي أطلب","كلم الفريق"];
  if(category==="greenhouse") return ["للمنزل","لمزرعة","أبغي عرض سعر","كلم الفريق"];
  if(p.price_focus==="value" && results.length) return ["رتبهم من الأرخص","المتوفر منهم؟","أبغي أطلب"];
  return [];
}

export function purchaseContinuation({profile={},state={},analysis={},message=""}={}){
  const p=sanitizeCustomerProfile(profile);
  if(!(p.purchase_intent || hasBuyingWords(message) || hasQuoteWords(message))) return null;
  const rows=Array.isArray(state.last_products)?state.last_products:[];
  if(rows.length){
    return {
      reply:"تمام 👍 إذا تقصد واحد من آخر المنتجات اللي عرضتهم لك، اكتب اسمه أو ترتيبه (الأول/الثاني)، أو كمل مع الفريق والملخص بيتجهز لهم.",
      quick_replies:["الأول","الثاني","أبغي عرض سعر"],
      actions:[buildWhatsAppHandoff({profile:p,state,analysis,message})],
      source:"sales_ready_with_products"
    };
  }
  return null;
}

export function greenhouseLeadReply({profile={},state={},analysis={},stage=""}={}){
  const p=sanitizeCustomerProfile(profile);
  const next=nextBestQuestion({analysis,profile:p,state,stage});
  const comps=GREENHOUSE_KNOWLEDGE.components.join("، ");
  if(next){
    return {
      reply:`هيه، عند MIG FARM حلول وتجهيز بيوت محمية، والتجهيز ممكن يشمل ${comps}. عشان ما نعطيك كلام عام: ${next.reply}`,
      quick_replies:next.quick_replies||[],
      source:`greenhouse_qualify_${next.field}`
    };
  }
  return {
    reply:"تمام، عندي بيانات كفاية كبداية للمشروع. أقدر أجهز لك انتقال للفريق بملخص المحصول والإمارة والمساحة بدل ما تعيد الكلام من الأول.",
    quick_replies:["أبغي عرض سعر","كلم الفريق"],
    actions:[buildWhatsAppHandoff({profile:p,state,analysis})],
    source:"greenhouse_qualified"
  };
}
