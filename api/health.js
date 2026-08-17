import { githubKnowledgeStatus } from "../lib/knowledge_loader.js";
import { knowledgeStats } from "../lib/human_knowledge.js";
import { cognitionHealth } from "../lib/cognition.js";
import { evidenceHealth } from "../lib/evidence.js";

export async function GET(){
  return Response.json({
    ok:true,
    service:"MIG FARM Cognitive Sales & Knowledge Assistant",
    version:"9.0.0",
    mode:"cognitive_knowledge_reasoning_v9",
    features:[
      "goal_tracking","constraint_memory","budget_reasoning","multi_constraint_product_selection",
      "visible_set_reasoning","decision_basis","evidence_aware_confidence","knowledge_gap_detection",
      "context_reset_and_correction","metacognitive_risk_flags",
      "customer_profile_memory","sales_journey_engine","lead_scoring","one_question_at_a_time_qualification",
      "whatsapp_handoff_summary","conversation_repair","hard_context_switching","visible_product_memory",
      "pairwise_product_comparison","response_deduplication","conversation_quality_score",
      "multi_intent_shipping_products","human_emirati_response_bank","extended_agriculture_glossary",
      "live_odoo_price_and_stock","mig_farm_seeds_only","page_product_context","confidence_guarded_site_rag",
      "safe_pesticide_and_fertilizer_guidance","github_managed_knowledge","privacy_safe_learning_telemetry"
    ],
    knowledge:{static:knowledgeStats(),github:githubKnowledgeStatus()},
    cognition:cognitionHealth(),
    evidence:evidenceHealth(),
    time:new Date().toISOString()
  });
}
