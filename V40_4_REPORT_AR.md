# V40.4 Current-Turn Provider Resilience

## Root cause
V40 intercepted the request before the existing current-turn social/identity guards. If neural generation failed, `groundedUnifiedFallbackV33` returned null for conversation-only turns and `degradedReply` emitted the generic intelligence-unavailable sentence.

## Fix
- Current-turn social/identity fallback is now inside the unified V40/V33 failure path.
- The fallback is semantic-intent driven and only activates after provider failure; it does not replace normal LLM generation.
- Identity variants and wellbeing variants were expanded in the deterministic emergency semantics.
- Meaning timeout default: 12s. Neural answer timeout default: 18s.
- Last-resort degradation no longer emits the old canned error for recognized social intents.
