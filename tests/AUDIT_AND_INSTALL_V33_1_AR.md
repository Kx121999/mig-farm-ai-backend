# MIG FARM AI — V33.1 Frontend Semantic Boundary Hotfix

## ما تم إثباته في V33 Frontend

واجهة V33 كانت ترسل `history` و`conversation_state` و`selected_product_context` إلى الـbackend، وهذا أساس جيد لاستمرارية المحادثة.

لكن الواجهة كانت أيضًا تتخذ قرارات دلالية من نص المستخدم قبل الإرسال باستخدام Regex وقوائم كلمات، ومنها:

- مسح `activeChatProduct` عندما تتوقع الواجهة أن المستخدم غيّر المنتج.
- تقرير أن الرسالة موضوع جديد بعيد عن الصورة.
- تقرير أن الرسالة متابعة للصورة.
- إعادة استخدام/إلغاء الصورة بناءً على صياغات محددة.

هذا يجعل صياغات غير موجودة في القوائم عرضة لفقد السياق حتى لو كان الـbackend قادرًا على فهمها.

## ما تم تغييره

1. حذف browser-side semantic routing للدوال:
   - `shouldClearActiveChatProduct`
   - `hasDirectVisualReference`
   - `isVisualCancelMessage`
   - `isNewTopicAwayFromImage`
   - `isVisualFollowupMessage`

2. `activeChatProduct` لا يتم مسحه الآن بسبب كلمات في رسالة المستخدم. يظل مجرد context سابق يرسل للسيرفر، والسيرفر هو الذي يقرر هل الرسالة الحالية تستمر عليه أو تصححه أو تغيّر الموضوع.

3. إعادة استخدام الصور أصبحت مرتبطة فقط بـ `conversation_state.active_visual_context.active` القادم من السيرفر، وليس بتخمين الكلمات في المتصفح.

4. عندما يغلق السيرفر `active_visual_context` يتم حذف الصور المحلية فورًا.

5. حذف رسالة الـAssistant العامة التي كان المتصفح ينشئها إذا رجع backend بدون `reply`. الحالة الآن تعامل كفشل قابل لإعادة المحاولة بدل اختراع رد محادثي من الواجهة.

6. رفع UI version إلى `33.1.0` مع الإبقاء على مفاتيح V33 نفسها حتى يقوم version gate بتنظيف history/session/state القديمة بشكل صحيح بدون فقدان basket/feedback لمجرد تغيير أسماء المفاتيح.

## ما لم يتم تغييره

- التصميم والشكل.
- API URLs.
- product cards.
- comparison UI.
- inquiry basket.
- WhatsApp handoff.
- voice input.
- image upload limits.
- backend response schema.

## الاختبارات المنفذة

- XML parse: PASS
- JavaScript `node --check`: PASS
- إزالة semantic interceptors القديمة: PASS
- منع frontend assistant fallback: PASS
- الحفاظ على history/state/product/image transport: PASS
- server-authoritative product/visual state assertions: PASS

## التثبيت

استبدل محتوى الـArchitecture الحالي الخاص بواجهة الشات بمحتوى:

`ODOO_CHAT_UI_V33_1_SERVER_AUTHORITATIVE_CONTEXT.xml`

ثم Save / Apply كالمعتاد.

## القيد الحالي المهم

هذا التعديل يصلح **Frontend V33** الذي أمكن الوصول إليه وفحصه فعليًا. مصدر backend المنشور الذي يحمل `unified_semantic_intelligence_v33` غير موجود ضمن الملفات المتاحة هنا ولم يظهر في GitHub/Vercel connector، لذلك لم يتم الادعاء بتعديل backend أو تشغيل hidden evaluation عليه.

الخطوة التالية الصحيحة عند توفر مصدر backend V33 هي تنفيذ نفس العقد على المسار الفعلي `/api/chat` و`/api/chat-stream`: trace → interception audit → one orchestrator → semantic state/reference/query rewrite → retrieval/rerank/evidence → validators → unseen/hidden multi-turn evaluation.
