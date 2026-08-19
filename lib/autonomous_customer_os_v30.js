import { normalizeAr, tokenize } from "./utils.js";

const VERSION="30.0";
const AGENT_ORDER=["conversation","product_truth","agronomist","business_facts","commerce","safety","quality"];
const ALL_TOOLS=[
  "search_catalog","search_product_dossiers","get_product_dossier","compare_product_dossiers",
  "verify_live_product_truth","get_product_relations","find_verified_alternatives","build_verified_bundle",
  "prepare_quote_draft","match_visual_product","verify_visual_product_live","search_visual_agronomy",
  "search_agricultural_engineering","diagnose_agricultural_problem","agriculture_calculator",
  "search_uae_agriculture","search_agricultural_master","get_business_fact","search_sales_playbook",
  "get_sales_strategy","optimize_live_bundle","compare_live_options","prepare_purchase_plan",
  "search_verified_knowledge","search_site_pages","search_semantic_memory"
];

function clean(value="",max=1200){return String(value??"").replace(/[\u0000-\u001f]/g," ").replace(/\s+/g," ").trim().slice(0,max);}
function arr(value){return Array.isArray(value)?value:[];}
function uniq(value){return [...new Set(arr(value).map(x=>clean(x,100)).filter(Boolean))];}
function clamp(value,min=0,max=1){return Math.max(min,Math.min(max,Number(value)||0));}
function has(rx,value){return rx.test(normalizeAr(clean(value,2400)));}
function currentIntents(analysis={},semanticFrame={}){
  return uniq([
    semanticFrame?.primary_intent,
    ...arr(semanticFrame?.intents).map(x=>typeof x==="string"?x:x?.name),
    analysis?.intent
  ]).filter(x=>x&&x!=="unknown");
}
function classifyRisk({message="",analysis={},semanticFrame={},hasImages=false}={}){
  const value=normalizeAr(clean(message,3000));
  const dosage=has(/(?:جرع|معدل استخدام|مل لكل|سم3|رش|خلط)/,value);
  const diagnosis=has(/(?:مرض|اصاب|اعراض|بقع|ذبول|اصفرار|حشر|فطر|عفن)/,value);
  const liveCommerce=has(/(?:سعر|متوفر|مخزون|حجز|اشتري|طلب|فاتوره|فاتورة)/,value);
  const privateData=has(/(?:رقم طلبي|رقم الطلب|هاتف|تلفون|ايميلي|بريدي|بطاق|دفع)/,value);
  const regulated=has(/(?:مبيد|سم|سام|فتره امان|فترة امان|تحريم|قانون)/,value);
  const score=(dosage?4:0)+(regulated?3:0)+(privateData?3:0)+(diagnosis?2:0)+(liveCommerce?1:0)+(hasImages?1:0);
  const level=(dosage||regulated)?"high":score>=2?"medium":"low";
  return {level,score,dosage,diagnosis,live_commerce:liveCommerce,private_data:privateData,regulated,requires_human_on_failure:level==="high",semantic_confidence:clamp(semanticFrame?.confidence||analysis?.v29_confidence||.55)};
}
function toolsFor({intents=[],risk={},hasImages=false,analysis={}}={}){
  const tools=[];
  const names=new Set(intents);
  if([...names].some(x=>/(?:branch|shipping|contact|hours|payment|return|pickup|services|company|order_status|business)/.test(x)))tools.push("get_business_fact");
  if([...names].some(x=>/(?:product|recommend|compare|purchase|bundle|category|price|availability)/.test(x))||analysis?.category){
    tools.push("search_catalog","search_product_dossiers","verify_live_product_truth");
  }
  if([...names].some(x=>/(?:compare)/.test(x)))tools.push("compare_product_dossiers","compare_live_options");
  if([...names].some(x=>/(?:purchase|bundle|recommend)/.test(x)))tools.push("find_verified_alternatives","optimize_live_bundle","prepare_purchase_plan");
  if(risk.diagnosis)tools.push("diagnose_agricultural_problem","search_agricultural_engineering","search_agricultural_master");
  if(risk.dosage||risk.regulated)tools.push("get_product_dossier","verify_live_product_truth","search_verified_knowledge");
  if(hasImages)tools.push("match_visual_product","verify_visual_product_live","search_visual_agronomy");
  if(!tools.length&&intents.length)tools.push("search_verified_knowledge","search_site_pages");
  return uniq(tools).filter(x=>ALL_TOOLS.includes(x)).slice(0,12);
}
function buildAgents({intents=[],risk={},tools=[]}={}){
  const selected=new Set(["conversation","safety","quality"]);
  if(tools.some(x=>/(?:catalog|product|dossier|truth|alternative|bundle|quote|live)/.test(x)))selected.add("product_truth");
  if(tools.some(x=>/(?:agricultur|diagnos|calculator)/.test(x)))selected.add("agronomist");
  if(tools.includes("get_business_fact"))selected.add("business_facts");
  if(intents.some(x=>/(?:purchase|recommend|compare|bundle|price|availability)/.test(x)))selected.add("commerce");
  const purpose={
    conversation:"يفهم المقصود والسياق واللهجة ويمنع خلط الأسئلة",
    product_truth:"يربط كل ادعاء بمنتج حي أو ملف منتج موثّق",
    agronomist:"يحلل المشكلة الزراعية مع قياس وتشخيص تفريقي آمن",
    business_facts:"يجيب عن الفروع والشحن والتواصل من بيانات MIG FARM",
    commerce:"يرتب الخيارات والشراء بدون ضغط أو وعود غير مؤكدة",
    safety:"يمنع الجرعات والتشخيصات والعمليات الحساسة غير الموثقة",
    quality:"يراجع الاكتمال والطبيعية وسؤال المتابعة قبل الإرسال"
  };
  return AGENT_ORDER.filter(x=>selected.has(x)).map((name,index)=>({name,order:index+1,purpose:purpose[name],status:"planned"}));
}
function buildTasks({intents=[],risk={},tools=[],reasoning={}}={}){
  const tasks=[];
  const push=(agent,goal,required=true)=>tasks.push({id:`t${tasks.length+1}`,agent,goal,required,status:"pending"});
  push("conversation","حل الإحالات والردود القصيرة وتثبيت طلب العميل الحالي");
  if(reasoning?.clarification?.required)push("conversation","طرح سؤال توضيحي محدد واحد بدل التخمين");
  for(const intent of intents.slice(0,5)){
    if(/(?:branch|shipping|contact|hours|payment|return|pickup|services|company|order_status|business)/.test(intent))push("business_facts",`إجابة حقيقة الشركة: ${intent}`);
    else if(/(?:product|price|availability|compare)/.test(intent))push("product_truth",`التحقق من حقيقة المنتج: ${intent}`);
    else if(/(?:recommend|purchase|bundle)/.test(intent))push("commerce",`بناء قرار شراء مناسب: ${intent}`);
    else push("conversation",`إكمال مقصد العميل: ${intent}`);
  }
  if(risk.diagnosis)push("agronomist","تقديم احتمالات مرتبة وفحص آمن قبل أي علاج");
  if(risk.dosage)push("safety","عدم ذكر جرعة إلا من ملصق المنتج أو مصدر موثوق محدد");
  if(risk.live_commerce)push("product_truth","التحقق الحي من السعر والتوفر وعدم ادعاء تنفيذ طلب");
  if(tools.length)push("quality","مطابقة الادعاءات مع نتائج الأدوات والأدلة");
  push("quality","إرسال رد طبيعي منظم يجيب أولاً ولا يكرر نفسه");
  return tasks.slice(0,12);
}

export function buildAutonomousCustomerPlanV30({message="",analysis={},semanticFrame={},reasoning={},state={},profile={},cognition={},hasImages=false,humanTurn=null}={}){
  const intents=currentIntents(analysis,semanticFrame),risk=classifyRisk({message,analysis,semanticFrame,hasImages});
  const zeroTools=humanTurn?.tool_policy?.mode==="zero_tools"||["social","browse_only_social"].includes(humanTurn?.mode);
  const allowedTools=zeroTools?[]:toolsFor({intents,risk,hasImages,analysis});
  const ambiguous=Boolean(reasoning?.clarification?.required||semanticFrame?.clarification?.required);
  const complexity=Math.min(10,intents.length*2+(risk.level==="high"?3:risk.level==="medium"?2:0)+(hasImages?2:0)+(allowedTools.length>3?2:0)+(ambiguous?1:0));
  const neuralConfigured=Boolean(clean(process.env.OPENAI_API_KEY,20));
  const executionMode=zeroTools?"deterministic_direct":neuralConfigured&&complexity>=4&&!ambiguous?"neural_primary":"deterministic_resilient";
  const agents=buildAgents({intents,risk,tools:allowedTools});
  const tasks=buildTasks({intents,risk,tools:allowedTools,reasoning});
  const target=risk.level==="high"?.94:risk.level==="medium"?.88:.82;
  return {
    version:VERSION,engine:"neural_autonomous_customer_orchestrator",execution_mode:executionMode,
    mission:{primary:intents[0]||analysis?.intent||"understand_and_help",intents,complexity,has_images:Boolean(hasImages),turn:Math.max(0,Number(state?.turn)||0)+1},
    risk,agents,tasks,allowed_tools:allowedTools,tool_budget:zeroTools?0:Math.max(1,Math.min(8,Math.ceil(complexity/2)+1)),
    evidence_contract:{required:Boolean(risk.level!=="low"||allowedTools.length),live_verification:risk.live_commerce,label_evidence:Boolean(risk.dosage||risk.regulated),identity_before_product_claim:Boolean(hasImages),minimum_sources:risk.level==="high"?2:allowedTools.length?1:0},
    response_contract:{answer_first:true,max_questions:ambiguous?1:1,natural_arabic:true,preserve_verified_names:true,no_internal_policy_labels:true,no_fake_urgency:true},
    confidence_target:target,fallback_contract:{provider_failure:"deterministic_resilient",missing_live_fact:"state_uncertainty",unsafe_or_unresolved:risk.level==="high"?"human_handoff":"specific_clarification"},
    privacy:{raw_message_persisted:false,private_identifiers_excluded:true,profile_fields_bounded:true},
    context:{dialect:clean(profile?.preferred_dialect||semanticFrame?.dialect,30),goal:clean(cognition?.goal||analysis?.intent,80)},
    ready:true
  };
}

export function constrainToolsWithPlanV30(humanAllowed,plan={}){
  const planned=uniq(plan?.allowed_tools).filter(x=>ALL_TOOLS.includes(x));
  if(Array.isArray(humanAllowed)&&humanAllowed.length===0)return [];
  if(!Array.isArray(humanAllowed))return planned;
  const human=new Set(humanAllowed);
  return planned.filter(x=>human.has(x));
}

export function autonomousCustomerOSHealthV30(){
  return {version:VERSION,ready:true,mode:"neural_when_useful_deterministic_when_needed",neural_configured:Boolean(clean(process.env.OPENAI_API_KEY,20)),agents:AGENT_ORDER,capabilities:["intent_plan","risk_plan","specialist_routing","bounded_tool_policy","evidence_contract","provider_fallback"],privacy:{secrets_exposed:false,raw_messages_persisted:false}};
}
