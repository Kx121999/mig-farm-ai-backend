import assert from "node:assert/strict";
import { POST } from "../api/chat.js";
const response=await POST(new Request("https://api.example.com/api/chat",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({session_id:"v28-api-contract",message:"مكانكم فين وبتوصلوا عجمان؟",locale:"ar"})}));
assert.equal(response.status,200);const body=await response.json();assert.equal(body.version,"29.0.0");assert.equal(body.mode,"conversational_reasoning_natural_language_os_v29");assert.equal(body.conversation_state.v,29);assert.equal(body.enterprise_platform.version,"29.0");assert.equal(body.runtime.conversation_reasoning.version,"29.0");assert.equal(body.runtime.enterprise_supervisor.version,"28.0");assert.equal(body.runtime.enterprise_retrieval.version,"28.0");assert.equal(body.runtime.enterprise_telemetry.version,"28.0");assert.ok(body.reply_blocks?.length);assert.equal(body.response_auditor.current.stale_context_risk,false);
console.log("V28 API contract PASS");
