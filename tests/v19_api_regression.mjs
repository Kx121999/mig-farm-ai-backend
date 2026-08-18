import assert from "node:assert/strict";
import { GET } from "../api/health.js";
import { POST } from "../api/chat.js";

delete process.env.OPENAI_API_KEY;
const h=await (await GET()).json();
assert.equal(h.version,"19.0.0");
assert.equal(h.mode,"conversion_decision_human_sales_employee_v19");
assert.equal(h.conversion_decision_brain?.version,"19.0");
assert.equal(h.sales_employee?.version,"19.0");
assert.equal(h.neural_brain?.version,"19.0");
assert.ok(h.features.includes("close_timing_guard"));

async function ask(message,state={},history=[]){
  const req=new Request("https://mig-farm-ai-backend.vercel.app/api/chat",{method:"POST",headers:{"content-type":"application/json","origin":"https://edu-mig-for-agriculture.odoo.com"},body:JSON.stringify({message,session_id:"v19-api-regression",locale:"ar",history,conversation_state:state,page_url:"https://edu-mig-for-agriculture.odoo.com/",page_title:"Home"})});
  const res=await POST(req);const data=await res.json();assert.equal(res.status,200);return data;
}
const stale={category:"fertilizer",crop:"tomato",topic:"product",visible_products:[{name:"سماد بوتاسيوم",price:"50",currency:"AED"}],last_products:[{name:"سماد بوتاسيوم",price:"50",currency:"AED"}],turn:4};
const history=[{role:"user",content:"عايز بذور"},{role:"assistant",content:"تمام"},{role:"user",content:"طب البوتاسيوم بيعمل إيه"},{role:"assistant",content:"البوتاسيوم مهم للنبات"}];
let r=await ask("لا يا عم أنا بس بسأل مش هشتري دلوقتي",stale,history);
assert.equal(r.version,"19.0.0");assert.equal(r.mode,"conversion_decision_human_sales_employee_v19");
assert.match(r.reply,/اسأل|براحتك|مش لازم/);assert.doesNotMatch(r.reply,/بوتاسيوم|كالسيوم|اطلب|اشتري|واتساب/);
console.log("V19 API regression PASS");
