import assert from "node:assert/strict";
import { GET } from "../api/health.js";
import { POST } from "../api/chat.js";

delete process.env.OPENAI_API_KEY;
const h=await (await GET()).json();
assert.ok(["21.0.0","22.0.0"].includes(h.version));
assert.ok(["live_product_truth_sales_action_os_v21","multimodal_agricultural_product_vision_sales_os_v22"].includes(h.mode));
assert.equal(h.product_truth_os?.version,"21.0");
assert.equal(h.product_truth_os?.products,704);
assert.ok(h.product_truth_os?.graph_edges>10000);
assert.ok(h.product_truth_os?.explicit_facts>900);
assert.equal(h.sales_employee?.version,"21.0");
assert.equal(h.sales_conversation_os?.version,"21.0");
assert.equal(h.conversion_decision_brain?.version,"21.0");
assert.ok(["21.0","22.0"].includes(h.neural_brain?.version));
for(const tool of ["verify_live_product_truth","get_product_relations","find_verified_alternatives","build_verified_bundle","prepare_quote_draft"]) assert.ok(h.neural_brain?.tools.includes(tool),tool);

const req=new Request("https://mig-farm-ai-backend.vercel.app/api/chat",{method:"POST",headers:{"content-type":"application/json","origin":"https://edu-mig-for-agriculture.odoo.com"},body:JSON.stringify({message:"لا يا عم أنا بس بسأل مش هشتري دلوقتي",session_id:"v21-api-regression",locale:"ar",history:[{role:"user",content:"عايز سماد"},{role:"assistant",content:"تمام"}],conversation_state:{category:"fertilizer",crop:"tomato",turn:3},page_url:"https://edu-mig-for-agriculture.odoo.com/",page_title:"Home"})});
const res=await POST(req);const r=await res.json();assert.equal(res.status,200);
assert.ok(["21.0.0","22.0.0"].includes(r.version));
assert.ok(["live_product_truth_sales_action_os_v21","multimodal_agricultural_product_vision_sales_os_v22"].includes(r.mode));
assert.equal(r.runtime?.product_truth_os?.version,"21.0");
assert.doesNotMatch(r.reply,/اطلب|اشتري|واتساب/);
console.log("V21 API regression PASS");
