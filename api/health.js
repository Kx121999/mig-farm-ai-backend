import { githubKnowledgeStatus } from "../lib/knowledge_loader.js";
import { knowledgeStats } from "../lib/human_knowledge.js";
import { cognitionHealth } from "../lib/cognition.js";
import { evidenceHealth } from "../lib/evidence.js";
import { semanticRagHealth } from "../lib/semantic_rag.js";
import { hybridBrainHealth } from "../lib/hybrid_brain.js";
import { vectorMemoryHealth } from "../lib/vector_memory.js";
import { knowledgeGraphHealth } from "../lib/knowledge_graph.js";
import { neuralBrainHealth } from "../lib/neural_agent.js";

export async function GET(){
  return Response.json({
    ok:true,
    service:"MIG FARM Neural Hybrid Cognitive Sales & Knowledge Agent",
    version:"11.0.0",
    mode:"neural_hybrid_agent_vector_memory_graph_v11",
    features:[
      "bounded_neural_tool_calling","responses_api_agent_loop","live_catalog_tool","verified_knowledge_tool","site_retrieval_tool","semantic_memory_tool",
      "bounded_semantic_memory","adaptive_embedding_rerank","ephemeral_knowledge_graph","cross_turn_entity_relations","prompt_injection_resistant_tool_policy",
      "deterministic_v10_fallback","multi_step_planner","query_hypotheses","hybrid_semantic_rag","weighted_source_fusion","episodic_memory",
      "preference_memory","self_critique_before_response","claim_risk_guard","cross_source_conflict_detection","evidence_weighted_confidence",
      "knowledge_gap_persistence","goal_tracking","constraint_memory","budget_reasoning","multi_constraint_product_selection","visible_set_reasoning",
      "decision_basis","context_reset_and_correction","customer_profile_memory","sales_journey_engine","lead_scoring","whatsapp_handoff_summary",
      "conversation_repair","hard_context_switching","pairwise_product_comparison","response_deduplication","conversation_quality_score",
      "multi_intent_shipping_products","live_odoo_price_and_stock","mig_farm_seeds_only","page_product_context","safe_pesticide_and_fertilizer_guidance",
      "github_managed_knowledge","privacy_safe_learning_telemetry"
    ],
    knowledge:{static:knowledgeStats(),github:githubKnowledgeStatus(),rag:semanticRagHealth(),graph:knowledgeGraphHealth()},
    cognition:cognitionHealth(),
    hybrid_brain:hybridBrainHealth(),
    neural_brain:neuralBrainHealth(),
    vector_memory:vectorMemoryHealth(),
    evidence:evidenceHealth(),
    time:new Date().toISOString()
  });
}
