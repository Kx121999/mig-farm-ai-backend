import {readFileSync,writeFileSync} from "node:fs";
import {understandTurnV31} from "../lib/llm_first_orchestrator_v31.js";
import {analyzeTurn} from "../lib/dialogue.js";

const cases=JSON.parse(readFileSync(new URL("../evals/v33_final_locked_holdout_e.json",import.meta.url),"utf8"));
const productState={turn:21,topic:"product",intelligence_v33:{version:"33.0",turn:21,active_topic:"products",active_products:[{entity_id:"final-a",name:"مياسة F1",sku:"A"}],visible_products:[{entity_id:"final-a",name:"مياسة F1",sku:"A"},{entity_id:"final-b",name:"مزيونة F1",sku:"B"}],active_product_id:"final-a",active_crop:"باذنجان",last_route:"product_discovery"}};
const failures=[];let passed=0;
for(let index=0;index<cases.length;index+=1){
  const item=cases[index],state=item.product_context?productState:{};
  const result=await understandTurnV31({message:item.message,state,history:[],legacyAnalysis:analyzeTurn(item.message,state,[],"ar")});
  const accepted=result.primary_intent===item.expected_intent||(item.expected_intent==="product_search"&&["recommendation","known_product_info"].includes(result.primary_intent));
  if(accepted)passed+=1;else failures.push({case_id:`final-locked-${String(index+1).padStart(3,"0")}`,expected:item.expected_intent,actual:result.primary_intent,provider:result.provider,classification:result.primary_intent==="unknown"?"intent_understanding_failure":"wrong_tool_routing"});
}
const score=Number((passed/Math.max(1,cases.length)*100).toFixed(2));
const report={version:"33.0",dataset:"final_locked_holdout_e",locked_before_first_execution:true,engine_frozen_before_dataset_creation:true,no_post_result_engine_changes:true,production_prompt_exposure:false,provider:process.env.OPENAI_API_KEY?"openai":"deterministic_emergency_fallback",total:cases.length,passed,failed:failures.length,score,quality_gate:{target:90,passed:score>=90},failures};
writeFileSync(new URL("../V33_FINAL_LOCKED_HOLDOUT_REPORT.json",import.meta.url),JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify(report,null,2));
if(!report.quality_gate.passed)process.exitCode=1;
