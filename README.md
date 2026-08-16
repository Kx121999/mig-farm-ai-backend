# MIG FARM Website Assistant — V5 Final Context Engine

Free site-wide assistant for the MIG FARM Odoo ecommerce website.

## What V5 fixes
- Keeps structured conversation state in the browser and sends it each turn.
- Understands short follow-ups such as `داخل العين`, `ودبي؟`, `والحار؟`, and `الثاني بكام؟` from the previous topic.
- Recovers context from recent history even before the new frontend is installed.
- Uses confidence thresholds for website retrieval and refuses weak/irrelevant page matches.
- Asks a clarification question when a fragment is ambiguous instead of inventing an answer.
- Stops obvious off-topic questions from being matched to random MIG FARM pages.
- Preserves live product search, price/availability comparisons, current product-page context, safety guardrails and Emirati Arabic.
- No paid LLM/API dependency in this mode.

## Endpoints
- `GET /api/health`
- `POST /api/chat`
