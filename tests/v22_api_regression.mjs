import assert from "node:assert/strict";
import { GET } from "../api/health.js";
import { POST } from "../api/chat.js";

delete process.env.OPENAI_API_KEY;
const h=await (await GET()).json();
assert.equal(h.version,"31.0.0");
assert.equal(h.mode,"llm_first_semantic_orchestrator_v31");
assert.equal(h.vision_intelligence?.version,"22.5");
assert.equal(h.vision_intelligence?.product_visual_signatures,704);
assert.equal(h.vision_intelligence?.visual_agronomy_cards,540);
assert.equal(h.neural_brain?.version,"27.0");
for(const tool of ["match_visual_product","verify_visual_product_live","guard_visual_label_claim","search_visual_agronomy","get_retake_advice","plan_visual_product_action"]) assert.ok(h.neural_brain?.tools.includes(tool),tool);

// Image-only input is accepted by the API contract. With no neural provider, legacy safe fallback still returns a valid V22 response.
const req=new Request("https://mig-farm-ai-backend.vercel.app/api/chat",{method:"POST",headers:{"content-type":"application/json","origin":"https://edu-mig-for-agriculture.odoo.com"},body:JSON.stringify({message:"",images:[{image_url:"data:image/jpeg;base64,AAAA",detail:"high"}],session_id:"v22-image-api",locale:"ar",history:[],conversation_state:{},page_url:"https://edu-mig-for-agriculture.odoo.com/",page_title:"Home"})});
const res=await POST(req);const r=await res.json();
assert.equal(res.status,200);
assert.equal(r.version,"31.0.0");
assert.equal(r.mode,"llm_first_semantic_orchestrator_v31");
assert.equal(r.runtime?.vision_intelligence?.version,"22.5");
console.log("V22 API regression PASS");
