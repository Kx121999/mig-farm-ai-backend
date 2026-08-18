import { githubKnowledgeStatus } from "../lib/knowledge_loader.js";
import { knowledgeStats } from "../lib/human_knowledge.js";
import { cognitionHealth } from "../lib/cognition.js";
import { evidenceHealth } from "../lib/evidence.js";
import { semanticRagHealth } from "../lib/semantic_rag.js";
import { hybridBrainHealth } from "../lib/hybrid_brain.js";
import { vectorMemoryHealth } from "../lib/vector_memory.js";
import { knowledgeGraphHealth } from "../lib/knowledge_graph.js";
import { neuralBrainHealth } from "../lib/neural_agent.js";
import { persistentStoreHealth } from "../lib/persistent_store.js";
import { cognitiveOSHealth } from "../lib/cognitive_os.js";
import { autonomousCommerceHealth } from "../lib/autonomous_commerce.js";
import { uaeAgricultureHealth } from "../lib/uae_agriculture_intelligence.js";
import { agriculturalEngineerHealth } from "../lib/agricultural_engineer.js";
import { salesEmployeeHealth } from "../lib/sales_employee.js";
import { salesConversationOSHealth } from "../lib/sales_conversation_os.js";

export async function GET(){
  const persistence=persistentStoreHealth();
  return Response.json({
    ok:true,
    service:"MIG FARM Human Sales Conversation OS & Senior Agricultural Engineer",
    version:"17.0.0",
    mode:"adaptive_human_sales_conversation_os_v17",
    features:[
      "human_sales_conversation_os","turn_level_goal_selection","buyer_readiness_inference","objection_root_cause_detection","next_best_action_engine","adaptive_reply_shape_selection","history_aware_followups","response_repetition_guard","bounded_naturalizer_retry","question_budgeting","soft_close_engine","trust_friction_resolution","anti_fake_urgency","anti_fake_discount","no_product_push_when_not_needed",
      "adaptive_human_sales_employee","free_form_sales_conversation","non_template_response_generation","dialect_and_style_mirroring","adaptive_response_length","consultative_sales_reasoning","objection_handling","natural_sales_closing","business_fact_tool","sales_playbook_tool","no_forced_cta","answer_first_policy","single_question_qualification","technical_problem_before_product_policy",
      "senior_agricultural_engineer_reasoning","free_form_agricultural_language_understanding","dialect_and_slang_normalization","agricultural_curriculum_knowledge_base","differential_crop_diagnosis","symptom_to_hypothesis_reasoning","crop_stage_system_context_extraction","agricultural_engineering_calculators","soil_water_nutrition_engineering","greenhouse_hydroponics_expert_knowledge","plant_pathology_entomology_ipm","seed_nursery_postharvest_engineering","measurement_first_diagnostics","single_symptom_diagnosis_guard","label_only_pesticide_dosage_policy",
      "uae_agricultural_intelligence","uae_regulatory_knowledge","official_source_manifest","legal_freshness_guard","emirate_authority_routing","climate_soil_water_knowledge","greenhouse_hydroponics_knowledge","crop_management_uae","agricultural_safety_guard","autonomous_commerce_mission_decomposition","single_question_clarification_gate","multi_step_commerce_orchestration",
      "live_portfolio_optimizer","budget_constrained_bundle_search","deterministic_live_comparison","grounded_price_claim_guard",
      "agricultural_dosage_claim_guard","deterministic_safe_finalizer","purchase_plan_tool","commerce_tool_budgeting",
      "counterfactual_alternatives","bounded_neural_tool_calling","responses_api_agent_loop","live_catalog_tool","verified_knowledge_tool",
      "site_retrieval_tool","semantic_memory_tool","persistent_memory_optional","temporal_memory_optional","adaptive_embedding_rerank",
      "prompt_injection_resistant_tool_policy","deterministic_v10_fallback","multi_step_planner","query_hypotheses","hybrid_semantic_rag",
      "weighted_source_fusion","self_critique_before_response","claim_risk_guard","cross_source_conflict_detection",
      "evidence_weighted_confidence","goal_tracking","constraint_memory","budget_reasoning","multi_constraint_product_selection",
      "visible_set_reasoning","decision_basis","context_reset_and_correction","customer_profile_memory","sales_journey_engine",
      "lead_scoring","whatsapp_handoff_summary","conversation_repair","hard_context_switching","pairwise_product_comparison",
      "response_deduplication","conversation_quality_score","multi_intent_shipping_products","live_odoo_price_and_stock",
      "mig_farm_seeds_only","page_product_context","safe_pesticide_and_fertilizer_guidance","github_managed_knowledge",
      "privacy_safe_learning_telemetry"
    ],
    knowledge:{static:knowledgeStats(),github:githubKnowledgeStatus(),rag:semanticRagHealth(),response_graph:knowledgeGraphHealth()},
    cognition:cognitionHealth(),
    hybrid_brain:hybridBrainHealth(),
    autonomous_commerce:autonomousCommerceHealth(),
    uae_agriculture:uaeAgricultureHealth(),
    agricultural_engineer:agriculturalEngineerHealth(),
    sales_employee:salesEmployeeHealth(),
    sales_conversation_os:salesConversationOSHealth(),
    neural_brain:neuralBrainHealth(),
    vector_memory:vectorMemoryHealth(),
    cognitive_os:cognitiveOSHealth(persistence),
    persistent_store:{...persistence,required_for_v17:false},
    evidence:evidenceHealth(),
    time:new Date().toISOString()
  });
}
