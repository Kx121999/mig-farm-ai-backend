import assert from "node:assert/strict";
import { searchAgriculturalMasterKnowledge, agriculturalMasterHealth, masterSourceManifest } from "../lib/agricultural_master_knowledge.js";
const h=agriculturalMasterHealth();
assert.equal(h.version,"18.0"); assert.ok(h.bytes>=4_000_000); assert.ok(h.megabytes>=4); assert.ok(h.cards>=2500); assert.ok(h.crops>=40); assert.ok(h.sources>=8);
let r=searchAgriculturalMasterKnowledge("الخيار عندي الورق مكرمش والمياه بئر في العين",{limit:8});
assert.ok(r.length>=4); assert.ok(r.slice(0,5).some(x=>x.crop==="cucumber")); assert.ok(r.some(x=>/تشخيص|تجعد|التفاف/.test(x.title+x.answer)));
r=searchAgriculturalMasterKnowledge("EC الصرف أعلى من مياه المصدر في البيت المحمي",{limit:6}); assert.ok(r.length>=3); assert.ok(r.some(x=>/EC|الأملاح|ملوحة/.test(x.title+x.answer)));
const manifest=masterSourceManifest(); assert.ok(manifest.some(x=>x.id==="uae_quarantine_7_2025")); assert.ok(manifest.some(x=>x.id==="fao56_2025"));
console.log("V18 4MB agricultural master knowledge PASS",h);
