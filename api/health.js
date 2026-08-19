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
import { humanConversationHealth } from "../lib/human_conversation_brain.js";
import { agriculturalMasterHealth } from "../lib/agricultural_master_knowledge.js";
import { conversionDecisionHealth } from "../lib/conversion_decision_brain.js";
import { productIntelligenceHealth } from "../lib/product_intelligence.js";
import { productTruthHealth } from "../lib/product_truth_os.js";
import { visionHealth } from "../lib/vision_intelligence.js";
import { productContextHealth } from "../lib/product_context_intelligence.js";
import { semanticHumanBrainHealth } from "../lib/semantic_human_brain.js";
import { autonomousActionHealth } from "../lib/autonomous_action_os.js";
import { selfLearningHealth } from "../lib/self_learning_os.js";
import { currentTurnRouterHealthV27 } from "../lib/current_turn_router_v27.js";
import { customerBrainHealthV27 } from "../lib/customer_brain_v27.js";
import { customerMemoryHealthV27 } from "../lib/customer_memory_v27.js";
import { responseAuditorHealthV27 } from "../lib/response_auditor_v27.js";
import { customerKnowledgeHealthV27 } from "../lib/customer_knowledge_v27.js";
import { enterpriseSupervisorHealthV28 } from "../lib/supervisor_v28.js";
import { enterpriseRetrievalHealthV28 } from "../lib/enterprise_retrieval_v28.js";
import { enterpriseTelemetryHealthV28 } from "../lib/enterprise_telemetry_v28.js";
import { adminAuthHealthV28 } from "../lib/admin_auth_v28.js";
import { conversationReasoningHealthV29 } from "../lib/conversation_reasoning_v29.js";
import { autonomousCustomerOSHealthV30 } from "../lib/autonomous_customer_os_v30.js";
import { customerDigitalTwinHealthV30 } from "../lib/customer_digital_twin_v30.js";
import { confidenceGatewayHealthV30 } from "../lib/confidence_gateway_v30.js";
import { closedLoopLearningHealthV30, closedLoopLearningSnapshotV30 } from "../lib/closed_loop_learning_v30.js";
import { llmFirstHealthV31 } from "../lib/llm_first_orchestrator_v31.js";

export async function GET(){
  const persistence=persistentStoreHealth();
  return Response.json({
    ok:true,
    service:"MIG FARM V31 LLM-First Semantic Orchestrator",
    version:"31.0.0",
    mode:"llm_first_semantic_orchestrator_v31",
    features:[
      "v31_llm_first_full_utterance_understanding","meaning_before_keyword_routing","structured_semantic_interpretation","latest_message_sovereignty","new_topic_context_quarantine","genuine_followup_context_reuse","speech_act_detection","multi_intent_semantic_decomposition_v31","llm_primary_natural_answer","legacy_router_fallback_only","legacy_route_intent_alignment","stale_agriculture_context_leak_block","social_intent_hijack_block","business_intent_hijack_block","identity_question_protection","structured_output_no_chain_of_thought","bounded_meaning_cache","provider_failure_exact_intent_guard","no_raw_message_meaning_metrics",
      "v30_neural_autonomous_customer_orchestrator","specialist_agent_mission_planning","neural_when_useful_deterministic_when_needed","bounded_per_turn_tool_policy","risk_aware_tool_budget","evidence_contract_before_answer","provider_failure_resilience","privacy_bounded_customer_digital_twin","explicit_fact_only_customer_memory","confidence_calibration_gateway","answer_clarify_handoff_block_decisions","unverified_dosage_hard_block","unverified_action_claim_hard_block","privacy_safe_closed_loop_learning","hashed_outcome_patterns","no_raw_transcript_learning","v30_admin_operational_visibility",
      "v29_conversational_reasoning_core","expected_answer_memory","bounded_question_state","short_answer_understanding","fuzzy_quick_reply_resolution","specific_clarification_instead_of_generic_fallback","pronoun_product_resolution_v29","ordinal_product_resolution_v29","correction_supersession_v29","natural_response_deduplication","one_question_response_contract","privacy_safe_reasoning_metrics",
      "enterprise_multi_agent_supervisor","specialized_product_truth_agent","senior_agronomist_agent","business_facts_agent","vision_specialist_agent","commerce_orchestrator_agent","pre_send_quality_critic","natural_structured_response_blocks","hybrid_vector_and_local_retrieval","openai_vector_store_adapter","400mb_resilient_local_fallback","privacy_safe_enterprise_telemetry","persistent_admin_analytics","protected_http_only_admin_session","live_quality_dashboard","knowledge_and_service_health_dashboard","downloadable_privacy_safe_reports","scalable_external_knowledge_plane","no_secret_browser_exposure",
      "400mb_customer_brain_decision_knowledge","ordered_multi_intent_execution","customer_journey_scenarios","ethical_objection_resolution","product_decision_graph","agricultural_decision_cases","response_error_corrections","pre_send_response_auditor","multi_intent_completion_check","one_question_enforcement","privacy_bounded_customer_memory","dialect_and_goal_memory","topic_switch_memory_guard","compound_business_product_answer","self_evaluating_response_contract",
      "400mb_github_sharded_conversation_knowledge","222k_grounded_conversation_cases","23_browser_upload_safe_knowledge_packs","manifest_routed_knowledge_retrieval","current_turn_sovereignty_router","business_question_before_product_context","explicit_location_language_understanding","stale_product_and_dosage_quarantine","natural_business_social_replies","dialect_question_lattice","product_agriculture_business_coverage",
      "explicit_confirmation_action_os","server_authoritative_action_state","odoo_allowlisted_jsonrpc_gateway","draft_quotation_creation","crm_lead_creation","phone_verified_order_tracking","action_idempotency","safe_action_failure","no_automatic_order_confirmation","no_payment_capture","privacy_safe_continuous_evaluation","multi_intent_completion_scoring","evidence_grounding_scoring","action_outcome_learning","hashed_knowledge_gap_fingerprints","admin_protected_learning_endpoint","identity_question_direct_route","stale_dose_context_quarantine","structured_safe_reply_renderer","mixed_direction_product_cards","comparison_answer_preservation",
      "semantic_human_brain","meaning_before_routing","egyptian_dialect_understanding","emirati_gulf_dialect_understanding","levantine_dialect_understanding","msa_and_english_understanding","arabizi_normalization","arabic_english_code_switching","multi_intent_decomposition","multi_intent_answer_completion","pronoun_product_resolution","ordinal_product_resolution","correction_topic_supersession","semantic_context_isolation","one_question_clarification_gate","evidence_task_planner","unified_tool_budget","natural_dialect_response_contract",
      "server_authoritative_active_product_memory","refresh_safe_product_context","same_category_product_switch_detection","explicit_product_mention_binding","visible_ordinal_product_binding","multi_product_comparison_context","comparison_card_selection","dosage_evidence_guard","suitability_evidence_guard","product_context_ttl","product_context_trace","multimodal_image_input","product_context_lock","product_card_bound_actions","generic_product_detail_agronomy_guard","selected_product_context_transport","bound_product_live_truth","per_product_details_button","recognition_before_identity_guard","forced_product_recognition_preflight","medium_candidate_confirmation","retake_loop_guard","different_image_detector","image_revision_tracking","fuzzy_visual_text_ranking","visual_intent_contract","intent_aware_retake_guidance","deterministic_visual_next_action","visual_availability_precision","visual_price_precision","visual_identity_before_live_commerce","visual_guidance_actions","deterministic_visual_live_fallback","active_visual_context_persistence","visual_followup_image_reuse","vision_first_routing","vision_tool_whitelist_enforcement","visual_grounding_retry","generic_visual_fallback_block","product_visual_recognition","readable_label_text_to_catalog_match","sku_barcode_visual_matching","visual_product_identity_guard","multi_image_evidence_fusion","plant_visual_triage","crop_visual_diagnostic_atlas","observation_before_inference","one_best_next_photo","image_quality_retake_protocol","pesticide_label_visual_claim_guard","visual_dosage_hallucination_guard","unknown_product_visual_mode","image_prompt_injection_guard","visual_to_live_odoo_verification",
      "live_product_truth_engine","field_level_provenance","variant_identity_guard","stale_snapshot_conflict_detection","product_relationship_graph","verified_alternative_ladder","shopping_adjacency_without_compatibility_claims","explicit_product_fact_index","generated_description_fact_exclusion","labelled_fact_colon_guard","product_fact_reliability_provenance","need_to_product_fact_matching","verified_bundle_builder","verified_quote_draft","live_price_stock_total_guard","order_not_placed_guard",
      "full_product_dossier_intelligence","704_product_dossiers","exact_sales_and_ecommerce_descriptions","product_description_semantic_retrieval","product_dossier_tool","product_comparison_grounding","live_odoo_dossier_fusion","archived_vs_live_precedence_guard","missing_specification_guard",
      "conversion_decision_brain","explicit_purchase_readiness","objection_root_cause_resolution","ethical_persuasion_policy","close_timing_guard","evidence_to_sales_decision","question_budget_enforcement","technical_before_commerce_guard","no_buying_override","conversion_reply_quality_guard",
      "current_turn_semantic_priority","stale_context_quarantine","zero_tool_casual_mode","browse_only_no_sales_pressure","semantic_reply_alignment_guard","repair_topic_supersession","followup_dependency_detection","old_agronomy_leak_guard","adaptive_human_acknowledgement","4mb_agricultural_master_knowledge","large_free_form_agricultural_retrieval","agricultural_master_tool",
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
    knowledge:{static:knowledgeStats(),github:githubKnowledgeStatus(),conversation_knowledge:customerKnowledgeHealthV27(),rag:semanticRagHealth(),response_graph:knowledgeGraphHealth(),agricultural_master:agriculturalMasterHealth(),product_intelligence:productIntelligenceHealth(),product_truth_os:productTruthHealth(),product_context_intelligence:productContextHealth(),semantic_human_brain:semanticHumanBrainHealth(),vision_intelligence:visionHealth()},
    cognition:cognitionHealth(),
    hybrid_brain:hybridBrainHealth(),
    autonomous_commerce:autonomousCommerceHealth(),
    uae_agriculture:uaeAgricultureHealth(),
    agricultural_engineer:agriculturalEngineerHealth(),
    sales_employee:salesEmployeeHealth(),
    sales_conversation_os:salesConversationOSHealth(),
    human_conversation_brain:humanConversationHealth(),
    conversion_decision_brain:conversionDecisionHealth(),
    agricultural_master:agriculturalMasterHealth(),
    product_intelligence:productIntelligenceHealth(),
    product_truth_os:productTruthHealth(),
    product_context_intelligence:productContextHealth(),
    semantic_human_brain:semanticHumanBrainHealth(),
    current_turn_router:currentTurnRouterHealthV27(),
    customer_brain:customerBrainHealthV27(),
    customer_memory:customerMemoryHealthV27(),
    response_auditor:responseAuditorHealthV27(),
    conversation_knowledge:customerKnowledgeHealthV27(),
    conversation_reasoning:conversationReasoningHealthV29(),
    autonomous_customer_os:autonomousCustomerOSHealthV30(),
    customer_digital_twin:customerDigitalTwinHealthV30(),
    confidence_gateway:confidenceGatewayHealthV30(),
    closed_loop_learning:{...closedLoopLearningHealthV30(),snapshot:closedLoopLearningSnapshotV30()},
    llm_first_orchestrator:llmFirstHealthV31(),
    enterprise_supervisor:enterpriseSupervisorHealthV28(),
    enterprise_retrieval:enterpriseRetrievalHealthV28(),
    enterprise_telemetry:enterpriseTelemetryHealthV28(),
    admin_auth:adminAuthHealthV28(),
    autonomous_actions:autonomousActionHealth(),
    self_learning:selfLearningHealth(),
    vision_intelligence:visionHealth(),
    neural_brain:neuralBrainHealth(),
    vector_memory:vectorMemoryHealth(),
    cognitive_os:cognitiveOSHealth(persistence),
    persistent_store:{...persistence,required_for_v28:false,recommended_for_admin_analytics:true},
    evidence:evidenceHealth(),
    time:new Date().toISOString()
  });
}
