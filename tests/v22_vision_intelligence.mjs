import assert from "node:assert/strict";
import { normalizeVisionImages, buildVisionFrame, matchVisualProduct, guardVisualLabelClaim, searchVisualAgronomy, enforceVisualReplySafety, visionHealth } from "../lib/vision_intelligence.js";

const h=visionHealth();
assert.equal(h.version,"22.3");
assert.equal(h.product_visual_signatures,704);
assert.equal(h.visual_agronomy_cards,540);
assert.equal(h.max_images_per_turn,4);
assert.ok(h.total_megabytes>1);

const imgs=normalizeVisionImages([
  {url:"https://example.com/a.jpg",detail:"high"},
  {image_url:"data:image/jpeg;base64,AAAA",detail:"auto"},
  {url:"javascript:alert(1)"},
  {file_id:"file-abc_123",detail:"low"},
  {url:"https://example.com/ignored.jpg"}
]);
assert.equal(imgs.length,3);
assert.equal(imgs[0].type,"input_image");
assert.equal(imgs[2].file_id,"file-abc_123");

const frame=buildVisionFrame("الورق عندي مكرمش وفي نقط تحت الورقة",imgs.slice(0,1));
assert.equal(frame.has_images,true);
assert.equal(frame.mode,"plant_diagnostic");
assert.equal(frame.policy.plant_image_is_triage_not_definitive_diagnosis,true);

const pump=matchVisualProduct({visible_text:"0.5 HP CLEAN WATER PUMP 350F W23805PUM",sku:"W23805PUM",limit:4});
assert.ok(pump.candidates.length>0);
assert.equal(pump.candidates[0].sku,"W23805PUM");
assert.equal(pump.identity_confidence,"high");

const rejected=guardVisualLabelClaim({claim_type:"pesticide_dosage",verbatim_text:"",claim:"50 ml/100 L",confidence:.98,image_quality:"high",product_identifier:""});
assert.equal(rejected.accepted,false);
const accepted=guardVisualLabelClaim({claim_type:"pesticide_dosage",verbatim_text:"50 ml/100 L",claim:"50 ml/100 L",confidence:.97,image_quality:"high",product_identifier:""});
assert.equal(accepted.accepted,true);


const doseFrame=buildVisionFrame("اديني الجرعة من الصورة",imgs.slice(0,1));
const unsafeDose=enforceVisualReplySafety({reply:"استخدم 50 ml لكل 100 L",frame:doseFrame,trace:[],audit:{label_guard_results:[]}});
assert.equal(unsafeDose.ok,false);
assert.equal(unsafeDose.reason,"unverified_visual_dosage_claim");
const safeDose=enforceVisualReplySafety({reply:"استخدم 50 ml لكل 100 L",frame:doseFrame,trace:[{tool:"match_visual_product"},{tool:"guard_visual_label_claim"}],audit:{label_guard_results:[{accepted:true}]}});
assert.equal(safeDose.ok,true);

const priceFrame=buildVisionFrame("ده بكام ومتوفر؟",imgs.slice(0,1));
assert.equal(priceFrame.requires_live_product_truth,true);
const unsafePrice=enforceVisualReplySafety({reply:"سعره 40 AED ومتوفر",frame:priceFrame,trace:[{tool:"match_visual_product"}],audit:{visual_matches:[{recognition_attempted:true,identity_confidence:"high",candidates:[{name:"TEST",sku:"SKU"}]}]}});
assert.equal(unsafePrice.ok,false);
assert.equal(unsafePrice.reason,"visual_commerce_without_live_verification");

const atlas=searchVisualAgronomy("طماطم اصفرار الأوراق القديمة",{crop:"tomato",limit:5});
assert.ok(atlas.length>0);
assert.equal(atlas[0].crop,"tomato");
assert.ok(Array.isArray(atlas[0].differential_categories));
console.log("V22 Vision Intelligence PASS");
