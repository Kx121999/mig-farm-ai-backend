import { normalizeAr } from "./utils.js";

const VERSION="21.0";
function clean(v,max=5000){return String(v||"").replace(/\s+/g," ").trim().slice(0,max)}
function n(v){return normalizeAr(clean(v,6000))}
function arr(v){return Array.isArray(v)?v:[]}
function clamp(v,a=0,b=100){return Math.max(a,Math.min(b,Number(v)||0))}
function uniq(v){return [...new Set(arr(v).filter(Boolean))]}
function countMatches(t,re){const m=t.match(re);return m?m.length:0}

const RX={
  notBuying:/(مش هشتري|مش ناوي اشتري|مو ناوي اشتري|بس بسال|بس بسأل|بستفسر بس|مجرد بسال|مجرد بسأل|مش دلوقتي|مو الحين|مش حاليا|مش حاليًا|خد فكره|اخد فكره|آخذ فكرة)/,
  commit:/(هاخد|هآخد|باخد|بآخذ|باخذ|آخذ|اخذ|هطلب|اطلب|أطلب|عايز اطلب|عايز أطلب|ابغى اطلب|أبغى أطلب|جهزلي|جهز لي|ضيف للسله|ضيف للسلة|أضف للسلة|اضف للسلة|هاتلي|هات لي)/,
  quantity:/(\b\d+\b|واحد|واحده|واحدة|اتنين|اثنين|ثلاث|اربع|أربع|خمس|كرتون|عبوه|عبوة|كيس|باكيت|حبه|حبة)/,
  price:/(سعر|بكام|بكم|كم سعر|غالي|غاليه|غالية|ارخص|أرخص|ميزاني|خصم)/,
  availability:/(متوفر|موجود|مخزون|خلص|غير متوفر|مو متوفر|هلف|عالفاضي|على الفاضي)/,
  compare:/(قارن|مقارنه|مقارنة|الفرق|ولا|التاني|الثاني|الاول|الأول|احسن|أحسن|افضل|أفضل|ارخص|أرخص)/,
  recommend:/(رشح|اختارلي|اختار لي|انسب|أنسب|تنصح|مناسب لي|يناسبني)/,
  trust:/(مش مقتنع|مو مقتنع|مش واثق|مو واثق|مضمون|اصلي|أصلي|جوده|جودة|ثقه|ثقة|جربت|تجربه|تجربة)/,
  timing:/(مستعجل|اليوم|بكره|بكرة|الحين|دلوقتي|متى|امتى|إمتى|مدة التوصيل|يوصل امتى|يوصل إمتى)/,
  shipping:/(شحن|توصيل|يوصل|توصيلكم|الاماره|الإمارة|العين|الشارقه|الشارقة|دبي|عجمان|راس الخيمه|رأس الخيمة|الفجيره|الفجيرة|ام القيوين|أم القيوين)/,
  risk:/(خايف|أخاف|اخاف|ضرر|يحرق|يموت|امن|آمن|سلامه|سلامة|جرعه|جرعة|مبيد|رش)/,
  technical:/(اصفر|اصفرار|ذبول|مكرمش|متجعد|جذر|عفن|مرض|حشر|افه|آفة|فطر|ملوح|ملوحة|تسميد|ري|تربه|تربة|مياه|ميه|تحليل|جرعه|جرعة|مبيد)/,
  project:/(مزرعه|مزرعة|بيت محمي|صوبه|صوبة|مشروع|مساحه|مساحة|متر|هكتار|دونم)/,
  repair:/(لا قصدي|مش قصدي|مو قصدي|اقصد|أقصد|سيبك من|فكك من|خلاص غير|بدل)/,
  frustration:/(زهقت|مش فاهمين|غلط|وحش|سيئ|خربان|كل مره|كل مرة|بتكرر|تكرر)/
};

function friction(t){
  if(RX.price.test(t)&&/(غالي|ميزاني|ارخص|أرخص|خصم)/.test(t)) return "price";
  if(RX.trust.test(t)) return "trust";
  if(RX.availability.test(t)&&/(خلص|غير متوفر|مو متوفر|هلف|عالفاضي|على الفاضي)/.test(t)) return "availability";
  if(/مش عارف اختار|محتار|يناسبني|مناسب لي|مش عارف انهي|مش عارف أي/.test(t)) return "fit";
  if(RX.timing.test(t)) return "timing";
  if(/صعب|معقد|مش فاهم|مو فاهم|ازاي استخدم|كيف استخدم/.test(t)) return "complexity";
  if(RX.risk.test(t)&&/(خايف|ضرر|يحرق|يموت|امن|آمن|سلامه|سلامة)/.test(t)) return "risk";
  return "none";
}

function recentSignals(history=[]){
  const user=arr(history).filter(x=>x?.role==="user").slice(-8).map(x=>n(x.content));
  let shopping=0,commit=0,objection=0,technical=0,noBuy=0,repair=0;
  for(const t of user){
    if(RX.price.test(t)||RX.availability.test(t)||RX.compare.test(t)||RX.recommend.test(t)) shopping++;
    if(RX.commit.test(t)) commit++;
    if(friction(t)!=="none") objection++;
    if(RX.technical.test(t)) technical++;
    if(RX.notBuying.test(t)) noBuy++;
    if(RX.repair.test(t)) repair++;
  }
  return {shopping,commit,objection,technical,no_buy:noBuy,repair,total:user.length};
}

function readiness(message,{analysis={},profile={},history=[],humanTurn={},salesTurn={}}={}){
  const t=n(message), hist=recentSignals(history); let score=8; const reasons=[];
  if(humanTurn?.no_sales_pressure||RX.notBuying.test(t)){return {score:0,state:"not_buying_now",reasons:["explicit_no_buying_signal"],history:hist};}
  if(RX.commit.test(t)){score+=55;reasons.push("explicit_purchase_language");}
  if(RX.quantity.test(t)&&RX.commit.test(t)){score+=12;reasons.push("quantity_with_commitment");}
  if(RX.price.test(t)){score+=12;reasons.push("price_interest");}
  if(RX.availability.test(t)){score+=12;reasons.push("availability_interest");}
  if(RX.shipping.test(t)){score+=8;reasons.push("delivery_or_location_interest");}
  if(RX.compare.test(t)){score+=16;reasons.push("comparison_behavior");}
  if(RX.recommend.test(t)){score+=12;reasons.push("recommendation_request");}
  if(friction(t)!=="none"){score+=8;reasons.push("active_objection");}
  if(hist.shopping>=2){score+=10;reasons.push("multi_turn_shopping_momentum");}
  if(hist.commit>=1){score+=10;reasons.push("prior_commitment_signal");}
  if(Number(profile?.lead_score||0)>=70){score+=5;reasons.push("existing_in_session_engagement");}
  if(RX.technical.test(t)&&!/(عايز علاج|ابغى علاج|رشح منتج|عندكم حاجه|عندكم حاجة|اشتري|شراء)/.test(t)){score=Math.min(score,28);reasons.push("technical_problem_before_commerce");}
  if(RX.repair.test(t)){score=Math.min(score,45);reasons.push("topic_repair_requires_reorientation");}
  score=Math.round(clamp(score));
  const state=score>=78?"ready_to_commit":score>=58?"decision_stage":score>=36?"considering":score>=16?"exploring":"browsing";
  return {score,state,reasons:uniq(reasons),history:hist};
}

function evidenceNeeds({message,friction:fr,analysis={},humanTurn={},readiness:r}={}){
  const t=n(message); const needs=[];
  if(RX.price.test(t)||RX.availability.test(t)||RX.recommend.test(t)||RX.compare.test(t)||r?.score>=58) needs.push("live_catalog");
  if(fr==="trust") needs.push("verified_product_or_business_evidence");
  if(fr==="trust"||RX.compare.test(t)||RX.recommend.test(t)||/وصف|مواصفات|تفاصيل|مكونات|ماده فعاله|مادة فعالة|استخدام|ينفع|description|specification|active ingredient|features/.test(t)) needs.push("product_dossier");
  if(RX.shipping.test(t)||/فروع|فرع|دفع|استرجاع|استلام/.test(t)) needs.push("business_fact");
  if(RX.technical.test(t)||analysis?.intent==="agriculture_general") needs.push("agricultural_engineering");
  if(/قانون|تصريح|ترخيص|استيراد|حجر|ممنوع|مسموح/.test(t)) needs.push("uae_regulations");
  return uniq(needs);
}

function chooseAction({message,friction:fr,readiness:r,humanTurn={},salesTurn={},analysis={}}={}){
  const t=n(message); const mode=humanTurn?.mode||salesTurn?.conversation_plan?.mode||"conversation";
  if(humanTurn?.no_sales_pressure||r.state==="not_buying_now") return "answer_without_sales_pressure";
  if(["social"].includes(mode)) return "human_acknowledgement_only";
  if(mode==="repair_or_switch"||RX.repair.test(t)) return "acknowledge_switch_and_answer_new_topic";
  if(RX.technical.test(t)&&!RX.commit.test(t)) return "diagnose_or_answer_technical_need_before_product";
  if(fr==="price") return "verify_price_then_offer_value_or_cheaper_verified_alternative";
  if(fr==="trust") return "resolve_trust_with_specific_verified_evidence";
  if(fr==="availability") return "verify_stock_then_offer_nearest_verified_alternative_if_needed";
  if(fr==="fit") return "resolve_fit_with_one_decisive_question_or_verified_comparison";
  if(fr==="timing") return "answer_timing_or_delivery_fact_before_any_close";
  if(fr==="risk") return "reduce_risk_with_verified_technical_guidance";
  if(RX.commit.test(t)&&RX.quantity.test(t)) return "confirm_selected_item_and_quantity_then_next_purchase_step";
  if(RX.commit.test(t)) return "confirm_choice_then_request_only_missing_purchase_detail";
  if(RX.compare.test(t)) return "compare_verified_options_and_make_decision_easy";
  if(RX.recommend.test(t)) return "recommend_few_grounded_options_with_reason";
  if(RX.availability.test(t)||RX.price.test(t)) return "answer_live_fact_first_then_stop_unless_user_invites_more";
  if(r.score>=78) return "soft_close_with_low_friction_confirmation";
  if(r.score>=58) return "help_customer_decide_without_pressure";
  if(analysis?.category||analysis?.crop) return "answer_and_narrow_only_if_needed";
  return "answer_current_turn_naturally";
}

function closePolicy({readiness:r,humanTurn={},friction:fr,message=""}={}){
  const t=n(message);
  if(humanTurn?.no_sales_pressure||r.state==="not_buying_now") return {allowed:false,type:"none",reason:"customer_not_buying_now"};
  if(fr!=="none"&&!RX.commit.test(t)) return {allowed:false,type:"none",reason:"resolve_objection_before_close"};
  if(RX.commit.test(t)&&RX.quantity.test(t)) return {allowed:true,type:"quantity_confirmation",reason:"explicit_commitment_and_quantity"};
  if(RX.commit.test(t)) return {allowed:true,type:"choice_confirmation",reason:"explicit_commitment"};
  if(r.score>=82) return {allowed:true,type:"soft_confirmation",reason:"strong_explicit_shopping_signals"};
  return {allowed:false,type:"none",reason:"insufficient_commitment"};
}

function questionPolicy({message,readiness:r,humanTurn={},friction:fr,salesTurn={},analysis={}}={}){
  const t=n(message);
  if(humanTurn?.no_sales_pressure||["social","browse_only_social"].includes(humanTurn?.mode)) return {budget:0,ask_for:[],reason:"no_sales_pressure_or_social"};
  if(RX.price.test(t)||RX.availability.test(t)||RX.shipping.test(t)) return {budget:0,ask_for:[],reason:"answerable_fact_first"};
  if(RX.commit.test(t)&&RX.quantity.test(t)) return {budget:0,ask_for:[],reason:"commitment_is_clear"};
  if(fr==="fit") return {budget:1,ask_for:["single_variable_that_changes_fit"],reason:"fit_requires_one_decisive_variable"};
  if(RX.technical.test(t)) return {budget:1,ask_for:["highest_information_gain_diagnostic_detail"],reason:"technical_differential_diagnosis"};
  if((analysis?.category||analysis?.crop)&&r.score<58) return {budget:Math.min(1,Number(salesTurn?.conversation_plan?.question_budget??1)),ask_for:["only_if_needed_for_a_better_answer"],reason:"light_qualification_only"};
  return {budget:0,ask_for:[],reason:"do_not_interrogate_customer"};
}

function persuasionPolicy({friction:fr,readiness:r,humanTurn={}}={}){
  if(humanTurn?.no_sales_pressure||r.state==="not_buying_now") return {mode:"none",allowed_moves:["answer","educate_if_asked"],forbidden:["product_push","close","urgency","discount_pressure"]};
  const allowed=["answer_first","specific_verified_benefit","transparent_tradeoff"];
  if(fr==="price") allowed.push("cheaper_verified_alternative","value_comparison");
  if(fr==="trust") allowed.push("specific_evidence","limitations_or_tradeoffs");
  if(fr==="fit") allowed.push("fit_based_comparison");
  if(r.score>=58) allowed.push("decision_simplification");
  if(r.score>=78) allowed.push("soft_close");
  return {mode:r.score>=78?"close_support":r.score>=36?"decision_support":"informational",allowed_moves:uniq(allowed),forbidden:["fabricated_discount","fabricated_scarcity","fake_social_proof","guilt","pressure","guarantee_without_evidence"]};
}

export function buildConversionDecision({message="",analysis={},profile={},state={},history=[],humanTurn={},salesTurn={},agriculturalContext={}}={}){
  const t=n(message); const fr=friction(t); const r=readiness(message,{analysis,profile,history,humanTurn,salesTurn});
  const action=chooseAction({message,friction:fr,readiness:r,humanTurn,salesTurn,analysis});
  const close=closePolicy({readiness:r,humanTurn,friction:fr,message});
  const questions=questionPolicy({message,readiness:r,humanTurn,friction:fr,salesTurn,analysis});
  const evidence=evidenceNeeds({message,friction:fr,analysis,humanTurn,readiness:r});
  const persuasion=persuasionPolicy({friction:fr,readiness:r,humanTurn});
  const topicRisk=RX.repair.test(t)||humanTurn?.stale_context_quarantine?"high":humanTurn?.followup_dependency?"dependent":"normal";
  const stage=r.state==="not_buying_now"?"browse":r.score>=78?"commit":r.score>=58?"decide":r.score>=36?"consider":"discover";
  return {
    version:VERSION,mode:"ethical_conversion_decision_brain",stage,
    readiness:r,friction:fr,next_best_action:action,close_policy:close,question_policy:questions,persuasion_policy:persuasion,
    evidence_required:evidence,topic_context_risk:topicRisk,
    response_contract:{
      answer_first:true,current_turn_first:true,free_form_wording:true,mirror_customer_style:true,
      question_budget:questions.budget,close_allowed:close.allowed,no_pressure:Boolean(humanTurn?.no_sales_pressure||r.state==="not_buying_now"),
      product_facts:"live_or_verified_only",price_stock:"live_catalog_only",technical:"engineer_evidence_first",legal:"official_current_source",
      never:["fake_discount","fake_scarcity","fake_social_proof","guarantee_without_evidence","guilt_or_pressure","canned_sales_script"]
    },
    meta:{explicit_commitment:RX.commit.test(t),quantity_signal:RX.quantity.test(t),topic_repair:RX.repair.test(t),frustration:RX.frustration.test(t),agricultural:Boolean(agriculturalContext?.is_agricultural)}
  };
}

export function evaluateConversionReply(reply="",decision={},message=""){
  const text=clean(reply,12000),t=n(text),flags=[];let score=100;
  const q=(String(reply).match(/[؟?]/g)||[]).length;
  if(q>Number(decision?.question_policy?.budget??1)){flags.push("question_budget_exceeded");score-=25;}
  if(decision?.response_contract?.no_pressure&&/(اطلب|اشتري|واتساب|جهزلك|جهز لي|أضف للسلة|اضف للسلة|الحق|فرصه|فرصة)/.test(t)){flags.push("sales_pressure_when_not_allowed");score-=55;}
  if(decision?.close_policy?.allowed===false&&/(نثبت الطلب|أكد الطلب|اكد الطلب|جهز الطلب|نقفل الطلب|حولك للواتساب|احجزه لك|أحجزه لك)/.test(t)){flags.push("premature_close");score-=35;}
  if(/لفتره محدوده|لفترة محدودة|اخر فرصه|آخر فرصة|الكميه بتخلص|الكمية بتخلص|الحق قبل/.test(t)){flags.push("unverified_urgency");score-=40;}
  if(/خصم خاص ليك|خصم مخصوص|هعملك خصم|اعملك خصم/.test(t)){flags.push("unverified_discount");score-=40;}
  if(/الكل بياخده|الكل بيشتريه|اكثر مبيعا|الأكثر مبيعاً|الأكثر مبيعا/.test(t)){flags.push("unverified_social_proof");score-=30;}
  if(decision?.next_best_action==="diagnose_or_answer_technical_need_before_product"&&/(اشتري|اطلب|أضف للسلة|اضف للسلة)/.test(t)){flags.push("product_push_before_technical_resolution");score-=45;}
  if(decision?.next_best_action==="answer_live_fact_first_then_stop_unless_user_invites_more"&&clean(message).split(/\s+/).length<=8&&clean(reply).split(/\s+/).length>85){flags.push("overexplained_direct_fact");score-=18;}
  return {version:VERSION,score:Math.max(0,score),ok:score>=78,flags,next_best_action:decision?.next_best_action||"",stage:decision?.stage||""};
}

export function conversionDecisionHealth(){
  return {version:VERSION,mode:"ethical_conversion_decision_brain",capabilities:["product_dossier_evidence_routing","explicit_purchase_readiness","multi_turn_shopping_momentum","objection_root_cause","next_best_action","evidence_requirements","close_timing_guard","question_budget","no_buying_override","technical_before_commerce","topic_repair_awareness","ethical_persuasion_policy","conversion_reply_guard","live_product_truth_before_close","verified_alternative_decision","quote_draft_guard"],persistent_memory_required:false};
}
