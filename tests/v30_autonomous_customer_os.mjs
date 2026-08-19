import assert from "node:assert/strict";
import { buildAutonomousCustomerPlanV30, constrainToolsWithPlanV30, autonomousCustomerOSHealthV30 } from "../lib/autonomous_customer_os_v30.js";
import { mergeCustomerDigitalTwinV30, sanitizeCustomerDigitalTwinV30, customerDigitalTwinHealthV30 } from "../lib/customer_digital_twin_v30.js";
import { evaluateConfidenceGatewayV30, enforceConfidenceGatewayV30, confidenceGatewayHealthV30 } from "../lib/confidence_gateway_v30.js";
import { recordClosedLoopOutcomeV30, closedLoopLearningSnapshotV30, closedLoopLearningHealthV30 } from "../lib/closed_loop_learning_v30.js";

process.env.OPENAI_API_KEY="";
let plan=buildAutonomousCustomerPlanV30({message:"عايز أقارن سعر وتوفر بذور خيار",analysis:{intent:"compare",category:{key:"seeds"}},semanticFrame:{primary_intent:"compare",intents:[{name:"compare"}],confidence:.9},state:{turn:3}});
assert.equal(plan.version,"30.0");
assert.equal(plan.execution_mode,"deterministic_resilient");
assert.ok(plan.allowed_tools.includes("search_catalog"));
assert.ok(plan.allowed_tools.includes("verify_live_product_truth"));
assert.ok(plan.agents.some(x=>x.name==="product_truth"));
assert.ok(plan.tasks.some(x=>x.agent==="quality"));

const social=buildAutonomousCustomerPlanV30({message:"شكرا",analysis:{intent:"acknowledgment"},semanticFrame:{primary_intent:"acknowledgment"},humanTurn:{mode:"social",tool_policy:{mode:"zero_tools",allowed:[]}}});
assert.equal(social.execution_mode,"deterministic_direct");
assert.deepEqual(social.allowed_tools,[]);
assert.equal(social.tool_budget,0);

const dosage=buildAutonomousCustomerPlanV30({message:"جرعة المبيد كام مل لكل لتر؟",analysis:{intent:"known_product_info"},semanticFrame:{primary_intent:"known_product_info"}});
assert.equal(dosage.risk.dosage,true);
assert.equal(dosage.risk.level,"high");
assert.ok(dosage.allowed_tools.includes("get_product_dossier"));
assert.deepEqual(constrainToolsWithPlanV30(["get_product_dossier","get_business_fact"],dosage),["get_product_dossier"]);
assert.deepEqual(constrainToolsWithPlanV30([],dosage),[]);

let twin=mergeCustomerDigitalTwinV30({}, {frame:{message:"أنا في العين وعايز خيار للبيت المحمي",dialect:"egyptian",entities:{emirate:"العين",crop:"cucumber",cultivation:"greenhouse"},tasks:[{intent:"recommendation"}]},analysis:{intent:"recommendation",crop:{key:"cucumber"},cultivation:"greenhouse"},turn:1});
assert.equal(twin.version,"30.0");
assert.equal(twin.facts.find(x=>x.key==="emirate")?.value,"العين");
assert.equal(twin.facts.find(x=>x.key==="crop")?.value,"cucumber");
twin=mergeCustomerDigitalTwinV30(twin,{frame:{message:"ميزانيتي 500 وإيميلي client@example.com",entities:{budget:500,product_reference:"client@example.com"},tasks:[{intent:"recommendation"}]},analysis:{intent:"recommendation"},turn:2});
assert.equal(twin.facts.find(x=>x.key==="budget_aed")?.value,500);
assert.equal(twin.facts.some(x=>String(x.value).includes("@")),false);
const sanitized=sanitizeCustomerDigitalTwinV30({facts:[{key:"phone",value:"0501234567"},{key:"email",value:"a@b.com"},{key:"crop",value:"tomato",confidence:.9,updated_turn:2}]});
assert.deepEqual(sanitized.facts.map(x=>x.key),["crop"]);

const unsafe=evaluateConfidenceGatewayV30({payload:{reply:"استخدم 5 مل لكل لتر."},plan:dosage,source:"neural_answer",audit:{dose_claim_risk:true},review:{},evidence:{}});
assert.equal(unsafe.decision,"block");
const blocked=enforceConfidenceGatewayV30({payload:{reply:"استخدم 5 مل لكل لتر."},assessment:unsafe});
assert.match(blocked.reply,/الملصق/);
assert.equal(blocked.reply.includes("5 مل"),false);

const safePlan=buildAutonomousCustomerPlanV30({message:"وين فروعكم؟",analysis:{intent:"branches"},semanticFrame:{primary_intent:"branches",confidence:.95}});
const safe=evaluateConfidenceGatewayV30({payload:{reply:"إحنا موجودين في الشارقة والعين."},plan:safePlan,source:"branches",results:[],audit:{score:98,flags:[]},review:{quality_score:98},evidence:{source:"business"}});
assert.equal(safe.decision,"answer");
assert.equal(enforceConfidenceGatewayV30({payload:{reply:"إحنا موجودين في الشارقة والعين."},assessment:safe}).reply,"إحنا موجودين في الشارقة والعين.");

const outcome=recordClosedLoopOutcomeV30({analysis:{intent:"branches"},plan:safePlan,assessment:safe,source:"branches",results:[]});
assert.equal(outcome.recorded,true);
assert.equal(JSON.stringify(outcome).includes("وين فروعكم"),false);
assert.ok(closedLoopLearningSnapshotV30().turns>=1);
assert.equal(autonomousCustomerOSHealthV30().ready,true);
assert.equal(customerDigitalTwinHealthV30().version,"30.0");
assert.equal(confidenceGatewayHealthV30().version,"30.0");
assert.equal(closedLoopLearningHealthV30().version,"30.0");

process.env.MIG_V27_KNOWLEDGE_TRANSPORT="local";
process.env.MIG_ENTERPRISE_RETRIEVAL_ENABLED="false";
process.env.OPENAI_VECTOR_STORE_ID="";
process.env.ODOO_ACTIONS_ENABLED="false";
const { POST }=await import("../api/chat.js");
const sessionId=`v30-safe-${Date.now()}`;
async function ask(body){
  const response=await POST(new Request("https://backend.example/api/chat",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({session_id:sessionId,locale:"ar",...body})}));
  assert.equal(response.status,200);return response.json();
}
const first=await ask({message:"وين مكانكم؟"});
assert.equal(first.version,"30.0.0");
assert.equal(first.mode,"neural_autonomous_customer_os_v30");
assert.equal(first.conversation_state.v,30);
assert.equal(first.autonomous_customer_os.version,"30.0");
assert.equal(first.confidence_gateway.version,"30.0");
assert.equal(first.customer_digital_twin.version,"30.0");
assert.equal(first.closed_loop_learning.version,"30.0");
const second=await ask({message:"3ain",conversation_state:first.conversation_state,history:[{role:"user",content:"وين مكانكم؟"},{role:"assistant",content:first.reply}]});
assert.match(second.reply,/\+971 58 176 8215/);
assert.equal(second.conversation_reasoning.current.resolution.kind,"expected_location");
assert.equal(second.confidence_gateway.current.decision,"answer");

console.log("V30 Neural Autonomous Customer OS PASS");
