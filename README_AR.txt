MIG FARM V8.1.1 HOTFIX

GitHub upload/replace:
- lib/catalog.js
- api/chat.js
- tests/v8_hotfix.mjs
- package.json

Odoo QWeb replace with:
- odoo/MIG_FARM_AI_CHAT_UI_V8_1_1_HOTFIX.txt

Fixes:
1) strict crop isolation: tomato search cannot leak JABAARA/MAYASA because of generic SEO text.
2) live search fallback now runs after index filtering, not before.
3) broken product images fall back to Odoo /web/image/product.template/<id>/image_512 and hide cleanly if unavailable.
