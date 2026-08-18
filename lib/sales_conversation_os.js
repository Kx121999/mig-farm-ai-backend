import { normalizeAr } from "./utils.js";

const VERSION="22.4";
function clean(v,max=4000){return String(v||"").replace(/\s+/g," ").trim().slice(0,max)}
function n(v){return normalizeAr(clean(v,5000))}
function arr(v){return Array.isArray(v)?v:[]}
function words(v){return clean(v).split(/\s+/).filter(Boolean)}
function clamp(x,a=0,b=100){return Math.max(a,Math.min(b,Number(x)||0))}
function uniq(v){return [...new Set(arr(v).filter(Boolean))]}
function has(t,re){return re.test(t)}
function hash(s){let h=2166136261;for(const ch of String(s||"")){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}

function detectFriction(t){
  if(has(t,/غالي|غاليه|غالية|السعر عالي|كتير علي|كثير علي|ميزاني|ارخص|أرخص|خصم/)) return "price";
  if(has(t,/مش واثق|مو واثق|مش مقتنع|مضمون|اصلي|أصلي|جوده|جودة|ثقه|ثقة|تجربه|تجربة/)) return "trust";
  if(has(t,/مش موجود|مو موجود|خلص|غير متوفر|مو متوفر|هلف|مخزون/)) return "availability";
  if(has(t,/ينفع لي|يناسبني|يناسب|مناسب|اختار ايه|اختار إيه|محتار بين|مش عارف انهي|مش عارف أي/)) return "fit";
  if(has(t,/مستعجل|اليوم|بكره|بكرة|متى|امتى|إمتى|وقت|تأخير|متاخر|متأخر/)) return "timing";
  if(has(t,/صعب|معقد|مش فاهم|مو فاهم|ازاي استخدم|كيف استخدم|طريقة الاستخدام/)) return "complexity";
  if(has(t,/خايف|اخاف|أخاف|ضرر|يحرق|يموت|آمن|امن|سلامه|سلامة/)) return "risk";
  return "";
}

function detectMode(message,analysis={},agriculturalContext={}){
  const t=n(message); const intent=String(analysis?.intent||"");
  if(["greeting","wellbeing","thanks","goodbye","acknowledgment","negative_ack"].includes(intent) || has(t,/^(اهلا|أهلا|هلا|السلام|صباح|مساء|عامل ايه|عامل إيه|شلونك|كيفك|شكرا|شكراً|تمام|اوكي|أوكي)$/)) return "social";
  if(intent==="purchase" || has(t,/عايز اطلب|عايز أطلب|ابغى اطلب|أبغى أطلب|هطلب|اشتري|أشتري|عايز اخد|عايز آخذ|ابغى اخذ|أبغى آخذ|اخذ واحد|آخذ واحد|هاخد|بآخذ|باخذ|جهزلي|جهز لي|ابعتلي لينك|أرسل لي الرابط/)) return "close";
  if(intent==="known_seed_comparison" || has(t,/قارن|مقارنه|مقارنة|ايه الفرق|إيه الفرق|شو الفرق|وش الفرق|محتار بين|بين الاتنين|بين الاثنين|والتاني|والثاني|التاني|الثاني|ولا|ارخص|أرخص|افضل|أفضل|احسن|أحسن/)) return "compare";
  if(detectFriction(t)) return "objection";
  if(agriculturalContext?.intent==="diagnosis" || has(t,/اصفر|اصفرار|ذبول|مكرمش|متجعد|جذر|عفن|حشر|فطر|مرض|افه|آفة|ملوح|مالح|ملوحة|تربه|تربة|تسميد|ري|مياه|ميه|تحليل مياه|تحليل تربة/)) return "technical";
  if(has(t,/مزرعه|مزرعة|بيت محمي|صوبه|صوبة|مشروع|مساحه|مساحة|متر|هكتار|دونم/)) return "project";
  if(intent==="recommendation" || has(t,/رشح|اختارلي|اختار لي|انسب|أنسب|ايه اللي يناسب|إيه اللي يناسب|شو تنصح|وش تنصح/)) return "recommend";
  if(["product_search"].includes(intent)||analysis?.category||analysis?.crop||has(t,/عندكم|موجود|متوفر|سعر|بكام|بكم|كم سعر|فيه|في /)) return "direct_fact";
  return "conversation";
}

function detectEnergy(message){
  const raw=String(message||""); const t=n(raw); let e=50;
  if(/[!؟?]{2,}/.test(raw)) e+=15;
  if(/[😂🤣🔥❤️😍👍👌]/u.test(raw)) e+=12;
  if(has(t,/بسرعه|بسرعة|مستعجل|دلوقتي|الحين|الحين/)) e+=15;
  if(words(raw).length<=4) e-=10;
  return e>=70?"high":e<=35?"low":"normal";
}

function detectStyle(message){
  const wc=words(message).length; const raw=String(message||"");
  return {
    brevity:wc<=5?"terse":wc<=18?"short":wc<=45?"normal":"detailed",
    energy:detectEnergy(message),
    uses_emoji:/\p{Extended_Pictographic}/u.test(raw),
    uses_question:/[؟?]/.test(raw),
    formality:has(n(message),/حضرتك|لو سمحت|من فضلك|يرجى|أرجو|السلام عليكم/)?"formal":"natural"
  };
}

function readiness(message,mode,profile={}){
  const t=n(message); let s=Number(profile?.lead_score||0)*0.25;
  if(mode==="close") s+=55;
  if(mode==="compare") s+=25;
  if(mode==="recommend") s+=22;
  if(mode==="objection") s+=18;
  if(has(t,/سعر|بكام|بكم|متوفر|موجود|مخزون/)) s+=12;
  if(has(t,/كميه|كمية|كرتون|عبوه|عبوة|حبه|حبة|عدد|متر|مزرعه|مزرعة/)) s+=10;
  if(has(t,/اليوم|بكره|بكرة|الحين|دلوقتي|الحين/)) s+=8;
  if(has(t,/واتساب|تواصل|رقم|لينك|رابط/)) s+=12;
  return Math.round(clamp(s));
}

function inferLastShape(history=[]){
  const last=[...arr(history)].reverse().find(x=>x?.role==="assistant"&&clean(x.content));
  if(!last) return "";
  const text=String(last.content); const wc=words(text).length;
  if(/^\s*[-•*]|\n\s*[-•*]/m.test(text)) return "bullets";
  if(/^\s*\d+[.)-]/m.test(text)||/\n\s*\d+[.)-]/m.test(text)) return "numbered";
  if((text.match(/[؟?]/g)||[]).length>=1 && wc<80) return "answer_question";
  if(wc<=25) return "short_paragraph";
  if(wc>90) return "detailed";
  return "paragraph";
}

function chooseShape({message,mode,style,history=[]}){
  const last=inferLastShape(history); let choices=[];
  if(mode==="social") choices=["one_liner","short_paragraph"];
  else if(mode==="direct_fact") choices=["direct_answer","direct_answer_plus_context","answer_question"];
  else if(mode==="objection") choices=["acknowledge_reframe_option","short_paragraph","answer_question"];
  else if(mode==="compare") choices=["decision_first_compare","mini_compare","bullets"];
  else if(mode==="close") choices=["concise_confirmation","direct_next_step"];
  else if(mode==="technical") choices=["diagnostic_paragraph","diagnostic_steps","answer_question"];
  else if(mode==="project") choices=["consultative_summary","mini_plan","answer_question"];
  else if(mode==="recommend") choices=["recommendation_reason","two_options","answer_question"];
  else choices=["short_paragraph","answer_question","paragraph"];
  const filtered=choices.filter(x=>x!==last); const pool=filtered.length?filtered:choices;
  return pool[hash(`${message}|${last}`)%pool.length];
}

function nextAction({mode,friction,readiness,analysis={},message=""}){
  if(mode==="social") return "respond_normally";
  if(mode==="technical") return "diagnose_before_selling";
  if(mode==="close") return "make_purchase_confirmation_easy";
  if(mode==="compare") return "compare_on_decision_criteria";
  if(mode==="objection"){
    if(friction==="price") return "reduce_price_friction_with_grounded_alternative";
    if(friction==="trust") return "increase_trust_with_evidence";
    if(friction==="availability") return "verify_stock_then_offer_nearest_alternative";
    if(friction==="fit") return "resolve_fit_with_one_decisive_variable";
    if(friction==="timing") return "verify_timing_or_delivery_fact";
    if(friction==="risk") return "reduce_risk_with_verified_guidance";
    return "resolve_objection_without_arguing";
  }
  if(mode==="direct_fact") return "answer_first_then_stop_or_one_natural_step";
  if(mode==="recommend") return "narrow_to_best_grounded_options";
  if(mode==="project") return "qualify_only_solution_changing_variable";
  if(readiness>=70) return "soft_close";
  return "continue_conversation_naturally";
}

export function buildSalesConversationPlan({message="",analysis={},profile={},state={},history=[],agriculturalContext={}}={}){
  const t=n(message); const mode=detectMode(message,analysis,agriculturalContext); const friction=detectFriction(t); const style=detectStyle(message); const r=readiness(message,mode,profile);
  const answerableDirect=mode==="social" || mode==="direct_fact" || mode==="compare" || mode==="close";
  const sellAllowed=!(["social"].includes(mode)) && !(mode==="technical"&&!has(t,/عايز علاج|ابغى علاج|أبغى علاج|رشح منتج|عندكم حاجه|عندكم حاجة|مبيد|سماد/));
  const shape=chooseShape({message,mode,style,history});
  const questionBudget=(answerableDirect||mode==="close")?0:1;
  const forbidden=["generic_greeting","canned_opening","repeat_previous_answer_shape","forced_whatsapp_cta","multi_question_interrogation","unsupported_claim","fake_discount","fake_urgency"];
  if(!sellAllowed) forbidden.push("product_push");
  if(mode==="social") forbidden.push("sales_pitch");
  return {
    version:VERSION,
    mode,
    friction:friction||"none",
    buyer_readiness:r,
    buyer_state:r>=78?"purchase_ready":r>=55?"considering":r>=30?"engaged":"browsing",
    communication:style,
    response_shape:shape,
    previous_response_shape:inferLastShape(history),
    next_best_action:nextAction({mode,friction,readiness:r,analysis,message}),
    should_sell:sellAllowed,
    question_budget:questionBudget,
    answer_first:true,
    micro_commitment:r>=60&&!["social","technical"].includes(mode),
    forbidden_moves:uniq(forbidden),
    decision_policy:{
      current_price_stock:"live_catalog_only",
      technical:"agricultural_engineering_evidence",
      legal:"official_uae_regulatory_evidence",
      discount:"only_if_verified",
      scarcity:"never_invent",
      closing:"soft_and_contextual"
    }
  };
}

function ngrams(text,k=4){const w=words(n(text));const out=[];for(let i=0;i<=w.length-k;i++)out.push(w.slice(i,i+k).join(" "));return out}
function overlap(a,b){const A=new Set(ngrams(a)),B=new Set(ngrams(b));if(!A.size||!B.size)return 0;let hit=0;for(const x of A)if(B.has(x))hit++;return hit/Math.max(1,Math.min(A.size,B.size))}

export function evaluateNaturalSalesReply(reply="",{plan={},message="",history=[]}={}){
  const text=clean(reply,10000); const flags=[]; const wc=words(text).length; const userWc=words(message).length;
  if(/^(أهلا بك في MIG FARM|أهلاً بك في MIG FARM|هلا بك في MIG FARM|يسعدني مساعدتك|حسب المعلومات المتاحة|بناءً على طلبك|بالطبع[،,]?|أكيد[،,]? خليني)/.test(text)) flags.push("canned_opening");
  if(userWc<=5 && wc>75 && plan?.mode!=="technical") flags.push("too_long_for_turn");
  const q=(text.match(/[؟?]/g)||[]).length; if(q>Number(plan?.question_budget??1)) flags.push("question_budget_exceeded");
  if(plan?.should_sell===false && /اطلب|اشتري|واتساب|تواصل معنا|راسلنا/.test(n(text))) flags.push("unwanted_sales_push");
  if(plan?.mode==="social" && wc>35) flags.push("social_turn_overworked");
  if(userWc<20 && (/^\s*\d+[.)-]/m.test(text)||((text.match(/\n\s*[-•*]/g)||[]).length>=4)) && !["technical","project","compare"].includes(plan?.mode)) flags.push("over_structured");
  if((text.match(/[😂🤣🔥❤️😍👍👌✅🌱]/gu)||[]).length>3 && !plan?.communication?.uses_emoji) flags.push("emoji_overuse");
  const prev=[...arr(history)].reverse().filter(x=>x?.role==="assistant"&&clean(x.content)).slice(0,2);
  const maxOverlap=prev.reduce((m,x)=>Math.max(m,overlap(text,x.content)),0); if(maxOverlap>=0.42&&wc>=18) flags.push("repetitive_with_recent_reply");
  if(/لفترة محدودة|الحق|آخر فرصة|متبقي|نفاد الكمية قريب/.test(n(text))) flags.push("unverified_urgency_risk");
  return {version:VERSION,score:Math.max(0,100-flags.length*16),flags,max_recent_overlap:Number(maxOverlap.toFixed(3)),response_shape:plan?.response_shape||"",next_best_action:plan?.next_best_action||""};
}

export function salesConversationOSHealth(){
  return {version:VERSION,mode:"human_sales_conversation_os_conversion_aware",capabilities:["turn_level_goal_selection","buyer_readiness_inference","objection_root_cause_detection","next_best_action","adaptive_reply_shapes","history_aware_followups","response_repetition_guard","question_budgeting","soft_close_logic","no_product_push_when_not_needed","trust_friction_resolution","anti_fake_urgency","anti_fake_discount","naturalness_quality_gate","current_turn_semantic_priority","stale_context_guard","conversion_decision_handoff","product_dossier_evidence_routing","live_product_truth_routing","verified_alternative_routing","quote_draft_routing","visual_intent_routing","intent_specific_visual_clarification"]};
}
