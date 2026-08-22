import { createHash, randomUUID } from "node:crypto";
import { runUnifiedEvolutionV40, unifiedEvolutionHealthV40, isUnifiedEvolutionEnabledV40 } from "./unified_evolution_v40.js";
import { providerGatewayHealthV41 } from "./provider_gateway_v41.js";

const VERSION="41.0.0";
const MODE="final_production_closure_v41";
const RELEASE="MIG_FARM_AI_V41_FINAL_PRODUCTION_CLOSURE";
const ALLOWED_ORIGINS=new Set(["LLM","LLM_PLUS_RAG","STRUCTURED_DATA","SEMANTIC_DEGRADED"]);
const runtime=globalThis.__migProductionClosureV41||{turns:0,llm:0,llm_rag:0,structured:0,degraded:0,canned_blocks:0,exceptions:0,last_error:null};
globalThis.__migProductionClosureV41=runtime;

function clean(v="",max=7000){return String(v??"").replace(/[\u0000-\u001f]/g," ").replace(/\s+/g," ").trim().slice(0,max);}
function arr(v){return Array.isArray(v)?v:[];}
function boolEnv(name,def=true){const raw=process.env[name];if(raw===undefined)return def;return /^(1|true|yes|on)$/i.test(String(raw));}
function hash(v=""){return createHash("sha256").update(String(v)).digest("hex").slice(0,18);}
function activeProduct(state={}){return arr(state?.active_products).find(x=>x?.entity_id===state?.active_product_id)||arr(state?.active_products)[0]||null;}
function intentList(meaning={}){const primary=clean(meaning?.corrected_goal_intent||meaning?.primary_intent||"unknown",60);return [...new Set([primary,...arr(meaning?.intents).map(x=>clean(x?.name||x,60))].filter(Boolean))];}
function isUniversalFailure(text=""){const t=clean(text,1200).toLowerCase();return [
  /التحليل الذكي غير متاح/,/خدمة الفهم الذكي متوقفة/,/خدمة التحليل متوقفة/,/الأفضل تعيد المحاولة بدل ما أرد عليك بتخمين/,/وصلتني رسالتك، لكن خدمة الفهم الذكي/,
  /intelligence service is temporarily unavailable/,/smart analysis is unavailable/,/please retry in a moment/
].some(rx=>rx.test(t));}
function responseText(payload={}){return clean(payload?.display_reply||payload?.reply,8000);}
function classifyOrigin(base={}){
  const source=clean(base?.source,120).toLowerCase(),results=arr(base?.results),evidence=arr(base?.evidence);
  if(source.includes("neural")||source.includes("llm"))return results.length||evidence.length?"LLM_PLUS_RAG":"LLM";
  if(source.includes("structured")||source.includes("differential")||source.includes("visual_safe")||source.includes("product_degradation"))return "STRUCTURED_DATA";
  return "SEMANTIC_DEGRADED";
}
function socialSemanticReply(intent,message,meaning={}){
  const safe=clean(meaning?.safe_direct_reply,900);if(safe&&!isUniversalFailure(safe))return safe;
  switch(intent){
    case "identity":return "أنا MIG FARM AI، مساعد ذكي لمتجر MIG FARM. أقدر أفهم سؤالك عن المنتجات والزراعة والطلبات وأكمل معاك من سياق المحادثة.";
    case "greeting":return "أهلًا بيك 👋 قولّي محتاج إيه وأنا معاك.";
    case "wellbeing":return "تمام الحمد لله 😄 إنت عامل إيه؟";
    case "thanks":return "العفو، تحت أمرك 🌱";
    case "goodbye":return "في أمان الله، وأي وقت تحتاج حاجة أنا موجود.";
    case "human":return "لو محتاج تتكلم مع موظف، أقدر أجهز لك التحويل للفريق بدل ما أكمّل بتخمين.";
    case "frustration":return "فاهم إن الرد السابق ما كانش مناسب. ابعت طلبك بصياغتك العادية وأنا هركز على آخر رسالة من غير ما أرجع لرد محفوظ.";
    case "help_request":return "أكيد، قولّي اللي محتاج مساعدة فيه بطريقتك وأنا هفهمه خطوة خطوة.";
    case "acknowledgment":return "تمام، مكمل معاك.";
    case "negative_ack":return "تمام، صححلي النقطة اللي تقصدها وأنا هبني عليها.";
    case "general_conversation":return clean(message,220)?`فاهمك. كمّل كلامك وأنا هتعامل مع اللي تقصده من السياق الحالي.`:"أنا معاك.";
    default:return null;
  }
}
export function buildSemanticDegradedResponseV41({message="",meaningFrame={},conversationState={},route={},priorPayload=null,reason="provider_unavailable"}={}){
  const prior=responseText(priorPayload||{});if(prior&&!isUniversalFailure(prior))return {reply:prior,origin:"STRUCTURED_DATA",reason:"verified_prior_fallback"};
  const intents=intentList(meaningFrame),primary=intents[0]||"unknown",domain=clean(meaningFrame?.domain||route?.domain||"unclear",60),active=activeProduct(conversationState),crop=clean(conversationState?.active_crop||meaningFrame?.entities?.crop,100),question=clean(meaningFrame?.ambiguity?.question,400);
  const social=socialSemanticReply(primary,message,meaningFrame);if(social)return {reply:social,origin:"SEMANTIC_DEGRADED",reason};
  if(question&&meaningFrame?.ambiguity?.required)return {reply:question,origin:"SEMANTIC_DEGRADED",reason:"material_clarification"};
  if(["price","availability","product_details","known_product_info","pack_size","sku","dosage","suitability","purchase"].includes(primary)){
    const subject=active?.name||clean(meaningFrame?.entities?.product_name||meaningFrame?.entities?.product_reference,220)||"المنتج اللي تقصده";
    const labels={price:"السعر الحالي",availability:"التوفر الحالي",product_details:"تفاصيل المنتج",known_product_info:"تفاصيل المنتج",pack_size:"حجم/عدد العبوة",sku:"SKU",dosage:"الجرعة الموثقة",suitability:"مدى ملاءمته للاستخدام",purchase:"بيانات إكمال الطلب"};
    return {reply:`فاهم إنك بتسأل عن ${subject} بخصوص ${labels[primary]||"التفصيلة المطلوبة"}. الجزء ده محتاج مصدر موثوق متاح لحظيًا، ومش هحط رقم أو معلومة من عندي. جرّب الطلب مرة ثانية بعد لحظة.`,origin:"SEMANTIC_DEGRADED",reason};
  }
  if(domain==="agriculture"||["diagnosis","agriculture_general","calculation","greenhouse_project"].includes(primary)){
    return {reply:`فاهم إن سؤالك زراعي${crop?` عن ${crop}`:""}. في اللحظة دي ما عنديش تحقق كافي يخليني أسمي سبب أو علاج بثقة، فمش هخمن. ${question||"لو تقدر اذكر أهم عرض ظاهر أو ابعت صورة واضحة وأنا أكمل من هناك."}`,origin:"SEMANTIC_DEGRADED",reason};
  }
  if(domain==="mig_farm_business"||["branches","shipping","delivery_time","contact","hours","payment","returns","pickup","services","company","order_status"].includes(primary)){
    return {reply:"فاهم إنك بتسأل عن خدمة من خدمات MIG FARM، لكن المصدر التشغيلي المطلوب مش متاح للحظة. مش هديك معلومة قديمة؛ جرّب مرة تانية بعد لحظة.",origin:"SEMANTIC_DEGRADED",reason};
  }
  return {reply:question||"وصلني معنى رسالتك، لكن الجزء اللي يحتاج توليد ذكي أو تحقق خارجي مش متاح للحظة. جرّبها مرة ثانية، وأنا مش هحوّل كلامك لرد محفوظ.",origin:"SEMANTIC_DEGRADED",reason};
}

function finalize(base,{message,meaningFrame,reason=null}={}){
  let payload={...(base?.payload||{})},text=responseText(payload),origin=classifyOrigin(base);let blocked=false;
  if(!text||isUniversalFailure(text)){
    blocked=Boolean(text);const fallback=buildSemanticDegradedResponseV41({message,meaningFrame,conversationState:base?.conversation_state||{},route:base?.route||{},priorPayload:payload,reason:reason||base?.trace?.fallback_reason||base?.source||"provider_unavailable"});
    payload={...payload,reply:fallback.reply,display_reply:fallback.reply};origin=fallback.origin;if(blocked)runtime.canned_blocks+=1;
  }
  if(!ALLOWED_ORIGINS.has(origin))origin="SEMANTIC_DEGRADED";
  if(origin==="LLM")runtime.llm+=1;else if(origin==="LLM_PLUS_RAG")runtime.llm_rag+=1;else if(origin==="STRUCTURED_DATA")runtime.structured+=1;else runtime.degraded+=1;
  const trace_id=`v41_${new Date().toISOString().slice(0,10).replace(/-/g,"")}_${randomUUID().slice(0,8)}`;
  payload={...payload,__production_closure_v41:true,production_closure_v41:{version:VERSION,mode:MODE,release:RELEASE,trace_id,response_origin:origin,universal_canned_blocked:blocked,current_message_hash:hash(message),single_final_orchestrator:true}};
  return {...base,payload,source:origin==="SEMANTIC_DEGRADED"?"semantic_degraded_v41":clean(base?.source||"production_closure_v41",120),response_origin_v41:origin,trace_v41:payload.production_closure_v41};
}

export async function runProductionClosureV41(args={}){
  runtime.turns+=1;
  try{
    const base=await runUnifiedEvolutionV40(args);
    return finalize(base,{message:args.message,meaningFrame:args.meaningFrame});
  }catch(error){
    runtime.exceptions+=1;runtime.last_error=clean(error?.code||error?.message||"v41_pipeline_exception",180);
    const fallback=buildSemanticDegradedResponseV41({message:args.message,meaningFrame:args.meaningFrame,conversationState:args?.state?.intelligence_v33||{},route:{},reason:runtime.last_error});
    return finalize({payload:{reply:fallback.reply,display_reply:fallback.reply},source:"semantic_degraded_v41",results:[],evidence:[],conversation_state:args?.state?.intelligence_v33||{},route:{}},{message:args.message,meaningFrame:args.meaningFrame,reason:runtime.last_error});
  }
}

export function isProductionClosureEnabledV41(){return boolEnv("AI_PIPELINE_V41",false)&&isUnifiedEvolutionEnabledV40();}
export function productionClosureHealthV41(){return {version:VERSION,mode:MODE,release:RELEASE,ready:true,enabled:isProductionClosureEnabledV41(),architecture:"one_user_facing_orchestrator_over_v40",allowed_response_origins:[...ALLOWED_ORIGINS],universal_canned_final_response:false,legacy_response_engines:"rollback_only_when_AI_PIPELINE_V41_false",provider_gateway:providerGatewayHealthV41(),base:unifiedEvolutionHealthV40(),stats:{...runtime}};}
