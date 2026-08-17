# MIG FARM AI V7 — Sales & Knowledge Agent

A free, deterministic, context-aware website assistant for MIG FARM's Odoo ecommerce site.

## Version
7.0.0 — `free_sales_knowledge_agent_v7`

## Core capabilities
- Live Odoo product search for price and availability
- Strict MIG FARM-only seed filtering
- Customer profile memory across turns
- Sales journey stages: discover, explore, qualify, consider, compare, ready, handoff, support
- Lead scoring and temperature
- One-question-at-a-time qualification
- Natural Emirati/UAE Arabic response variation
- Conversation repair when the user says the previous answer was wrong
- Multi-intent handling such as product + shipping in the same message
- WhatsApp handoff with a prefilled conversation summary
- Extended MIG FARM product and agriculture knowledge
- Safe handling of pesticide/fertilizer dosage questions
- Confidence-guarded site retrieval
- Privacy-safe learning telemetry without raw user messages
- No paid LLM/API dependency in this mode

## New V7 modules
- `lib/customer.js` — customer profile and signal extraction
- `lib/sales.js` — journey, lead score, next-best-question and WhatsApp handoff
- `lib/human_knowledge.js` — natural FAQ/glossary and verified project knowledge
- `lib/learning.js` — privacy-safe quality/learning events

## Existing human-engine modules
- `lib/brain.js`
- `lib/dialogue.js`
- `lib/catalog.js`

## Tests
```bash
npm test
node tests/api_direct.mjs
```
