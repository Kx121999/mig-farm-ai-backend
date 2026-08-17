import { normalizeAr, tokenize } from "./utils.js";

function n(v=""){ return normalizeAr(String(v||"")); }
function words(v=""){ return tokenize(v); }
function clamp(v,min=0,max=100){ return Math.max(min,Math.min(max,Number(v)||0)); }
function uniq(items=[],limit=12){
  const seen=new Set(),out=[];
  for(const item of items){
    const value=String(item||"").trim();
    if(!value) continue;
    const key=n(value); if(!key||seen.has(key)) continue;
    seen.add(key); out.push(value); if(out.length>=limit) break;
  }
  return out;
}
function numericPrice(p){
  const x=Number(String(p?.price??"").replace(/[^0-9.]/g,""));
  return Number.isFinite(x)?x:null;
}
function isAvailable(p){ return !/(غير متوفر|out of stock|unavailable|نفد|sold out)/.test(n(p?.availability)); }
function cleanProduct(p={}){
  return {
    name:String(p?.name||"").slice(0,300), price:String(p?.price??"").slice(0,80), currency:String(p?.currency||"AED").slice(0,20),
    availability:String(p?.availability||"").slice(0,100), url:String(p?.url||"").slice(0,1000), sku:String(p?.sku||"").slice(0,120),
    image:String(p?.image||"").slice(0,1000), product_template_id:Number(p?.product_template_id)||null, product_id:Number(p?.product_id)||null
  };
}

function requestedCount(message=""){
  const t=n(message);
  const direct=t.match(/(?:عايز|عاوز|ابي|ابغي|احتاج|اريد|اختار|رشح|هات|give me|show me)\s*(?:لي\s*)?([1-4])\s*(?:منتج|منتجات|خيار|خيارات|اصناف|items?|products?|options?)/);
  if(direct) return Number(direct[1]);
  const noun=t.match(/([1-4])\s*(?:منتج|منتجات|خيار|خيارات|اصناف|items?|products?|options?)/);
  if(noun) return Number(noun[1]);
  const wordMap=[["واحد",1],["واحده",1],["اثنين",2],["اتنين",2],["اثنان",2],["ثلاثه",3],["تلاته",3],["اربع",4],["اربعه",4]];
  for(const [word,count] of wordMap){
    if(new RegExp(`(?:عايز|عاوز|ابي|ابغي|احتاج|اريد|اختار|رشح|هات)?\\s*${word}\\s*(?:منتج|منتجات|خيار|خيارات|اصناف)?`).test(t) && t.includes(word)) return count;
  }
  return null;
}
function budgetConstraint(message="",analysis={}){
  const t=n(message);
  let total=null,maxUnit=null;
  let m=t.match(/(?:ميزانيتي|ميزانيه|ميزانيتي حوالي|budget)\s*(?:هي|حوالي|حدود)?\s*([0-9]+(?:\.[0-9]+)?)/);
  if(m) total=Number(m[1]);
  m=t.match(/(?:الاجمالي|اجمالي|كلهم|المجموع|total)\s*(?:تحت|اقل من|حده|حدود)?\s*([0-9]+(?:\.[0-9]+)?)/);
  if(m) total=Number(m[1]);
  m=t.match(/(?:تحت|اقل من|أقل من|بحد اقصي|حد اقصى|حد اقصي|under|max)\s*([0-9]+(?:\.[0-9]+)?)/);
  if(m && total===null) maxUnit=Number(m[1]);
  if(total===null && maxUnit===null && analysis?.budget!==null && analysis?.budget!==undefined && analysis?.budget!=="" && Number.isFinite(Number(analysis.budget))) total=Number(analysis.budget);
  return {total_budget:Number.isFinite(total)?total:null,max_unit_price:Number.isFinite(maxUnit)?maxUnit:null};
}
function goalFrom(message="",analysis={}){
  const t=n(message);
  if(/(قارن|مقارنه|مقارنة|الفرق|compare|versus| vs )/.test(` ${t} `)) return "compare";
  if(/(ارخص|اقل سعر|اوفر|اقتصادي|budget|cheap)/.test(t)) return "optimize_budget";
  if(/(اختار|رشح|انسب|أنسب|افضل|أفضل|اي واحد|أي واحد|recommend|best)/.test(t)) return "recommend";
  if(/(باقة|باكدج|مجموعة|مع بعض|bundle)/.test(t) || requestedCount(message)>1) return "bundle";
  if(/(اشتري|اطلب|اضف للسله|أضف للسلة|add to cart|buy|order)/.test(t)) return "purchase";
  if(["product_search","recommendation","product_memory"].includes(analysis?.intent)) return "discover_product";
  if(["shipping","delivery_time"].includes(analysis?.intent)) return "delivery";
  if(analysis?.intent==="plant_problem") return "diagnose";
  return "answer";
}
function pricePreference(message=""){
  const t=n(message);
  if(/(ارخص|اقل سعر|اوفر|اقتصادي|cheap|lowest)/.test(t)) return "lower";
  if(/(اغلي|أغلى|اعلي سعر|أعلى سعر|premium|highest)/.test(t)) return "higher";
  return "neutral";
}
function availabilityPreference(message=""){
  const t=n(message);
  if(/(مش لازم متوفر|مش شرط متوفر|مو لازم متوفر|مب لازم متوفر|التوفر مش مهم|availability not required)/.test(t)) return {value:false,explicit:true};
  if(/(متوفر|موجود|جاهز|في المخزون|in stock|available)/.test(t)) return {value:true,explicit:true};
  return {value:false,explicit:false};
}
function comparisonCriteria(message=""){
  const t=n(message),out=[];
  if(/(سعر|ارخص|اغلي|price|cost)/.test(t)) out.push("price");
  if(/(متوفر|مخزون|available|stock)/.test(t)) out.push("availability");
  if(/(مقاوم|مقاومه|resistan)/.test(t)) out.push("resistance");
  if(/(انتاج|إنتاج|yield)/.test(t)) out.push("yield");
  if(/(موسم|حر|برد|season)/.test(t)) out.push("season");
  if(/(مكشوف|بيت محمي|greenhouse|open field)/.test(t)) out.push("cultivation");
  return uniq(out,6);
}
function referenceToVisible(message=""){
  const t=n(message);
  return /(منهم|فيهم|دول|هذول|هذولا|اللي فوق|اللي عرضتهم|اللي ظاهرين|الاول|الثاني|التاني|الثالث|الرابع|ارخصهم|افضلهم)/.test(t);
}

export function buildCognitiveFrame({message="",analysis={},state={},profile={},history=[]}={}){
  const budget=budgetConstraint(message,analysis);
  const goal=goalFrom(message,analysis);
  const criteria=comparisonCriteria(message);
  const availability=availabilityPreference(message);
  const constraints={
    category:String(analysis?.category?.key||state?.category||profile?.category||""),
    crop:String(analysis?.crop?.key||state?.crop||profile?.crop||""),
    emirate:String(analysis?.emirate||state?.emirate||profile?.emirate||""),
    cultivation:String(analysis?.cultivation||state?.cultivation||profile?.cultivation||""),
    quantity:String(analysis?.quantity||state?.quantity||profile?.quantity||""),
    pepper_type:String(analysis?.pepperType||state?.pepper_type||""),
    requested_count:requestedCount(message),
    total_budget:budget.total_budget,
    max_unit_price:budget.max_unit_price,
    require_available:availability.value,
    availability_explicit:availability.explicit,
    price_preference:pricePreference(message),
    comparison_criteria:criteria
  };
  const explicit=Object.entries(constraints).filter(([,v])=>v!==""&&v!==null&&v!==false&&!(Array.isArray(v)&&!v.length)).map(([k])=>k);
  const unresolved=[];
  if(goal==="recommend" && !constraints.category && !constraints.crop) unresolved.push("product_or_category");
  if(goal==="compare" && !referenceToVisible(message) && !analysis?.seedVarieties?.length) unresolved.push("comparison_targets");
  if(goal==="diagnose") unresolved.push("crop_and_symptoms_or_image");
  const contextSwitch=Boolean(analysis?.hardSwitch || (analysis?.category?.key&&state?.category&&analysis.category.key!==state.category) || (analysis?.crop?.key&&state?.crop&&analysis.crop.key!==state.crop));
  let confidence=70;
  confidence+=Math.min(16,explicit.length*2);
  confidence-=unresolved.length*10;
  if(analysis?.correction) confidence+=2;
  if(analysis?.intent==="unknown") confidence-=10;
  return {
    v:1,goal,intent:String(analysis?.intent||"unknown"),constraints,
    references_visible_set:referenceToVisible(message),
    correction:Boolean(analysis?.correction),context_switch:contextSwitch,
    unresolved:uniq(unresolved,8),confidence:clamp(confidence,35,96),
    user_terms:words(message).slice(0,16),history_turns:Array.isArray(history)?history.length:0
  };
}

export function sanitizeCognitiveMemory(value={}){
  const v=value&&typeof value==="object"&&!Array.isArray(value)?value:{};
  const c=v.constraints&&typeof v.constraints==="object"?v.constraints:{};
  return {
    v:1,active_goal:String(v.active_goal||"").slice(0,60),
    constraints:{
      category:String(c.category||"").slice(0,60),crop:String(c.crop||"").slice(0,60),emirate:String(c.emirate||"").slice(0,60),cultivation:String(c.cultivation||"").slice(0,60),quantity:String(c.quantity||"").slice(0,80),pepper_type:String(c.pepper_type||"").slice(0,30),
      requested_count:Number(c.requested_count)||null,total_budget:c.total_budget!==null&&c.total_budget!==""&&Number.isFinite(Number(c.total_budget))?Number(c.total_budget):null,max_unit_price:c.max_unit_price!==null&&c.max_unit_price!==""&&Number.isFinite(Number(c.max_unit_price))?Number(c.max_unit_price):null,require_available:Boolean(c.require_available),availability_explicit:Boolean(c.availability_explicit),price_preference:["lower","higher","neutral"].includes(c.price_preference)?c.price_preference:"neutral",comparison_criteria:Array.isArray(c.comparison_criteria)?c.comparison_criteria.slice(0,6).map(String):[]
    },
    last_decision_basis:Array.isArray(v.last_decision_basis)?v.last_decision_basis.slice(0,8).map(x=>String(x).slice(0,120)):[],
    last_knowledge_gaps:Array.isArray(v.last_knowledge_gaps)?v.last_knowledge_gaps.slice(0,8).map(x=>String(x).slice(0,120)):[],
    decision_count:Math.max(0,Math.min(999,Number(v.decision_count)||0)),
    updated_turn:Math.max(0,Number(v.updated_turn)||0)
  };
}

export function mergeCognitiveMemory(previous={},frame={},turn=0){
  const old=sanitizeCognitiveMemory(previous);
  const reset=Boolean(frame?.correction||frame?.context_switch);
  const base=reset?sanitizeCognitiveMemory({}):old;
  const incoming=frame?.constraints||{};
  const merged={...base.constraints};
  for(const [key,val] of Object.entries(incoming)){
    if(val===null||val===""||(Array.isArray(val)&&!val.length)) continue;
    if(key==="availability_explicit"){ merged[key]=Boolean(val); continue; }
    if(key==="require_available"){
      if(incoming.availability_explicit) merged[key]=Boolean(val);
      continue;
    }
    if(typeof val==="boolean" && val===false) continue;
    if(key==="price_preference" && val==="neutral") continue;
    merged[key]=val;
  }
  return sanitizeCognitiveMemory({
    ...base,active_goal:frame?.goal&&frame.goal!=="answer"?frame.goal:base.active_goal,
    constraints:merged,updated_turn:turn
  });
}

function scoreProduct(p,frame,index){
  const c=frame?.constraints||{};
  const price=numericPrice(p),available=isAvailable(p);
  let score=50;
  const reasons=[];
  if(available){score+=12;reasons.push("متوفر حسب آخر نتيجة");}
  else if(c.require_available){score-=60;reasons.push("غير متوفر حسب آخر نتيجة");}
  if(c.max_unit_price!==null && price!==null){
    if(price<=c.max_unit_price){score+=20;reasons.push(`سعره ضمن حد ${c.max_unit_price} AED`);} else score-=35;
  }
  if(c.total_budget!==null && price!==null && price<=c.total_budget){score+=10;reasons.push("داخل الميزانية");}
  if(c.price_preference==="lower" && price!==null) score+=Math.max(0,20-Math.min(20,price/5));
  if(c.price_preference==="higher" && price!==null) score+=Math.min(18,price/10);
  score-=index*.01;
  return {product:p,price,available,score,reasons};
}

export function rankProductsCognitively(products=[],frame={}){
  const rows=(Array.isArray(products)?products:[]).filter(p=>p?.name).map(cleanProduct);
  return rows.map((p,i)=>scoreProduct(p,frame,i)).sort((a,b)=>b.score-a.score);
}

function chooseWithinBudget(ranked=[],frame={}){
  const c=frame?.constraints||{};
  const defaultCount=frame?.goal==="bundle"?Math.min(4,ranked.length):1;
  const count=Math.max(1,Math.min(4,Number(c.requested_count)||defaultCount));
  let candidates=ranked.filter(x=>!c.require_available||x.available);
  if(c.max_unit_price!==null) candidates=candidates.filter(x=>x.price===null||x.price<=c.max_unit_price);
  if(c.total_budget===null){
    if(c.price_preference==="lower"){
      candidates=[...candidates].sort((a,b)=>{
        if(a.price===null&&b.price===null) return b.score-a.score;
        if(a.price===null) return 1;
        if(b.price===null) return -1;
        return a.price-b.price || b.score-a.score;
      });
    }else if(c.price_preference==="higher"){
      candidates=[...candidates].sort((a,b)=>{
        if(a.price===null&&b.price===null) return b.score-a.score;
        if(a.price===null) return 1;
        if(b.price===null) return -1;
        return b.price-a.price || b.score-a.score;
      });
    }
    return candidates.slice(0,count);
  }
  const priced=candidates.filter(x=>x.price!==null).sort((a,b)=>{
    if(c.price_preference==="higher") return b.price-a.price;
    return a.price-b.price;
  });
  const selected=[];let total=0;
  for(const row of priced){
    if(selected.length>=count) break;
    if(total+row.price<=c.total_budget){selected.push(row);total+=row.price;}
  }
  if(!selected.length) return [];
  return selected;
}

function decisionBasis(selected=[],frame={}){
  const c=frame?.constraints||{};const basis=[];
  if(c.require_available) basis.push("التوفر الظاهر حاليًا");
  if(c.total_budget!==null) basis.push(`الميزانية الإجمالية ${c.total_budget} AED`);
  if(c.max_unit_price!==null) basis.push(`حد السعر ${c.max_unit_price} AED للمنتج`);
  if(c.price_preference==="lower") basis.push("السعر الأقل");
  if(c.price_preference==="higher") basis.push("الفئة السعرية الأعلى");
  if(c.cultivation) basis.push(`طريقة الزراعة: ${c.cultivation}`);
  if(c.emirate) basis.push(`الإمارة: ${c.emirate}`);
  if(!basis.length) basis.push("السعر والتوفر الظاهرين في المتجر");
  return uniq(basis,6);
}

export function cognitiveProductDecision({products=[],frame={},locale="ar"}={}){
  const goal=frame?.goal||"answer";
  if(!["recommend","optimize_budget","bundle","purchase"].includes(goal)) return {handled:false};
  const ranked=rankProductsCognitively(products,frame);
  if(!ranked.length) return {handled:false};
  const selected=chooseWithinBudget(ranked,frame);
  const basis=decisionBasis(selected,frame);
  const gaps=[];
  if(goal==="recommend" && !frame?.constraints?.comparison_criteria?.length) gaps.push("المواصفات الزراعية غير المؤكدة لم تدخل في القرار");
  if(!selected.length){
    return {handled:true,results:[],display_reply:locale==="en"?"I couldn't find a visible option that satisfies all of those constraints at the same time.":"ما حصلت خيار ظاهر يحقق كل الشروط دي مع بعض. أقدر أوسع شرط السعر أو التوفر ونحاول ثانية.",decision_basis:basis,knowledge_gaps:gaps,confidence:74};
  }
  const total=selected.reduce((s,x)=>s+(x.price||0),0);
  const names=selected.map(x=>x.product.name);
  const count=selected.length;
  let display;
  if(locale==="en") display=`I narrowed it down to ${count} option${count===1?"":"s"} based on the visible store data and your constraints.`;
  else display=count===1?`حسب الشروط اللي قلتها، ده أقوى اختيار من النتائج الظاهرة 👇`:`حسب الشروط اللي قلتها، ضيقتهم لك إلى ${count} خيارات مناسبة 👇`;
  if(frame?.constraints?.total_budget!==null && selected.every(x=>x.price!==null)) display+=locale==="en"?` Total: ${total.toFixed(2)} AED.`:` الإجمالي: ${total.toFixed(2)} AED.`;
  return {
    handled:true,results:selected.map(x=>x.product),display_reply:display,
    memory_reply:`${display}\n${selected.map((x,i)=>`${i+1}. ${x.product.name}${x.price!==null?` — ${x.price} ${x.product.currency||"AED"}`:""}${x.product.availability?` - ${x.product.availability}`:""}`).join("\n")}`,
    decision_basis:basis,knowledge_gaps:gaps,confidence:Math.min(96,82+basis.length*2),selected_names:names
  };
}

export function cognitiveVisibleSetDecision({state={},frame={},locale="ar"}={}){
  const rows=Array.isArray(state?.visible_products)?state.visible_products:[];
  if(!rows.length || !frame?.references_visible_set) return {handled:false};
  if(!["recommend","optimize_budget","bundle","purchase"].includes(frame?.goal)) return {handled:false};
  return cognitiveProductDecision({products:rows,frame,locale});
}

export function cognitiveResponseMeta({frame={},memory={},decision=null,evidence=null,risks=[]}={}){
  const gaps=uniq([...(frame?.unresolved||[]),...(decision?.knowledge_gaps||[])],8);
  const basis=uniq(decision?.decision_basis||memory?.last_decision_basis||[],8);
  let confidence=Number(decision?.confidence||frame?.confidence||70);
  if(evidence?.confidence) confidence=(confidence*.45)+(evidence.confidence*100*.55);
  confidence-=risks.length*8;
  return {
    engine:"cognitive_v9",goal:String(frame?.goal||"answer"),intent:String(frame?.intent||"unknown"),
    confidence:Math.round(clamp(confidence,30,99)),constraints:frame?.constraints||{},
    decision_basis:basis,knowledge_gaps:gaps,context_switch:Boolean(frame?.context_switch),correction:Boolean(frame?.correction),
    evidence_level:evidence?.level||"",risk_flags:uniq(risks,6)
  };
}

export function updateCognitiveDecisionMemory(memory={},decision=null){
  const m=sanitizeCognitiveMemory(memory);
  if(!decision?.handled) return m;
  m.last_decision_basis=uniq(decision.decision_basis||[],8);
  m.last_knowledge_gaps=uniq(decision.knowledge_gaps||[],8);
  m.decision_count=Math.min(999,(m.decision_count||0)+1);
  return m;
}

export function cognitionHealth(){
  return {version:"9.0",capabilities:["goal_tracking","constraint_memory","budget_reasoning","visible_set_reasoning","evidence_aware_confidence","knowledge_gap_detection","context_reset","decision_basis"]};
}
