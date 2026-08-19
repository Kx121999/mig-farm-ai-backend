import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildCustomerBrainFrameV27 } from "../lib/customer_brain_v27.js";
import { createSupervisorPlanV28, superviseResponseV28 } from "../lib/supervisor_v28.js";
import { auditCustomerResponseV27 } from "../lib/response_auditor_v27.js";

const root=new URL("..",import.meta.url).pathname;
const cases=JSON.parse(readFileSync(join(root,"evals","v28_golden_cases.json"),"utf8"));
const results=[];
for(const item of cases){
  const frame=buildCustomerBrainFrameV27({message:item.message,state:item.state||{}}),plan=createSupervisorPlanV28({message:item.message,frame,hasImages:Boolean(item.has_images)});
  const intents=frame.tasks.map(x=>x.intent),agents=plan.agents;
  const checks={intents:(item.expect_intents||[]).every(x=>intents.includes(x)),forbidden_intents:(item.forbid_intents||[]).every(x=>!intents.includes(x)),agents:(item.expect_agents||[]).every(x=>agents.includes(x)),question_budget:plan.answer_contract.one_question_max===true,context:item.expect_context?plan.context_policy===item.expect_context:true};
  if(item.candidate_reply){const audit=auditCustomerResponseV27({reply:item.candidate_reply,frame,source:"eval",state:item.state||{}}),supervised=superviseResponseV28({payload:{reply:item.candidate_reply},plan,frame,source:"eval",audit});checks.response=Boolean(supervised.payload.reply)&&supervised.payload.reply_blocks.length>0;checks.dosage_safe=item.expect_dosage_risk===undefined?true:audit.dose_claim_risk===item.expect_dosage_risk;}
  const passed=Object.values(checks).every(Boolean);results.push({id:item.id,passed,checks,intents,agents});
}
const passed=results.filter(x=>x.passed).length,report={version:"28.0",generated_at:new Date().toISOString(),status:passed===results.length?"pass":"fail",passed,total:results.length,results};
mkdirSync(join(root,"evals"),{recursive:true});writeFileSync(join(root,"evals","v28_eval_report.json"),JSON.stringify(report,null,2)+"\n");
if(report.status!=="pass"){console.error(JSON.stringify(report,null,2));process.exit(1);}console.log(`V28 enterprise evals PASS — ${passed}/${results.length}`);
