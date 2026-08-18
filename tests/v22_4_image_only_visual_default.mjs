import assert from 'node:assert/strict';
import { normalizeVisionImages, buildVisionFrame, buildRetakeAdvice, visionHealth } from '../lib/vision_intelligence.js';

const h=visionHealth();
assert.equal(h.version,'22.5');
assert.equal(h.image_only_defaults_to_identity,true);
assert.equal(h.image_only_forces_product_mode,true);

const imgs=normalizeVisionImages([{type:'input_image',image_url:'data:image/jpeg;base64,AAAA',client_image_id:'img-a'}]);
const frame=buildVisionFrame('',imgs,{}, {visual_context_reused:false});
assert.equal(frame.visual_intent,'identity');
assert.equal(frame.mode,'product_or_label');
assert.equal(frame.requires_recognition_preflight,true);
const advice=buildRetakeAdvice(frame,{quality_issues:['ground_visual_evidence'],retake_count:0,previous_target:''});
assert.match(advice.ask_one,/حللت الصورة|واجهة العبوة|اسم المنتج|الباركود/);
console.log('V22.5 image-only visual default PASS');
