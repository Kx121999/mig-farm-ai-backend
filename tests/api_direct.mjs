import assert from 'node:assert/strict';
import { POST } from '../api/chat.js';

async function ask(message,state={},history=[]){
  const req=new Request('https://mig-farm-ai-backend.vercel.app/api/chat',{
    method:'POST',
    headers:{'content-type':'application/json','origin':'https://edu-mig-for-agriculture.odoo.com'},
    body:JSON.stringify({message,session_id:'test-v7',locale:'ar',history,conversation_state:state,page_url:'https://edu-mig-for-agriculture.odoo.com/',page_title:'Home'})
  });
  const res=await POST(req); const data=await res.json();
  assert.equal(res.status,200);
  return data;
}

let r=await ask('هلا');
assert.equal(r.version,'12.0.0');
assert.equal(r.mode,'persistent_cognitive_os_neural_agent_v12');
assert.equal(r.hybrid_brain?.engine,'hybrid_brain_v10');
assert.match(r.reply,/حياك|هلا|مرحبا/);

r=await ask('شو يعني F1؟');
assert.match(r.reply,/هجين|الجيل الأول/);

r=await ask('عندكم شحن للعين؟');
assert.match(r.reply,/13/);
assert.equal(r.conversation_state.emirate,'العين');

r=await ask('عندي مزرعة 2000 متر في العين وعايز بيت محمي');
assert.equal(r.customer_profile.project_type,'farm');
assert.match(r.customer_profile.area,/2000/);
assert.match(r.reply,/المحصول|الاستخدام/);
const state1=r.conversation_state;

r=await ask('طماطم',state1,[{role:'user',content:'عندي مزرعة 2000 متر في العين وعايز بيت محمي'},{role:'assistant',content:r.reply}]);
assert.equal(r.customer_profile.crop,'tomato');

console.log('MIG FARM V12 direct API tests passed');
