import assert from "node:assert/strict";
import {
  analyzeAgriculturalRequest, searchAgriculturalEngineering, diagnoseAgriculturalProblem,
  agricultureCalculator, agriculturalEngineerHealth, isAgriculturalExpertQuery
} from "../lib/agricultural_engineer.js";
import { neuralBrainHealth } from "../lib/neural_agent.js";

const h=agriculturalEngineerHealth();
assert.equal(h.version,"15.0");
assert.ok(h.curriculum_modules>=18);
assert.ok(h.knowledge_cards>=500);
assert.ok(h.diagnostic_rules>=25);
assert.ok(h.crop_profiles>=25);

const slang=analyzeAgriculturalRequest("الطماطم عندي في الصوبة الورق مكرمش وبيصفر من تحت والنبات شكله مخنوق");
assert.equal(slang.is_agricultural,true);
assert.equal(slang.crop,"طماطم");
assert.equal(slang.system,"greenhouse");
assert.equal(slang.intent,"diagnosis");

assert.equal(isAgriculturalExpertQuery("الميه فيها ملوحة عالية والنقاطات بتسد"),true);
const iron=searchAgriculturalEngineering("الحديد مش نافع معايا والمياه قلوية وبيكربونات",{limit:8});
assert.ok(iron.some(x=>/الحديد|pH الماء والقلوية|نقص إتاحة الحديد/.test(x.topic+x.body_ar)));

const diag=diagnoseAgriculturalProblem("النبات ذابل رغم ان التربة مبلولة والجذور لونها بني وريحة وحشة");
assert.equal(diag.handled,true);
assert.ok(diag.hypotheses.length>=2);
assert.ok(diag.first_steps.length>=1);
assert.equal(diag.diagnosis_status,"differential_not_confirmed");

const mm=agricultureCalculator("irrigation_volume",{depth_mm:5,area_m2:200});
assert.equal(mm.ok,true); assert.equal(mm.value,1000); assert.equal(mm.unit,"L");
const density=agricultureCalculator("planting_density",{row_cm:100,plant_cm:50});
assert.equal(density.ok,true); assert.equal(density.value,2);
const ppm=agricultureCalculator("fertilizer_ppm",{target_ppm:100,volume_l:1000,nutrient_pct:20});
assert.equal(ppm.ok,true); assert.equal(ppm.value,500);
const blocked=agricultureCalculator("label_tank_mix",{label_rate_per_100l:50,tank_l:200,label_confirmed:false});
assert.equal(blocked.ok,false);
const label=agricultureCalculator("label_tank_mix",{label_rate_per_100l:50,tank_l:200,label_confirmed:true,rate_unit:"ml"});
assert.equal(label.ok,true); assert.equal(label.value,100);

const nh=neuralBrainHealth();
assert.ok(["15.0","16.0","17.0","18.0","19.0"].includes(nh.version));
for(const tool of ["search_agricultural_engineering","diagnose_crop_problem","agriculture_calculator","search_uae_regulations"]){
  assert.ok(nh.tools.includes(tool),`missing neural tool ${tool}`);
}

console.log("V15 agricultural engineer PASS",h);
