import assert from "node:assert/strict";
import { GET } from "../api/health.js";
import { POST } from "../api/chat.js";

delete process.env.OPENAI_API_KEY;
const h=await (await GET()).json();
assert.ok(["20.0.0","21.0.0","22.0.0","22.1.0","22.2.0","22.3.0"].includes(h.version));
assert.ok(["product_intelligence_human_sales_employee_v20","live_product_truth_sales_action_os_v21","multimodal_agricultural_product_vision_sales_os_v22","multimodal_agricultural_product_vision_stability_os_v22_1","multimodal_visual_intent_product_precision_os_v22_2","multimodal_visual_recognition_pipeline_os_v22_3"].includes(h.mode));
assert.ok(["20.0","22.1","22.2","22.3"].includes(h.product_intelligence?.version));
assert.equal(h.product_intelligence?.products,704);
assert.equal(h.product_intelligence?.descriptions,704);
assert.ok(h.product_intelligence?.total_megabytes>=7);
assert.ok(["20.0","21.0","22.0","22.1","22.2","22.3"].includes(h.neural_brain?.version));
assert.ok(h.neural_brain?.tools.includes("search_product_dossiers"));
assert.ok(h.neural_brain?.tools.includes("get_product_dossier"));
assert.ok(h.neural_brain?.tools.includes("compare_product_dossiers"));

async function ask(message,state={},history=[]){
  const req=new Request("https://mig-farm-ai-backend.vercel.app/api/chat",{method:"POST",headers:{"content-type":"application/json","origin":"https://edu-mig-for-agriculture.odoo.com"},body:JSON.stringify({message,session_id:"v20-api-regression",locale:"ar",history,conversation_state:state,page_url:"https://edu-mig-for-agriculture.odoo.com/",page_title:"Home"})});
  const res=await POST(req);const data=await res.json();assert.equal(res.status,200);return data;
}
const r=await ask("لا يا عم أنا بس بسأل مش هشتري دلوقتي",{category:"fertilizer",crop:"tomato",turn:3},[{role:"user",content:"عايز سماد"},{role:"assistant",content:"تمام"}]);
assert.ok(["20.0.0","21.0.0","22.0.0","22.1.0","22.2.0","22.3.0"].includes(r.version));
assert.ok(["product_intelligence_human_sales_employee_v20","live_product_truth_sales_action_os_v21","multimodal_agricultural_product_vision_sales_os_v22","multimodal_agricultural_product_vision_stability_os_v22_1","multimodal_visual_intent_product_precision_os_v22_2","multimodal_visual_recognition_pipeline_os_v22_3"].includes(r.mode));
assert.doesNotMatch(r.reply,/اطلب|اشتري|واتساب/);
assert.equal(r.runtime?.product_intelligence?.products,704);
console.log("V20 API regression PASS");
