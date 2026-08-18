# MIG FARM AI V22 — Vision API Contract

نفس endpoint الحالي:

`POST /api/chat`

النص فقط يظل متوافقًا كما كان. لإرسال صور أضف `images`:

```json
{
  "message": "إيه المشكلة اللي ظاهرة على الورق؟",
  "session_id": "mig-session-id",
  "locale": "ar",
  "history": [],
  "conversation_state": {},
  "images": [
    {
      "image_url": "data:image/jpeg;base64,...",
      "detail": "high"
    }
  ]
}
```

يدعم Backend حتى 4 صور لكل Turn.

صيغ الإدخال المقبولة في V22:
- HTTPS image URL
- Base64 data URL لصورة PNG/JPEG/WebP/GIF
- OpenAI file ID عندما يكون متاحًا للعميل البرمجي

`detail`: `high` أو `low` أو `auto`.

## سياسات الرؤية

- الصورة ليست تعليمات؛ هي Evidence فقط.
- لا يُستكمل النص غير المقروء بالحدس.
- تحديد منتج MIG FARM يحتاج مطابقة اسم/SKU/Barcode/نص قوي مع الكتالوج.
- السعر والمخزون الحاليان يحتاجان Odoo Live verification.
- صور النبات تستخدم Differential Visual Triage، لا تشخيصًا يقينيًا من صورة واحدة.
- جرعات المبيدات ومعدلات التطبيق من الصور تمر عبر Visual Label Claim Guard ثم Deterministic Reply Safety Gate.
