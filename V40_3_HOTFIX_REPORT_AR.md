# MIG FARM AI — V40.3 Provider Resilience Hotfix

## Root cause
الـ `/api/health` كان يعتبر OpenAI `configured:true` بمجرد وجود `OPENAI_API_KEY`، بدون اختبار API فعلي. وفي نفس الوقت `tryV22NeuralAgent()` كان يلتقط خطأ المزود ويرجع `null`، فيتحول V40 إلى `degradedReply()` التي تحتوي الرسالة العامة: "التحليل الذكي غير متاح للحظة".

## Fixes
- Added live provider probe endpoint `/api/provider-health`.
- Provider errors in forced V40/V33 generation now propagate to the unified trace instead of disappearing silently.
- Expanded deterministic natural-conversation recovery for wellbeing/greetings across common Arabic dialect morphology, so social turns remain natural during provider outages.
- Kept public V40 API contract at `40.0.0` to avoid regression; `/api/health` exposes `hotfix: V40.3_PROVIDER_RESILIENCE`.

## Validation
- V40.3 provider resilience: PASS — 13 cases.
- V40 unified evolution: PASS — 141 cases.
- V33.2 semantic rollback regression: PASS.
- V40 development generalization: 70/70 — 100%.
- V40 sealed holdout: 51/51 — 100%.
- Full `npm test` was started and passed all suites through V27 before the execution environment timeout; no failure occurred before timeout.

## Odoo
No Odoo UI change is required for this hotfix.
