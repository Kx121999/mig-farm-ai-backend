import assert from "node:assert/strict";

process.env.OPENAI_API_KEY="";
process.env.FINAL_CRITIC_ENABLED="false";
process.env.MIG_V27_KNOWLEDGE_TRANSPORT="local";
process.env.MIG_ENTERPRISE_RETRIEVAL_ENABLED="false";
process.env.ODOO_ACTIONS_ENABLED="false";

const { POST }=await import("../api/chat-stream.js");
const response=await POST(new Request("https://backend.example/api/chat-stream",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({session_id:"final-stream-contract",message:"اسمك إيه؟",locale:"ar"})}));
assert.equal(response.status,200);
assert.match(response.headers.get("content-type")||"",/text\/event-stream/);
const text=await response.text();
assert.match(text,/event: status/);
assert.match(text,/event: result/);
assert.match(text,/FINAL_PRODUCTION_OS/);
assert.match(text,/MIG FARM AI/);
assert.match(text,/event: done/);
console.log("FINAL_PRODUCTION_OS progressive SSE contract PASS");
