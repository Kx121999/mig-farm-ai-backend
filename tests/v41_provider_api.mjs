import assert from 'node:assert/strict';
process.env.AI_PIPELINE_V41='true';
process.env.AI_PIPELINE_V40='true';
process.env.AI_PIPELINE_V33='true';
process.env.UNIFIED_SEMANTIC_V33_ENABLED='true';
process.env.AI_DEBUG='true';
process.env.AI_DEBUG_TOKEN='v41-debug-test';
process.env.OPENAI_API_KEY='v41-test-key';
process.env.OPENAI_MODEL='gpt-5-mini';
process.env.MIG_ENTERPRISE_RETRIEVAL_ENABLED='false';
process.env.ODOO_ACTIONS_ENABLED='false';
process.env.PROVIDER_V41_CIRCUIT_FAILURES='20';
function response(text,id,model='gpt-5-mini'){return new Response(JSON.stringify({id,model,output:[{type:'message',content:[{type:'output_text',text}]}]}),{status:200,headers:{'content-type':'application/json'}});}
function meaning(){return {language:'ar',dialect:'egyptian',domain:'social',primary_intent:'identity',corrected_goal_intent:null,intents:[{name:'identity',confidence:.99}],speech_act:'question',topic_relationship:'new_topic',context_policy:{use_recent_context:false,ignore_old_product:true,ignore_old_agriculture:true,requires_visible_choice:false},entities:{emirate:null,crop:null,cultivation:null,category:null,product_name:null,product_reference:null,quantity:null,budget_aed:null,symptoms:[],decision_criteria:[]},reference:{requires_context:false,target:'none',resolved_text:null,confidence:0},ambiguity:{required:false,missing_information:null,question:null},response_plan:{mode:'social',external_facts_required:false,answer_order:['identity'],max_questions:0,tone:'natural'},compound:false,safe_direct_reply:'أنا MIG FARM AI، مساعدك للمنتجات والزراعة وخدمات MIG FARM.',meaning_summary:'identity',confidence:.99};}
const originalFetch=global.fetch;let meaningCalls=0,answerCalls=0;
global.fetch=async (url,options={})=>{assert.match(String(url),/api\.openai\.com\/v1\/responses/);const body=JSON.parse(options.body||'{}');if(body.text?.format?.name==='mig_farm_meaning_v31'){meaningCalls++;return response(JSON.stringify(meaning()),'meaning-v41');}answerCalls++;return response('أنا MIG FARM AI، مساعد ذكي لمتجر MIG FARM وبفهم طلبك من سياق المحادثة.','answer-v41');};
try{
  const {POST}=await import('../api/chat.js');
  const req=new Request('https://backend.example/api/chat',{method:'POST',headers:{'content-type':'application/json','origin':'https://edu-mig-for-agriculture.odoo.com','x-ai-debug-token':'v41-debug-test'},body:JSON.stringify({session_id:'v41-provider-api',locale:'ar',message:'بغض النظر عن الكلام اللي فات، مين اللي بيرد عليا دلوقتي؟',history:[{role:'assistant',content:'كنا بنتكلم عن مبيد'}],conversation_state:{active_product_context:{name:'مبيد قديم'}},ai_debug:true})});
  const res=await POST(req);const data=await res.json();assert.equal(res.status,200);assert.equal(data.version,'41.0.0');assert.equal(data.mode,'final_production_closure_v41');assert.match(data.reply,/MIG FARM AI/);assert.equal(data.production_closure_v41?.response_origin,'LLM');assert.equal(data.production_closure_v41?.single_final_orchestrator,true);assert.equal(data.ai_debug?.version,'41.0.0');assert.ok(meaningCalls>=1);assert.ok(answerCalls>=1);assert.equal(/التحليل الذكي غير متاح|خدمة الفهم الذكي متوقفة/i.test(data.reply),false);
  console.log('V41 provider-backed API PASS');
}finally{global.fetch=originalFetch;}
