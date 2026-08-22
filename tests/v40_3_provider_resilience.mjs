import assert from "node:assert/strict";
import { classifyNaturalConversationV32, composeNaturalConversationReplyV32 } from "../lib/natural_conversation_v32.js";
import { probeOpenAIProviderV40 } from "../lib/provider_health_v40.js";
const variants=["كيفك","كيف حالك","شلونك","شخبارك","شو اخبارك","عامل ايه","ازيك","إزيكم"];
for(const text of variants){const frame=classifyNaturalConversationV32(text);assert.equal(frame?.intent,"wellbeing",`wellbeing failed: ${text}`);assert.ok(composeNaturalConversationReplyV32(frame,"ar").length>3);}
for(const text of ["السلام عليكم","هلا","مرحبا","صباح الخير"]){assert.equal(classifyNaturalConversationV32(text)?.intent,"greeting",`greeting failed: ${text}`);}
const old=process.env.OPENAI_API_KEY;delete process.env.OPENAI_API_KEY;const probe=await probeOpenAIProviderV40();assert.equal(probe.ok,false);assert.equal(probe.configured,false);assert.equal(probe.error_code,"not_configured");if(old)process.env.OPENAI_API_KEY=old;
console.log("V40.3 provider resilience tests passed",variants.length+4+1);
