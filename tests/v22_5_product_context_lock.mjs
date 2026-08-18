import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GET } from '../api/health.js';
import { POST } from '../api/chat.js';

const h=await (await GET()).json();
assert.equal(h.version,'25.0.0');
assert.equal(h.mode,'autonomous_sales_learning_agent_os_v25');
for(const f of ['product_context_lock','product_card_bound_actions','generic_product_detail_agronomy_guard','selected_product_context_transport','per_product_details_button']) assert.ok(h.features.includes(f),f);

const oldKey=process.env.OPENAI_API_KEY; delete process.env.OPENAI_API_KEY;
try{
  const unboundReq=new Request('https://mig-farm-ai-backend.vercel.app/api/chat',{method:'POST',headers:{'content-type':'application/json','origin':'https://edu-mig-for-agriculture.odoo.com'},body:JSON.stringify({message:'تفاصيل المنتج واستخدامه',session_id:'v225-unbound',locale:'ar',history:[],conversation_state:{}})});
  const unbound=await (await POST(unboundReq)).json();
  assert.equal(unbound.source,'v23_unbound_product_context_guard');
  assert.doesNotMatch(String(unbound.reply||''),/المن يتجمع|ندوة عسلية|جلود انسلاخ/);
  assert.match(String(unbound.reply||''),/اسم المنتج|زر.*التفاصيل/);

  const boundReq=new Request('https://mig-farm-ai-backend.vercel.app/api/chat',{method:'POST',headers:{'content-type':'application/json','origin':'https://edu-mig-for-agriculture.odoo.com'},body:JSON.stringify({message:'تفاصيل المنتج واستخدامه',session_id:'v225-bound',locale:'ar',history:[],conversation_state:{},selected_product_context:{name:'خيار جبارة f1 (CUCUMBER JABAARA F1)',sku:'287F1'}})});
  const bound=await (await POST(boundReq)).json();
  assert.equal(bound.source,'v23_bound_product_dossier');
  assert.equal(bound.product_context_lock,true);
  assert.equal(bound.bound_product?.sku,'287F1');
  assert.match(String(bound.reply||''),/خيار جبارة/);
  assert.match(String(bound.reply||''),/الاستخدام والوصف|المهم بسرعة|الوصف المسجل|المواصفات المؤكدة/);
  assert.doesNotMatch(String(bound.reply||''),/المن يتجمع|ندوة عسلية|جلود انسلاخ/);
} finally { if(oldKey!==undefined) process.env.OPENAI_API_KEY=oldKey; }

const ui=readFileSync(new URL('../ODOO_CHAT_UI_V22_5_PRODUCT_CONTEXT_LOCK_FINAL.txt',import.meta.url),'utf8');
assert.match(ui,/UI_VERSION='22\.5\.0'/);
assert.match(ui,/mig_ai_session_id_v22_5/);
assert.match(ui,/mig_ai_conversation_state_v22_5/);
assert.match(ui,/selected_product_context:activeChatProduct/);
assert.match(ui,/mig-ai-product-detail-btn/);
assert.match(ui,/isGenericProductDetailLabel\(label\)&&lastResultItems\.length>1/);
assert.match(ui,/sendText\(locale\(\)==='en'\?'Product details and use':'تفاصيل المنتج واستخدامه',\{productRef:p\}\)/);
console.log('V22.5 product context lock PASS');
