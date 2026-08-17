import { githubKnowledgeStatus } from "../lib/knowledge_loader.js";
import { knowledgeStats } from "../lib/human_knowledge.js";
import { cognitionHealth } from "../lib/cognition.js";
import { evidenceHealth } from "../lib/evidence.js";
import { semanticRagHealth } from "../lib/semantic_rag.js";
import { hybridBrainHealth } from "../lib/hybrid_brain.js";

export async function GET(){
  return Response.json({
    ok:true,
    service:"MIG FARM Hybrid Cognitive Sales & Knowledge Assistant",
    version:"10.0.0",
    mode:"hybrid_brain_rag_planner_critic_v10",
    features:[
      "multi_step_planner","query_hypotheses","hybrid_semantic_rag","weighted_source_fusion","episodic_memory",
      "preference_memory","self_critique_before_response","claim_risk_guard","cross_source_conflict_detection",
      "evidence_weighted_confidence","knowledge_gap_persistence","goal_tracking","constraint_memory","budget_reasoning",
      "multi_constraint_product_selection","visible_set_reasoning","decision_basis","context_reset_and_correction",
      "customer_profile_memory","sales_journey_engine","lead_scoring","whatsapp_handoff_summary","conversation_repair",
      "hard_context_switching","pairwise_product_comparison","response_deduplication","conversation_quality_score",
      "multi_intent_shipping_products","live_odoo_price_and_stock","mig_farm_seeds_only","page_product_context",
      "safe_pesticide_and_fertilizer_guidance","github_managed_knowledge","privacy_safe_learning_telemetry"
    ],
    knowledge:{static:knowledgeStats(),github:githubKnowledgeStatus(),rag:semanticRagHealth()},
    cognition:cognitionHealth(),
    hybrid_brain:hybridBrainHealth(),
    evidence:evidenceHealth(),
    time:new Date().toISOString()
  });
}
