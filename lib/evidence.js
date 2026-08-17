import { normalizeAr } from "./utils.js";

function n(v=""){ return normalizeAr(String(v||"")); }
function clamp(v,min=0,max=1){ return Math.max(min,Math.min(max,Number(v)||0)); }

const SOURCE_TIERS=[
  {match:/^cognitive_product_decision/,level:"live_derived_decision",score:.96,basis:"live_store_decision"},
  {match:/^cognitive_visible_set_decision/,level:"visible_live_memory",score:.90,basis:"visible_product_memory"},
  {match:/^(live_|multi_shipping_products|current_product)/,level:"live_verified",score:.98,basis:"live_store"},
  {match:/github_knowledge/,level:"managed_verified",score:.97,basis:"github_knowledge"},
  {match:/^(knowledge_|seed_knowledge_|human_knowledge_|faq_|services|company|identity)/,level:"verified_static",score:.90,basis:"verified_business_knowledge"},
  {match:/confidence_site_rag/,level:"site_retrieval",score:.78,basis:"site_content"},
  {match:/(memory_|context_|recommend_|sales_qualify_|plant_diagnosis|greenhouse_)/,level:"context_reasoning",score:.72,basis:"conversation_context"},
  {match:/(no_live|clarify|fallback|off_domain|repair|empty|rate_limit)/,level:"uncertain",score:.42,basis:"clarification_or_gap"}
];

export function evidenceSummary({source="",payload={},results=[],analysis={}}={}){
  const s=String(source||"");
  const tier=SOURCE_TIERS.find(x=>x.match.test(s))||{level:"rule_engine",score:.68,basis:"deterministic_rules"};
  let score=tier.score;
  const liveCount=Array.isArray(results)?results.length:0;
  if(liveCount) score=Math.max(score,.94);
  if(payload?.knowledge_matches?.length) score=Math.max(score,.96);
  if(payload?.confidence!==undefined){
    const c=Number(payload.confidence);
    if(Number.isFinite(c)) score=Math.max(score,clamp(c>1?c/10:c));
  }
  if(analysis?.correction) score=Math.min(.99,score+.01);
  return {
    level:tier.level,
    confidence:Number(clamp(score,.2,.99).toFixed(2)),
    basis:tier.basis,
    live_products:liveCount,
    managed_knowledge:Boolean(payload?.knowledge_matches?.length),
    knowledge_revision:String(payload?.knowledge_revision||"").slice(0,120)
  };
}

export function detectEvidenceRisks({source="",payload={},results=[]}={}){
  const text=n(payload?.display_reply||payload?.reply||"");
  const risks=[];
  const hasResults=Array.isArray(results)&&results.length>0;
  const uncertain=/(fallback|clarify|no_live|off_domain)/.test(String(source||""));
  if(uncertain && /(مضمون|100|الافضل علي الاطلاق|اكيد|قطعا|definitely|guaranteed)/.test(text)) risks.push("overconfidence_without_evidence");
  if(!hasResults && /(متوفر|out of stock|available)/.test(text) && /(live_|current_product)/.test(String(source||""))===false) risks.push("availability_without_live_result");
  if(!hasResults && /(aed|درهم|السعر|price)/.test(text) && /(github_knowledge|knowledge_|faq_)/.test(String(source||""))===false) risks.push("price_without_live_result");
  return [...new Set(risks)].slice(0,6);
}

export function evidenceHealth(){
  return {version:"1.0",tiers:SOURCE_TIERS.length,policy:"live > managed knowledge > verified static > site retrieval > context inference > clarification"};
}
