export function GET(){
  return Response.json({
    ok:true,
    service:"MIG FARM Contextual Website Assistant",
    version:"5.0.0",
    mode:"free_contextual_rag_v5",
    features:[
      "structured_conversation_state",
      "elliptical_followup_resolution",
      "history_context_recovery",
      "live_product_search",
      "confidence_guarded_site_rag",
      "ambiguity_clarification",
      "off_domain_guard",
      "page_product_context",
      "product_comparison_memory",
      "emirati_arabic",
      "safe_agricultural_guidance",
      "dynamic_quick_replies"
    ],
    time:new Date().toISOString()
  });
}
