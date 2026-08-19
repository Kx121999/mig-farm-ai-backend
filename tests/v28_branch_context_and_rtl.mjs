import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { analyzeTurn, directReply } from "../lib/dialogue.js";

for(const [message,expectedSource,expectedPhone] of [
  ["العين","branch_alain","+971 58 176 8215"],
  ["الشارقة","branch_sharjah","+971 54 702 5904"]
]){
  const analysis=analyzeTurn(message,{topic:"branches",turn:2},[],"ar");
  assert.equal(analysis.intent,"branches");
  const reply=directReply(analysis,{topic:"branches",turn:2},message,"branch-context-test");
  assert.equal(reply.source,expectedSource);
  assert.ok(reply.reply.includes(expectedPhone));
  assert.equal(reply.reply.includes("ما قدرت أثبت"),false);
}

const contactAnalysis=analyzeTurn("العين",{topic:"contact",turn:2},[],"ar");
assert.equal(contactAnalysis.intent,"contact");
assert.equal(directReply(contactAnalysis,{topic:"contact"},"العين","contact-context-test").source,"contact_alain");

const shippingAnalysis=analyzeTurn("العين",{topic:"shipping",turn:2},[],"ar");
assert.equal(shippingAnalysis.intent,"unknown");

const ui=readFileSync(new URL("../ODOO_CHAT_UI_V28_ENTERPRISE_AUTONOMOUS_INTELLIGENCE_PLATFORM.txt",import.meta.url),"utf8");
for(const marker of ["function appendSafeInline","mig-ai-inline-ltr","token.href='tel:'","white-space:nowrap"]){
  assert.ok(ui.includes(marker),`UI marker missing: ${marker}`);
}
const script=ui.match(/<!\[CDATA\[([\s\S]*?)\]\]>/)?.[1];
assert.ok(script,"Odoo UI CDATA script missing");
new Function(script);

// Verify the real API pipeline keeps the assistant's branch question in state,
// then understands a one-word customer answer instead of emitting the generic fallback.
process.env.MIG_V27_KNOWLEDGE_TRANSPORT="local";
process.env.MIG_ENTERPRISE_RETRIEVAL_ENABLED="false";
process.env.OPENAI_API_KEY="";
process.env.OPENAI_VECTOR_STORE_ID="";
process.env.ODOO_ACTIONS_ENABLED="false";
process.env.ODOO_URL="";
process.env.ODOO_ACTION_URL="";
process.env.ODOO_DB="";
process.env.ODOO_USERNAME="";
process.env.ODOO_API_KEY="";

const { POST }=await import("../api/chat.js");
const sessionId=`v28-branch-context-${Date.now()}`;
const firstResponse=await POST(new Request("https://api.example.com/api/chat",{
  method:"POST",
  headers:{"content-type":"application/json"},
  body:JSON.stringify({session_id:sessionId,message:"وين مكانكم",locale:"ar"})
}));
assert.equal(firstResponse.status,200);
const firstBody=await firstResponse.json();
assert.equal(firstBody.conversation_state.topic,"branches");

const secondResponse=await POST(new Request("https://api.example.com/api/chat",{
  method:"POST",
  headers:{"content-type":"application/json"},
  body:JSON.stringify({
    session_id:sessionId,
    message:"العين",
    locale:"ar",
    conversation_state:firstBody.conversation_state,
    history:[
      {role:"user",content:"وين مكانكم"},
      {role:"assistant",content:firstBody.reply}
    ]
  })
}));
assert.equal(secondResponse.status,200);
const secondBody=await secondResponse.json();
assert.ok(secondBody.reply.includes("+971 58 176 8215"));
assert.equal(secondBody.reply.includes("ما قدرت أثبت"),false);

console.log("V28 branch follow-up and RTL phone UI PASS");
