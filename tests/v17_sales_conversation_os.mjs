import assert from "node:assert/strict";
import { buildSalesConversationPlan, evaluateNaturalSalesReply, salesConversationOSHealth } from "../lib/sales_conversation_os.js";
import { analyzeSalesConversation, salesEmployeeHealth } from "../lib/sales_employee.js";
import { neuralBrainHealth } from "../lib/neural_agent.js";

function plan(message,analysis={},history=[],agriculturalContext={}){
  return buildSalesConversationPlan({message,analysis,profile:{lead_score:20},state:{},history,agriculturalContext});
}

let p=plan("عامل ايه يا هندسه",{intent:"greeting"});
assert.equal(p.mode,"social"); assert.equal(p.should_sell,false); assert.equal(p.question_budget,0); assert.equal(p.next_best_action,"respond_normally");

p=plan("غالي اوي يا باشا",{intent:"unknown"});
assert.equal(p.mode,"objection"); assert.equal(p.friction,"price"); assert.match(p.next_best_action,/price_friction/);

p=plan("هو موجود ولا هلف عالفاضي",{intent:"unknown"});
assert.equal(p.mode,"compare"); // "ولا" is a decision/compare cue; availability remains encoded as friction.
assert.equal(p.friction,"availability");

p=plan("بص انا محتار بين الاتنين",{intent:"unknown"});
assert.equal(p.mode,"compare"); assert.equal(p.question_budget,0);

p=plan("الخيار عندي الورق الجديد مكرمش وبيصفر",{intent:"unknown"},[],{intent:"diagnosis"});
assert.equal(p.mode,"technical"); assert.equal(p.should_sell,false); assert.equal(p.next_best_action,"diagnose_before_selling");

p=plan("عندكم بذور طماطم؟",{intent:"product_search",category:{key:"seeds"},crop:{key:"tomato"}});
assert.equal(p.mode,"direct_fact"); assert.equal(p.answer_first,true); assert.equal(p.question_budget,0);

const prev=[{role:"assistant",content:"تمام، عندنا كذا اختيار. السعر متاح في المتجر ولو تحب أقولك الفرق بينهم."}];
let q=evaluateNaturalSalesReply("أهلا بك في MIG FARM يسعدني مساعدتك. عندنا كذا اختيار. السعر متاح في المتجر ولو تحب أقولك الفرق بينهم.",{plan:p,message:"عندكم بذور طماطم؟",history:prev});
assert.ok(q.flags.includes("canned_opening")); assert.ok(q.score<100);

const sp=analyzeSalesConversation("مش مقتنع بصراحة",{analysis:{intent:"unknown"},profile:{lead_score:45},state:{},history:[]});
assert.ok(["17.0","18.0","19.0","20.0"].includes(sp.version)); assert.equal(sp.conversation_plan.friction,"trust");

const sh=salesConversationOSHealth(); assert.ok(["17.0","18.0","19.0","20.0"].includes(sh.version)); assert.ok(sh.capabilities.includes("next_best_action"));
const eh=salesEmployeeHealth(); assert.ok(["17.0","18.0","19.0","20.0"].includes(eh.version)); assert.ok(["17.0","18.0","19.0","20.0"].includes(eh.conversation_os.version));
process.env.OPENAI_API_KEY="test"; const nh=neuralBrainHealth(); assert.ok(["17.0","18.0","19.0","20.0"].includes(nh.version)); assert.ok(["human_sales_conversation_os","current_turn_semantic_human_sales_agent","conversion_decision_human_sales_agent","product_intelligence_conversion_human_sales_agent"].includes(nh.mode));
console.log("V17 sales conversation OS PASS");
