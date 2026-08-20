import assert from "node:assert/strict";
import { classifyNaturalConversationV32, composeNaturalConversationReplyV32, isCredibleProductReferenceV32 } from "../lib/natural_conversation_v32.js";
import { analyzeTurn, ambiguousContextReply } from "../lib/dialogue.js";
import { buildCustomerBrainFrameV27 } from "../lib/customer_brain_v27.js";
import { understandTurnV31 } from "../lib/llm_first_orchestrator_v31.js";

process.env.OPENAI_API_KEY="";
process.env.MIG_V27_KNOWLEDGE_TRANSPORT="local";
process.env.MIG_ENTERPRISE_RETRIEVAL_ENABLED="false";
process.env.OPENAI_VECTOR_STORE_ID="";
process.env.ODOO_ACTIONS_ENABLED="false";

const helpCases=[
  "محتاجه مساعده","محتاج مساعدة","ممكن تساعدني","ساعديني","عندي سؤال","ممكن أسألك سؤال",
  "عايزة أسألك حاجة","مش عارفة أبدأ منين","انا تايه","ابي مساعده","ابغى مساعدتك","i need help"
];
for(const message of helpCases){
  const classified=classifyNaturalConversationV32(message);
  assert.equal(classified?.intent,"help_request",message);
  assert.match(composeNaturalConversationReplyV32(classified,/^[a-z]/i.test(message)?"en":"ar"),/معا|اسأل|نبدأ|Of course|No problem/i,message);
  const analysis=analyzeTurn(message,{},[],"ar");
  assert.equal(analysis.intent,"help_request",message);
  const meaning=await understandTurnV31({message,state:{},legacyAnalysis:analysis});
  assert.equal(meaning.primary_intent,"help_request",message);
  assert.equal(meaning.authoritative,true,message);
  assert.equal(meaning.domain,"social",message);
  assert.equal(meaning.response_plan.external_facts_required,false,message);
}

for(const message of ["انا تعبت","كل مرة نفس المشكلة ومش فاهم","مش فاهم اعمل ايه الحل"]){
  const classified=classifyNaturalConversationV32(message);
  assert.equal(classified?.intent,"frustration",message);
  assert.equal(analyzeTurn(message,{},[],"ar").intent,"frustration",message);
}

for(const message of ["محتاج مساعدة في اختيار بذور خيار","عايزة مساعدة في شجرة ليمون أوراقها صفراء","محتاج مساعدة في الشحن للعين"]){
  assert.equal(classifyNaturalConversationV32(message),null,`specific content must keep its own intent: ${message}`);
}

assert.equal(isCredibleProductReferenceV32("ه مساعده",{productTask:true}),false);
assert.equal(isCredibleProductReferenceV32("محتاجه مساعده",{productTask:true}),false);
assert.equal(isCredibleProductReferenceV32("خيار وفرة F1",{productTask:true}),true);
assert.equal(isCredibleProductReferenceV32("سماد 20-20-20",{productTask:true}),true);

const badFrame=buildCustomerBrainFrameV27({message:"محتاجه مساعده",analysis:analyzeTurn("محتاجه مساعده",{},[],"ar"),semanticFrame:null,state:{}});
assert.equal(badFrame.entities.product_reference,"");
assert.equal(badFrame.entities.product_reference_verified,false);

const shortUnknown=ambiguousContextReply("بلبل",{},analyzeTurn("بلبل",{},[],"ar"));
assert.equal(shortUnknown.source,"clarify_current_words_v32");
assert.match(shortUnknown.reply,/بلبل/);
assert.equal(/ما قدرت أثبت الإجابة|بيانات MIG FARM بثقة/.test(shortUnknown.reply),false);

const { POST }=await import("../api/chat.js");
async function ask(message,conversationState={}){
  const id=`v32-${Math.random().toString(36).slice(2)}`;
  const response=await POST(new Request("https://backend.example/api/chat",{method:"POST",headers:{"content-type":"application/json","origin":"https://www.migfarm.com","x-forwarded-for":id},body:JSON.stringify({session_id:id,locale:"ar",message,conversation_state:conversationState})}));
  assert.equal(response.status,200,message);
  return response.json();
}

const exact=await ask("محتاجه مساعده",{
  topic:"product",last_products:[{name:"Old product",sku:"OLD-1"}],visible_products:[{name:"Old product",sku:"OLD-1"}],
  customer_brain_memory:{last_product_reference:"ه مساعده"},customer_digital_twin_v30:{facts:[{key:"product_reference",value:"ه مساعده",confidence:.9}]}
});
assert.equal(exact.source,"natural_help_request_v32");
assert.equal(exact.llm_first_orchestrator.current.primary_intent,"help_request");
assert.equal(exact.llm_first_orchestrator.current.provider,"deterministic_guard");
assert.match(exact.reply,/أنا معاكي/);
assert.equal(/ما قدرت أثبت الإجابة|بيانات MIG FARM بثقة|وضح لي المقصود/.test(exact.reply),false);
assert.equal(exact.customer_brain.frame.entities.product_reference,"");
assert.equal(exact.customer_memory.current.last_product_reference,"");
assert.equal(exact.customer_digital_twin.current.facts.some(x=>x.key==="product_reference"),false);
assert.equal(exact.final_production.current.audit.passed,true);

for(const message of ["ممكن تساعدني","عندي سؤال","انا تعبت"]){
  const result=await ask(message);
  assert.ok(["natural_help_request_v32","natural_frustration_v32"].includes(result.source),message);
  assert.equal(result.customer_brain.frame.entities.product_reference,"",message);
  assert.equal(/ما قدرت أثبت الإجابة|بيانات MIG FARM بثقة/.test(result.reply),false,message);
}

const specific=await ask("محتاج مساعدة في اختيار بذور خيار");
assert.notEqual(specific.llm_first_orchestrator.current.primary_intent,"help_request");
assert.ok(["product_search","recommendation"].includes(specific.llm_first_orchestrator.current.primary_intent));

console.log("V32 natural conversation and false-product-memory guard PASS");
