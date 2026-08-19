import assert from "node:assert/strict";
import { GET } from "../api/health.js";
import { POST } from "../api/chat.js";

delete process.env.OPENAI_API_KEY;

const health=await (await GET()).json();
assert.equal(health.version,"28.0.0");
assert.equal(health.mode,"enterprise_autonomous_intelligence_platform_v28");
assert.equal(health.semantic_human_brain?.version,"27.0");
for(const feature of ["semantic_human_brain","arabizi_normalization","multi_intent_decomposition","pronoun_product_resolution"])assert.ok(health.features.includes(feature),feature);

async function ask(body){
  const request=new Request("https://mig-farm-ai-backend.vercel.app/api/chat",{method:"POST",headers:{"content-type":"application/json","origin":"https://www.migfarm.com"},body:JSON.stringify(body)});
  const response=await POST(request);const data=await response.json();assert.equal(response.status,200);return data;
}

let result=await ask({message:"عامل ايه",session_id:"v24-api-social",locale:"ar",conversation_state:{turn:7,category:"fertilizer",crop:"tomato",visible_products:[{name:"سماد قديم",price:"99"}],active_product_context:{active:true,product:{name:"سماد قديم",sku:"OLD"},expires_turn:20}}});
assert.equal(result.version,"28.0.0");
assert.equal(result.mode,"enterprise_autonomous_intelligence_platform_v28");
assert.equal(result.semantic_human_brain?.frame?.dialect?.dialect,"egyptian");
assert.equal(result.semantic_human_brain?.frame?.context?.scope,"current_turn_only");
assert.doesNotMatch(result.reply,/سماد قديم|طماطم|99/);

const jabara={name:"JABARA F1 CHERRY TOMATO",sku:"287F1",price:"",currency:"AED",availability:""};
result=await ask({message:"tafsil da",session_id:"v24-api-arabizi",locale:"ar",selected_product_context:jabara});
assert.equal(result.semantic_human_brain?.frame?.dialect?.language,"arabizi");
assert.ok(result.semantic_human_brain?.frame?.intents?.includes("product_details"));
assert.equal(result.semantic_human_brain?.frame?.reference?.kind,"client_selected");
assert.equal(result.bound_product?.sku,"287F1");
assert.match(result.source,/v23_bound_product/);

console.log("V24 API Semantic Orchestrator regression PASS");
