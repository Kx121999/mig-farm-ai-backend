import assert from "node:assert/strict";
import { POST } from "../api/chat.js";

delete process.env.OPENAI_API_KEY;
async function ask(message,state={},history=[]){
  const req=new Request("https://mig-farm-ai-backend.vercel.app/api/chat",{method:"POST",headers:{"content-type":"application/json","origin":"https://edu-mig-for-agriculture.odoo.com"},body:JSON.stringify({message,session_id:"v18-screenshot-regression",locale:"ar",history,conversation_state:state,page_url:"https://edu-mig-for-agriculture.odoo.com/",page_title:"Home"})});
  const res=await POST(req);const data=await res.json();assert.equal(res.status,200);return data;
}
const stale={category:"fertilizer",crop:"tomato",topic:"product",visible_products:[{name:"سماد بوتاسيوم",price:"50",currency:"AED"}],last_products:[{name:"سماد بوتاسيوم",price:"50",currency:"AED"}],turn:4};
const history=[{role:"user",content:"عايز بذور ومش عارف أجيب إيه"},{role:"assistant",content:"تمام عندنا اختيارات"},{role:"user",content:"طب البوتاسيوم بيعمل إيه"},{role:"assistant",content:"البوتاسيوم مهم لتنظيم الماء وجودة الثمار"}];
let r=await ask("لا يا عم أنا بس بسأل مش هشتري دلوقتي",stale,history);
assert.ok(["18.0.0","19.0.0","20.0.0","21.0.0","22.0.0","22.1.0","22.2.0"].includes(r.version)); assert.ok(["current_turn_semantic_human_sales_employee_v18","conversion_decision_human_sales_employee_v19","product_intelligence_human_sales_employee_v20","live_product_truth_sales_action_os_v21","multimodal_agricultural_product_vision_sales_os_v22","multimodal_agricultural_product_vision_stability_os_v22_1","multimodal_visual_intent_product_precision_os_v22_2"].includes(r.mode));
assert.match(r.reply,/اسأل|براحتك|مش لازم/); assert.doesNotMatch(r.reply,/بوتاسيوم|كالسيوم|مغنيسيوم|نيتروجين|تسميد/);
assert.equal(r.human_conversation?.mode,"browse_only_social");

r=await ask("عامل ايه",stale,history); assert.doesNotMatch(r.reply,/بوتاسيوم|سماد|طماطم/); assert.equal(r.human_conversation?.mode,"social");
console.log("V18 screenshot semantic regression PASS");
