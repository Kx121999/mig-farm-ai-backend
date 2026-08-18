import assert from "node:assert/strict";
import { runNeuralAgent } from "../lib/neural_agent.js";

const oldFetch=globalThis.fetch;
const oldKey=process.env.OPENAI_API_KEY;
const oldRounds=process.env.NEURAL_MAX_ROUNDS;
process.env.OPENAI_API_KEY="test-key";
process.env.NEURAL_MAX_ROUNDS="5";
const bodies=[];let callNo=0;
globalThis.fetch=async (_url,opts={})=>{
  const body=JSON.parse(String(opts.body||"{}"));bodies.push(body);callNo+=1;
  if(callNo===1){
    return new Response(JSON.stringify({id:"resp-1",output:[{type:"function_call",name:"match_visual_product",call_id:"m1",arguments:JSON.stringify({visible_text:"0.5 HP CLEAN WATER PUMP 350F W23805PUM",candidate_name:"0.5 HP CLEAN WATER PUMP 350F",sku:"W23805PUM",barcode:"",brand:"",category:"",limit:5})}]}),{status:200,headers:{"content-type":"application/json"}});
  }
  if(callNo===2){
    return new Response(JSON.stringify({id:"resp-2",output:[{type:"function_call",name:"verify_visual_product_live",call_id:"v1",arguments:JSON.stringify({identifier:"W23805PUM",query:"0.5 HP CLEAN WATER PUMP 350F"})}]}),{status:200,headers:{"content-type":"application/json"}});
  }
  return new Response(JSON.stringify({id:"resp-3",output:[{type:"message",role:"assistant",content:[{type:"output_text",text:"ثبتّ المنتج وراجعت التوفر Live."}]}]}),{status:200,headers:{"content-type":"application/json"}});
};
try{
  const result=await runNeuralAgent({
    message:"هل متوفر؟",locale:"ar",
    context:{vision_context:{has_visual_context:true,has_fresh_images:true,has_image_pixels:true,requires_recognition_preflight:true,mode:"product_or_label",visual_intent:"availability"}},
    images:[{type:"input_image",image_url:"data:image/jpeg;base64,AAAA",detail:"high",client_image_id:"img-x"}],
    allowedTools:["match_visual_product","verify_visual_product_live","get_retake_advice","plan_visual_product_action"],
    toolHandlers:{
      match_visual_product:async ()=>({recognition_attempted:true,identity_confidence:"high",candidates:[{name:"0.5 HP CLEAN WATER PUMP 350F",sku:"W23805PUM"}]}),
      verify_visual_product_live:async ()=>({truth:{identity:{live_verified:true,name:"0.5 HP CLEAN WATER PUMP 350F"},current:{availability:"متوفر"}}}),
      get_retake_advice:async ()=>({ask_one:"retake"}),
      plan_visual_product_action:async ()=>({next_action:"verify_exact_product_live"})
    }
  });
  assert.equal(result.handled,true);
  assert.equal(result.visual_recognition_preflight,true);
  assert.equal(result.trace[0].tool,"match_visual_product");
  assert.equal(result.trace[1].tool,"verify_visual_product_live");
  assert.equal(bodies[0].tool_choice,"required");
  assert.deepEqual((bodies[0].tools||[]).map(x=>x.name),["match_visual_product"]);
  assert.ok((bodies[1].tools||[]).some(x=>x.name==="verify_visual_product_live"));
  assert.match(JSON.stringify(bodies[0].input),/PRODUCT RECOGNITION PREFLIGHT/);
  console.log("V22.5 forced neural recognition preflight PASS");
} finally {
  globalThis.fetch=oldFetch;
  if(oldKey===undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY=oldKey;
  if(oldRounds===undefined) delete process.env.NEURAL_MAX_ROUNDS; else process.env.NEURAL_MAX_ROUNDS=oldRounds;
}
