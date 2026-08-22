import assert from "node:assert/strict";

process.env.AI_PIPELINE_V33="true";
process.env.AI_DEBUG="true";
process.env.AI_DEBUG_TOKEN="v33-debug-test";
process.env.OPENAI_API_KEY="v33-test-key";
process.env.OPENAI_MODEL="gpt-5-mini";
process.env.MIG_V27_KNOWLEDGE_TRANSPORT="local";
process.env.MIG_ENTERPRISE_RETRIEVAL_ENABLED="false";
process.env.ODOO_ACTIONS_ENABLED="false";
delete process.env.UPSTASH_REDIS_REST_URL;delete process.env.UPSTASH_REDIS_REST_TOKEN;delete process.env.KV_REST_API_URL;delete process.env.KV_REST_API_TOKEN;

function response(text,id){return {ok:true,status:200,json:async()=>({id,output:[{type:"message",content:[{type:"output_text",text}]}]})};}
function meaning(){return {language:"ar",dialect:"egyptian",domain:"social",primary_intent:"identity",intents:[{name:"identity",confidence:.99}],speech_act:"question",topic_relationship:"new_topic",context_policy:{use_recent_context:false,ignore_old_product:true,ignore_old_agriculture:true,requires_visible_choice:false},entities:{emirate:null,crop:null,cultivation:null,category:null,product_name:null,product_reference:null,quantity:null,budget_aed:null,symptoms:[],decision_criteria:[]},reference:{requires_context:false,target:"none",resolved_text:null,confidence:0},ambiguity:{required:false,missing_information:null,question:null},response_plan:{mode:"social",external_facts_required:false,answer_order:["identity"],max_questions:0,tone:"طبيعي ومباشر"},compound:false,safe_direct_reply:"أنا MIG FARM AI، مساعدك للمنتجات والزراعة وخدمات MIG FARM.",meaning_summary:"المستخدم يسأل عن هوية المساعد ويصحح الموضوع السابق",confidence:.99};}

const originalFetch=globalThis.fetch;let meaningCalls=0,answerCalls=0;
globalThis.fetch=async (url,options={})=>{
  assert.match(String(url),/api\.openai\.com\/v1\/responses/);const body=JSON.parse(options.body||"{}");assert.equal(body.store,false);
  if(body.text?.format?.name==="mig_farm_meaning_v31"){meaningCalls+=1;return response(JSON.stringify(meaning()),"meaning-v33");}
  answerCalls+=1;assert.match(body.instructions,/latest message|current message/i);assert.equal(Array.isArray(body.tools),false);return response("أنا MIG FARM AI، مساعدك في منتجات MIG FARM والزراعة وخدمات المتجر.","answer-v33");
};

try{
  const {POST}=await import("../api/chat.js");
  const poisoned={v:32,turn:8,topic:"product",selected_product:"مبيد قديم",active_product_context:{active:true,product:{name:"مبيد قديم",sku:"OLD-1"}},intelligence_v33:{version:"33.0",turn:8,active_topic:"products",active_products:[{entity_id:"old",name:"مبيد قديم",sku:"OLD-1"}],visible_products:[{entity_id:"old",name:"مبيد قديم",sku:"OLD-1"}],active_product_id:"old",active_crop:"خيار",last_route:"product_exact"}};
  const request=new Request("https://backend.example/api/chat",{method:"POST",headers:{"content-type":"application/json","x-ai-debug-token":"v33-debug-test"},body:JSON.stringify({session_id:"v33-provider-api",locale:"ar",message:"بغض النظر عن المبيد، مين اللي بيرد عليا دلوقتي؟",conversation_state:poisoned,history:[{role:"assistant",content:"ابعت الملصق لتحديد الجرعة"}],ai_debug:true})});
  const result=await POST(request);assert.equal(result.status,200);const data=await result.json();
  assert.equal(data.version,"33.0.0");assert.equal(data.mode,"unified_semantic_intelligence_v33");assert.equal(data.source,"unified_neural_generation_v33");
  assert.equal(data.llm_first_orchestrator.current.provider,"openai");assert.equal(data.llm_first_orchestrator.current.primary_intent,"identity");
  assert.match(data.reply,/MIG FARM AI/);assert.equal(/جرع|ملصق|مبيد قديم/.test(data.reply),false);
  assert.equal(data.conversation_state.v,33);assert.equal(data.conversation_state.intelligence_v33.active_products.length,0);
  assert.equal(data.unified_intelligence_v33.validation.accepted,true);assert.equal(data.ai_debug.route.kind,"conversation_only");assert.ok(data.ai_debug.trace_id.startsWith("ai_"));
  assert.equal(meaningCalls,1);assert.equal(answerCalls,1);
  console.log("V33 provider-backed single pipeline and authorized debug PASS");
}finally{globalThis.fetch=originalFetch;}
