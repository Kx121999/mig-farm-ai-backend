# MIG FARM AI Backend

باك إند آمن لشات الذكاء الاصطناعي الخاص بموقع MIG FARM على Odoo.

## النسخة الأولى
- POST /api/chat
- GET /api/health
- عربي وإنجليزي
- تسلسل المحادثة باستخدام previous_response_id
- قاعدة معرفة أولية خاصة بـ MIG FARM
- سياق الصفحة والمنتج
- CORS لدومينات MIG FARM
- تحويل للواتساب عند الحاجة
- لا يتم وضع مفتاح OpenAI داخل Odoo

## النشر على Vercel
1. ارفع الملفات إلى GitHub.
2. استورد الريبو داخل Vercel.
3. أضف Environment Variables: OPENAI_API_KEY و OPENAI_MODEL=gpt-5-mini و ALLOWED_ORIGINS.
4. اعمل Deploy.
5. اختبر /api/health.
6. بعدها نربط /api/chat بواجهة Odoo.

مهم: لا ترفع ملف .env ولا تضع المفتاح الحقيقي داخل GitHub.
