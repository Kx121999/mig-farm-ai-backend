import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildVisionFrame, buildRetakeAdvice, planVisualProductAction, buildVisualGuidance,
  updateActiveVisualContext, enforceVisualReplySafety, visionHealth
} from "../lib/vision_intelligence.js";
import { analyzeHumanConversationTurn } from "../lib/human_conversation_brain.js";
import { sanitizeState } from "../lib/dialogue.js";

const img=[{type:"input_image",image_url:"data:image/jpeg;base64,AAAA",detail:"high"}];
const vh=visionHealth();
assert.equal(vh.version,"22.2");
assert.equal(vh.visual_intent_contract,true);
assert.equal(vh.intent_aware_retake,true);
assert.equal(vh.availability_price_identity_gate,true);
assert.equal(vh.deterministic_visual_next_action,true);

const availability=buildVisionFrame("هل متوفر؟",img,{});
assert.equal(availability.visual_intent,"availability");
assert.equal(availability.mode,"product_or_label");
assert.equal(availability.requires_live_product_truth,true);
assert.equal(availability.retake_target,"product_name_or_sku_barcode");
const availabilityRetake=buildRetakeAdvice(availability,{});
assert.match(availabilityRetake.ask_one,/التوفر/);
assert.match(availabilityRetake.ask_one,/Odoo/);
assert.match(availabilityRetake.ask_one,/اسم المنتج/);
assert.match(availabilityRetake.ask_one,/الباركود/);
assert.doesNotMatch(availabilityRetake.ask_one,/الجزء اللي تقصده/);
assert.equal(availabilityRetake.actions.some(x=>x.type==="camera"&&x.target==="barcode"),true);

const price=buildVisionFrame("بكام؟",img,{});
assert.equal(price.visual_intent,"price");
assert.equal(price.requires_live_product_truth,true);
assert.match(buildRetakeAdvice(price,{}).ask_one,/السعر الحالي/);

const identity=buildVisionFrame("إيه ده؟",img,{});
assert.equal(identity.visual_intent,"identity");
assert.equal(identity.mode,"product_or_label");
assert.match(buildRetakeAdvice(identity,{}).ask_one,/اسم المنتج/);

const dosage=buildVisionFrame("الجرعة كام من الملصق؟",img,{});
assert.equal(dosage.visual_intent,"dosage");
assert.equal(dosage.mode,"regulated_label_high_risk");
assert.match(buildRetakeAdvice(dosage,{}).ask_one,/الأرقام والوحدات/);

const low=planVisualProductAction({intent:"availability",identity_confidence:"low",candidate_name:"TEST",candidate_sku:"",live_verified:false,mode:"product_or_label"});
assert.equal(low.next_action,"request_product_identity_evidence");
const readyToVerify=planVisualProductAction({intent:"availability",identity_confidence:"high",candidate_name:"TEST",candidate_sku:"SKU1",live_verified:false,mode:"product_or_label"});
assert.equal(readyToVerify.next_action,"verify_exact_product_live");
assert.equal(readyToVerify.identifier,"SKU1");
const answerLive=planVisualProductAction({intent:"availability",identity_confidence:"high",candidate_name:"TEST",candidate_sku:"SKU1",live_verified:true,mode:"product_or_label"});
assert.equal(answerLive.next_action,"answer_availability_from_live_truth");

const active=updateActiveVisualContext({},availability,{visual_matches:[{identity_confidence:"medium",candidates:[{external_id:"x",name:"TEST",sku:"SKU1",score:130}]}]},2);
assert.equal(active.last_visual_intent,"availability");
assert.equal(active.last_retake_target,"product_name_or_sku_barcode");
const persisted=sanitizeState({v:22.2,turn:2,active_visual_context:active});
assert.equal(persisted.active_visual_context.last_visual_intent,"availability");
assert.equal(persisted.active_visual_context.last_retake_target,"product_name_or_sku_barcode");

const follow=buildVisionFrame("بكام؟",[],{...persisted.active_visual_context,current_turn:3});
assert.equal(follow.visual_followup,true);
assert.equal(follow.visual_intent,"price");
const human=analyzeHumanConversationTurn("بكام؟",{analysis:{intent:"unknown"},state:persisted,visionContext:follow});
assert.equal(human.mode,"visual_followup");
assert.ok(human.tool_policy.allowed.includes("plan_visual_product_action"));

const guidance=buildVisualGuidance({frame:availability,activeContext:{},audit:{}});
assert.equal(guidance.intent,"availability");
assert.equal(guidance.next_action,"request_product_identity_evidence");
assert.ok(guidance.actions.length>=2);
assert.match(guidance.retake.ask_one,/التوفر/);

const unsafe=enforceVisualReplySafety({reply:"أيوه متوفر",frame:availability,trace:[],audit:{}});
assert.equal(unsafe.ok,false);
assert.equal(unsafe.reason,"visual_commerce_without_live_verification");
assert.match(unsafe.reply,/التوفر/);
assert.match(unsafe.reply,/اسم المنتج|الباركود/);

const ui=readFileSync(new URL("../ODOO_CHAT_UI_V22_2_VISUAL_INTENT_PRECISION.txt",import.meta.url),"utf8");
assert.match(ui,/UI_VERSION='22\.2\.0'/);
assert.match(ui,/mig_ai_history_v22_2/);
assert.match(ui,/addVisualGuidance/);
assert.match(ui,/mig-ai-visual-action/);
assert.match(ui,/fileInput\.click\(\)/);

console.log("V22.2 visual intent precision PASS");
