import assert from "node:assert/strict";
import {
  createFinalTurnContract, buildFinalTruthEnvelope, auditFinalResponse,
  finalizeProductionResponse, finalProductionHealth, finalPromptRegistry
} from "../lib/final_production_os.js";

process.env.OPENAI_API_KEY="";
process.env.FINAL_CRITIC_ENABLED="false";

function meaning(primary,overrides={}){
  return {version:"31.0",authoritative:true,primary_intent:primary,intents:[{name:primary,confidence:.99}],domain:"products",speech_act:"question",topic_relationship:"new_topic",context_policy:{use_recent_context:false,ignore_old_product:true,ignore_old_agriculture:true},response_plan:{answer_order:[primary],max_questions:0},ambiguity:{required:false},confidence:.99,...overrides};
}

const poisoned={turn:8,active_product_context:{product:{name:"مبيد قديم"}},crop:"cucumber"};
let contract=createFinalTurnContract({message:"اسمك إيه؟",meaningFrame:meaning("identity",{domain:"social"}),state:poisoned});
let truth=buildFinalTruthEnvelope({payload:{},results:[],source:"legacy_dose"});
let audit=auditFinalResponse({message:"اسمك إيه؟",payload:{reply:"الجرعة 20 مل لكل لتر حسب المحصول."},contract,truth,source:"legacy_dose"});
assert.ok(audit.hard_blocks.includes("stale_context_leak"));
assert.ok(audit.hard_blocks.includes("unverified_dosage"));
let final=await finalizeProductionResponse({message:"اسمك إيه؟",payload:{reply:"الجرعة 20 مل لكل لتر."},meaningFrame:meaning("identity",{domain:"social"}),state:poisoned,source:"legacy_dose"});
assert.match(final.payload.reply,/MIG FARM AI/);
assert.equal(/جرع|مل لكل/.test(final.payload.reply),false);
assert.equal(final.audit.passed,true);

contract=createFinalTurnContract({message:"الجرعة كام؟",meaningFrame:meaning("dosage")});
truth=buildFinalTruthEnvelope({payload:{},results:[],source:"neural"});
audit=auditFinalResponse({message:"الجرعة كام؟",payload:{reply:"استخدم 2 مل لكل لتر."},contract,truth,source:"neural"});
assert.ok(audit.hard_blocks.includes("unverified_dosage"));

contract=createFinalTurnContract({message:"نفذ الطلب",meaningFrame:meaning("purchase",{domain:"commerce"})});
truth=buildFinalTruthEnvelope({payload:{},results:[],source:"neural"});
audit=auditFinalResponse({message:"نفذ الطلب",payload:{reply:"تم تأكيد الطلب والدفع."},contract,truth,source:"neural"});
assert.ok(audit.hard_blocks.includes("unverified_action_execution"));

const live={name:"خيار وفرة",price:"35",currency:"AED",availability:"متوفر",truth:{source:"odoo_live_product_page",observed_at:new Date().toISOString(),ttl_seconds:600,current:true}};
contract=createFinalTurnContract({message:"بكام ومتوفر؟",meaningFrame:meaning("price",{intents:[{name:"price",confidence:.99},{name:"availability",confidence:.99}],compound:true,response_plan:{answer_order:["price","availability"],max_questions:0}})});
truth=buildFinalTruthEnvelope({payload:{},results:[live],source:"live_catalog"});
audit=auditFinalResponse({message:"بكام ومتوفر؟",payload:{reply:"السعر 35 AED ومتوفر حاليًا."},contract,truth,source:"live_catalog"});
assert.equal(audit.hard_blocks.length,0);

truth=buildFinalTruthEnvelope({payload:{},results:[{name:"قديم",price:"35",availability:"متوفر"}],source:"archive"});
audit=auditFinalResponse({message:"بكام ومتوفر؟",payload:{reply:"السعر 35 AED ومتوفر حاليًا."},contract,truth,source:"archive"});
assert.ok(audit.hard_blocks.includes("unverified_live_price"));
assert.ok(audit.hard_blocks.includes("unverified_live_availability"));

contract=createFinalTurnContract({message:"السعر والشحن؟",meaningFrame:meaning("price",{domain:"mixed",intents:[{name:"price",confidence:.99},{name:"shipping",confidence:.99}],compound:true,response_plan:{answer_order:["price","shipping"],max_questions:1}})});
truth=buildFinalTruthEnvelope({payload:{},results:[live],source:"live_catalog"});
audit=auditFinalResponse({message:"السعر والشحن؟",payload:{reply:"السعر 35 AED."},contract,truth,source:"live_catalog"});
assert.ok(audit.flags.includes("missing_intent:shipping"));

assert.equal(finalProductionHealth().ready,true);
assert.equal(finalProductionHealth().release,"FINAL_PRODUCTION_OS");
assert.equal(Object.keys(finalPromptRegistry()).length,3);
console.log("FINAL_PRODUCTION_OS unit and safety contract PASS");
