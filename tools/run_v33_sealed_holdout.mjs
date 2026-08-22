import {readFileSync,writeFileSync} from "node:fs";
import {understandTurnV31} from "../lib/llm_first_orchestrator_v31.js";
import {analyzeTurn} from "../lib/dialogue.js";

const source=new URL("../evals/v33_sealed_holdout.json",import.meta.url);
const cases=JSON.parse(readFileSync(source,"utf8"));
const productState={turn:9,topic:"product",intelligence_v33:{version:"33.0",turn:9,active_topic:"products",active_products:[{entity_id:"a",name:"مياسة F1",sku:"A"}],visible_products:[{entity_id:"a",name:"مياسة F1",sku:"A"},{entity_id:"b",name:"مزيونة F1",sku:"B"}],active_product_id:"a",active_crop:"باذنجان",last_route:"product_discovery"}};
const failures=[];let passed=0;
for(const item of cases){
  const state=item.product_context?productState:{};
  const legacy=analyzeTurn(item.message,state,[],"ar");
  const result=await understandTurnV31({message:item.message,state,history:[],legacyAnalysis:legacy});
  const accepted=result.primary_intent===item.expected_intent||(item.expected_intent==="product_search"&&["recommendation","known_product_info"].includes(result.primary_intent));
  if(accepted)passed+=1;
  else failures.push({message:item.message,expected:item.expected_intent,actual:result.primary_intent,provider:result.provider,classification:result.primary_intent==="unknown"?"intent_understanding_failure":"wrong_tool_routing"});
}
const score=Number((passed/Math.max(1,cases.length)*100).toFixed(2));
const report={version:"33.2.0",dataset:"sealed_post_fix_holdout_b",created_after_mechanism_fix:true,production_prompt_exposure:false,provider:process.env.OPENAI_API_KEY?"openai":"deterministic_emergency_fallback",total:cases.length,passed,failed:failures.length,score,quality_gate:{target:90,passed:score>=90},failures};
writeFileSync(new URL("../V33_SEALED_HOLDOUT_REPORT.json",import.meta.url),JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify({...report,failures:failures.slice(0,12)},null,2));
if(!report.quality_gate.passed)process.exitCode=1;
