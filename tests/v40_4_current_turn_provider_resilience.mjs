import assert from 'node:assert/strict';

process.env.AI_PIPELINE_V40='true';
process.env.AI_PIPELINE_V33='true';
process.env.UNIFIED_SEMANTIC_V33_ENABLED='true';
process.env.LLM_FIRST_V31_ENABLED='true';
process.env.NEURAL_AGENT_MODE='adaptive';
process.env.MIG_V27_KNOWLEDGE_TRANSPORT='local';
process.env.MIG_ENTERPRISE_RETRIEVAL_ENABLED='false';
process.env.ODOO_ACTIONS_ENABLED='false';
const oldKey=process.env.OPENAI_API_KEY;
delete process.env.OPENAI_API_KEY;

const {POST}=await import('../api/chat.js');
const cases=[
  {message:'كيفك',must:/.{3,}/},
  {message:'شلونك',must:/.{3,}/},
  {message:'عامل ايه',must:/.{3,}/},
  {message:'انتا مين',must:/MIG FARM AI|مساعد ذكي/},
  {message:'مين انتا',must:/MIG FARM AI|مساعد ذكي/},
  {message:'منو انت',must:/MIG FARM AI|مساعد ذكي/},
  {message:'شكرا',must:/.{3,}/}
];
for(let i=0;i<cases.length;i++){
  const item=cases[i];
  const req=new Request('https://backend.example/api/chat',{
    method:'POST',headers:{'content-type':'application/json','origin':'https://edu-mig-for-agriculture.odoo.com'},
    body:JSON.stringify({session_id:`v404-social-${i}`,locale:'ar',message:item.message,history:[],conversation_state:{}})
  });
  const res=await POST(req);assert.equal(res.status,200,item.message);const data=await res.json();
  assert.ok(data.reply,item.message);
  assert.equal(/التحليل الذكي غير متاح|خدمة الفهم الذكي متوقفة|intelligence service is temporarily unavailable/i.test(data.reply),false,`${item.message}: ${data.reply}`);
  assert.match(data.reply,item.must,`${item.message}: ${data.reply}`);
  assert.match(String(data.source||''),/provider_resilience|unified/i,`${item.message}: source=${data.source}`);
}
if(oldKey)process.env.OPENAI_API_KEY=oldKey;
console.log(`V40.4 current-turn provider resilience PASS ${cases.length}/${cases.length}`);
