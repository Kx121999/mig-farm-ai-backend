import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  normalizeVisionImages, buildVisionFrame, matchVisualProduct, planVisualProductAction,
  buildRetakeAdvice, buildVisualGuidance, updateActiveVisualContext, visionHealth
} from "../lib/vision_intelligence.js";
import { sanitizeState } from "../lib/dialogue.js";

const vh=visionHealth();
assert.equal(vh.version,"22.5");
assert.equal(vh.recognition_before_identity_guard,true);
assert.equal(vh.forced_product_recognition_preflight,true);
assert.equal(vh.medium_candidate_confirmation,true);
assert.equal(vh.retake_loop_guard,true);
assert.equal(vh.different_image_detector,true);

const raw=[{type:"input_image",image_url:"data:image/jpeg;base64,AAAA",detail:"high",client_image_id:"img-one",capture_target:"product_name",width:900,height:700}];
const normalized=normalizeVisionImages(raw);
assert.equal(normalized[0].client_image_id,"img-one");
assert.equal(normalized[0].capture_target,"product_name");
assert.equal(normalized[0].width,900);

const first=buildVisionFrame("هل متوفر؟",normalized,{}, {visual_context_reused:false});
assert.equal(first.has_fresh_images,true);
assert.equal(first.new_image_evidence,true);
assert.equal(first.requires_recognition_preflight,true);
assert.equal(first.image_ids[0],"img-one");
assert.equal(first.visual_intent,"availability");

const beforeRecognition=planVisualProductAction({intent:"availability",identity_confidence:"none",mode:"product_or_label",recognition_attempted:false});
assert.equal(beforeRecognition.next_action,"recognize_product_before_identity_guard");
assert.equal(beforeRecognition.must_attempt_recognition,true);

const known=matchVisualProduct({visible_text:"0.5 HP CLEAN WATER PUMP 350F W23805PUM",candidate_name:"0.5 HP CLEAN WATER PUMP 350F",sku:"W23805PUM",barcode:"",brand:"",category:"",limit:5});
assert.equal(known.recognition_attempted,true);
assert.equal(known.identity_confidence,"high");
assert.equal(known.candidates[0].sku,"W23805PUM");
assert.ok(known.top_margin>=0);

const medium=planVisualProductAction({intent:"availability",identity_confidence:"medium",candidate_name:"TEST PRODUCT",candidate_sku:"SKU1",live_verified:false,mode:"product_or_label",recognition_attempted:true,candidate_count:2,top_margin:12});
assert.equal(medium.next_action,"confirm_visual_candidate");
assert.equal(medium.confirmation_required,true);

const firstRetake=buildRetakeAdvice(first,{quality_issues:["request_product_identity_evidence"],retake_count:0,previous_target:""});
assert.match(firstRetake.ask_one,/حاولت|المنتج/);
const secondRetake=buildRetakeAdvice(first,{quality_issues:["request_alternate_identity_evidence"],retake_count:1,previous_target:"product_name_or_sku_barcode"});
assert.match(secondRetake.ask_one,/الصورة الجديدة وصلت/);
assert.match(secondRetake.ask_one,/بدل ما تعيد نفس اللقطة/);
assert.equal(secondRetake.target,"alternate_identity_evidence");

const audit={visual_matches:[known],retake_advice:[],live_visual_verifications:[]};
const active=updateActiveVisualContext({},first,audit,1);
assert.equal(active.recognition_attempts,1);
assert.equal(active.image_ids[0],"img-one");
assert.equal(active.visual_revision,1);
assert.equal(active.identity_confidence,"high");

const persisted=sanitizeState({v:22.5,turn:1,active_visual_context:active});
assert.equal(persisted.active_visual_context.recognition_attempts,1);
assert.equal(persisted.active_visual_context.image_ids[0],"img-one");
assert.equal(persisted.active_visual_context.visual_revision,1);

const reused=buildVisionFrame("بكام؟",normalized,{...persisted.active_visual_context,current_turn:2},{visual_context_reused:true});
assert.equal(reused.has_fresh_images,false);
assert.equal(reused.reused_visual_pixels,true);
assert.equal(reused.has_visual_context,true);
assert.equal(reused.visual_followup,true);
assert.equal(reused.new_image_evidence,false);

const newRaw=normalizeVisionImages([{type:"input_image",image_url:"data:image/jpeg;base64,BBBB",detail:"high",client_image_id:"img-two"}]);
const revised=buildVisionFrame("هل متوفر؟",newRaw,{...persisted.active_visual_context,current_turn:2},{visual_context_reused:false});
assert.equal(revised.new_image_evidence,true);
assert.equal(revised.visual_revision,2);

const mediumGuidance=buildVisualGuidance({frame:first,activeContext:{},audit:{visual_matches:[{recognition_attempted:true,identity_confidence:"medium",top_margin:10,candidate_count:2,candidates:[{name:"TEST PRODUCT",sku:"SKU1",score:120}]}]}});
assert.equal(mediumGuidance.next_action,"confirm_visual_candidate");
assert.match(mediumGuidance.confirmation,/أقرب تطابق/);
assert.equal(mediumGuidance.actions.some(x=>x.type==="message"&&x.message==="أيوه هو"),true);

const ui=readFileSync(new URL("../ODOO_CHAT_UI_V22_3_VISUAL_RECOGNITION_PIPELINE.txt",import.meta.url),"utf8");
assert.match(ui,/UI_VERSION='22\.5\.0'/);
assert.match(ui,/mig_ai_history_v22_5/);
assert.match(ui,/client_image_id:'img-'/);
assert.match(ui,/simpleImageHash/);
assert.match(ui,/pendingCaptureTarget/);
assert.match(ui,/isNewTopicAwayFromImage\(message\).*activeImages=\[\]/s);
assert.doesNotMatch(ui,/يفهم الصورة بدقة/);

console.log("V22.5 visual recognition pipeline PASS");
