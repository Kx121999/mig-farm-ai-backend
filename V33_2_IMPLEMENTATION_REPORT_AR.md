# MIG FARM AI — V33.2 Unified Semantic Intelligence

## الحالة
Production release candidate validated locally على نسخة V33 الأصلية المرفوعة من المشروع نفسه.

- Version: `33.2.0`
- Mode: `unified_semantic_intelligence_v33`
- Release: `UNIFIED_SEMANTIC_INTELLIGENCE_V33`
- Main runtime: `api/chat.js -> runUnifiedIntelligenceV33()`
- Legacy V15–V32: rollback compatibility only when `AI_PIPELINE_V33=false`

## ما تم إصلاحه فعليًا

1. **Correction semantics بدون فقد الهدف الجديد**
   - `primary_intent=correction` يظل معبّرًا عن حالة التصحيح.
   - الهدف الجديد محفوظ في `corrected_goal_intent` ويُستخدم فعليًا في routing/generation.
   - مثال معماري: "مش الجرعة، قصدي السعر" = correction state + price goal.

2. **Current-turn sovereignty**
   - التصحيح أو الموضوع الجديد لا يُختطف بواسطة سياق منتج/جرعة/زراعة قديم.

3. **Active product subject lock**
   - عند وجود منتج نشط، سؤال مثل "هل ينفع للطماطم؟" يُفهم كملاءمة المنتج للمحصول، وليس بحثًا جديدًا عن بذور طماطم.

4. **Server-authoritative pending actions**
   - قبول/رفض/إلغاء إجراء معلّق يحسمه السيرفر قبل clarification/LLM routing.
   - العميل لا يستطيع تزوير pending action من المتصفح.

5. **Visual context priority في rollback path**
   - image-only / visual follow-up لا يتم اختطافه بواسطة help_request اجتماعي عام.
   - الموضوعات الصريحة الجديدة تظل قادرة على قطع سياق الصورة.

6. **Claim scope / fact separation**
   - Business amounts وحالة Odoo لا تُعامل تلقائيًا كسعر/توفر منتج.

7. **Health contract صحيح عند rollback**
   - V33.2 عند تشغيل V33.
   - V31 contract عند `AI_PIPELINE_V33=false` لاختبارات/rollback النسخ القديمة.

8. **Semantic routing for correction targets**
   - correction لا يصبح task معلومات مستقل.
   - corrected goal هو الذي يحدد product_exact / business / technical / conversation route.

## اختبارات الجودة المنفذة

| Gate | Result |
|---|---:|
| V33 architecture/provider quality gate | PASS |
| V33 architecture cases | 135/135 |
| Hidden generalization | 50/50 — 100% |
| Sealed holdout | 60/60 — 100% |
| Final sealed holdout | 59/60 — 98.33% |
| Locked holdout | 49/50 — 98% |
| Final locked holdout | 50/50 — 100% |
| Release holdout | 45/50 — 90% — PASS |
| Release validator | PASS |
| Legacy evals reported by validator | 1320/1320 |
| Knowledge records | 200,025 |
| V33.2 semantic regression | PASS |
| Key rollback regression V22.1/V23/V25/V31/V32 | PASS |

## ملاحظة مهمة عن الاختبارات

بيئة البناء المحلية لا تحتوي على مفتاح OpenAI production حقيقي. Provider contract تم اختباره باستخدام mocked Responses API بنفس العقد البنيوي. لذلك لا يوجد ادعاء بأن live-provider network smoke تم من هذه البيئة.

الـRelease Holdout في emergency deterministic fallback = 90% وهو حد النجاح المطلوب. لم يتم تحويل الحالات الخمس المتبقية إلى قواعد أو جمل hardcoded، لتجنب overfitting والرجوع لسلوك البوت المحفوظ.

## سياسات لم يتم كسرها

- لا جرعات غير موثقة.
- لا سعر/مخزون live يتم اختراعه عند غياب المصدر.
- لا تأكيد شراء أو دفع تلقائي.
- Odoo actions تظل خاضعة للـserver authority والـconfirmation policy.
- RAG يظل مصدر evidence وليس مولد الرد النهائي.
- الذاكرة لا تتغلب على الرسالة الحالية.

## ملفات التنفيذ الرئيسية المعدلة

- `api/chat.js`
- `api/health.js`
- `lib/llm_first_orchestrator_v31.js`
- `lib/unified_intelligence_v33.js`
- `lib/autonomous_action_os.js`
- `tests/v33_2_semantic_regression.mjs`
- تحديثات اختبارات compatibility غير المرتبطة بصياغة محفوظة

