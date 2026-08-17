import { knowledgeStats } from "../lib/human_knowledge.js";

export function GET(){
  return Response.json({
    ok:true,
    service:"MIG FARM Sales & Knowledge Assistant",
    version:"7.0.0",
    mode:"free_sales_knowledge_agent_v7",
    features:[
      "customer_profile_memory",
      "sales_journey_engine",
      "lead_scoring",
      "one_question_at_a_time_qualification",
      "whatsapp_handoff_summary",
      "conversation_repair",
      "multi_intent_shipping_products",
      "human_emirati_response_bank",
      "extended_agriculture_glossary",
      "live_odoo_price_and_stock",
      "mig_farm_seeds_only",
      "product_comparison_memory",
      "page_product_context",
      "confidence_guarded_site_rag",
      "safe_pesticide_and_fertilizer_guidance",
      "privacy_safe_learning_telemetry"
    ],
    knowledge:knowledgeStats(),
    time:new Date().toISOString()
  });
}
