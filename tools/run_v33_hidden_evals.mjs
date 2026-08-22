import {readFileSync,writeFileSync} from "node:fs";
import {understandTurnV31} from "../lib/llm_first_orchestrator_v31.js";
import {analyzeTurn} from "../lib/dialogue.js";

const url=new URL("../evals/v33_hidden_generalization.json",import.meta.url),cases=JSON.parse(readFileSync(url,"utf8"));
const configured=Boolean(String(process.env.OPENAI_API_KEY||"").trim());const failures=[];let passed=0;
const productState={turn:6,topic:"product",intelligence_v33:{version:"33.0",turn:6,active_topic:"products",active_products:[{entity_id:"a",name:"مياسة F1",sku:"A"}],visible_products:[{entity_id:"a",name:"مياسة F1",sku:"A"},{entity_id:"b",name:"مزيونة F1",sku:"B"}],active_product_id:"a",active_crop:"باذنجان",last_route:"product_discovery"}};
for(const item of cases){
  const state=item.product_context?productState:{};const legacy=analyzeTurn(item.message,state,[],"ar");const result=await understandTurnV31({message:item.message,state,history:[],legacyAnalysis:legacy});
  const accepted=result.primary_intent===item.expected_intent||(item.expected_intent==="product_search"&&["recommendation","known_product_info"].includes(result.primary_intent));
  if(accepted)passed+=1;else failures.push({message:item.message,expected:item.expected_intent,actual:result.primary_intent,provider:result.provider,classification:result.primary_intent==="unknown"?"intent_understanding_failure":"wrong_tool_routing"});
}
const report={version:"33.0",dataset:"post_implementation_hidden_generalization",created_after_implementation:true,production_prompt_exposure:false,provider:configured?"openai":"deterministic_emergency_fallback",total:cases.length,passed,failed:failures.length,score:Number((passed/Math.max(1,cases.length)*100).toFixed(2)),quality_gate:{target:90,passed:passed/cases.length>=.9},failures};
writeFileSync(new URL("../V33_HIDDEN_GENERALIZATION_REPORT.json",import.meta.url),JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify({...report,failures:failures.slice(0,10)},null,2));
if(!report.quality_gate.passed){console.error(`V33 hidden generalization gate failed: ${passed}/${cases.length}`);process.exit(1);}
