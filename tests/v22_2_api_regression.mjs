import assert from "node:assert/strict";
import { GET } from "../api/health.js";
import { POST } from "../api/chat.js";

delete process.env.OPENAI_API_KEY;
const h=await (await GET()).json();
assert.equal(h.version,"22.3.0");
assert.equal(h.mode,"multimodal_visual_recognition_pipeline_os_v22_3");
assert.equal(h.vision_intelligence?.version,"22.3");
assert.equal(h.human_conversation_brain?.version,"22.3");
assert.equal(h.conversion_decision_brain?.version,"22.3");
assert.equal(h.sales_employee?.version,"22.3");
assert.equal(h.sales_conversation_os?.version,"22.3");
assert.equal(h.neural_brain?.version,"22.3");
assert.ok(h.neural_brain?.tools.includes("plan_visual_product_action"));
assert.ok(h.features.includes("visual_availability_precision"));
assert.ok(h.features.includes("visual_guidance_actions"));

const origin="https://edu-mig-for-agriculture.odoo.com";
const req=new Request("https://mig-farm-ai-backend.vercel.app/api/chat",{method:"POST",headers:{"content-type":"application/json","origin":origin},body:JSON.stringify({message:"هل متوفر",images:[{image_url:"data:image/jpeg;base64,AAAA",detail:"high"}],session_id:"v22-2-availability",locale:"ar",history:[],conversation_state:{},page_url:"https://edu-mig-for-agriculture.odoo.com/",page_title:"Home"})});
const res=await POST(req);const r=await res.json();
assert.equal(res.status,200);
assert.equal(r.version,"22.3.0");
assert.equal(r.source,"v22_3_visual_recognition_safe_fallback");
assert.equal(r.vision?.visual_intent,"availability");
assert.equal(r.vision?.mode,"product_or_label");
assert.equal(r.vision?.requires_live_product_truth,true);
assert.match(String(r.reply),/التوفر/);
assert.match(String(r.reply),/اسم المنتج|الباركود/);
assert.ok(Array.isArray(r.visual_guidance?.actions));
assert.equal(r.visual_guidance?.next_action,"recognize_product_before_identity_guard");
assert.equal(r.visual_guidance.actions.length,0);
assert.equal(r.conversation_state?.active_visual_context?.last_visual_intent,"availability");

const req2=new Request("https://mig-farm-ai-backend.vercel.app/api/chat",{method:"POST",headers:{"content-type":"application/json","origin":origin},body:JSON.stringify({message:"بكام؟",images:[],session_id:"v22-2-availability",locale:"ar",history:[{role:"user",content:"هل متوفر"},{role:"assistant",content:r.reply}],conversation_state:r.conversation_state,page_url:"https://edu-mig-for-agriculture.odoo.com/",page_title:"Home"})});
const res2=await POST(req2);const r2=await res2.json();
assert.equal(res2.status,200);
assert.equal(r2.vision?.visual_intent,"price");
assert.equal(r2.human_conversation?.mode,"visual_followup");
assert.match(String(r2.reply),/السعر الحالي/);
assert.doesNotMatch(String(r2.reply),/الجزء اللي تقصده/);

console.log("V22.2 API regression PASS");
