# نشر MIG FARM AI V33

## الملفات

ارفع **محتويات مجلد الإصدار كله** إلى جذر مستودع `mig-farm-ai-backend`. لا تضع المجلد نفسه داخل مجلد إضافي. لا تحتاج حذف تاريخ GitHub، لكن يجب أن تصبح ملفات V33 هي الملفات الحالية على فرع `main`.

## متغيرات Vercel الأساسية

```text
OPENAI_API_KEY=...
AI_PIPELINE_V33=true
```

اختياري للتشخيص الإداري فقط:

```text
AI_DEBUG=true
AI_DEBUG_TOKEN=<قيمة سرية طويلة>
```

لا تضع `AI_DEBUG_TOKEN` في واجهة الموقع أو GitHub. يرسل فقط من أداة إدارية عبر header باسم `X-AI-Debug-Token`.

تكامل Odoo يمكن إبقاؤه معطلًا الآن:

```text
ODOO_ACTIONS_ENABLED=false
```

## فحص ما بعد النشر

1. افتح `/api/health`.
2. يجب أن ترى:

```json
{
  "ok": true,
  "version": "33.0.0",
  "mode": "unified_semantic_intelligence_v33",
  "release": "UNIFIED_SEMANTIC_INTELLIGENCE_V33"
}
```

3. اختبر محادثة من خمس رسائل: منتج، متابعة قصيرة، تصحيح، متابعة للسعر/العبوة، ثم تغيير موضوع.
4. تحقق أن `unified_intelligence_v33.validation.accepted` تساوي `true` في استجابة API.
5. عند خطأ غير مفهوم استخدم `trace_id` للبحث في Vercel Logs.

## التراجع الآمن

إذا ظهر عطل حرج بعد النشر فقط:

```text
AI_PIPELINE_V33=false
```

ثم Redeploy. هذا يعيد المسار السابق مؤقتًا، ولا يجب تركه معطلًا بعد تشخيص المشكلة.

