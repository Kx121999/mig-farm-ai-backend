import assert from "node:assert/strict";
import { GET } from "../api/health.js";
import { POST } from "../api/chat.js";

delete process.env.OPENAI_API_KEY;
const h=await (await GET()).json();
assert.ok(["19.0.0","20.0.0","21.0.0","22.0.0","22.1.0","22.2.0","22.5.0","23.0.0","24.0.0","25.0.0","26.0.0"].includes(h.version));
assert.ok(["conversion_decision_human_sales_employee_v19","product_intelligence_human_sales_employee_v20","live_product_truth_sales_action_os_v21","multimodal_agricultural_product_vision_sales_os_v22","multimodal_agricultural_product_vision_stability_os_v22_1","multimodal_visual_intent_product_precision_os_v22_2","multimodal_product_context_lock_os_v22_5","server_authoritative_product_context_intelligence_os_v23","semantic_human_conversation_orchestrator_os_v24","autonomous_sales_learning_agent_os_v25","github_knowledge_natural_conversation_os_v26"].includes(h.mode));
assert.ok(["19.0","20.0","21.0","22.1","22.2","22.5"].includes(h.conversion_decision_brain?.version));
assert.ok(["19.0","20.0","21.0","22.2","22.5"].includes(h.sales_employee?.version));
assert.ok(["19.0","20.0","21.0","22.1","22.2","22.5","24.0","25.0","26.0"].includes(h.neural_brain?.version));
assert.ok(h.features.includes("close_timing_guard"));

async function ask(message,state={},history=[]){
  const req=new Request("https://mig-farm-ai-backend.vercel.app/api/chat",{method:"POST",headers:{"content-type":"application/json","origin":"https://edu-mig-for-agriculture.odoo.com"},body:JSON.stringify({message,session_id:"v19-api-regression",locale:"ar",history,conversation_state:state,page_url:"https://edu-mig-for-agriculture.odoo.com/",page_title:"Home"})});
  const res=await POST(req);const data=await res.json();assert.equal(res.status,200);return data;
}
const stale={category:"fertilizer",crop:"tomato",topic:"product",visible_products:[{name:"سماد بوتاسيوم",price:"50",currency:"AED"}],last_products:[{name:"سماد بوتاسيوم",price:"50",currency:"AED"}],turn:4};
const history=[{role:"user",content:"عايز بذور"},{role:"assistant",content:"تمام"},{role:"user",content:"طب البوتاسيوم بيعمل إيه"},{role:"assistant",content:"البوتاسيوم مهم للنبات"}];
let r=await ask("لا يا عم أنا بس بسأل مش هشتري دلوقتي",stale,history);
assert.ok(["19.0.0","20.0.0","21.0.0","22.0.0","22.1.0","22.2.0","22.5.0","23.0.0","24.0.0","25.0.0","26.0.0"].includes(r.version));assert.ok(["conversion_decision_human_sales_employee_v19","product_intelligence_human_sales_employee_v20","live_product_truth_sales_action_os_v21","multimodal_agricultural_product_vision_sales_os_v22","multimodal_visual_intent_product_precision_os_v22_2","multimodal_product_context_lock_os_v22_5","server_authoritative_product_context_intelligence_os_v23","semantic_human_conversation_orchestrator_os_v24","autonomous_sales_learning_agent_os_v25","github_knowledge_natural_conversation_os_v26"].includes(r.mode));
assert.match(r.reply,/اسأل|براحتك|مش لازم/);assert.doesNotMatch(r.reply,/بوتاسيوم|كالسيوم|اطلب|اشتري|واتساب/);
console.log("V19 API regression PASS");
