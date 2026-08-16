export function GET(){
  return Response.json({
    ok:true,
    service:"MIG FARM Website Assistant Backend",
    version:"4.0.0",
    mode:"free_sitewide_emirati_v4",
    features:[
      "live_product_search",
      "conversation_memory",
      "sitewide_business_intents",
      "page_product_context",
      "emirati_arabic",
      "shipping_and_branch_answers",
      "policy_routing",
      "product_comparison_filters",
      "safe_pesticide_guidance"
    ],
    time:new Date().toISOString()
  });
}
