import { normalizeAr } from "./utils.js";

const VERSION="25.0";
const MAX_KEYS=120;
const store=globalThis.__migV25SelfLearning||{
  started_at:new Date().toISOString(),evaluated:0,score_sum:0,grades:{pass:0,review:0,fail:0},
  flags:{},intents:{},sources:{},actions:{proposed:0,executed:0,failed:0,cancelled:0},
  feedback:{up:0,down:0,reasons:{}},gaps:{},last_updated_at:null
};
globalThis.__migV25SelfLearning=store;

function clean(value="",max=180){return String(value??"").replace(/[\u0000-\u001f]/g," ").replace(/\s+/g," ").trim().slice(0,max);}
function arr(value){return Array.isArray(value)?value:[];}
function inc(bucket,key,amount=1){
  const safe=clean(key,80)||"unknown";bucket[safe]=(Number(bucket[safe])||0)+amount;
  const keys=Object.keys(bucket);if(keys.length>MAX_KEYS)keys.sort((a,b)=>bucket[a]-bucket[b]).slice(0,keys.length-MAX_KEYS).forEach(k=>delete bucket[k]);
}
function hash(value=""){
  let h=2166136261;for(const ch of String(value)){h^=ch.codePointAt(0);h=Math.imul(h,16777619);}return (h>>>0).toString(36);
}
function questionCount(reply=""){return (String(reply).match(/[؟?]/g)||[]).length;}
function actionStatus(action={}){return ["awaiting_confirmation","executed","failed","cancelled"].includes(action?.status)?action.status:"";}
function intentNames(semanticFrame={},analysis={}){
  const names=arr(semanticFrame?.intents).map(x=>clean(x?.name||x,60)).filter(Boolean);
  const fallback=clean(analysis?.intent,60);return [...new Set(names.length?names:(fallback?[fallback]:["unknown"]))].slice(0,8);
}
function gapFingerprint({intents=[],flags=[],source="",analysis={}}={}){
  const category=clean(analysis?.category?.key||analysis?.category||"",50),crop=clean(analysis?.crop?.key||analysis?.crop||"",50);
  const signature=[...intents].sort().join("+"),risk=[...flags].sort().join("+");
  return `gap:${hash([signature,risk,clean(source,60),category,crop].join("|"))}`;
}
function safeTop(bucket={},limit=12){return Object.entries(bucket).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,limit).map(([key,count])=>({key,count}));}

export function evaluateAndRecordTurn({message="",semanticFrame={},analysis={},payload={},source="",evidence={},quality={},actionState=null}={}){
  const reply=clean(payload?.reply||payload?.display_reply,6000);
  const intents=intentNames(semanticFrame,analysis);
  const flags=[];let score=100;
  if(!reply){flags.push("empty_reply");score-=70;}
  if(reply&&reply.length<8){flags.push("too_short");score-=12;}
  const qCount=questionCount(reply),questionBudget=Math.max(0,Math.min(3,Number(semanticFrame?.response_contract?.question_budget??semanticFrame?.plan?.question_budget??1)));
  if(qCount>Math.max(1,questionBudget)){flags.push("question_budget_exceeded");score-=12;}
  const multi=Boolean(semanticFrame?.compound?.is_multi_intent||intents.length>1);
  const completed=arr(semanticFrame?.plan?.tasks).filter(task=>task?.status==="completed"||task?.completed).length;
  if(multi&&/(fallback|clarify|unknown|off_domain)/.test(source)&&completed<intents.length){flags.push("possible_multi_intent_drop");score-=20;}
  if(/(fallback|unknown|no_live|unbound|clarify|repair)/.test(source)){flags.push("needs_learning_review");score-=10;}
  if(arr(quality?.flags).length){flags.push(...arr(quality.flags).slice(0,5).map(x=>`quality_${clean(x,50)}`));score-=Math.min(18,arr(quality.flags).length*4);}
  const normalized=normalizeAr(message);
  const priceClaim=/(سعره|السعر|بكام|بكم|price|cost)/.test(normalizeAr(reply))&&/\d/.test(reply);
  const liveEvidence=Boolean(arr(evidence?.sources).some(x=>/(live|odoo|catalog)/.test(String(x?.type||x?.source||x)))||arr(payload?.results).length||payload?.bound_product?.price||payload?.action_receipt);
  if(priceClaim&&!liveEvidence&&!/(غير متاح|مش ظاهر|مب ظاهر|not available)/.test(normalizeAr(reply))){flags.push("ungrounded_price_risk");score-=25;}
  if(/(مش قصدي|غلط|مش فاهم|ما فهمت|لا اقصد|لأ اقصد)/.test(normalized)&&/(fallback|unknown)/.test(source)){flags.push("correction_not_resolved");score-=18;}
  const status=actionStatus(actionState||payload?.autonomous_action);
  if(status==="failed")score-=8;
  if(payload?.action_receipt&&!/^v25_action_.*_success$/.test(source)){flags.push("untrusted_action_receipt");score-=40;}
  score=Math.max(0,Math.min(100,Math.round(score)));
  const grade=score>=85?"pass":score>=60?"review":"fail";
  const gap=flags.length?gapFingerprint({intents,flags,source,analysis}):"";

  store.evaluated+=1;store.score_sum+=score;store.grades[grade]=(store.grades[grade]||0)+1;
  intents.forEach(x=>inc(store.intents,x));inc(store.sources,clean(source,70)||"unknown");flags.forEach(x=>inc(store.flags,x));
  if(status==="awaiting_confirmation"&&/_proposal$/.test(source))store.actions.proposed+=1;
  if(status==="executed"&&/_success$/.test(source))store.actions.executed+=1;
  if(status==="failed"&&/(safe_failure|gateway_unavailable)$/.test(source))store.actions.failed+=1;
  if(status==="cancelled"&&/action_cancelled$/.test(source))store.actions.cancelled+=1;
  if(gap)inc(store.gaps,gap);store.last_updated_at=new Date().toISOString();

  return {version:VERSION,privacy_safe:true,score,grade,flags:[...new Set(flags)].slice(0,10),intents,question_count:qCount,question_budget:questionBudget,multi_intent:multi,gap_fingerprint:gap||undefined};
}

export function recordOutcomeFeedback(value={}){
  const rating=String(value?.rating||"").toLowerCase();if(!["up","down"].includes(rating))return {ok:false,error:"invalid_rating"};
  const reason=clean(value?.reason_code,60).replace(/[^a-z0-9_-]/gi,"_")||"unspecified";
  store.feedback[rating]=(store.feedback[rating]||0)+1;inc(store.feedback.reasons,`${rating}:${reason}`);store.last_updated_at=new Date().toISOString();
  return {ok:true,version:VERSION,recorded:rating,reason_code:reason};
}

export function selfLearningSnapshot(){
  const average=store.evaluated?Math.round((store.score_sum/store.evaluated)*10)/10:0;
  return {version:VERSION,mode:"privacy_safe_continuous_evaluation",started_at:store.started_at,last_updated_at:store.last_updated_at,totals:{evaluated:store.evaluated,average_score:average,...store.grades},actions:{...store.actions},feedback:{up:store.feedback.up,down:store.feedback.down,reasons:safeTop(store.feedback.reasons,12)},top_flags:safeTop(store.flags,16),top_intents:safeTop(store.intents,16),top_sources:safeTop(store.sources,16),knowledge_gaps:safeTop(store.gaps,20),privacy:{stores_raw_messages:false,stores_contact_data:false,stores_only_aggregates_and_hashes:true}};
}

export function resetSelfLearning(){
  store.started_at=new Date().toISOString();store.evaluated=0;store.score_sum=0;store.grades={pass:0,review:0,fail:0};store.flags={};store.intents={};store.sources={};store.actions={proposed:0,executed:0,failed:0,cancelled:0};store.feedback={up:0,down:0,reasons:{}};store.gaps={};store.last_updated_at=null;
  return selfLearningSnapshot();
}

export function selfLearningHealth(){return {version:VERSION,mode:"privacy_safe_continuous_evaluation",enabled:true,signals:["response_completeness","multi_intent_completion","question_budget","evidence_grounding","correction_recovery","action_outcome","explicit_feedback"],stores:["aggregate_scores","reason_codes","hashed_gap_fingerprints"],never_stores:["raw_messages","phone","email","address","credentials"],snapshot:selfLearningSnapshot().totals};}
