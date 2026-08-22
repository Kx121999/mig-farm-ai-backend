import { createHash, randomUUID } from "node:crypto";
import { normalizeAr } from "./utils.js";

const VERSION="33.2.0";
const RELEASE="UNIFIED_SEMANTIC_INTELLIGENCE_V33";
const SOCIAL=new Set(["greeting","wellbeing","thanks","goodbye","acknowledgment","negative_ack","identity","human","help_request","frustration","general_conversation"]);
const BUSINESS=new Set(["branches","shipping","delivery_time","contact","hours","payment","returns","pickup","services","company","order_status"]);
const PRODUCT=new Set(["product_search","product_details","known_product_info","product_memory","price","availability","suitability","recommendation","compare","purchase","bundle","complaint","dosage"]);
const AGRICULTURE=new Set(["agriculture_general","diagnosis","calculation","greenhouse_project"]);
const EXACT_PRODUCT=new Set(["price","availability","product_details","known_product_info","dosage","purchase"]);

const stats=globalThis.__migV33Stats||{
  turns:0,generated:0,degraded:0,regenerated:0,validation_blocks:0,provider_failures:0,
  routes:{},failures:{},started_at:new Date().toISOString(),last_updated_at:null
};
globalThis.__migV33Stats=stats;

function clean(value="",max=2600){return String(value??"").replace(/[\u0000-\u001f]/g," ").replace(/\s+/g," ").trim().slice(0,max);}
function arr(value){return Array.isArray(value)?value:[];}
function uniq(values,max=20){return [...new Set(arr(values).map(x=>clean(x,240)).filter(Boolean))].slice(0,max);}
function clamp(value,min=0,max=1){return Math.max(min,Math.min(max,Number(value)||0));}
function boolEnv(name,fallback=true){const value=clean(process.env[name]??(fallback?"true":"false"),20);return !/^(?:0|false|off|no)$/i.test(value);}
function hash(value=""){return createHash("sha256").update(String(value)).digest("hex").slice(0,18);}
function now(){return new Date().toISOString();}
function increment(bucket,key){const safe=clean(key||"unknown",80)||"unknown";bucket[safe]=(bucket[safe]||0)+1;}
function canonical(value=""){return normalizeAr(clean(value,500)).replace(/[^\p{L}\p{N}]+/gu," ").replace(/\s+/g," ").trim();}
function canonicalId(product={}){const seed=canonical(product.sku||product.external_id||product.name||product.title||"");return seed?`product_${hash(seed)}`:"";}
function normalizeProduct(product={},source="context"){
  if(!product||typeof product!=="object")return null;
  const name=clean(product.name||product.title,300),sku=clean(product.sku||product.default_code,120),external_id=clean(product.external_id,160);
  if(!name&&!sku&&!external_id)return null;
  return {entity_id:clean(product.entity_id,100)||canonicalId({name,sku,external_id}),name,sku,external_id,category:clean(product.category,180),source:clean(product.source||source,80),confidence:clamp(product.confidence||.9)};
}
function explicitProducts({meaningFrame={},selectedProduct=null,selectedProducts=[]}={}){
  const out=[];
  for(const item of [selectedProduct,...arr(selectedProducts)]){const product=normalizeProduct(item,"frontend_context");if(product)out.push(product);}
  const entity=clean(meaningFrame?.entities?.product_name||meaningFrame?.entities?.product_reference,300);
  if(entity)out.push(normalizeProduct({name:entity,source:"meaning_frame",confidence:meaningFrame?.confidence||.75},"meaning_frame"));
  return out.filter(Boolean);
}
function ordinalIndex(message=""){
  const value=canonical(message);
  if(/(?:^| )(?:اللي بعده|التالي|بعده|next)(?: |$)/u.test(value))return "next";
  if(/(?:^| )(?:اللي قبله|السابق|قبله|previous)(?: |$)/u.test(value))return "previous";
  if(/(?:^| )(?:الاول|اول|first)(?: |$)/u.test(value))return 0;
  if(/(?:^| )(?:الثاني|التاني|تاني|second)(?: |$)/u.test(value))return 1;
  if(/(?:^| )(?:الثالث|التالت|تالت|third)(?: |$)/u.test(value))return 2;
  if(/(?:^| )(?:الاخير|اخر|last)(?: |$)/u.test(value))return -1;
  return null;
}
function resolveProductReference({message="",meaningFrame={},previous={},selectedProduct=null,selectedProducts=[]}={}){
  const explicit=explicitProducts({meaningFrame,selectedProduct,selectedProducts});
  if(explicit.length)return {resolved:true,product:explicit[0],kind:"explicit_entity",confidence:explicit[0].confidence,candidates:explicit};
  const visible=[...arr(previous.visible_products),...arr(previous.active_products)].map(x=>normalizeProduct(x,"active_state")).filter(Boolean);
  const resolvedText=clean(meaningFrame?.reference?.resolved_text,300);
  if(resolvedText){
    const target=canonical(resolvedText);const found=visible.find(x=>canonical(x.name)===target||canonical(x.sku)===target||canonical(x.name).includes(target)||target.includes(canonical(x.name)));
    return {resolved:true,product:found||normalizeProduct({name:resolvedText,source:"semantic_reference",confidence:meaningFrame?.reference?.confidence||.75}),kind:"semantic_reference",confidence:clamp(meaningFrame?.reference?.confidence||.75),candidates:visible};
  }
  const ordinal=ordinalIndex(message);
  if(ordinal!==null&&visible.length){let product=null;if(ordinal==="next"||ordinal==="previous"){const activeId=previous?.active_product_id,activeIndex=visible.findIndex(x=>x.entity_id===activeId);const offset=ordinal==="next"?1:-1;product=visible[Math.max(0,Math.min(visible.length-1,(activeIndex>=0?activeIndex:0)+offset))];}else product=ordinal===-1?visible[visible.length-1]:visible[ordinal];if(product)return {resolved:true,product,kind:"ordinal_reference",confidence:.94,candidates:visible};}
  const target=clean(meaningFrame?.reference?.target,40);
  if(meaningFrame?.reference?.requires_context&&["active_product","visible_product"].includes(target)){
    const active=normalizeProduct(previous?.active_products?.find(x=>x.entity_id===previous.active_product_id)||previous?.active_products?.[0]||visible[0],"active_state");
    if(active)return {resolved:true,product:active,kind:"active_reference",confidence:clamp(meaningFrame?.reference?.confidence||.82),candidates:visible};
  }
  return {resolved:false,product:null,kind:meaningFrame?.reference?.requires_context?"unresolved_reference":"none",confidence:meaningFrame?.reference?.requires_context?.25:1,candidates:visible};
}

function blankState(turn=0){return {
  version:VERSION,schema_version:1,turn,active_topic:null,active_subtopic:null,active_products:[],visible_products:[],active_product_id:null,
  active_crop:null,active_pest:null,active_disease:null,active_problem:null,active_environment:null,active_location:null,active_quantity:null,
  user_goal:null,known_constraints:[],confirmed_facts:[],uncertain_facts:[],pending_question:null,last_assistant_action:null,
  last_reference_resolution:null,last_route:null,last_rewritten_query:null,last_correction:null,updated_at:now()
};}

function fact(key,value,source,turn,confidence=.9){const text=clean(value,320);return text?{key, value:text,source:clean(source,80),turn,confidence:clamp(confidence)}:null;}
function mergeFacts(previous=[],current=[]){
  const map=new Map();for(const item of [...arr(previous),...arr(current)]){if(!item?.key||!clean(item.value))continue;map.set(item.key,{...item,value:clean(item.value,320)});}
  return [...map.values()].slice(-24);
}
function intentNames(frame={}){const names=arr(frame?.intents).map(x=>clean(x?.name||x,60)).filter(Boolean);const primary=clean(frame?.primary_intent,60)||"unknown";return uniq([primary,...names],8);}
function routeDomain(frame={}){
  const domain=clean(frame?.domain,40);if(domain&&domain!=="unclear")return domain;
  const intents=intentNames(frame);if(intents.some(x=>AGRICULTURE.has(x)))return "agriculture";if(intents.some(x=>PRODUCT.has(x)))return "products";if(intents.some(x=>BUSINESS.has(x)))return "mig_farm_business";if(intents.some(x=>SOCIAL.has(x)))return "social";return "unclear";
}

export function buildConversationStateV33({message="",state={},meaningFrame={},selectedProduct=null,selectedProducts=[],visionFrame=null}={}){
  const prior=state?.intelligence_v33&&typeof state.intelligence_v33==="object"?state.intelligence_v33:blankState(Number(state?.turn)||0);
  const turn=Math.max(Number(prior.turn)||0,Number(state?.turn)||0)+1;
  const next={...blankState(turn),...prior,turn,updated_at:now()};
  const relationship=clean(meaningFrame?.topic_relationship,40)||"unclear",domain=routeDomain(meaningFrame),intents=intentNames(meaningFrame),primary=intents[0]||"unknown";
  const correctedGoal=clean(meaningFrame?.corrected_goal_intent,60)||null;
  const correction=relationship==="correction"||clean(meaningFrame?.speech_act,30)==="correction"||primary==="correction";
  const newTopic=relationship==="new_topic"&&!correction,uncertainNewTopic=newTopic&&domain==="unclear"&&primary==="unknown";
  if(newTopic&&!uncertainNewTopic){next.active_topic=domain;next.active_subtopic=primary;next.pending_question=null;if(domain!=="products"&&domain!=="commerce"&&domain!=="mixed"){next.active_products=[];next.visible_products=[];next.active_product_id=null;}if(domain!=="agriculture"&&domain!=="mixed"){next.active_crop=null;next.active_pest=null;next.active_disease=null;next.active_problem=null;next.active_environment=null;}}
  if(meaningFrame?.context_policy?.ignore_old_product&&!uncertainNewTopic&&!correction){next.active_products=[];next.visible_products=[];next.active_product_id=null;}
  if(meaningFrame?.context_policy?.ignore_old_agriculture&&!uncertainNewTopic&&!correction){next.active_crop=null;next.active_pest=null;next.active_disease=null;next.active_problem=null;next.active_environment=null;}
  next.active_topic=domain!=="unclear"?domain:(next.active_topic||"unclear");next.active_subtopic=(correctedGoal&&correctedGoal!=="unknown"?correctedGoal:primary)!=="unknown"?(correctedGoal||primary):next.active_subtopic;
  const shortUnresolvedFollowup=uncertainNewTopic&&tokens(message).length<=7&&Boolean(next.active_product_id||arr(next.active_products).length||arr(next.visible_products).length);
  const referenceFrame=shortUnresolvedFollowup?{...meaningFrame,reference:{requires_context:true,target:next.active_product_id?"active_product":"visible_product",resolved_text:null,confidence:.64}}:meaningFrame;
  const reference=resolveProductReference({message,meaningFrame:referenceFrame,previous:next,selectedProduct,selectedProducts});
  if(reference.resolved&&reference.product){
    const product=reference.product;const remaining=arr(next.active_products).map(x=>normalizeProduct(x,"active_state")).filter(Boolean).filter(x=>x.entity_id!==product.entity_id);
    next.active_products=[product,...remaining].slice(0,6);next.active_product_id=product.entity_id;
  }else if(!next.active_products.length&&(!newTopic||uncertainNewTopic)&&!meaningFrame?.context_policy?.ignore_old_product){const legacyActive=normalizeProduct(state?.active_product_context?.product||state?.active_product_context||{},"legacy_active_context");next.active_products=legacyActive?[legacyActive]:[];next.active_product_id=legacyActive?.entity_id||null;}
  if(correction&&!reference.resolved){next.active_products=[];next.active_product_id=null;}
  const entities=meaningFrame?.entities||{};
  if(entities.crop)next.active_crop=clean(entities.crop,100);
  if(entities.cultivation)next.active_environment=clean(entities.cultivation,100);
  if(entities.emirate)next.active_location=clean(entities.emirate,100);
  if(entities.quantity!==null&&entities.quantity!==undefined)next.active_quantity=Number(entities.quantity);
  if(arr(entities.symptoms).length)next.active_problem={kind:"plant_symptoms",description:uniq(entities.symptoms,10).join("، "),symptoms:uniq(entities.symptoms,10),source:"current_message",turn};
  next.user_goal=clean(meaningFrame?.meaning_summary,300)||primary||next.user_goal;
  const currentFacts=[fact("crop",entities.crop,"current_message",turn,meaningFrame?.confidence),fact("environment",entities.cultivation,"current_message",turn,meaningFrame?.confidence),fact("location",entities.emirate,"current_message",turn,meaningFrame?.confidence),fact("quantity",entities.quantity,"current_message",turn,meaningFrame?.confidence),fact("product",reference.product?.name||entities.product_name,"current_message",turn,reference.confidence)].filter(Boolean);
  next.confirmed_facts=mergeFacts(next.confirmed_facts,currentFacts);
  next.known_constraints=uniq([entities.emirate,entities.cultivation,entities.quantity!==null&&entities.quantity!==undefined?`quantity:${entities.quantity}`:"",...arr(entities.decision_criteria)],16);
  next.pending_question=meaningFrame?.ambiguity?.required?clean(meaningFrame?.ambiguity?.question,420)||clean(meaningFrame?.ambiguity?.missing_information,180):null;
  next.last_reference_resolution={kind:reference.kind,resolved:reference.resolved,entity_id:reference.product?.entity_id||null,entity_name:reference.product?.name||null,confidence:reference.confidence};
  if(correction)next.last_correction={turn,replacement:{product:reference.product?.name||null,crop:entities.crop||null,topic:domain,goal:correctedGoal},supersedes_previous:true};
  return next;
}

const TOOLS={
  conversation_only:[],
  business:["get_business_fact","search_knowledge","search_site"],
  product_exact:["get_product_dossier","verify_live_product_truth","search_catalog","search_product_dossiers","guard_visual_label_claim"],
  product_discovery:["search_product_dossiers","search_catalog","compare_product_dossiers","compare_live_options","find_verified_alternatives","get_product_relations"],
  commerce:["verify_live_product_truth","search_catalog","build_verified_bundle","prepare_quote_draft","prepare_purchase_plan","compare_live_options","find_verified_alternatives"],
  technical:["diagnose_crop_problem","search_agricultural_engineering","search_agricultural_master","search_uae_agriculture","agriculture_calculator","search_knowledge"],
  multimodal:["match_visual_product","verify_visual_product_live","guard_visual_label_claim","search_visual_agronomy","diagnose_crop_problem","get_retake_advice","plan_visual_product_action","get_product_dossier","search_catalog"]
};

export function routeIntelligenceV33({meaningFrame={},conversationState={},hasImages=false}={}){
  const intents=intentNames(meaningFrame),actionableIntents=intents.filter(x=>x!=="correction"),domain=routeDomain(meaningFrame),primary=intents[0]||"unknown",correctedGoal=clean(meaningFrame?.corrected_goal_intent,60)||null;
  const routingIntents=actionableIntents.length?actionableIntents:intents;
  let kind="conversation_only";
  if(hasImages||routingIntents.includes("image_analysis"))kind="multimodal";
  else if(routingIntents.every(x=>SOCIAL.has(x)))kind="conversation_only";
  else if(routingIntents.some(x=>AGRICULTURE.has(x)))kind="technical";
  else if(routingIntents.some(x=>["purchase","bundle","compare"].includes(x)))kind="commerce";
  else if(routingIntents.some(x=>EXACT_PRODUCT.has(x)))kind="product_exact";
  else if(routingIntents.some(x=>PRODUCT.has(x)))kind="product_discovery";
  else if(routingIntents.some(x=>BUSINESS.has(x)))kind="business";
  else if(domain==="agriculture")kind="technical";else if(["products","commerce"].includes(domain))kind="product_discovery";else if(domain==="mig_farm_business")kind="business";
  const relationship=clean(meaningFrame?.topic_relationship,40),hasProductContext=Boolean(conversationState?.active_product_id||arr(conversationState?.active_products).length||arr(conversationState?.visible_products).length);
  if(kind==="conversation_only"&&primary==="unknown"&&hasProductContext&&(relationship!=="new_topic"||["product_exact","product_discovery","commerce"].includes(clean(conversationState?.last_route,40))))kind="product_exact";
  if(primary==="correction"&&!correctedGoal&&hasProductContext&&["product_exact","product_discovery","commerce"].includes(clean(conversationState?.last_route,40)))kind="product_discovery";
  if(domain==="mixed"||routingIntents.some(x=>BUSINESS.has(x))&&routingIntents.some(x=>PRODUCT.has(x)||AGRICULTURE.has(x)))kind="multi_source";
  let allowed=kind==="multi_source"?[...TOOLS.business,...TOOLS.product_exact,...TOOLS.product_discovery,...TOOLS.technical]:[...(TOOLS[kind]||[])];
  if(meaningFrame?.reference?.requires_context)allowed.push("recall_memory");
  allowed=uniq(allowed,24);
  const tasks=routingIntents.filter(x=>x!=="unknown"&&x!=="correction").map((intent,index)=>({id:`task_${index+1}`,intent,source:BUSINESS.has(intent)?"business_fact":AGRICULTURE.has(intent)?"technical_knowledge":["price","availability"].includes(intent)?"live_structured_data":PRODUCT.has(intent)?"product_data":"conversation",status:"pending"}));
  return {version:VERSION,kind,domain,primary_intent:primary,corrected_goal_intent:correctedGoal,intents,tasks,allowed_tools:allowed,requires_structured_data:routingIntents.some(x=>["price","availability","purchase","order_status"].includes(x)),requires_semantic_knowledge:routingIntents.some(x=>["diagnosis","agriculture_general","suitability","recommendation","compare","product_search"].includes(x)),requires_generation:true,max_retrieval_attempts:2,active_entity_id:conversationState.active_product_id||null};
}

export function rewriteQueryV33({message="",meaningFrame={},conversationState={},route={}}={}){
  const parts=[clean(message,1200)];
  const active=arr(conversationState.active_products).find(x=>x.entity_id===conversationState.active_product_id)||arr(conversationState.active_products)[0];
  if(meaningFrame?.reference?.requires_context&&active?.name)parts.push(`المنتج المقصود: ${active.name}${active.sku?` (${active.sku})`:""}`);
  if(conversationState.active_crop&&!canonical(message).includes(canonical(conversationState.active_crop)))parts.push(`المحصول: ${conversationState.active_crop}`);
  if(conversationState.active_environment&&!canonical(message).includes(canonical(conversationState.active_environment)))parts.push(`بيئة الزراعة: ${conversationState.active_environment}`);
  if(conversationState.active_problem?.description)parts.push(`المشكلة النشطة: ${conversationState.active_problem.description}`);
  const requested=arr(route?.intents).filter(x=>x!=="correction");
  if(meaningFrame?.corrected_goal_intent)parts.push(`تصحيح المستخدم — الهدف الحالي: ${meaningFrame.corrected_goal_intent}`);
  if(requested.length)parts.push(`المطلوب: ${requested.join("، ")}`);
  return parts.filter(Boolean).join(" | ").slice(0,1800);
}

function tokens(value=""){return canonical(value).split(" ").filter(x=>x.length>1);}
function jaccard(a="",b=""){const A=new Set(tokens(a)),B=new Set(tokens(b));if(!A.size||!B.size)return 0;let shared=0;for(const item of A)if(B.has(item))shared+=1;return shared/(A.size+B.size-shared);}
function replyText(payload={}){return clean(payload?.display_reply||payload?.reply,7000);}
function flattenEvidence(value,depth=0,out=[]){
  if(depth>5||out.length>=160||value===null||value===undefined)return out;
  if(typeof value==="string"||typeof value==="number"){const text=clean(value,4000);if(text)out.push(text);return out;}
  if(Array.isArray(value)){for(const item of value.slice(0,24))flattenEvidence(item,depth+1,out);return out;}
  if(typeof value==="object"){for(const [key,item] of Object.entries(value).slice(0,40)){if(["ecommerce_html","raw","prompt","instructions"].includes(key))continue;flattenEvidence(item,depth+1,out);} }
  return out;
}
function evidenceTexts({evidence=[],results=[]}={}){return flattenEvidence([...arr(evidence),...arr(results)]).map(x=>clean(x,4000)).filter(Boolean);}
function numericClaims(text="",{ignoreListMarkers=false}={}){
  const source=ignoreListMarkers?String(text).split(/\r?\n/).map(line=>line.replace(/^\s*\d{1,2}\s*[.)-]\s+/u,"")).join("\n"):String(text);
  return [...source.matchAll(/(?<![\p{L}\p{N}])\d+(?:[.,]\d+)?(?![\p{L}\p{N}])/gu)].map(x=>String(x[0]).replace(",","."));
}

function candidateText(item={}){return [item.name,item.sku,item.category,item.sales_description,item.ecommerce_description,item.description,...arr(item.type),...arr(item.feature),...arr(item.supplier)].filter(Boolean).join(" ");}
export function rerankCandidatesV33({query="",candidates=[],conversationState={},meaningFrame={},limit=6}={}){
  const queryTokens=new Set(tokens(query));
  const active=arr(conversationState.active_products).find(x=>x.entity_id===conversationState.active_product_id)||arr(conversationState.active_products)[0]||null;
  const resolvedName=canonical(meaningFrame?.reference?.resolved_text||meaningFrame?.entities?.product_name||active?.name||"");
  const crop=canonical(conversationState.active_crop||meaningFrame?.entities?.crop||"");
  const seen=new Set(),scored=[];
  for(const item of arr(candidates)){
    if(!item||typeof item!=="object")continue;
    const identity=clean(item.external_id||item.sku||canonical(item.name),240);if(!identity||seen.has(identity))continue;seen.add(identity);
    const text=candidateText(item),textTokens=new Set(tokens(text));let shared=0;for(const token of queryTokens)if(textTokens.has(token))shared+=1;
    const overlap=queryTokens.size?shared/queryTokens.size:0,name=canonical(item.name),sku=canonical(item.sku);let score=Number(item.score)||0;const reasons=[];
    score+=overlap*120;if(overlap>.15)reasons.push("semantic_token_coverage");
    if(resolvedName&&(name===resolvedName||sku===resolvedName)){score+=260;reasons.push("resolved_entity_exact");}
    else if(resolvedName&&(name.includes(resolvedName)||resolvedName.includes(name))){score+=100;reasons.push("resolved_entity_related");}
    if(crop&&canonical(text).includes(crop)){score+=85;reasons.push("active_crop_match");}
    if(active&&(clean(active.external_id)&&clean(active.external_id)===clean(item.external_id)||canonical(active.sku)&&canonical(active.sku)===sku)){score+=180;reasons.push("active_entity_match");}
    if(item.source&&/(dossier|structured|live|odoo)/i.test(item.source)){score+=12;reasons.push("authoritative_source");}
    scored.push({...item,rerank_score:Number(score.toFixed(4)),rerank_reasons:uniq(reasons,8)});
  }
  return scored.sort((a,b)=>b.rerank_score-a.rerank_score).slice(0,Math.max(1,Math.min(12,Number(limit)||6)));
}
function intentCovered(intent,text=""){
  const t=canonical(text),checks={price:/(?:سعر|درهم|aed|بكام|بكم)/i,availability:/(?:متوفر|متاح|مخزون|نفد|موجود)/i,shipping:/(?:شحن|توصيل|اماره|إمارة)/i,delivery_time:/(?:توصيل|مده|مدة|وقت|يوم)/i,branches:/(?:فرع|شارق|عين|مكان|عنوان)/i,contact:/(?:تواصل|هاتف|واتساب|رقم|ايميل)/i,product_details:/(?:مواصف|تفاصيل|عبوه|عبوة|بذره|بذرة|استخدام)/i,dosage:/(?:جرع|ملصق|معدل|ما اقدرش|مش هخمن)/i,diagnosis:/(?:احتمال|سبب|عرض|افحص|فحص|تشخيص|صوره|صورة)/i,compare:/(?:فرق|مقار|افضل|أنسب|انسب)/i,purchase:/(?:طلب|كمي|سله|سلة|شراء)/i};
  return checks[intent]?checks[intent].test(t):true;
}
function genericFallback(text=""){return /(?:لم افهم|وضح سؤالك|كيف يمكنني مساعدتك|ما قدرت اثبت الاجابه|بيانات mig farm بثقه|تقصد سعر المنتج، توفره، استخدامه)/i.test(canonical(text));}
function executedAction(text=""){return /(?:تم تنفيذ الطلب|تم تاكيد الطلب|تم الدفع|order confirmed|payment completed)/i.test(canonical(text));}

export function validateUnifiedResponseV33({message="",payload={},meaningFrame={},conversationState={},route={},evidence=[],results=[]}={}){
  const rawReply=String(payload?.display_reply||payload?.reply||""),reply=replyText(payload),flags=[],hard=[];
  if(!reply){flags.push("empty_response");hard.push("empty_response");}
  if(reply&&genericFallback(reply)&&meaningFrame?.primary_intent!=="unknown"){flags.push("generic_canned_fallback");hard.push("current_message_relevance_failure");}
  const missing=arr(route?.intents).filter(intent=>!intentCovered(intent,reply));for(const intent of missing)flags.push(`missing_intent:${intent}`);
  if(route?.intents?.length>1&&missing.length){hard.push("multi_intent_failure");}
  if(executedAction(reply)){flags.push("unverified_action_execution");hard.push("grounding_failure");}
  const sourceTexts=evidenceTexts({evidence,results}),groundingBlob=[message,...sourceTexts].join(" ");
  const claims=numericClaims(rawReply,{ignoreListMarkers:true}),known=new Set(numericClaims(groundingBlob));
  const unsupported=claims.filter(x=>!known.has(x)&&!/^20\d{2}$/.test(x));
  if(unsupported.length&&route?.kind!=="conversation_only"){flags.push("unsupported_numeric_claim");hard.push("grounding_failure");}
  if(reply.length>120&&sourceTexts.some(text=>text.length>100&&jaccard(reply,text)>.91)){flags.push("raw_retrieval_output");hard.push("answer_generation_bypass");}
  const active=arr(conversationState.active_products).find(x=>x.entity_id===conversationState.active_product_id);
  if(active&&meaningFrame?.reference?.requires_context){
    const other=arr(conversationState.visible_products).find(x=>x.entity_id!==active.entity_id&&x.name&&canonical(reply).includes(canonical(x.name))&&!canonical(message).includes(canonical(x.name)));
    if(other){flags.push("wrong_entity_reference");hard.push("wrong_entity_resolution");}
  }
  const questionCount=(reply.match(/[؟?]/g)||[]).length,maxQuestions=Math.max(0,Math.min(1,Number(meaningFrame?.response_plan?.max_questions??1)));
  if(questionCount>maxQuestions){flags.push("question_budget_exceeded");}
  let score=100-hard.length*34-flags.filter(x=>!hard.includes(x)).length*8-missing.length*8;score=Math.max(0,Math.min(100,score));
  return {version:VERSION,accepted:hard.length===0&&score>=76,score,flags:uniq(flags,24),hard_blocks:uniq(hard,12),missing_intents:missing,unsupported_numeric_claims:unsupported,question_count:questionCount,current_message_used:!hard.includes("current_message_relevance_failure"),grounded:!hard.includes("grounding_failure"),entity_consistent:!hard.includes("wrong_entity_resolution")};
}

function degradedReply({message="",meaningFrame={},conversationState={},route={}}={}){
  if(meaningFrame?.safe_direct_reply&&!meaningFrame?.response_plan?.external_facts_required)return clean(meaningFrame.safe_direct_reply,800);
  if(meaningFrame?.ambiguity?.required&&meaningFrame?.ambiguity?.question)return clean(meaningFrame.ambiguity.question,600);
  const active=arr(conversationState.active_products).find(x=>x.entity_id===conversationState.active_product_id)||arr(conversationState.active_products)[0];
  const effectiveIntent=route?.corrected_goal_intent||route?.primary_intent;
  if(["price","availability","product_details","known_product_info","dosage","suitability"].includes(effectiveIntent)&&active?.name)return `فهمت إنك بتسأل عن ${active.name}، لكن ما قدرتش أوصل للمصدر المطلوب دلوقتي من غير ما أخمّن. جرّب إعادة المحاولة بعد لحظة.`;
  if(route?.kind==="technical")return `وصلني إن سؤالك عن مشكلة زراعية${conversationState.active_crop?` في ${conversationState.active_crop}`:""}. خدمة التحليل متوقفة مؤقتًا، فمش هسمّي سبب أو علاج من غير فحص موثوق. جرّب مرة ثانية بعد لحظة.`;
  if(route?.kind==="business")return "وصلني طلبك، لكن مصدر بيانات الخدمة غير متاح مؤقتًا. جرّب إعادة المحاولة بعد لحظة عشان ما أديكش معلومة قديمة.";
  return `وصلني كلامك: «${clean(message,180)}». التحليل الذكي غير متاح للحظة، فالأفضل تعيد المحاولة بدل ما أرد عليك بتخمين.`;
}

function traceStart({conversationId="",message=""}={}){const id=`ai_${new Date().toISOString().slice(0,10).replace(/-/g,"")}_${randomUUID().slice(0,8)}`;return {trace_id:id,conversation_hash:hash(conversationId),message_hash:hash(message),started_at:Date.now(),stages:[],fallback_reason:null};}
function stage(trace,name,started,data={}){trace.stages.push({name,duration_ms:Math.max(0,Date.now()-started),...data});}
function finalizeTrace(trace){return {...trace,latency_ms:Math.max(0,Date.now()-trace.started_at),completed_at:now(),started_at:undefined};}
function updateProductsFromResult(state={},results=[],payload={}){
  const products=arr(results).map(x=>normalizeProduct(x,"selected_evidence")).filter(Boolean);if(!products.length)return state;
  const preserveVisible=state.last_route==="product_exact"&&arr(state.visible_products).length>0;
  const mergedVisible=preserveVisible?[...arr(state.visible_products),...products]:products;
  const seenVisible=new Set(),visible=[];for(const item of mergedVisible){const product=normalizeProduct(item,item?.source||"selected_evidence");if(!product)continue;const key=product.entity_id||canonical(product.name);if(seenVisible.has(key))continue;seenVisible.add(key);visible.push(product);}
  const next={...state,visible_products:visible.slice(0,8)};
  const active=arr(next.active_products).find(x=>x.entity_id===next.active_product_id);
  if(active){const verified=products.find(x=>x.entity_id===active.entity_id||canonical(x.name)===canonical(active.name));if(verified){next.active_products=[verified,...arr(next.active_products).filter(x=>x.entity_id!==active.entity_id)].slice(0,6);next.active_product_id=verified.entity_id;}}
  else if(products.length===1){next.active_products=[products[0]];next.active_product_id=products[0].entity_id;}
  else{const text=canonical(replyText(payload)),mentioned=products.filter(x=>x.name&&canonical(x.name).length>4&&text.includes(canonical(x.name)));if(mentioned.length===1){next.active_products=[mentioned[0]];next.active_product_id=mentioned[0].entity_id;}}
  return next;
}

export async function runUnifiedIntelligenceV33({message="",conversationId="",state={},history=[],meaningFrame={},semanticFrame={},analysis={},selectedProduct=null,selectedProducts=[],visionFrame=null,generate=null,fallback=null}={}){
  const trace=traceStart({conversationId,message});stats.turns+=1;
  let started=Date.now();let conversationState=buildConversationStateV33({message,state,meaningFrame,selectedProduct,selectedProducts,visionFrame});stage(trace,"context_and_reference",started,{reference:conversationState.last_reference_resolution?.kind||"none"});
  started=Date.now();const route=routeIntelligenceV33({meaningFrame,conversationState,hasImages:Boolean(visionFrame?.has_visual_context)});conversationState.last_route=route.kind;stage(trace,"semantic_route",started,{route:route.kind,tasks:route.tasks.length});increment(stats.routes,route.kind);
  started=Date.now();const rewrittenQuery=rewriteQueryV33({message,meaningFrame,conversationState,route});conversationState.last_rewritten_query=rewrittenQuery;stage(trace,"contextual_query_rewrite",started,{changed:canonical(rewrittenQuery)!==canonical(message)});
  const generationContext={version:VERSION,release:RELEASE,current_message:message,meaning:meaningFrame,active_state:conversationState,route,rewritten_query:rewrittenQuery,recent_dialogue:arr(history).slice(-10),semantic_frame:semanticFrame,validation_repair:null};
  let generated=null;started=Date.now();
  if(typeof generate==="function"){
    try{generated=await generate(generationContext);}catch(error){trace.fallback_reason=clean(error?.message||"generation_failed",120);increment(stats.failures,"generation_failed");}
  }
  stage(trace,"grounded_generation",started,{handled:Boolean(generated?.payload?.reply||generated?.reply),source:clean(generated?.source,80)});
  if(!generated?.payload?.reply&&!generated?.reply){
    stats.provider_failures+=1;started=Date.now();
    if(typeof fallback==="function")try{generated=await fallback(generationContext);}catch(error){trace.fallback_reason=clean(error?.message||"fallback_failed",120);}
    if(!generated?.payload?.reply&&!generated?.reply)generated={payload:{reply:degradedReply({message,meaningFrame,conversationState,route})},source:"unified_degraded_v33",results:[],evidence:[]};
    trace.fallback_reason=trace.fallback_reason||clean(generated?.reason||generated?.source||"provider_unavailable",120);stats.degraded+=1;stage(trace,"bounded_degradation",started,{source:clean(generated?.source,80)});
  }else stats.generated+=1;
  let payload=generated.payload||{reply:generated.reply},results=arr(generated.results||payload.results),evidence=arr(generated.evidence||payload.evidence);
  conversationState=updateProductsFromResult(conversationState,results,payload);
  started=Date.now();let validation=validateUnifiedResponseV33({message,payload,meaningFrame,conversationState,route,evidence,results});stage(trace,"answer_validation",started,{accepted:validation.accepted,score:validation.score,flags:validation.flags.length});
  if(!validation.accepted&&typeof generate==="function"){
    stats.validation_blocks+=1;increment(stats.failures,validation.hard_blocks[0]||"validation_failure");
    const repairContext={...generationContext,active_state:conversationState,validation_repair:{previous_reply:replyText(payload),issues:validation.flags,hard_blocks:validation.hard_blocks,instruction:"Regenerate a fresh answer using only verified evidence. Address the latest message and every requested intent. Remove unsupported claims and wrong entities."}};
    started=Date.now();let repaired=null;try{repaired=await generate(repairContext);}catch{}
    if(repaired?.payload?.reply||repaired?.reply){const candidate=repaired.payload||{reply:repaired.reply},candidateResults=arr(repaired.results||candidate.results||results),candidateEvidence=arr(repaired.evidence||candidate.evidence||evidence),candidateValidation=validateUnifiedResponseV33({message,payload:candidate,meaningFrame,conversationState,route,evidence:candidateEvidence,results:candidateResults});if(candidateValidation.score>validation.score&&candidateValidation.hard_blocks.length<=validation.hard_blocks.length){payload=candidate;results=candidateResults;evidence=candidateEvidence;validation=candidateValidation;generated={...repaired,payload:candidate};stats.regenerated+=1;}}
    stage(trace,"bounded_regeneration",started,{accepted:validation.accepted,score:validation.score});
  }
  if(!validation.accepted&&validation.hard_blocks.length){
    let safe=null;if(typeof fallback==="function")try{safe=await fallback({...generationContext,active_state:conversationState,validation_repair:{issues:validation.flags,safe_only:true}});}catch{}
    payload=safe?.payload?.reply?safe.payload:{reply:degradedReply({message,meaningFrame,conversationState,route})};results=arr(safe?.results);evidence=arr(safe?.evidence);validation=validateUnifiedResponseV33({message,payload,meaningFrame,conversationState,route,evidence,results});generated={...(safe||{}),payload,source:safe?.source||"unified_validation_safe_fallback_v33"};
  }
  conversationState.last_assistant_action=clean(generated?.source||"unified_generation",100);conversationState.updated_at=now();
  const completed=finalizeTrace(trace);stats.last_updated_at=now();
  if(boolEnv("AI_DEBUG",false))console.info("MIG_AI_V33_TRACE",JSON.stringify({trace_id:completed.trace_id,conversation_hash:completed.conversation_hash,message_hash:completed.message_hash,route:route.kind,intents:route.intents,reference:conversationState.last_reference_resolution,rewritten_query_hash:hash(rewrittenQuery),selected_result_count:results.length,evidence_count:evidence.length,source:clean(generated?.source,80),validation:{accepted:validation.accepted,score:validation.score,flags:validation.flags,hard_blocks:validation.hard_blocks},fallback_reason:completed.fallback_reason,latency_ms:completed.latency_ms}));
  const clientTrace={trace_id:completed.trace_id,route:route.kind,latency_ms:completed.latency_ms,validation:{accepted:validation.accepted,score:validation.score,grounded:validation.grounded,entity_consistent:validation.entity_consistent,current_message_used:validation.current_message_used},fallback_reason:completed.fallback_reason||null};
  return {handled:true,payload:{...payload,reply:replyText(payload),display_reply:replyText(payload),__unified_v33:true,unified_intelligence_v33:clientTrace},source:clean(generated?.source||"unified_intelligence_v33",120),results,evidence,retrieval:generated?.retrieval||null,plan:generated?.plan||null,conversation_state:conversationState,route,rewritten_query:rewrittenQuery,validation,trace:completed};
}

export function unifiedIntelligenceHealthV33(){
  return {version:VERSION,release:RELEASE,ready:true,enabled:boolEnv("AI_PIPELINE_V33",true),architecture:"single_semantic_orchestrator",legacy_pipeline:boolEnv("AI_PIPELINE_V33",true)?"rollback_only":"active_by_explicit_flag",response_policy:"one_generator_rag_is_evidence",state_schema:1,debug:{enabled:boolEnv("AI_DEBUG",false),token_configured:Boolean(clean(process.env.AI_DEBUG_TOKEN,400))},capabilities:["current_message_priority","semantic_routing","explicit_active_state","reference_resolution","contextual_query_rewrite","bounded_tools","fresh_answer_generation","grounding_validation","relevance_validation","entity_consistency","bounded_regeneration","trace_ids","privacy_safe_debug","safe_degradation","correction_goal_supersession","pending_action_state_priority","active_product_subject_lock"],stats:{...stats,routes:{...stats.routes},failures:{...stats.failures}}};
}

export function isUnifiedIntelligenceEnabledV33(){return boolEnv("AI_PIPELINE_V33",true);}
