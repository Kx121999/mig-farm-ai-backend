import assert from "node:assert/strict";
import { buildCustomerBrainFrameV27, customerBrainHealthV27 } from "../lib/customer_brain_v27.js";
import { mergeCustomerMemoryV27, customerMemoryHealthV27 } from "../lib/customer_memory_v27.js";
import { auditCustomerResponseV27, enforceCustomerResponseV27, responseAuditorHealthV27 } from "../lib/response_auditor_v27.js";

const compound=buildCustomerBrainFrameV27({message:"مكانكم فين وهل خيار وفرة متوفر وبكام؟",state:{customer_brain_memory:{last_goal:"dosage"}}});
assert.equal(compound.version,"27.0");assert.equal(compound.is_multi_intent,true);assert.equal(compound.can_execute_deterministically,true);
assert.deepEqual(compound.tasks.map(x=>x.intent),["branches","availability","price"]);assert.equal(compound.topic_switch,true);assert.equal(compound.answer_contract.one_question_max,true);

const dialects=[
  ["وين موقعكم والدفع كيف؟","emirati"],["mkanokom feen w bkam?","arabizi"],["Where is your store and do you deliver?","english"],["مكانكم فين والشحن بكام؟","egyptian"]
];
for(const [message,expected] of dialects){const frame=buildCustomerBrainFrameV27({message});assert.equal(frame.dialect,expected,message);assert.ok(frame.tasks.length>=1,message);}

const memory=mergeCustomerMemoryV27({},buildCustomerBrainFrameV27({message:"عايز بذور خيار لعجمان وميزانيتي 500"}),4);
assert.equal(memory.version,"27.0");assert.equal(memory.emirate,"ajman");assert.equal(memory.crop,"خيار");assert.equal(memory.budget_aed,500);assert.equal(memory.updated_turn,4);

const payload=enforceCustomerResponseV27({reply:"السؤال الأول؟ السؤال الثاني؟\n\nالسؤال الثاني؟"},compound);assert.equal((payload.reply.match(/[؟?]/g)||[]).length,1);
const audit=auditCustomerResponseV27({reply:"الفروع في الشارقة والعين. التوفر من Odoo Live والسعر الحالي من Odoo Live.",frame:compound,source:"test",state:{category:"fertilizer"}});
assert.equal(audit.passed,true);assert.deepEqual(audit.missing_tasks,[]);assert.equal(audit.question_count,0);
assert.equal(customerBrainHealthV27().version,"27.0");assert.equal(customerMemoryHealthV27().version,"27.0");assert.equal(responseAuditorHealthV27().version,"27.0");
console.log("V27 Customer Brain, Memory & Response Auditor PASS");

