const VERSION='39.0.0';const RELEASE='AGRICULTURAL_DIAGNOSTIC_ENGINE_V39';
const stats=globalThis.__migV39Stats||{frames:0,diagnostic_turns:0,high_risk:0,clarifications:0};globalThis.__migV39Stats=stats;
function clean(v='',max=1200){return String(v??'').replace(/[\u0000-\u001f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max);}
function arr(v){return Array.isArray(v)?v:[];}
export function buildDiagnosticFrameV39({semanticCore={},conversationState={},visionFrame=null,meaningFrame={}}={}){
  stats.frames+=1;const intents=arr(semanticCore?.intents);const diagnostic=intents.some(x=>['diagnosis','dosage','agriculture_general','image_analysis','calculation'].includes(x))||semanticCore?.slots?.problem;
  if(diagnostic)stats.diagnostic_turns+=1;const crop=semanticCore?.slots?.crop||conversationState?.active_crop||null,environment=semanticCore?.slots?.environment||conversationState?.active_environment||null,problem=semanticCore?.slots?.problem||conversationState?.active_problem||null;
  const hasImage=Boolean(visionFrame?.has_visual_context),dosage=intents.includes('dosage');const highRisk=dosage||Boolean(problem?.regulated)||Boolean(meaningFrame?.safety?.high_risk);if(highRisk)stats.high_risk+=1;
  const missing=[];if(diagnostic&&!crop)missing.push('crop');if(diagnostic&&!problem&&!hasImage&&!dosage)missing.push('symptom_or_problem');if(dosage&&!hasImage)missing.push('verified_label_or_product_identity');
  const ask=missing.length?missing[0]:null;if(ask)stats.clarifications+=1;
  return {version:VERSION,release:RELEASE,active:Boolean(diagnostic),mode:dosage?'regulated_dosage':hasImage?'visual_diagnosis':'differential_diagnosis',observations:{crop,environment,problem,visual_context:hasImage},missing_evidence:missing,next_best_evidence:ask,risk:{high:highRisk,regulated_dosage:dosage},policy:{differential_before_diagnosis:true,no_pesticide_dosage_without_verified_label:true,no_single_cause_certainty_from_ambiguous_symptoms:true,prefer_one_discriminating_question:true,low_risk_checks_before_treatment:true},allowed_tools:diagnostic?['diagnose_crop_problem','search_agricultural_engineering','search_agricultural_master','search_uae_agriculture','search_visual_agronomy','guard_visual_label_claim','agriculture_calculator']:[]};
}
export function agriculturalDiagnosticHealthV39(){return {version:VERSION,release:RELEASE,ready:true,differential_reasoning:true,label_grounded_dosage:true,visual_context:true,stats:{...stats}};}
