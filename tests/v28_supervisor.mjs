import assert from "node:assert/strict";
import { buildCustomerBrainFrameV27 } from "../lib/customer_brain_v27.js";
import { createSupervisorPlanV28, superviseResponseV28, enterpriseSupervisorHealthV28 } from "../lib/supervisor_v28.js";
import { auditCustomerResponseV27 } from "../lib/response_auditor_v27.js";

const frame=buildCustomerBrainFrameV27({message:"مكانكم فين وبتوصلوا عجمان والدفع كاش؟"});
const plan=createSupervisorPlanV28({message:frame.message,frame});
assert.equal(plan.version,"28.0");assert.equal(plan.multi_intent,true);assert.ok(plan.agents.includes("business_facts"));assert.ok(plan.agents.includes("quality_critic"));
const reply="**الفروع:** عندنا فرع في الشارقة وفرع في العين.\n\n**التوصيل:** نوصل عجمان.\n\n**الدفع:** طرق الدفع تظهر في صفحة الدفع.";
const audit=auditCustomerResponseV27({reply,frame,source:"eval"});
const result=superviseResponseV28({payload:{reply},plan,frame,source:"eval",audit});
assert.equal(result.payload.reply.includes("Odoo"),false);assert.ok(result.payload.reply_blocks.length>=3);assert.equal(result.payload.enterprise_supervision.version,"28.0");
assert.equal(enterpriseSupervisorHealthV28().gates.includes("quality_before_send"),true);
console.log("V28 enterprise supervisor PASS");
