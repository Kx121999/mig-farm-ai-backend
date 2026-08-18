import assert from "node:assert/strict";
import { buildVisionFrame, updateActiveVisualContext, visualContextFallback, visionHealth, isVisualFollowup, isImplicitVisualTopicSwitch } from "../lib/vision_intelligence.js";
import { analyzeHumanConversationTurn } from "../lib/human_conversation_brain.js";
import { sanitizeState } from "../lib/dialogue.js";
import { POST } from "../api/chat.js";
import { readFileSync } from "node:fs";

assert.equal(visionHealth().version,"22.5");

const img=[{type:"input_image",image_url:"data:image/jpeg;base64,AAAA",detail:"high"}];
const fresh=buildVisionFrame("إيه ده؟",img,{});
assert.equal(fresh.has_fresh_images,true);
assert.equal(fresh.has_visual_context,true);

const active=updateActiveVisualContext({},fresh,{visual_matches:[{identity_confidence:"medium",candidates:[{external_id:"x",name:"TEST PRODUCT",sku:"SKU1",score:120,match_basis:"visual_text_signature"}]}]},3);
assert.equal(active.active,true);
assert.equal(active.product_candidates[0].name,"TEST PRODUCT");

const persisted=sanitizeState({v:22.5,turn:3,active_visual_context:active});
assert.equal(persisted.v,22.5);
assert.equal(persisted.active_visual_context?.active,true);
assert.equal(persisted.active_visual_context?.product_candidates?.[0]?.sku,"SKU1");

const follow=buildVisionFrame("ركز واقرأ اللي عليها",[],{...persisted.active_visual_context,current_turn:4});
assert.equal(follow.visual_followup,true);
assert.equal(follow.has_visual_context,true);
assert.equal(follow.has_images,false);
const human=analyzeHumanConversationTurn("ركز",{analysis:{intent:"unknown"},state:persisted,visionContext:follow});
assert.equal(human.mode,"visual_followup");
assert.equal(human.tool_policy.mode,"vision_priority");
assert.ok(human.tool_policy.allowed.includes("match_visual_product"));

const fallback=visualContextFallback({frame:follow,activeContext:persisted.active_visual_context});
assert.match(fallback,/الملصق|اسم المنتج|الباركود|TEST PRODUCT/);
assert.doesNotMatch(fallback,/منتج.*شحن.*فرع.*خدمة/);

const cancelledFrame=buildVisionFrame("سيبك من الصورة غير الموضوع",[],{...persisted.active_visual_context,current_turn:4});
assert.equal(cancelledFrame.clear_active_context,true);
assert.equal(updateActiveVisualContext(persisted.active_visual_context,cancelledFrame,{},4),null);

// A real new topic must supersede an old image even if the wording contains "موجود/بكام".
const newTopicMessage="عندكم بذور طماطم وبكام؟";
assert.equal(isImplicitVisualTopicSwitch(newTopicMessage,{...persisted.active_visual_context,current_turn:4}),true);
assert.equal(isVisualFollowup(newTopicMessage,{...persisted.active_visual_context,current_turn:4}),false);
const switchedFrame=buildVisionFrame(newTopicMessage,[],{...persisted.active_visual_context,current_turn:4});
assert.equal(switchedFrame.has_visual_context,false);
assert.equal(switchedFrame.implicit_topic_switch,true);
assert.equal(switchedFrame.clear_active_context,true);
assert.equal(updateActiveVisualContext(persisted.active_visual_context,switchedFrame,{},4),null);

// Explicit reference keeps the image even when a crop word appears.
const explicitVisual="المنتج ده ينفع للطماطم؟";
assert.equal(isVisualFollowup(explicitVisual,{...persisted.active_visual_context,current_turn:4}),true);

// API regression: image-only turn must create active visual state; "ركز" must stay on visual route even without resending image.
delete process.env.OPENAI_API_KEY;
const origin="https://edu-mig-for-agriculture.odoo.com";
const req1=new Request("https://mig-farm-ai-backend.vercel.app/api/chat",{method:"POST",headers:{"content-type":"application/json","origin":origin},body:JSON.stringify({message:"",images:[{image_url:"data:image/jpeg;base64,AAAA",detail:"high"}],session_id:"v22-1-visual-context",locale:"ar",history:[],conversation_state:{},page_url:"https://edu-mig-for-agriculture.odoo.com/",page_title:"Home"})});
const res1=await POST(req1);const r1=await res1.json();
assert.equal(res1.status,200);
assert.equal(r1.version,"23.0.0");
assert.equal(r1.source,"v22_5_visual_recognition_safe_fallback");
assert.equal(r1.conversation_state?.active_visual_context?.active,true);

const req2=new Request("https://mig-farm-ai-backend.vercel.app/api/chat",{method:"POST",headers:{"content-type":"application/json","origin":origin},body:JSON.stringify({message:"ركز",images:[],session_id:"v22-1-visual-context",locale:"ar",history:[{role:"user",content:"[صورة مرفقة]"},{role:"assistant",content:r1.reply}],conversation_state:r1.conversation_state,page_url:"https://edu-mig-for-agriculture.odoo.com/",page_title:"Home"})});
const res2=await POST(req2);const r2=await res2.json();
assert.equal(res2.status,200);
assert.equal(r2.source,"v22_5_visual_recognition_safe_fallback");
assert.equal(r2.human_conversation?.mode,"visual_followup");
assert.doesNotMatch(String(r2.reply),/منتج\s*[،,]?\s*شحن\s*[،,]?\s*فرع\s*[،,]?\s*خدمة/);

// Product-fact reliability regression: the formerly generic generated hose copy must not become fake Pressure/Size facts.
const facts=JSON.parse(readFileSync(new URL("../knowledge/MIG_FARM_PRODUCT_FACT_INDEX_V21.json",import.meta.url),"utf8"));
assert.equal(facts.version,"22.1");
const generated=facts.products.find(x=>x.external_id==="__export__.product_template_1417_0be34083");
assert.equal(generated.description_reliability,"generated_catalog_copy_not_technical_spec");
assert.equal(generated.explicit_facts.some(x=>x.kind==="labelled_fact"&&/Pressure|Size|المقاس/.test(String(x.label||""))),false);

const ui=readFileSync(new URL("../ODOO_CHAT_UI_V22_3_VISUAL_RECOGNITION_PIPELINE.txt",import.meta.url),"utf8");
assert.match(ui,/UI_VERSION='22\.5\.0'/);
assert.match(ui,/activeImages/);
assert.match(ui,/visual_context_reused/);
assert.match(ui,/isVisualFollowupMessage/);
assert.match(ui,/isNewTopicAwayFromImage/);
assert.match(ui,/hasDirectVisualReference/);

console.log("V22.1 visual context & reliability regression PASS");
