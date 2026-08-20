import { finalProductionHealth, finalProductionSnapshot } from "../lib/final_production_os.js";

const VERSION="31.0.0";
const MODE="llm_first_semantic_orchestrator_v31";
const FEATURES=[
  "final_production_os","whole_utterance_contract","meaning_before_keyword_routing","llm_primary_natural_answer",
  "contextual_crop_symptom_recovery","arbitrary_crop_entity_memory","deterministic_diagnosis_fallback",
  "universal_agricultural_problem_engine","multi_turn_diagnostic_memory","symptom_attribute_extraction",
  "adaptive_pre_send_critic","deterministic_hard_safety","truth_freshness_envelope","prompt_versioning",
  "provider_circuit_breaker","privacy_safe_failure_learning","progressive_sse_transport","lightweight_crash_safe_health",
  "semantic_human_brain","arabizi_normalization","multi_intent_decomposition","multi_intent_answer_completion",
  "pronoun_product_resolution","ordinal_product_resolution","correction_topic_supersession","semantic_context_isolation",
  "server_authoritative_active_product_memory","same_category_product_switch_detection","multi_product_comparison_context",
  "dosage_evidence_guard","suitability_evidence_guard","current_turn_semantic_priority","stale_context_quarantine",
  "new_topic_context_quarantine","legacy_keyword_router_fallback_only","unverified_live_price_stock_guard",
  "unverified_action_claim_hard_block","label_only_pesticide_dosage_policy","400mb_resilient_local_fallback",
  "enterprise_multi_agent_supervisor","protected_http_only_admin_session","privacy_safe_enterprise_telemetry"
];

function configured(name){return Boolean(String(process.env[name]||"").trim());}
function enabled(name,def=false){const value=process.env[name];return value===undefined?def:/^(1|true|yes|on)$/i.test(String(value));}
function descriptor(version,extra={}){return {version,ready:true,...extra};}
function intentModel(){const requested=String(process.env.OPENAI_INTENT_MODEL||process.env.OPENAI_MODEL||"gpt-5-mini").trim();return /^gpt-5\.6$/i.test(requested)?"gpt-5-mini":requested;}

export async function GET(){
  try{
    const final=finalProductionHealth();
    return Response.json({
      ok:true,status:"healthy",service:"MIG FARM AI — FINAL PRODUCTION OS",version:VERSION,mode:MODE,
      release:"FINAL_PRODUCTION_OS",runtime:"nodejs_serverless",health_strategy:"lightweight_no_heavy_module_initialization",
      features:FEATURES,
      final_production_os:{...final,snapshot:finalProductionSnapshot()},
      llm_first_orchestrator:descriptor("31.0",{priority:"full_utterance_before_legacy_routes",configured:configured("OPENAI_API_KEY"),provider:configured("OPENAI_API_KEY")?"openai_responses_api":"deterministic_emergency_fallback",model:intentModel(),structured_output:true,legacy_keyword_router:"fallback_only",crop_symptom_recovery:true,universal_problem_engine_version:"31.2",universal_problem_recovery:true,multi_turn_diagnostic_memory:true}),
      autonomous_customer_os:descriptor("30.0",{neural_configured:configured("OPENAI_API_KEY")}),
      customer_digital_twin:descriptor("30.0",{privacy_bounded:true}),
      confidence_gateway:descriptor("30.0",{hard_guards:["unverified_dosage","unverified_order_or_payment_claim"]}),
      closed_loop_learning:descriptor("30.0",{raw_transcripts:false}),
      conversation_reasoning:descriptor("29.0"),
      semantic_human_brain:descriptor("27.0"),current_turn_router:descriptor("27.0"),customer_brain:descriptor("27.0"),
      customer_memory:descriptor("27.0"),response_auditor:descriptor("27.0"),
      conversation_knowledge:descriptor("27.0",{megabytes:400,records:200025,packs:23,storage:process.env.MIG_V27_KNOWLEDGE_TRANSPORT||"local_manifest_router",function_bundle:"manifest_router_only"}),
      enterprise_supervisor:descriptor("28.0"),enterprise_retrieval:descriptor("28.0",{local_ready:true,local_megabytes:400,external_configured:configured("OPENAI_VECTOR_STORE_ID"),fail_open_to_local:true}),
      enterprise_telemetry:descriptor("28.0",{persistent:configured("UPSTASH_REDIS_REST_URL")||configured("KV_REST_API_URL"),raw_transcripts:false}),
      admin_auth:descriptor("28.0",{configured:configured("MIG_ADMIN_TOKEN")&&configured("MIG_ADMIN_SESSION_SECRET")}),
      autonomous_actions:descriptor("25.0",{enabled:enabled("ODOO_ACTIONS_ENABLED",false),configured:["ODOO_ACTION_URL","ODOO_DB","ODOO_USERNAME","ODOO_API_KEY"].every(configured)}),
      self_learning:descriptor("25.0",{privacy_safe:true}),vision_intelligence:descriptor("22.5"),product_context_intelligence:descriptor("23.0"),
      product_intelligence:descriptor("20.0"),product_truth_os:descriptor("21.0"),agricultural_engineer:descriptor("15.0"),
      config:{openai:configured("OPENAI_API_KEY"),persistent_store:configured("UPSTASH_REDIS_REST_URL")||configured("KV_REST_API_URL"),odoo_actions_enabled:enabled("ODOO_ACTIONS_ENABLED",false),admin_configured:configured("MIG_ADMIN_TOKEN")&&configured("MIG_ADMIN_SESSION_SECRET")},
      privacy:{secrets_returned:false,raw_transcripts:false,raw_session_ids:false},time:new Date().toISOString()
    },{headers:{"Cache-Control":"no-store, max-age=0","X-Content-Type-Options":"nosniff"}});
  }catch(error){
    return Response.json({ok:false,status:"degraded",service:"MIG FARM AI — FINAL PRODUCTION OS",version:VERSION,mode:MODE,error:"health_probe_failed",detail:String(error?.message||"unknown").slice(0,160),time:new Date().toISOString()},{status:503,headers:{"Cache-Control":"no-store, max-age=0"}});
  }
}
