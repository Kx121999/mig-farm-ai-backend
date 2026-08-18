import { normalizeAr, tokenize } from "./utils.js";

const VERSION="22.3";
function clean(v,max=6000){return String(v||"").replace(/\s+/g," ").trim().slice(0,max)}
function n(v){return normalizeAr(clean(v,7000))}
function arr(v){return Array.isArray(v)?v:[]}
function has(t,re){return re.test(t)}
function words(v){return clean(v).split(/\s+/).filter(Boolean)}
function uniq(v){return [...new Set(arr(v).filter(Boolean))]}

const SOCIAL=/^(اهلا|أهلا|هلا|السلام عليكم|سلام|هاي|hello|hi|hey|صباح الخير|مساء الخير|عامل ايه|عامل إيه|اخبارك|أخبارك|شلونك|كيفك|شكرا|شكراً|تسلم|تمام|اوكي|أوكي|ماشي|هههه+|هاها+|😂+|🤣+)[\s.!؟?]*$/;
const NON_BUYING=/(بس بسال|بس بسأل|انا بس بسال|أنا بس بسأل|مش هشتري|مش حشتري|مو شاري|مب شاري|مش ناوي اشتري|مش ناوي أشتري|مش عايز اشتري دلوقتي|مش عايز أشتري دلوقتي|مش محتاج اشتري|بس باخد فكره|بس باخد فكرة|بس بشوف|just asking|not buying|not ready to buy)/;
const REPAIR=/(لا يا عم|لا لا|مش ده قصدي|مش دا قصدي|مو هذا قصدي|مب هذا قصدي|قصدي|اقصد|أقصد|سيبك من|فكك من|خلاص سيب|غير الموضوع|خلينا في|خلينا نتكلم عن|لا انا اقصد|لا أنا أقصد)/;
const FOLLOWUP=/^(طب|طيب|والتاني|والثاني|والاول|والأول|وده|ودا|دي|دول|فيهم|منهم|كمان|وبرضه|وبرضو|طيب هو|طب هو|ولو|طيب لو|طب لو|ايه رايك فيه|إيه رأيك فيه|وش عنه|شو عنه|والسعر|ومتوفر|والشحن)[\s\S]{0,180}$/;
const LEGAL=/(قانون|تصريح|ترخيص|استيراد|تصدير|جمارك|حجر زراعي|شهادة صحية نباتية|ممنوع|مسموح|رسوم|وزارة التغير المناخي|moccae|permit|license|quarantine|legal)/;
const TECHNICAL=/(نبات|زرع|زراعه|زراعة|محصول|مزرعه|مزرعة|ورق|ورقه|ورقة|جذر|جذور|اصفر|مصفر|مكرمش|متجعد|ذبول|عفن|مرض|فطر|فيروس|حشر|افه|آفة|سماد|تسميد|ري|مياه|ميه|موية|ملوح|تربه|تربة|صوبه|صوبة|بيت محمي|هيدروبونيك|ec|ph|تعفن|عقد|تزهير|ثمار|بذور|شتل|شتله|شتلة|f1|هجين|انبات|إنبات)/;
const COMMERCE=/(عندكم|موجود|متوفر|سعر|بكام|بكم|اشتري|أشتري|اطلب|أطلب|هاخد|باخد|باخذ|بآخذ|رشح|اختار|قارن|ارخص|أرخص|افضل|أفضل|منتج|عبوه|عبوة|كميه|كمية|شحن|توصيل|فرع|واتساب)/;
const CASUAL_BROWSE=/(بس بسال|بس بسأل|عايز اعرف|عايز أعرف|حبيت اعرف|حبيت أعرف|باخد فكره|باخد فكرة|بشوف بس|استفسار بس)/;
const PURCHASE=/(عايز اطلب|عايز أطلب|هطلب|هاخد|باخذ|بآخذ|اشتري|أشتري|جهزلي|جهز لي|ابعت لينك|أرسل الرابط)/;

const CROP_ALIASES={
  tomato:["طماطم","بندوره","بندورة","tomato"],cucumber:["خيار","cucumber"],pepper:["فلفل","فليفله","فليفلة","pepper","capsicum"],eggplant:["باذنجان","eggplant"],zucchini:["كوسه","كوسة","zucchini"],watermelon:["بطيخ","watermelon"],melon:["شمام","كنتالوب","melon"],okra:["باميه","بامية","okra"],onion:["بصل","onion"],lettuce:["خس","lettuce"],spinach:["سبانخ","spinach"],cabbage:["ملفوف","كرنب","cabbage"],radish:["فجل","radish"],beet:["شمندر","بنجر","beet"],corn:["ذره","ذرة","corn"],strawberry:["فراوله","فراولة","strawberry"],date_palm:["نخيل","تمر","date palm"]
};
function cropMentions(text){const t=n(text),out=[];for(const [k,aa] of Object.entries(CROP_ALIASES))if(aa.some(a=>t.includes(n(a))))out.push(k);return out}
function mode(message,analysis={},visionContext={}){
  const t=n(message),intent=String(analysis?.intent||"");
  if(visionContext?.has_fresh_images) return "visual_analysis";
  if(visionContext?.visual_followup||visionContext?.inherited_visual_context) return "visual_followup";
  if(NON_BUYING.test(t)) return "browse_only_social";
  if(REPAIR.test(t)) return "repair_or_switch";
  if(SOCIAL.test(t)||["greeting","wellbeing","thanks","goodbye","acknowledgment","negative_ack"].includes(intent)) return "social";
  if(LEGAL.test(t)) return "legal";
  if(PURCHASE.test(t)||intent==="purchase") return "purchase";
  if(TECHNICAL.test(t)) return "technical";
  if(COMMERCE.test(t)||analysis?.category||analysis?.crop) return "commerce";
  if(CASUAL_BROWSE.test(t)) return "browse_only_social";
  return "general_conversation";
}
function isFollowup(message,analysis={}){
  const t=n(message); if(analysis?.memoryAction) return true;
  if(FOLLOWUP.test(t)) return true;
  if(/(الاول|الأول|التاني|الثاني|ارخصهم|أرخصهم|اغلاهم|أغلاهم|فيهم|منهم)/.test(t)) return true;
  return false;
}
function responseLength(message,m){const wc=words(message).length;if(["social","browse_only_social"].includes(m))return "micro";if(["visual_analysis","visual_followup"].includes(m))return wc<=6?"compact":"normal";if(wc<=6)return "short";if(wc<=22)return "compact";if(m==="technical"||m==="legal")return "adaptive_detailed";return "normal"}
function toolPolicy(m,followup){
  if(m==="visual_analysis"||m==="visual_followup") return {mode:"vision_priority",allowed:["match_visual_product","verify_visual_product_live","guard_visual_label_claim","search_visual_agronomy","get_retake_advice","plan_visual_product_action","search_product_dossiers","get_product_dossier","verify_live_product_truth","search_catalog","search_agricultural_engineering","search_agricultural_master","diagnose_crop_problem","agriculture_calculator"]};
  if(["social","browse_only_social"].includes(m)) return {mode:"zero_tools",allowed:[]};
  if(m==="general_conversation") return {mode:"selective",allowed:["search_knowledge","search_agricultural_master","get_business_fact"]};
  if(m==="followup") return {mode:"followup",allowed:["search_catalog","search_knowledge","recall_memory","compare_live_options","search_product_dossiers","get_product_dossier","compare_product_dossiers","verify_live_product_truth","get_product_relations","find_verified_alternatives","search_agricultural_engineering","search_agricultural_master","diagnose_crop_problem","get_business_fact"]};
  if(m==="repair_or_switch") return {mode:"current_turn_only",allowed:["search_catalog","search_knowledge","search_product_dossiers","get_product_dossier","verify_live_product_truth","search_agricultural_engineering","diagnose_crop_problem","search_agricultural_master","search_uae_agriculture","search_uae_regulations","get_business_fact"]};
  if(m==="legal") return {mode:"legal_evidence",allowed:["search_uae_regulations","search_uae_agriculture","search_agricultural_master"]};
  if(m==="technical") return {mode:"agricultural_expert",allowed:["search_agricultural_engineering","search_agricultural_master","diagnose_crop_problem","agriculture_calculator","search_uae_agriculture","search_uae_regulations","search_catalog","search_product_dossiers","get_product_dossier","verify_live_product_truth"]};
  if(m==="purchase"||m==="commerce") return {mode:"commerce",allowed:["search_catalog","search_knowledge","get_business_fact","search_sales_playbook","get_sales_strategy","search_product_dossiers","get_product_dossier","compare_product_dossiers","verify_live_product_truth","get_product_relations","find_verified_alternatives","build_verified_bundle","prepare_quote_draft","optimize_live_bundle","compare_live_options","prepare_purchase_plan","search_agricultural_engineering","search_agricultural_master","diagnose_crop_problem"]};
  return {mode:followup?"followup":"selective",allowed:[]};
}
function contextPolicy(m,followup,message){
  if(m==="visual_analysis"||m==="visual_followup") return {scope:"active_visual_context",allow_stale_product_context:false,allow_old_agronomy:false,history_turns:4,keep_visual_context:true};
  if(["social","browse_only_social"].includes(m)) return {scope:"current_turn_isolated",allow_stale_product_context:false,allow_old_agronomy:false,history_turns:0};
  if(m==="general_conversation") return {scope:"current_turn_isolated",allow_stale_product_context:false,allow_old_agronomy:false,history_turns:0};
  if(m==="followup") return {scope:"explicit_followup",allow_stale_product_context:true,allow_old_agronomy:true,history_turns:8};
  if(m==="repair_or_switch") return {scope:"repair_current_turn_priority",allow_stale_product_context:false,allow_old_agronomy:false,history_turns:2};
  if(followup) return {scope:"explicit_followup",allow_stale_product_context:true,allow_old_agronomy:true,history_turns:8};
  return {scope:"current_topic_plus_relevant_context",allow_stale_product_context:true,allow_old_agronomy:true,history_turns:5};
}

export function analyzeHumanConversationTurn(message="",{analysis={},history=[],state={},profile={},agriculturalContext={},visionContext={}}={}){
  const t=n(message); const baseMode=mode(message,analysis,visionContext); const followup=isFollowup(message,analysis); const m=(baseMode==="general_conversation"&&followup)?"followup":baseMode; const cp=contextPolicy(m,followup,message); const tp=toolPolicy(m,followup);
  const noSales=NON_BUYING.test(t)||m==="browse_only_social"||String(state?.sales_mode||"")==="browse_only"&&!PURCHASE.test(t);
  const crops=cropMentions(message);
  const currentTopic={mode:m,crops,category:analysis?.category?.key||"",crop:analysis?.crop?.key||crops[0]||"",intent:analysis?.intent||""};
  return {
    version:VERSION,mode:m,current_turn_priority:1,followup_dependency:followup,
    current_topic:currentTopic,context_policy:cp,tool_policy:tp,
    no_sales_pressure:Boolean(noSales),answer_current_message_only:!followup,
    response_contract:{answer_first:true,length:responseLength(message,m),question_budget:["social","browse_only_social"].includes(m)?0:1,mirror_dialect:true,mirror_energy:true,no_canned_intro:true,no_unasked_agronomy:["social","browse_only_social"].includes(m),no_forced_sale:Boolean(noSales),one_natural_idea_per_short_turn:true,vision_first:["visual_analysis","visual_followup"].includes(m),keep_active_image_reference:m==="visual_followup"},
    stale_context_quarantine:!cp.allow_stale_product_context,
    explicit_repair:m==="repair_or_switch",
    debug_reason:m==="visual_analysis"?"fresh_image_requires_vision_first":m==="visual_followup"?"active_image_followup":m==="browse_only_social"?"user_not_buying_or_browsing":m==="repair_or_switch"?"user_repair_or_topic_switch":followup?"explicit_followup":"current_turn_semantics"
  };
}

export function isolateStateForCurrentTurn(state={},human={}){
  if(!human?.stale_context_quarantine) return state;
  const s={...state};
  s.last_products=[];s.visible_products=[];s.selected_product="";s.product_query="";s.pending="";
  if(human?.context_policy?.scope==="current_turn_isolated"){
    s.category="";s.crop="";s.topic="";s.pepper_type="";
  }else if(human?.explicit_repair){
    if(human?.current_topic?.category) s.category=human.current_topic.category; else s.category="";
    if(human?.current_topic?.crop) s.crop=human.current_topic.crop; else s.crop="";
  }
  return s;
}

function replyTopics(reply){
  const t=n(reply); return {
    agronomy:TECHNICAL.test(t),commerce:COMMERCE.test(t),legal:LEGAL.test(t),crops:cropMentions(reply),
    nutrient:/(بوتاسيوم|كالسيوم|مغنيسيوم|نيتروجين|فوسفور|سماد|تسميد)/.test(t),
    pesticide:/(مبيد|رش|جرعه|جرعة|ماده فعاله|مادة فعالة)/.test(t)
  };
}
export function evaluateCurrentTurnAlignment(reply="",{message="",humanTurn={},history=[]}={}){
  const text=clean(reply,12000); const topics=replyTopics(text); const flags=[]; let score=100;
  if(!text){flags.push("empty_reply");score=0;}
  if(["social","browse_only_social"].includes(humanTurn?.mode)){
    if(topics.agronomy||topics.nutrient||topics.pesticide){flags.push("stale_agronomy_leak");score-=65;}
    if(humanTurn?.no_sales_pressure&&/(اطلب|اشتري|واتساب|جهزلك|أضف للسلة|اضف للسلة)/.test(n(text))){flags.push("sales_pressure_violation");score-=45;}
  }
  const currentCrops=arr(humanTurn?.current_topic?.crops); if(currentCrops.length){
    const wrong=topics.crops.filter(x=>!currentCrops.includes(x));
    if(wrong.length&&humanTurn?.explicit_repair){flags.push("old_crop_after_repair");score-=55;}
  }
  if(humanTurn?.explicit_repair&&/حسب المنتجات السابقة|اخر المنتجات|آخر المنتجات/.test(n(text))){flags.push("stale_product_context_after_repair");score-=45;}
  const wc=words(text).length,uw=words(message).length;if(uw<=6&&wc>65&&!['technical','legal'].includes(humanTurn?.mode)){flags.push("overlong_for_current_turn");score-=20;}
  return {version:VERSION,score:Math.max(0,score),flags,aligned:score>=78,reply_topics:topics,current_mode:humanTurn?.mode||""};
}

export function safeCurrentTurnFallback(message="",humanTurn={}){
  const t=n(message); const m=humanTurn?.mode;
  if(m==="browse_only_social"){
    if(/يا عم|يا راجل|باشا/.test(t)) return "ولا يهمك يا عم 😄 اسأل براحتك، خد فكرة الأول ومفيش أي ضغط شراء.";
    if(/بس بسال|بس بسأل/.test(t)) return "أكيد، اسأل براحتك. مش لازم تكون ناوي تشتري عشان أجاوبك.";
    return "تمام، خذ راحتك واسأل عن أي حاجة حابب تعرفها.";
  }
  if(m==="social"){
    if(/عامل ايه|عامل إيه|اخبارك|أخبارك/.test(t)) return "تمام الحمد لله 😄 إنت عامل إيه؟";
    if(/شكرا|شكراً|تسلم/.test(t)) return "حبيبي، تحت أمرك.";
    if(/هههه|😂|🤣/.test(String(message))) return "😂😂 تمام وصلت.";
    return "هلا 👋";
  }
  if(m==="visual_analysis") return "الصورة وصلت. هركز على اللي ظاهر فيها وأفصل بين اللي أقدر أثبته واللي محتاج لقطة أوضح.";
  if(m==="visual_followup") return "أنا مركز على نفس الصورة. لو الجزء المهم مش مقروء بوضوح هقولك بالضبط تصور إيه أقرب.";
  if(m==="repair_or_switch") return "تمام، فهمت التصحيح. هتعامل مع اللي قصدته دلوقتي ونسيب السياق القديم.";
  return "تمام، قول اللي في بالك وأنا هرد على سؤالك نفسه مباشرة.";
}

export function humanConversationHealth(){return {version:VERSION,mode:"current_turn_semantic_priority_brain",capabilities:["current_turn_override","stale_context_quarantine","zero_tool_casual_mode","non_buying_state","repair_and_topic_switch","followup_dependency_detection","semantic_reply_alignment","old_topic_leak_guard","adaptive_response_contract","human_acknowledgement_first","vision_first_override","active_visual_followup","visual_context_preservation","visual_intent_awareness","intent_specific_retake_guidance","recognition_before_identity_guard","medium_candidate_confirmation","retake_loop_guard"]};}
