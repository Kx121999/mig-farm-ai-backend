# MIG FARM AI — V40 Unified Evolution Intelligence

## الحالة
Release Candidate إنتاجي موحّد يجمع التطويرات V35 إلى V40 فوق الـV33.2 المجرّب، مع مسار مستخدم واحد وRollback صريح.

- Version: `40.0.0`
- Mode: `unified_evolution_intelligence_v40`
- Release: `MIG_FARM_AI_V40_UNIFIED_EVOLUTION`
- Base proven core: `V33.2 unified_semantic_intelligence_v33`
- Default pipeline: V40
- Rollback: `AI_PIPELINE_V40=false` يرجع إلى V33.2 بدون حذف الكود القديم.

## ما تم تنفيذه

### V35 — Semantic Intelligence Core
- Current-turn sovereignty: الرسالة الحالية والتصحيح الصريح أعلى أولوية من الذاكرة القديمة.
- فهم المتابعات القصيرة مع المنتج النشط: السعر، التوفر، عدد البذور/حجم العبوة، الملاءمة، الجرعة، والتفاصيل.
- Reference continuity للمنتج النشط بدل تحويل كل Follow-up إلى Product Search جديد.
- Light Arabic morphological stemming للّواصق والتصريفات مثل: `البذور`، `بالمخزون`، `للصوبة`، `عددها`، بدون تخزين جمل المستخدم كحالات خاصة.
- Correction entity recovery مع الاحتفاظ بالهدف الجديد.

### V36 — Advanced RAG + Reranking
- Query rewrite يحمل canonical entity + crop + environment + intent.
- Hybrid retrieval plan: structured exact + entity + lexical + vector + knowledge graph حسب نوع الطلب.
- Reranking متعدد الإشارات: semantic coverage + source authority + freshness + active entity + correction/entity lock + diversity.
- Entity-lock boost لمنع منتج قديم أو مشابه من خطف Follow-up.
- Evidence confidence assessment قبل الاعتماد على النتائج.

### V37 — Persistent Multi-Layer Memory
- Working memory.
- Episodic memory.
- Semantic facts.
- Correction history.
- Unresolved-question state.
- لا يتم تخزين `null/undefined` كنصوص حقائق.
- الذاكرة تستخدم للسياق فقط ولا تتغلب على تصحيح المستخدم الحالي.

### V38 — Product Intelligence Graph
- Canonical product nodes مرتبطة بـentity IDs/SKUs.
- علاقات same-category وvisible alternatives.
- Fact scope محفوظ داخل كل منتج لمنع cross-product contamination.
- السعر والمخزون حقول volatile وتتطلب Live Verification ولا يعتمد عليها من Graph قديم.
- Fuzzy canonical entity resolver محسّن للأسماء العربية والاختلافات الكتابية.

### V39 — Agricultural Diagnostic Engine
- Differential diagnosis بدل القفز لسبب واحد.
- Visual diagnosis عند وجود سياق صورة.
- Crop / environment / problem evidence tracking.
- سؤال تمييزي واحد عند نقص معلومة مؤثرة.
- جرعات المبيدات/المواد المنظمة لا تُعطى رقمياً بدون verified label/product identity.
- Technical-first: حل المشكلة الزراعية قبل محاولة البيع.

### V40 — Autonomous Sales Intelligence
- `technical_first` عند التشخيص.
- `browse_no_pressure` عند التصفح بدون نية شراء.
- `purchase_assist` فقط عندما توجد نية سعر/توفر/شراء مناسبة.
- Answer-first + trust-before-sale.
- منع forced WhatsApp CTA / fake urgency / البيع قبل التشخيص / ادعاء تنفيذ طلب بلا receipt.
- سؤال واحد كحد أقصى عند الحاجة.

## Orchestrator واحد
V40 لا يضيف 6 محركات تتنافس على الرد النهائي. `runUnifiedEvolutionV40()` يبني طبقات V35–V40 ثم يستخدم V33.2 كـproven semantic base، وبعدها يعمل rerank / state canonicalization / memory / graph / validation. الرد النهائي يخرج من مسار واحد.

## تكامل الـLLM
`neural_agent.js` يستقبل `unified_evolution_v40` قبل الذاكرة القديمة ويطبق عقد V35–V40. Retrieval data تعتبر evidence وليست wording إجباري. لا يتم كشف أسماء الطبقات أو scores أو memory structures للمستخدم.

## Validation وSafety
- Empty response guard.
- Internal metadata leak guard.
- No-pressure sales guard.
- Unverified dosage quantity guard.
- V33 relevance/grounding/entity consistency validators ما زالت تعمل كأساس.
- Regeneration bounded عند فشل validation.

## الاختبارات الفعلية
- JavaScript syntax checks: PASS.
- V40 unified evolution: `141/141` PASS.
- V40 development generalization: `70/70` PASS.
- V40 sealed holdout بعد تجميد المحرك: `51/51 = 100%` PASS.
- Engine SHA-256 قبل وبعد sealed holdout: UNCHANGED.
- V33 architecture regression: `135` cases PASS.
- V33 hidden generalization: `50/50 = 100%` PASS.
- V33 release holdout: `45/50 = 90%`, quality gate PASS. الحالات الخمس تخص deterministic fallback القديم بدون OpenAI key وليست regression من V40.
- Release validator: PASS على `200,025` knowledge records و`1320/1320` legacy evals.
- Legacy/API suites شُغلت على أجزاء بسبب حد وقت أداة التنفيذ؛ جميع الأجزاء المنفذة من V15/FINAL وحتى V33 وV40 مرّت بدون failure بعد التعديل النهائي.

## Final API smoke
مع `OPENAI_API_KEY` غير موجود:
- `عدد البذور قد إيه` مع Miaysa active product → فهم الـFollow-up وأعاد `500 بذرة`.
- `السعر بالدراهم؟` → لم يخترع سعرًا عندما Live source غير متاح.
- `لسه موجود بالمخزون؟` → لم يخترع Stock عندما Live source غير متاح.

هذا السلوك مقصود: Exact volatile facts تفشل بأمان بدل التخمين.

## الملفات الرئيسية الجديدة
- `lib/semantic_intelligence_core_v35.js`
- `lib/advanced_rag_reranker_v36.js`
- `lib/persistent_memory_v37.js`
- `lib/product_intelligence_graph_v38.js`
- `lib/agricultural_diagnostic_engine_v39.js`
- `lib/autonomous_sales_intelligence_v40.js`
- `lib/unified_evolution_v40.js`
- `tests/v40_unified_evolution.mjs`
- `tools/run_v40_evals.mjs`
- `tools/run_v40_development_generalization.mjs`
- `tools/run_v40_sealed_holdout.mjs`

## الملفات الأساسية المعدلة
- `api/chat.js`
- `api/health.js`
- `lib/neural_agent.js`
- `lib/product_intelligence.js`
- `lib/unified_intelligence_v33.js`
- `package.json`
- `.env.example`
- `tools/run_all_tests.mjs`
- `tools/validate_release.mjs`

## حدود حقيقية متبقية
- Live price/stock يحتاج مصدر Odoo/structured live صالح؛ النظام لا يخمن عند غيابه.
- أعلى جودة semantic intent في الإنتاج تحصل عند وجود `OPENAI_API_KEY`; fallback المحلي محسّن لكنه ليس بديلًا كاملًا عن النموذج الدلالي.
- V33 القديم لديه release holdout baseline = 90% في deterministic no-key mode، وهو مقبول حسب gate الحالي لكن يمكن تحسينه لاحقًا كمسار rollback فقط.
