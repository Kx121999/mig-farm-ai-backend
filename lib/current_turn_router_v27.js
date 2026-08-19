import { detectCurrentTurnPriorityV26, quarantineCurrentTurnStateV26 } from "./current_turn_router_v26.js";

export function detectCurrentTurnPriorityV27(input={}){
  const route=detectCurrentTurnPriorityV26(input);return route?{...route,version:"27.0",customer_brain_compatible:true}:null;
}
export function quarantineCurrentTurnStateV27(state={}){return quarantineCurrentTurnStateV26(state);}
export function currentTurnRouterHealthV27(){return {version:"27.0",mode:"current_turn_sovereignty_and_compound_message_router",features:["business_fact_before_product_context","stale_product_quarantine","single_intent_fast_path","compound_message_handoff","customer_brain_compatibility","dialect_business_phrases"]};}

