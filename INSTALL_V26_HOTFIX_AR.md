# إصلاح نشر MIG FARM AI V26 على Vercel

هذه الحزمة لا تحتوي قاعدة المعرفة نفسها ولا تحذفها. هي تستبدل خمسة ملفات فقط فوق مستودع V26 الحالي.

## الملفات التي تُستبدل

1. `vercel.json`
2. `api/chat.js`
3. `lib/conversation_knowledge_v26.js`
4. `tools/validate_v26_knowledge_packs.mjs`
5. `.vercelignore` — ملف جديد في جذر المستودع

ارفع كل ملف إلى نفس مساره بالضبط داخل مستودع `mig-farm-ai-backend`. لا ترفع مجلد `V26_VERCEL_HOTFIX` نفسه داخل المشروع.

## ما يصلحه التحديث

- يحول `includeFiles` إلى نص مطابق لمخطط Vercel بدل القائمة غير الصالحة.
- يطابق اسم المجلد الموجود فعلًا: `knowledge_V26`.
- يمنع ضم 400 MiB إلى حزمة Node.js Function التي حدها 250 MB.
- يبقي `manifest.json` و`router.json` فقط داخل الـFunction.
- يحمل حزمة JSONL واحدة فقط من GitHub عند الحاجة.
- يتحقق من حجم الحزمة وSHA-256 قبل استعمالها.
- يحتفظ بآخر حزمة في الذاكرة ويمنع تكرار التنزيل المتزامن.
- يسمح لاحقًا بالنقل إلى Vercel Blob أو S3 بدون تعديل الكود عبر المتغير `MIG_V26_KNOWLEDGE_BASE_URL`.

## بعد الرفع

1. انتظر Vercel Deployment حتى تصبح الحالة `Ready`.
2. افتح `/api/health`.
3. تأكد أن القيم التالية ظاهرة:
   - `version: 26.0.0`
   - `conversation_knowledge.ready: true`
   - `conversation_knowledge.megabytes: 400`
   - `conversation_knowledge.function_bundle: manifest_router_only`
4. اختبر سؤالًا مثل: `عايز تفاصيل خيار وفرة F1`.

لا تحتاج إلى إضافة متغير جديد الآن؛ رابط GitHub الحالي هو الوضع الافتراضي. المفتاح `OPENAI_API_KEY` يبقى كما هو ولا يوضع داخل GitHub.
