import assert from "node:assert/strict";
import { searchUaeAgriculture, answerUaeAgricultureKnowledge, uaeAgricultureHealth } from "../lib/uae_agriculture_intelligence.js";

const h=uaeAgricultureHealth();
assert.equal(h.version,"14.0");
assert.ok(h.entries>=70);
assert.ok(h.regulatory_entries>=15);
assert.equal(h.legal_freshness_guard,true);

const q=searchUaeAgriculture("ما هو قانون الحجر الزراعي الجديد في الامارات؟",{limit:4,regulationsOnly:true});
assert.ok(q.some(x=>String(x.legal_reference).includes("7 of 2025")));
const old=answerUaeAgricultureKnowledge("هل قانون الحجر رقم 5 لسنة 1979 هو الحالي؟","ar");
assert.ok(old && /7 لسنة 2025/.test(old.reply));
const pest=answerUaeAgricultureKnowledge("قانون استيراد المبيدات في الامارات","ar");
assert.ok(pest?.regulatory);
assert.ok(/2026-08-17/.test(pest.reply));
const seed=searchUaeAgriculture("استيراد بذور وتقاوي للامارات",{limit:4,regulationsOnly:true});
assert.ok(seed.some(x=>x.id==="seed_import_permit"));
const agr=answerUaeAgricultureKnowledge("كيف اتعامل مع ملوحة التربة في الامارات؟","ar");
assert.ok(agr && /ملوحة/.test(agr.reply));
console.log("V14 UAE agriculture intelligence PASS",h);
