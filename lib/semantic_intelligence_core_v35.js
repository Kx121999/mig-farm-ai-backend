import { createHash } from 'node:crypto';
import { normalizeAr } from './utils.js';

const VERSION='35.0.0';
const RELEASE='SEMANTIC_INTELLIGENCE_CORE_V35';
const stats=globalThis.__migV35Stats||{turns:0,corrections:0,followups:0,topic_switches:0,multi_intent:0,clarifications_blocked:0};
globalThis.__migV35Stats=stats;

function clean(v='',max=2400){return String(v??'').replace(/[\u0000-\u001f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max);}
function arr(v){return Array.isArray(v)?v:[];}
function uniq(v,max=20){return [...new Set(arr(v).map(x=>clean(x,240)).filter(Boolean))].slice(0,max);}
function clamp(v,min=0,max=1){const n=Number(v);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):0;}
function canonical(v=''){return normalizeAr(clean(v,800)).replace(/[^\p{L}\p{N}]+/gu,' ').replace(/\s+/g,' ').trim();}
function hash(v=''){return createHash('sha256').update(String(v)).digest('hex').slice(0,18);}
function intents(frame={}){const primary=clean(frame?.primary_intent,80)||'unknown';return uniq([primary,...arr(frame?.intents).map(x=>x?.name||x),frame?.corrected_goal_intent],10);}


function shortTokens(value=''){return canonical(value).split(' ').filter(Boolean);}
function lightArabicTokenStem(raw=''){
  let token=clean(raw,120);
  if(!/^[\p{Script=Arabic}]+$/u.test(token))return token;
  if(/^[وفبكل]ال/u.test(token)&&token.length>5)token=token.slice(1);
  if(token.startsWith('لل')&&token.length>4)token=`ال${token.slice(2)}`;
  if(token.startsWith('ال')&&token.length>4)token=token.slice(2);
  for(const suffix of ['هما','ها','هم','هن','كم','كن','ه']){
    if(token.endsWith(suffix)&&token.length>suffix.length+2){token=token.slice(0,-suffix.length);break;}
  }
  return token;
}
function tokenStemMatch(tokens=[],patterns=[]){
  return tokens.some(raw=>{
    const token=lightArabicTokenStem(raw);
    return patterns.some(pattern=>token===pattern||token.startsWith(pattern)||pattern.startsWith(token));
  });
}
function recoveredAttributeIntent(message=''){
  const t=canonical(message),tokens=shortTokens(t);
  // Emergency/local semantic recovery only. These are broad concept stems, not
  // stored user sentences; the provider-backed meaning model remains primary.
  if(tokenStemMatch(tokens,['جرع','dose','dosage','معدل']))return 'dosage';
  if(tokenStemMatch(tokens,['سعر','بكام','بكم','تكلف','ثمن','price','cost']))return 'price';
  if(tokenStemMatch(tokens,['متوفر','موجود','متاح','مخزون','stock','avail']))return 'availability';
  if(tokenStemMatch(tokens,['ينفع','مناسب','صالح','اصلح','يلائم','يناسب','suit','fit']))return 'suitability';
  if(tokenStemMatch(tokens,['عدد'])||tokenStemMatch(tokens,['بذر','بذور','بذره','بذرة','حبه','حبة','seed','packet','pack','باكيت','كيس','عبوه','عبوة','علبه','علبة']))return 'pack_size';
  if(tokenStemMatch(tokens,['تفاصيل','مواصف','استخدام','استعمال','وظيف','بيستخدم','بيستعمل','بيعمل','details','spec','use']))return 'product_details';
  return null;
}
function correctionEntityCandidate(message=''){
  const raw=clean(message,600);
  const match=raw.match(/(?:قصدي|اقصد|أقصد|المقصود|i mean)\s+(.{2,100})/iu);
  if(!match)return null;
  const candidate=clean(match[1],100).replace(/^[\s:،,-]+|[؟?!.,،]+$/g,'').trim();
  if(!candidate||/^(?:السعر|سعر|التوفر|متوفر|الجرعه|الجرعة|الكمية|التفاصيل|price|availability|dose)$/iu.test(candidate))return null;
  return candidate;
}

export function stabilizeMeaningFrameV35({message='',meaningFrame={},conversationState={}}={}){
  const frame={...meaningFrame,entities:{...(meaningFrame?.entities||{})},reference:{...(meaningFrame?.reference||{})},response_plan:{...(meaningFrame?.response_plan||{})}};
  const visible=arr(conversationState?.visible_products),active=arr(conversationState?.active_products),hasProductContext=Boolean(conversationState?.active_product_id||visible.length||active.length);
  const confidence=clamp(meaningFrame?.confidence?.overall??meaningFrame?.confidence??0);
  const attribute=hasProductContext&&shortTokens(message).length<=7?recoveredAttributeIntent(message):null;
  const weakReference=!frame.reference?.requires_context&&['new_topic','unclear'].includes(clean(frame.topic_relationship,40)||'unclear');
  if(attribute&&hasProductContext&&(confidence<=.7||weakReference||frame.primary_intent==='unknown'||frame.primary_intent==='product_search')){
    frame.primary_intent=attribute;
    const existing=arr(frame.intents).map(x=>typeof x==='string'?{name:x,confidence}:{...x});
    frame.intents=[{name:attribute,confidence:Math.max(.78,confidence)},...existing.filter(x=>x?.name!==attribute&&x?.name!=='product_search')].slice(0,6);
    frame.domain='products';frame.topic_relationship='followup';
    frame.reference={...frame.reference,requires_context:true,target:conversationState?.active_product_id?'active_product':'visible_product',resolved_text:frame.reference?.resolved_text||null,confidence:Math.max(.82,Number(frame.reference?.confidence)||0)};
    frame.context_policy={...(frame.context_policy||{}),use_recent_context:true,ignore_old_product:false};
    frame.response_plan={...frame.response_plan,external_facts_required:true,answer_order:[attribute],max_questions:visible.length>1&&!conversationState?.active_product_id?1:0};
    frame.v35_recovery={kind:'short_contextual_attribute',intent:attribute,confidence:Math.max(.78,confidence)};
  }
  if((frame.topic_relationship==='correction'||frame.primary_intent==='correction')&&!frame.entities?.product_name){
    const entity=correctionEntityCandidate(message);
    if(entity){
      frame.entities.product_name=entity;frame.entities.product_reference=entity;
      if(!frame.corrected_goal_intent||frame.corrected_goal_intent==='unknown')frame.corrected_goal_intent='product_search';
      const correctionIntents=arr(frame.intents).map(x=>typeof x==='string'?{name:x,confidence:confidence||.84}:{...x});
      if(!correctionIntents.some(x=>x?.name==='product_search'))correctionIntents.push({name:'product_search',confidence:Math.max(.84,confidence)});
      frame.intents=correctionIntents.slice(0,6);frame.domain='products';frame.topic_relationship='correction';
      frame.response_plan={...frame.response_plan,external_facts_required:true,answer_order:['product_search'],max_questions:0};
      frame.v35_recovery={kind:'correction_entity',entity,confidence:.84};
    }
  }
  return frame;
}

export function buildSemanticCoreV35({message='',meaningFrame={},conversationState={},history=[]}={}){
  stats.turns+=1;
  const relationship=clean(meaningFrame?.topic_relationship,40)||'unclear';
  const intentList=intents(meaningFrame);
  const correction=relationship==='correction'||clean(meaningFrame?.speech_act,40)==='correction'||intentList[0]==='correction';
  const followup=relationship==='followup'||Boolean(meaningFrame?.reference?.requires_context);
  const topicSwitch=relationship==='new_topic'&&!correction;
  if(correction)stats.corrections+=1;if(followup)stats.followups+=1;if(topicSwitch)stats.topic_switches+=1;if(intentList.filter(x=>x!=='unknown'&&x!=='correction').length>1)stats.multi_intent+=1;
  const priorActive=arr(conversationState?.active_products).find(x=>x?.entity_id===conversationState?.active_product_id)||arr(conversationState?.active_products)[0]||null;
  const correctionTarget=correction?clean(meaningFrame?.entities?.product_name||meaningFrame?.entities?.product_reference||'',240):'';
  const active=correctionTarget?{entity_id:null,name:correctionTarget,sku:null,source:'current_correction_v35'}:priorActive;
  const constraints=uniq([
    ...arr(conversationState?.known_constraints),
    ...arr(meaningFrame?.entities?.decision_criteria),
    meaningFrame?.entities?.crop?`crop:${clean(meaningFrame.entities.crop,100)}`:'',
    meaningFrame?.entities?.cultivation?`environment:${clean(meaningFrame.entities.cultivation,100)}`:'',
    meaningFrame?.entities?.location?`location:${clean(meaningFrame.entities.location,100)}`:''
  ],20);
  const missing=uniq([meaningFrame?.ambiguity?.missing_information,...arr(meaningFrame?.clarification?.missing)],8);
  const alreadyKnown=new Set([
    conversationState?.active_product_id?'product':'',conversationState?.active_crop?'crop':'',conversationState?.active_environment?'environment':'',conversationState?.active_location?'location':''
  ].filter(Boolean));
  const materialMissing=missing.filter(x=>!alreadyKnown.has(canonical(x)));
  const clarificationRequired=Boolean((meaningFrame?.ambiguity?.required||meaningFrame?.clarification?.required)&&materialMissing.length);
  if((meaningFrame?.ambiguity?.required||meaningFrame?.clarification?.required)&&!clarificationRequired)stats.clarifications_blocked+=1;
  const semanticSignature=hash(JSON.stringify({intent:intentList,relationship,active:active?.entity_id||active?.name||null,crop:conversationState?.active_crop||meaningFrame?.entities?.crop||null,environment:conversationState?.active_environment||meaningFrame?.entities?.cultivation||null,goal:meaningFrame?.corrected_goal_intent||meaningFrame?.user_goal||null}));
  return {
    version:VERSION,release:RELEASE,semantic_signature:semanticSignature,current_message:clean(message,1800),
    primary_intent:intentList[0]||'unknown',corrected_goal_intent:clean(meaningFrame?.corrected_goal_intent,80)||null,intents:intentList,
    relationship,correction,followup,topic_switch:topicSwitch,multi_intent:intentList.filter(x=>x!=='unknown'&&x!=='correction').length>1,
    active_entity:active?{entity_id:clean(active.entity_id,120),name:clean(active.name,240),sku:clean(active.sku,120)}:null,
    slots:{crop:conversationState?.active_crop||meaningFrame?.entities?.crop||null,pest:conversationState?.active_pest||null,disease:conversationState?.active_disease||null,problem:conversationState?.active_problem||null,environment:conversationState?.active_environment||meaningFrame?.entities?.cultivation||null,location:conversationState?.active_location||meaningFrame?.entities?.location||null,quantity:conversationState?.active_quantity||meaningFrame?.entities?.quantity||null},
    constraints,reference:{required:Boolean(meaningFrame?.reference?.requires_context),target:clean(meaningFrame?.reference?.target,80)||null,resolved_text:clean(meaningFrame?.reference?.resolved_text,300)||active?.name||null,confidence:clamp(meaningFrame?.reference?.confidence||conversationState?.last_reference_resolution?.confidence||0)},
    clarification:{required:clarificationRequired,missing:materialMissing,question:clarificationRequired?clean(meaningFrame?.ambiguity?.question||meaningFrame?.clarification?.question,500):null,max_questions:clarificationRequired?1:0},
    recent_turn_count:arr(history).length,current_message_priority:true,examples_are_not_templates:true
  };
}

export function applySemanticCoreV35(state={},core={}){
  return {...state,semantic_core_v35:{...core,current_message:undefined,updated_at:new Date().toISOString()}};
}

export function semanticCoreHealthV35(){return {version:VERSION,release:RELEASE,ready:true,architecture:'meaning_first_current_turn_sovereignty',stats:{...stats}};}
