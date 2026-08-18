import assert from "node:assert/strict";
import { buildConversionDecision, evaluateConversionReply, conversionDecisionHealth } from "../lib/conversion_decision_brain.js";

function d(message,extra={}){
  return buildConversionDecision({message,analysis:extra.analysis||{},profile:extra.profile||{},state:extra.state||{},history:extra.history||[],humanTurn:extra.humanTurn||{},salesTurn:extra.salesTurn||{conversation_plan:{}},agriculturalContext:extra.agriculturalContext||{}});
}

let x=d("لا يا عم أنا بس بسأل مش هشتري دلوقتي",{humanTurn:{no_sales_pressure:true,mode:"browse_only_social",stale_context_quarantine:true}});
assert.equal(x.readiness.state,"not_buying_now");
assert.equal(x.readiness.score,0);
assert.equal(x.close_policy.allowed,false);
assert.equal(x.question_policy.budget,0);
assert.equal(x.response_contract.no_pressure,true);
assert.equal(x.next_best_action,"answer_without_sales_pressure");
let q=evaluateConversionReply("أكيد يا عم اسأل براحتك.",x,"لا يا عم أنا بس بسأل مش هشتري دلوقتي");
assert.equal(q.ok,true);
q=evaluateConversionReply("تمام اطلب دلوقتي على واتساب.",x,"لا يا عم أنا بس بسأل مش هشتري دلوقتي");
assert.equal(q.ok,false);assert.ok(q.flags.includes("sales_pressure_when_not_allowed"));

x=d("هاخد اتنين من الأول",{history:[{role:"user",content:"بكام الأول؟"},{role:"assistant",content:"35 درهم"}]});
assert.ok(x.readiness.score>=78);
assert.equal(x.readiness.state,"ready_to_commit");
assert.equal(x.close_policy.allowed,true);
assert.equal(x.close_policy.type,"quantity_confirmation");
assert.equal(x.next_best_action,"confirm_selected_item_and_quantity_then_next_purchase_step");
assert.equal(x.question_policy.budget,0);

x=d("غالي شوية",{history:[{role:"user",content:"بكام الطماطم؟"},{role:"assistant",content:"35 درهم"}]});
assert.equal(x.friction,"price");
assert.match(x.next_best_action,/price|alternative|value/);
assert.equal(x.close_policy.allowed,false);
assert.ok(x.persuasion_policy.allowed_moves.includes("cheaper_verified_alternative"));

x=d("مش مقتنع بصراحة");
assert.equal(x.friction,"trust");
assert.match(x.next_best_action,/trust|evidence/);
assert.ok(x.evidence_required.includes("verified_product_or_business_evidence"));

x=d("الورق عندي مكرمش وفيه نقط تحت الورقة عايز أعرف المشكلة",{agriculturalContext:{is_agricultural:true}});
assert.equal(x.next_best_action,"diagnose_or_answer_technical_need_before_product");
assert.equal(x.close_policy.allowed,false);
assert.ok(x.evidence_required.includes("agricultural_engineering"));
q=evaluateConversionReply("اشتري المبيد ده وخلاص.",x,"الورق عندي مكرمش وفيه نقط تحت الورقة عايز أعرف المشكلة");
assert.equal(q.ok,false);assert.ok(q.flags.includes("product_push_before_technical_resolution"));

x=d("هو موجود في العين وبكام؟");
assert.ok(x.evidence_required.includes("live_catalog"));
assert.ok(x.evidence_required.includes("business_fact")||x.evidence_required.includes("live_catalog"));
assert.equal(x.question_policy.budget,0);

x=d("لا قصدي خيار مش طماطم",{humanTurn:{mode:"repair_or_switch",stale_context_quarantine:true}});
assert.equal(x.topic_context_risk,"high");
assert.equal(x.next_best_action,"acknowledge_switch_and_answer_new_topic");

const health=conversionDecisionHealth();
assert.equal(health.version,"19.0");
assert.ok(health.capabilities.includes("close_timing_guard"));
console.log("V19 conversion decision brain PASS");
