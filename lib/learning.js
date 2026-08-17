import { normalizeAr, tokenize } from "./utils.js";

function stableHash(value=""){
  let h=2166136261;
  for(const ch of String(value||"")){ h^=ch.charCodeAt(0); h=Math.imul(h,16777619); }
  return (h>>>0).toString(36);
}

function unresolvedSource(source=""){
  return /(fallback|no_live_product_match|seed_knowledge_no_live_match|clarify_unknown|conversation_repair|off_domain)/.test(String(source||""));
}

function evidenceType(source=""){
  const s=String(source||"");
  if(/fallback|no_live|clarify|repair|off_domain/.test(s)) return "clarification";
  if(/^live_|_live_|multi_shipping_products/.test(s)) return "live_store";
  if(/knowledge|faq|company|categories|shipping|branch|payment|privacy|terms|cookies|greenhouse/.test(s)) return "verified_knowledge";
  if(/memory|current_product/.test(s)) return "conversation_context";
  return "rule_engine";
}

function confidence(source=""){
  const type=evidenceType(source);
  if(type==="live_store") return "high";
  if(type==="verified_knowledge") return "high";
  if(type==="conversation_context") return "medium";
  if(type==="clarification") return "low";
  return "medium";
}

export function buildLearningEvent({sessionId="",message="",analysis={},profile={},source="",stage="",lead={}}={}){
  const norm=normalizeAr(message||"");
  return {
    event:"assistant_turn",
    session_hash:stableHash(sessionId),
    query_hash:stableHash(norm),
    intent:String(analysis.intent||"unknown").slice(0,80),
    category:String(analysis.category?.key||profile.category||"").slice(0,60),
    crop:String(analysis.crop?.key||profile.crop||"").slice(0,60),
    stage:String(stage||"").slice(0,30),
    source:String(source||"").slice(0,100),
    unresolved:unresolvedSource(source),
    evidence:evidenceType(source),
    confidence:confidence(source),
    lead_temperature:String(lead.temperature||"cold").slice(0,20),
    word_count:tokenize(norm).length,
    has_emirate:Boolean(profile.emirate),
    has_quantity:Boolean(profile.quantity),
    has_area:Boolean(profile.area)
  };
}

export function logLearningEvent(event={}){
  try{
    // Intentionally no raw customer message, phone, email or address in logs.
    console.info("MIG_AI_LEARNING",JSON.stringify(event));
  }catch{}
}

export function assistantMeta({source="",stage="",lead={},profile={}}={}){
  return {
    evidence:evidenceType(source),
    confidence:confidence(source),
    sales_stage:stage||"discover",
    lead_score:Number(lead.score)||0,
    lead_temperature:lead.temperature||"cold",
    profile_completeness:["category","crop","emirate","cultivation","quantity","area","project_type"].filter(k=>Boolean(profile?.[k])).length
  };
}
