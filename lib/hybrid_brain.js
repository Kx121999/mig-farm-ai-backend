import { normalizeAr, tokenize } from "./utils.js";

function n(v=""){ return normalizeAr(String(v||"")); }
function arr(v){ return Array.isArray(v)?v:[]; }
function clamp(v,min=0,max=100){ return Math.max(min,Math.min(max,Number(v)||0)); }
function uniq(items=[],limit=12){
  const seen=new Set(),out=[];
  for(const item of items){
    const value=String(item||"").trim(); if(!value) continue;
    const key=n(value); if(!key||seen.has(key)) continue;
    seen.add(key);out.push(value);if(out.length>=limit) break;
  }
  return out;
}
function slimProduct(p={}){
  return {name:String(p?.name||"").slice(0,260),price:String(p?.price??"").slice(0,60),currency:String(p?.currency||"AED").slice(0,20),availability:String(p?.availability||"").slice(0,90),url:String(p?.url||"").slice(0,700)};
}

export function buildHybridPlan({message="",analysis={},cognition={},state={},profile={}}={}){
  const steps=["understand_request"];
  const intent=String(analysis?.intent||"unknown");
  const goal=String(cognition?.goal||"answer");
  const productLike=["product_search","recommendation","product_memory","known_product_info","known_seed_info","known_seed_comparison"].includes(intent) || Boolean(analysis?.category||analysis?.crop);
  if(productLike) steps.push("retrieve_live_catalog");
  if(["recommend","compare","optimize_budget","bundle","purchase"].includes(goal)) steps.push("apply_constraints_and_rank");
  if(["shipping","delivery_time","payment","returns","branches","contact","hours","tax"].includes(intent)) steps.push("retrieve_verified_policy");
  if(["unknown","agriculture_general","faq"].includes(intent) || !productLike) steps.push("retrieve_managed_knowledge");
  if(["unknown","agriculture_general"].includes(intent)) steps.push("retrieve_site_context");
  if(goal==="compare" || /قارن|الفرق|compare|افضل|انسب/.test(n(message))) steps.push("compare_evidence");
  if(goal==="purchase") steps.push("prepare_commerce_action");
  steps.push("check_evidence","critic_review");

  const queryParts=[message];
  const category=analysis?.category?.key||state?.category||profile?.category||"";
  const crop=analysis?.crop?.key||state?.crop||profile?.crop||"";
  const emirate=analysis?.emirate||state?.emirate||profile?.emirate||"";
  if(category||crop) queryParts.push([category,crop].filter(Boolean).join(" "));
  if(emirate && /شحن|توصيل|فرع|shipping|delivery/.test(n(message))) queryParts.push(`${message} ${emirate}`);
  const hypotheses=uniq(queryParts,4);
  const complexity=Math.min(5,1+Math.floor(steps.length/2));
  return {
    engine:"hybrid_planner_v10",intent,goal,steps:uniq(steps,9),hypotheses,
    complexity,requires_live_data:productLike||["shipping","payment"].includes(intent),
    requires_reasoning:["recommend","compare","optimize_budget","bundle"].includes(goal),
    requires_critic:true,
    context:{category:String(category),crop:String(crop),emirate:String(emirate),turn:Number(state?.turn)||0}
  };
}

export function sanitizeHybridMemory(value={}){
  const v=value&&typeof value==="object"&&!Array.isArray(value)?value:{};
  const prefs=v.preferences&&typeof v.preferences==="object"&&!Array.isArray(v.preferences)?v.preferences:{};
  return {
    v:1,
    preferences:{
      emirate:String(prefs.emirate||"").slice(0,60),cultivation:String(prefs.cultivation||"").slice(0,60),
      budget:prefs.budget!==null&&prefs.budget!==""&&Number.isFinite(Number(prefs.budget))?Number(prefs.budget):null,
      price_preference:["lower","higher","neutral"].includes(prefs.price_preference)?prefs.price_preference:"neutral",
      require_available:Boolean(prefs.require_available)
    },
    active_goal:String(v.active_goal||"").slice(0,70),
    recent_goals:arr(v.recent_goals).slice(-6).map(x=>String(x).slice(0,100)),
    last_entities:arr(v.last_entities).slice(0,10).map(x=>String(x).slice(0,120)),
    last_decisions:arr(v.last_decisions).slice(-5).map(x=>({summary:String(x?.summary||"").slice(0,300),basis:arr(x?.basis).slice(0,6).map(y=>String(y).slice(0,120)),products:arr(x?.products).slice(0,4).map(slimProduct),turn:Number(x?.turn)||0})),
    knowledge_gaps:arr(v.knowledge_gaps).slice(-8).map(x=>String(x).slice(0,160)),
    corrections:arr(v.corrections).slice(-6).map(x=>String(x).slice(0,180)),
    rejected_constraints:arr(v.rejected_constraints).slice(-6).map(x=>String(x).slice(0,120)),
    last_retrieval_sources:arr(v.last_retrieval_sources).slice(0,8).map(String),
    confidence_history:arr(v.confidence_history).slice(-8).map(x=>Math.max(0,Math.min(100,Number(x)||0))),
    updated_turn:Math.max(0,Number(v.updated_turn)||0)
  };
}

function entityList({analysis={},state={},results=[]}={}){
  return uniq([
    analysis?.category?.key,analysis?.crop?.key,analysis?.emirate,analysis?.cultivation,
    state?.category,state?.crop,state?.emirate,
    ...arr(results).slice(0,4).map(x=>x?.name)
  ],10);
}

export function mergeHybridMemory(previous={},context={}){
  const old=sanitizeHybridMemory(previous);
  const frame=context?.cognition||{};
  const c=frame?.constraints||{};
  const next={...old,preferences:{...old.preferences}};
  if(frame?.context_switch||frame?.correction){
    next.last_entities=[];
    next.knowledge_gaps=[];
    if(frame?.correction) next.corrections=uniq([...next.corrections,String(context?.message||"").slice(0,180)],6);
  }
  if(c.emirate) next.preferences.emirate=String(c.emirate);
  if(c.cultivation) next.preferences.cultivation=String(c.cultivation);
  if(c.total_budget!==null&&c.total_budget!==undefined) next.preferences.budget=Number(c.total_budget);
  if(c.price_preference&&c.price_preference!=="neutral") next.preferences.price_preference=c.price_preference;
  if(c.availability_explicit) next.preferences.require_available=Boolean(c.require_available);
  if(frame?.goal && frame.goal!=="answer"){
    next.active_goal=String(frame.goal);
    next.recent_goals=uniq([...next.recent_goals,frame.goal],6);
  }
  next.last_entities=entityList(context);
  const gaps=uniq([...(frame?.unresolved||[]),...(context?.decision?.knowledge_gaps||[])],8);
  if(gaps.length) next.knowledge_gaps=uniq([...next.knowledge_gaps,...gaps],8);
  if(context?.decision?.handled){
    next.last_decisions=[...next.last_decisions,{
      summary:String(context?.decision?.display_reply||context?.decision?.memory_reply||"").slice(0,300),
      basis:arr(context?.decision?.decision_basis),products:arr(context?.decision?.results),turn:Number(context?.turn)||0
    }].slice(-5);
  }
  next.last_retrieval_sources=uniq(context?.retrieval?.sources||[],8);
  if(context?.confidence!==undefined) next.confidence_history=[...next.confidence_history,Math.round(Number(context.confidence)||0)].slice(-8);
  next.updated_turn=Math.max(0,Number(context?.turn)||old.updated_turn);
  return sanitizeHybridMemory(next);
}

function unsupportedClaimFlags({payload={},source="",results=[],evidence={},cognition={},retrieval={}}={}){
  const text=n(payload?.display_reply||payload?.reply||"");
  const flags=[];
  const hasLive=arr(results).length>0 || /^live_|current_product|cognitive_/.test(String(source||""));
  const evidenceConfidence=Number(evidence?.confidence||0);
  if(/مضمون|100|اكيد 100|قطعا|بلا شك|guaranteed|definitely/.test(text) && evidenceConfidence<.9) flags.push("absolute_claim_without_strong_evidence");
  if(/الافضل علي الاطلاق|افضل منتج في السوق|best on the market/.test(text)) flags.push("unsupported_superlative");
  if(/متوفر|موجود في المخزون|available|in stock/.test(text) && !hasLive && !/github_knowledge/.test(String(source||""))) flags.push("stock_claim_without_live_evidence");
  if(/aed|درهم|السعر|price/.test(text) && !hasLive && !/github_knowledge/.test(String(source||"")) && evidenceConfidence<.9) flags.push("price_claim_without_strong_evidence");
  if(cognition?.goal==="compare" && !arr(results).length && !arr(retrieval?.items).length) flags.push("comparison_without_evidence_set");
  if(arr(cognition?.unresolved).length && !/(احتاج|محتاج|حدد|اذكر|قول لي|عطني|ارسل)/.test(text)) flags.push("unresolved_constraint_not_acknowledged");
  return uniq(flags,8);
}

function conflictFlags(retrieval={}){
  const items=arr(retrieval?.items),flags=[];
  const priceRows=items.filter(x=>x?.product?.price!==undefined || /aed|درهم/.test(n(x?.answer)));
  if(priceRows.length>1){
    const prices=uniq(priceRows.map(x=>String(x?.product?.price||x?.answer||"").match(/[0-9]+(?:\.[0-9]+)?/)?.[0]||""),8);
    if(prices.length>1 && items.some(x=>x.source==="live_product") && items.some(x=>x.source!=="live_product")) flags.push("cross_source_price_conflict_possible");
  }
  return flags;
}

export function criticReview(context={}){
  const flags=uniq([...unsupportedClaimFlags(context),...conflictFlags(context?.retrieval)],10);
  let score=96;
  for(const flag of flags){
    if(/absolute|superlative|price_claim|stock_claim/.test(flag)) score-=14;
    else score-=8;
  }
  const evidenceConfidence=Number(context?.evidence?.confidence||0)*100;
  score=(score*.58)+(evidenceConfidence*.42);
  return {
    engine:"self_critic_v10",passed:flags.length===0 || score>=72,score:Math.round(clamp(score,25,99)),flags,
    action:flags.some(x=>/absolute|superlative|price_claim|stock_claim/.test(x))?"guard_response":"allow",
    evidence_level:String(context?.evidence?.level||""),retrieval_confidence:Number(context?.retrieval?.confidence||0)
  };
}

export function applyCriticGuard(payload={},review={}){
  if(review?.action!=="guard_response") return payload;
  const out={...payload};
  function guard(text=""){
    return String(text||"")
      .replace(/مضمون\s*100\s*%?/gi,"مدعوم بالبيانات المتاحة")
      .replace(/أكيد\s*100\s*%?/gi,"بحسب البيانات المتاحة")
      .replace(/الأفضل على الإطلاق/gi,"من أقوى الخيارات حسب البيانات المتاحة")
      .replace(/افضل منتج في السوق/gi,"خيار قوي حسب البيانات المتاحة")
      .replace(/definitely guaranteed/gi,"supported by the available data");
  }
  if(typeof out.reply==="string") out.reply=guard(out.reply);
  if(typeof out.display_reply==="string") out.display_reply=guard(out.display_reply);
  return out;
}

export function hybridResponseMeta({plan={},memory={},review={},retrieval={},evidence={},cognition={}}={}){
  let confidence=Number(cognition?.confidence||70);
  if(evidence?.confidence) confidence=(confidence*.44)+(Number(evidence.confidence)*100*.38)+(Number(review?.score||70)*.18);
  if(retrieval?.confidence) confidence=(confidence*.86)+(Number(retrieval.confidence)*100*.14);
  return {
    engine:"hybrid_brain_v10",confidence:Math.round(clamp(confidence,25,99)),
    planner:{complexity:Number(plan?.complexity)||1,steps:arr(plan?.steps).slice(0,9),hypotheses:arr(plan?.hypotheses).slice(0,4)},
    retrieval:{confidence:Number(retrieval?.confidence||0),sources:arr(retrieval?.sources).slice(0,8),items_count:arr(retrieval?.items).length},
    critic:review,
    memory:{active_goal:String(memory?.active_goal||""),entities:arr(memory?.last_entities).slice(0,8),knowledge_gaps:arr(memory?.knowledge_gaps).slice(-5)},
    certainty_policy:"live/store evidence > managed verified knowledge > site retrieval > contextual inference"
  };
}

export function episodicMemoryCandidates(memory={}){
  const m=sanitizeHybridMemory(memory),out=[];
  m.last_decisions.slice(-3).reverse().forEach((d,index)=>{
    if(!d.summary) return;
    out.push({id:`decision-${d.turn||index}`,title:"Previous decision",answer:d.summary,score:.74-(index*.05),source:"episodic_memory",verified:false});
  });
  if(m.last_entities.length) out.push({id:"entities",title:"Conversation entities",answer:m.last_entities.join("، "),score:.48,source:"episodic_memory",verified:false});
  return out;
}

export function hybridBrainHealth(){
  return {
    version:"10.0",
    capabilities:[
      "multi_step_planning","query_hypotheses","episodic_memory","preference_memory","hybrid_source_fusion",
      "self_critique","claim_risk_guard","cross_source_conflict_detection","evidence_weighted_confidence","knowledge_gap_persistence"
    ]
  };
}
