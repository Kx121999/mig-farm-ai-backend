import assert from "node:assert/strict";

process.env.OPENAI_API_KEY="v31-test-key";
process.env.OPENAI_MODEL="gpt-5.6";
process.env.MIG_V27_KNOWLEDGE_TRANSPORT="local";
process.env.MIG_ENTERPRISE_RETRIEVAL_ENABLED="false";
process.env.OPENAI_VECTOR_STORE_ID="";
process.env.ODOO_ACTIONS_ENABLED="false";
delete process.env.UPSTASH_REDIS_REST_URL;delete process.env.UPSTASH_REDIS_REST_TOKEN;
delete process.env.KV_REST_API_URL;delete process.env.KV_REST_API_TOKEN;

const originalFetch=globalThis.fetch;let meaningCalls=0,answerCalls=0;
function messageResponse(text,id="resp-v31"){return {ok:true,status:200,json:async()=>({id,output:[{type:"message",content:[{type:"output_text",text}]}]})};}
function meaning(){return {language:"ar",dialect:"egyptian",domain:"social",primary_intent:"identity",intents:[{name:"identity",confidence:.99}],speech_act:"question",topic_relationship:"new_topic",context_policy:{use_recent_context:false,ignore_old_product:true,ignore_old_agriculture:true,requires_visible_choice:false},entities:{emirate:null,crop:null,cultivation:null,category:null,product_name:null,product_reference:null,quantity:null,budget_aed:null,symptoms:[],decision_criteria:[]},reference:{requires_context:false,target:"none",resolved_text:null,confidence:0},ambiguity:{required:false,missing_information:null,question:null},response_plan:{mode:"social",external_facts_required:false,answer_order:["identity"],max_questions:0,tone:"طبيعي وودود"},compound:false,safe_direct_reply:"أنا MIG FARM AI، مساعدك للمنتجات والزراعة وخدمات MIG FARM.",meaning_summary:"يسأل عن هوية المساعد وليس عن المنتج السابق",confidence:.99};}
globalThis.fetch=async (url,options={})=>{
  assert.match(String(url),/api\.openai\.com\/v1\/responses/);
  const body=JSON.parse(options.body||"{}");assert.equal(body.store,false);
  if(body.text?.format?.name==="mig_farm_meaning_v31"){meaningCalls+=1;return messageResponse(JSON.stringify(meaning()),"meaning-v31");}
  answerCalls+=1;return messageResponse("أنا MIG FARM AI، مساعدك في منتجات MIG FARM والزراعة وخدمات المتجر. إزاي أقدر أساعدك؟","answer-v31");
};

try{
  const { POST }=await import("../api/chat.js");
  const oldState={v:30,turn:6,topic:"product",last_intent:"known_product_info",selected_product:"مبيد قديم",crop:"cucumber",active_product_context:{active:true,product:{name:"مبيد قديم",sku:"OLD-1"}},dialogue_v29:{expected:{active:true,field:"product_selection",intent:"known_product_info",question:"اسم المنتج؟",asked_turn:6,expires_turn:8}}};
  const response=await POST(new Request("https://backend.example/api/chat",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({session_id:"v31-neural-primary",locale:"ar",message:"أنا مش بسأل عن الجرعة أنا بسأل اسمك إيه",conversation_state:oldState,history:[{role:"assistant",content:"ابعت اسم المنتج وصورة الملصق عشان أحدد الجرعة"}]})}));
  assert.equal(response.status,200);const data=await response.json();
  assert.equal(data.version,"31.0.0");assert.equal(data.mode,"llm_first_semantic_orchestrator_v31");
  assert.equal(data.source,"neural_llm_first_primary_v31");assert.equal(data.llm_first_v31,true);
  assert.equal(data.llm_first_orchestrator.current.provider,"openai");assert.equal(data.llm_first_orchestrator.current.primary_intent,"identity");
  assert.equal(data.llm_first_orchestrator.current.topic_relationship,"new_topic");assert.equal(data.meaning_alignment.passed,true);
  assert.match(data.reply,/MIG FARM AI/);assert.equal(/جرع|مبيد|ملصق/.test(data.reply),false);
  assert.equal(data.neural_brain.used,true);assert.equal(data.conversation_state.v,31);
  assert.equal(meaningCalls,1);assert.ok(answerCalls>=1);
  console.log("V31 LLM-first primary neural API PASS");
}finally{globalThis.fetch=originalFetch;}
