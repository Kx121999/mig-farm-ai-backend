import assert from "node:assert/strict";
import { GET } from "../api/health.js";
import { POST } from "../api/chat.js";

const h=await (await GET()).json();
assert.equal(h.ok,true);
assert.equal(h.version,"23.0.0");
assert.equal(h.mode,"server_authoritative_product_context_intelligence_os_v23");
assert.equal(h.vision_intelligence?.version,"22.5");
assert.equal(h.vision_intelligence?.recognition_before_identity_guard,true);
assert.equal(h.vision_intelligence?.forced_product_recognition_preflight,true);
assert.equal(h.vision_intelligence?.retake_loop_guard,true);
assert.equal(h.human_conversation_brain?.version,"22.5");
assert.equal(h.conversion_decision_brain?.version,"22.5");
assert.equal(h.sales_employee?.version,"22.5");
assert.equal(h.sales_conversation_os?.version,"22.5");
assert.equal(h.neural_brain?.version,"22.5");
assert.ok(h.features.includes("recognition_before_identity_guard"));
assert.ok(h.neural_brain.tools.includes("match_visual_product"));

const oldKey=process.env.OPENAI_API_KEY;delete process.env.OPENAI_API_KEY;
try{
  const req=new Request("https://mig-farm-ai-backend.vercel.app/api/chat",{method:"POST",headers:{"content-type":"application/json","origin":"https://www.migfarm.com"},body:JSON.stringify({message:"هل متوفر؟",session_id:"v223-api",locale:"ar",history:[],conversation_state:{},images:[{type:"input_image",image_url:"data:image/jpeg;base64,AAAA",detail:"high",client_image_id:"img-api"}],visual_context_reused:false})});
  const r=await (await POST(req)).json();
  assert.equal(r.version,"23.0.0");
  assert.equal(r.mode,"server_authoritative_product_context_intelligence_os_v23");
  assert.equal(r.runtime?.vision_intelligence?.version,"22.5");
  assert.equal(r.vision?.requires_recognition_preflight,true);
  assert.ok(["v22_5_visual_recognition_safe_fallback","neural_multimodal_visual_recognition_sales_v22_5"].includes(r.source));
  assert.doesNotMatch(String(r.reply||""),/منتج ولا شحن ولا فرع/);
} finally {if(oldKey!==undefined) process.env.OPENAI_API_KEY=oldKey;}
console.log("V22.5 API regression PASS");
