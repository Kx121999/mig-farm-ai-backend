import assert from 'node:assert/strict';
process.env.AI_PIPELINE_V41='true';
process.env.AI_PIPELINE_V40='true';
process.env.AI_PIPELINE_V33='true';
process.env.UNIFIED_SEMANTIC_V33_ENABLED='true';
process.env.LLM_FIRST_V31_ENABLED='true';
process.env.MIG_ENTERPRISE_RETRIEVAL_ENABLED='false';
process.env.ODOO_ACTIONS_ENABLED='false';
delete process.env.OPENAI_API_KEY;
const {POST}=await import('../api/chat.js');
const {GET}=await import('../api/health.js');
const banned=/التحليل الذكي غير متاح|خدمة الفهم الذكي متوقفة|intelligence service is temporarily unavailable/i;
const cases=['انتا مين','كيفك','ممكن تساعدني','أنا تايه ومش عارف أبدأ منين','شكرا'];
for(let i=0;i<cases.length;i++){
  const req=new Request('https://backend.example/api/chat',{method:'POST',headers:{'content-type':'application/json','origin':'https://edu-mig-for-agriculture.odoo.com'},body:JSON.stringify({session_id:`v41-e2e-${i}`,locale:'ar',message:cases[i],history:[],conversation_state:{}})});
  const res=await POST(req);const data=await res.json();assert.equal(res.status,200,cases[i]);assert.equal(data.version,'41.0.0');assert.equal(data.mode,'final_production_closure_v41');assert.ok(data.reply?.length>2);assert.equal(banned.test(data.reply),false,`${cases[i]} => ${data.reply}`);assert.equal(data.production_closure_v41?.version,'41.0.0');assert.ok(['LLM','LLM_PLUS_RAG','STRUCTURED_DATA','SEMANTIC_DEGRADED'].includes(data.production_closure_v41?.response_origin));
}
const health=await (await GET(new Request('https://backend.example/api/health'))).json();assert.equal(health.version,'41.0.0');assert.equal(health.mode,'final_production_closure_v41');assert.equal(health.production_closure_v41?.enabled,true);assert.equal(health.production_closure_v41?.universal_canned_final_response,false);
console.log(`V41 API E2E PASS ${cases.length}/${cases.length}`);
