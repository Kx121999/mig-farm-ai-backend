import { finalProductionHealth, finalProductionSnapshot } from "../lib/final_production_os.js";
import { unifiedIntelligenceHealthV33, isUnifiedIntelligenceEnabledV33 } from "../lib/unified_intelligence_v33.js";
import { unifiedEvolutionHealthV40, isUnifiedEvolutionEnabledV40 } from "../lib/unified_evolution_v40.js";
import { probeOpenAIProviderV40 } from "../lib/provider_health_v40.js";

const V40_ENABLED=isUnifiedEvolutionEnabledV40();
const V33_ENABLED=isUnifiedIntelligenceEnabledV33();
const VERSION=V40_ENABLED?"40.0.0":V33_ENABLED?"33.2.0":"31.0.0";
const MODE=V40_ENABLED?"unified_evolution_intelligence_v40":V33_ENABLED?"unified_semantic_intelligence_v33":"llm_first_semantic_orchestrator_v31";
const RELEASE=V40_ENABLED?"MIG_FARM_AI_V40_UNIFIED_EVOLUTION":V33_ENABLED?"UNIFIED_SEMANTIC_INTELLIGENCE_V33":"FINAL_PRODUCTION_OS";
const FEATURES=[
  "provider_live_probe_v40_4","current_turn_provider_resilience_v40_4","social_identity_resilience_v40_4","semantic_intelligence_core_v35","advanced_hybrid_rag_reranking_v36","persistent_multi_layer_memory_v37","canonical_product_intelligence_graph_v38","differential_agricultural_diagnostic_engine_v39","autonomous_no_pressure_sales_intelligence_v40",
  "single_user_facing_intelligence_pipeline","correction_goal_supersession","pending_action_state_priority","active_product_subject_lock","legacy_pipeline_explicit_rollback_only","current_message_highest_priority",
  "explicit_conversation_state","semantic_reference_resolution","contextual_query_rewriting","semantic_retrieval_routing",
  "rag_evidence_not_final_answer","bounded_tool_generation","answer_relevance_validation","grounding_validation","entity_consistency_validation","bounded_regeneration","trace_id_observability",
  "final_production_os","whole_utterance_contract","meaning_before_keyword_routing","llm_primary_natural_answer",
  "natural_help_request_understanding","frustration_support","false_product_reference_guard","non_factual_social_bypass",
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
  "enterprise_multi_agent_supervisor","protected_http_only_admin_session","privacy_safe_enterprise_telemetry",
  "close_timing_guard","visual_availability_precision","visual_guidance_actions","recognition_before_identity_guard",
  "product_context_lock","product_card_bound_actions","generic_product_detail_agronomy_guard",
  "selected_product_context_transport","per_product_details_button"
];

const NEURAL_COMPAT_TOOLS=[
  "search_product_dossiers","get_product_dossier","compare_product_dossiers","verify_live_product_truth",
  "get_product_relations","find_verified_alternatives","build_verified_bundle","prepare_quote_draft",
  "match_visual_product","verify_visual_product_live","guard_visual_label_claim","search_visual_agronomy",
  "get_retake_advice","plan_visual_product_action"
];

function configured(name){return Boolean(String(process.env[name]||"").trim());}
function enabled(name,def=false){const value=process.env[name];return value===undefined?def:/^(1|true|yes|on)$/i.test(String(value));}
function descriptor(version,extra={}){return {version,ready:true,...extra};}
function intentModel(){const requested=String(process.env.OPENAI_INTENT_MODEL||process.env.OPENAI_MODEL||"gpt-5-mini").trim();return /^gpt-5\.6$/i.test(requested)?"gpt-5-mini":requested;}

export async function GET(request){
  try{
    const url=new URL(request?.url||"https://health.local/api/health");
    if(["1","true","live"].includes(String(url.searchParams.get("provider")||"").toLowerCase())){
      const provider=await probeOpenAIProviderV40();
      return Response.json({service:"MIG FARM AI Provider Health",hotfix:"V40.4_CURRENT_TURN_PROVIDER_RESILIENCE",...provider,time:new Date().toISOString()},{status:provider.ok?200:503,headers:{"Cache-Control":"no-store, max-age=0","X-Content-Type-Options":"nosniff"}});
    }
    const final=finalProductionHealth();
    return Response.json({
      ok:true,status:"healthy",service:"MIG FARM AI — UNIFIED EVOLUTION INTELLIGENCE",version:VERSION,mode:MODE,
      release:RELEASE,hotfix:"V40.4_CURRENT_TURN_PROVIDER_RESILIENCE",runtime:"nodejs_serverless",health_strategy:"lightweight_no_heavy_module_initialization",
      features:FEATURES,
      unified_evolution:unifiedEvolutionHealthV40(),
      unified_intelligence:unifiedIntelligenceHealthV33(),
      final_production_os:{...final,snapshot:finalProductionSnapshot()},
      llm_first_orchestrator:descriptor("31.0",{priority:"full_utterance_before_legacy_routes",configured:configured("OPENAI_API_KEY"),provider:configured("OPENAI_API_KEY")?"openai_responses_api":"deterministic_emergency_fallback",model:intentModel(),structured_output:true,legacy_keyword_router:"fallback_only",crop_symptom_recovery:true,universal_problem_engine_version:"31.2",universal_problem_recovery:true,multi_turn_diagnostic_memory:true}),
      natural_conversation:descriptor("32.0",{help_request:true,frustration_support:true,false_product_reference_guard:true,unknown_factual_wording_disabled_for_social_turns:true}),
      autonomous_customer_os:descriptor("30.0",{neural_configured:configured("OPENAI_API_KEY")}),
      customer_digital_twin:descriptor("30.0",{privacy_bounded:true}),
      confidence_gateway:descriptor("30.0",{hard_guards:["unverified_dosage","unverified_order_or_payment_claim"]}),
      closed_loop_learning:descriptor("30.0",{raw_transcripts:false}),
      conversation_reasoning:descriptor("29.0"),
      semantic_human_brain:descriptor("27.0"),current_turn_router:descriptor("27.0"),customer_brain:descriptor("27.0"),
      customer_memory:descriptor("27.0"),response_auditor:descriptor("27.0"),
      conversion_decision_brain:descriptor("22.5"),sales_employee:descriptor("22.5"),sales_conversation_os:descriptor("22.5"),
      human_conversation_brain:descriptor("22.5"),neural_brain:descriptor("27.0",{tools:NEURAL_COMPAT_TOOLS}),
      conversation_knowledge:descriptor("27.0",{megabytes:400,records:200025,packs:23,storage:process.env.MIG_V27_KNOWLEDGE_TRANSPORT||"local_manifest_router",function_bundle:"manifest_router_only"}),
      enterprise_supervisor:descriptor("28.0"),enterprise_retrieval:descriptor("28.0",{local_ready:true,local_megabytes:400,external_configured:configured("OPENAI_VECTOR_STORE_ID"),fail_open_to_local:true}),
      enterprise_telemetry:descriptor("28.0",{persistent:configured("UPSTASH_REDIS_REST_URL")||configured("KV_REST_API_URL"),raw_transcripts:false}),
      admin_auth:descriptor("28.0",{configured:configured("MIG_ADMIN_TOKEN")&&configured("MIG_ADMIN_SESSION_SECRET")}),
      autonomous_actions:descriptor("25.0",{enabled:enabled("ODOO_ACTIONS_ENABLED",false),configured:["ODOO_ACTION_URL","ODOO_DB","ODOO_USERNAME","ODOO_API_KEY"].every(configured)}),
      self_learning:descriptor("25.0",{privacy_safe:true}),
      vision_intelligence:descriptor("22.5",{product_visual_signatures:704,visual_agronomy_cards:540,recognition_before_identity_guard:true,forced_product_recognition_preflight:true,retake_loop_guard:true}),
      product_context_intelligence:descriptor("23.0"),
      product_intelligence:descriptor("22.1",{products:704,descriptions:704,total_megabytes:7.14}),
      product_truth_os:descriptor("22.1",{products:704,graph_edges:11776,explicit_facts:727}),agricultural_engineer:descriptor("15.0"),
      config:{openai:configured("OPENAI_API_KEY"),timeout_defaults:{meaning_ms:12000,neural_ms:18000},persistent_store:configured("UPSTASH_REDIS_REST_URL")||configured("KV_REST_API_URL"),odoo_actions_enabled:enabled("ODOO_ACTIONS_ENABLED",false),admin_configured:configured("MIG_ADMIN_TOKEN")&&configured("MIG_ADMIN_SESSION_SECRET")},
      privacy:{secrets_returned:false,raw_transcripts:false,raw_session_ids:false},time:new Date().toISOString()
    },{headers:{"Cache-Control":"no-store, max-age=0","X-Content-Type-Options":"nosniff"}});
  }catch(error){
    return Response.json({ok:false,status:"degraded",service:"MIG FARM AI — UNIFIED EVOLUTION INTELLIGENCE",version:VERSION,mode:MODE,error:"health_probe_failed",detail:String(error?.message||"unknown").slice(0,160),time:new Date().toISOString()},{status:503,headers:{"Cache-Control":"no-store, max-age=0"}});
  }
}
