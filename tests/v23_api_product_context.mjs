import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { GET } from "../api/health.js";
import { POST } from "../api/chat.js";

const origin="https://edu-mig-for-agriculture.odoo.com";
const jabara={name:"خيار جبارة f1 (CUCUMBER JABAARA F1)",sku:"287F1"};
const wafra={name:"خيار وفرة F1 ( CUCUMBER F1)",sku:"5041F1"};
async function ask(body){
  const req=new Request("https://mig-farm-ai-backend.vercel.app/api/chat",{method:"POST",headers:{"content-type":"application/json","origin":origin},body:JSON.stringify({locale:"ar",history:[],conversation_state:{},...body})});
  return await (await POST(req)).json();
}

const health=await (await GET()).json();
assert.equal(health.version,"23.0.0");
assert.equal(health.mode,"server_authoritative_product_context_intelligence_os_v23");
for(const feature of ["server_authoritative_active_product_memory","same_category_product_switch_detection","multi_product_comparison_context","dosage_evidence_guard","suitability_evidence_guard"])assert.ok(health.features.includes(feature),feature);

const oldKey=process.env.OPENAI_API_KEY;delete process.env.OPENAI_API_KEY;
try{
  const first=await ask({message:"تفاصيل المنتج واستخدامه",session_id:"v23-bind",selected_product_context:jabara});
  assert.equal(first.source,"v23_bound_product_dossier");
  assert.equal(first.product_context_lock,true);
  assert.equal(first.conversation_state?.active_product_context?.product?.sku,"287F1");
  assert.equal(first.product_context_intelligence?.active,true);

  const follow=await ask({message:"استخدامه؟",session_id:"v23-bind",conversation_state:first.conversation_state,history:[{role:"user",content:"تفاصيل المنتج واستخدامه"},{role:"assistant",content:first.reply}]});
  assert.equal(follow.source,"v23_bound_product_dossier");
  assert.equal(follow.product_context_reason,"persisted_active_product");
  assert.equal(follow.bound_product?.sku,"287F1");

  const suitability=await ask({message:"هل ينفع للطماطم؟",session_id:"v23-bind",conversation_state:follow.conversation_state});
  assert.ok(["v23_bound_product_verified_suitability","v23_bound_product_suitability_guard"].includes(suitability.source));
  assert.equal(suitability.bound_product?.sku,"287F1");

  const unbound=await ask({message:"تفاصيل المنتج واستخدامه",session_id:"v23-unbound"});
  assert.equal(unbound.source,"v23_unbound_product_context_guard");
  assert.doesNotMatch(String(unbound.reply||""),/المن يتجمع|ندوة عسلية|جلود انسلاخ/);

  const comparison=await ask({message:"قارن المنتجين",session_id:"v23-compare",selected_product_contexts:[jabara,wafra]});
  assert.equal(comparison.source,"v23_bound_product_comparison");
  assert.equal(comparison.comparison_context_lock,true);
  assert.deepEqual(comparison.bound_products.map(x=>x.sku),["287F1","5041F1"]);
  assert.equal(comparison.conversation_state?.comparison_context?.products?.length,2);
  assert.match(comparison.reply,/مقارنة موثقة/);
}finally{if(oldKey!==undefined)process.env.OPENAI_API_KEY=oldKey;}

const ui=readFileSync(new URL("../ODOO_CHAT_UI_V23_CONTEXT_INTELLIGENCE_OS.txt",import.meta.url),"utf8");
for(const marker of ["UI_VERSION='23.0.0'","mig_ai_session_id_v23","selected_product_contexts:selectedComparisonProducts","comparisonSelection","active_product_context"] )assert.match(ui,new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")));
console.log("V23 API product context persistence & comparison PASS");
