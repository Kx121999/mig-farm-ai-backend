import assert from "node:assert/strict";
import { evaluateAndRecordTurn, recordOutcomeFeedback, resetSelfLearning, selfLearningSnapshot, selfLearningHealth } from "../lib/self_learning_os.js";

resetSelfLearning();
let evaluation=evaluateAndRecordTurn({message:"بكام المنتج؟",semanticFrame:{intents:[{name:"product_price"}],response_contract:{question_budget:0}},analysis:{intent:"product_price"},payload:{reply:"السعر غير متاح حاليًا."},source:"v23_bound_product_live",evidence:{sources:[{type:"live_odoo"}]},quality:{}});
assert.equal(evaluation.grade,"pass");assert.equal(evaluation.flags.includes("ungrounded_price_risk"),false);

evaluation=evaluateAndRecordTurn({message:"عندكم سماد وتوصلوا العين؟",semanticFrame:{intents:[{name:"product_search"},{name:"shipping"}],compound:{is_multi_intent:true},plan:{tasks:[]},response_contract:{question_budget:1}},analysis:{intent:"product_search",category:{key:"fertilizer"}},payload:{reply:"ممكن توضح؟ وهل تقصد منتج معين؟"},source:"safe_human_fallback",evidence:{},quality:{flags:["low_confidence"]}});
assert.equal(evaluation.grade,"fail");assert.ok(evaluation.flags.includes("possible_multi_intent_drop"));assert.ok(evaluation.gap_fingerprint.startsWith("gap:"));

assert.equal(recordOutcomeFeedback({rating:"down",reason_code:"wrong_intent"}).ok,true);
const snapshot=selfLearningSnapshot();assert.equal(snapshot.totals.evaluated,2);assert.equal(snapshot.feedback.down,1);assert.equal(snapshot.privacy.stores_raw_messages,false);assert.equal(JSON.stringify(snapshot).includes("عندكم سماد"),false);
assert.equal(selfLearningHealth().version,"25.0");
console.log("V25 Self Learning OS PASS");
