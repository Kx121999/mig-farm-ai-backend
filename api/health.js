import { githubKnowledgeStatus } from "../lib/knowledge_loader.js";
import { knowledgeStats } from "../lib/human_knowledge.js";

export async function GET(){
  return Response.json({
    ok:true,
    service:"MIG FARM Sales & Knowledge Assistant",
    version:"8.4.0",
    mode:"github_commerce_conversation_quality_v8",
    features:["customer_profile_memory","sales_journey_engine","lead_scoring","one_question_at_a_time_qualification","whatsapp_handoff_summary","conversation_repair","hard_context_switching","correction_understanding","visible_product_memory","pairwise_product_comparison","response_deduplication","conversation_quality_score","multi_intent_shipping_products","human_emirati_response_bank","extended_agriculture_glossary","live_odoo_price_and_stock","mig_farm_seeds_only","page_product_context","confidence_guarded_site_rag","safe_pesticide_and_fertilizer_guidance","github_managed_knowledge","privacy_safe_learning_telemetry"],
    knowledge:{static:knowledgeStats(),github:githubKnowledgeStatus()},
    time:new Date().toISOString()
  });
}
