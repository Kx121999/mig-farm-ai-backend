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
assert.ok(['15.0.0','16.0.0','17.0.0','18.0.0','19.0.0','20.0.0','21.0.0','22.0.0','22.1.0','22.2.0'].includes(r.version));
assert.ok(['agricultural_engineer_uae_intelligence_autonomous_commerce_v15','adaptive_human_agricultural_sales_employee_v16','adaptive_human_sales_conversation_os_v17','current_turn_semantic_human_sales_employee_v18','conversion_decision_human_sales_employee_v19','product_intelligence_human_sales_employee_v20','live_product_truth_sales_action_os_v21','multimodal_agricultural_product_vision_sales_os_v22','multimodal_agricultural_product_vision_stability_os_v22_1','multimodal_visual_intent_product_precision_os_v22_2'].includes(r.mode));
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

console.log('MIG FARM V15 direct API tests passed');
