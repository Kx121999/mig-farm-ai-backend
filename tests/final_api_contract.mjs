import assert from "node:assert/strict";

process.env.OPENAI_API_KEY="";
process.env.FINAL_CRITIC_ENABLED="false";
process.env.MIG_V27_KNOWLEDGE_TRANSPORT="local";
process.env.MIG_ENTERPRISE_RETRIEVAL_ENABLED="false";
process.env.ODOO_ACTIONS_ENABLED="false";

const { GET }=await import("../api/health.js");
const health=await (await GET()).json();
assert.equal(health.ok,true);
assert.equal(health.version,"31.0.0");
assert.equal(health.release,"FINAL_PRODUCTION_OS");
assert.equal(health.final_production_os.ready,true);
assert.equal(health.health_strategy,"lightweight_no_heavy_module_initialization");

const { POST }=await import("../api/chat.js");
const poisoned={turn:9,topic:"product",crop:"cucumber",active_product_context:{active:true,product:{name:"مبيد قديم"}},dialogue_v29:{expected:{active:true,field:"product_selection",question:"اسم المنتج؟"}}};
const response=await POST(new Request("https://backend.example/api/chat",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({session_id:"final-api-contract",message:"أنا مش بسأل عن الجرعة، أنا بسأل اسمك إيه؟",locale:"ar",conversation_state:poisoned,history:[{role:"assistant",content:"ابعت الملصق عشان الجرعة"}]})}));
assert.equal(response.status,200);
const data=await response.json();
assert.equal(data.version,"31.0.0");
assert.equal(data.final_production_os,true);
assert.equal(data.conversation_state.final_release,"FINAL_PRODUCTION_OS");
assert.equal(data.final_production.current.audit.passed,true);
assert.equal(data.final_production.current.contract.primary_intent,"correction");
assert.equal(data.final_production.current.contract.answer_order.includes("identity"),true);
assert.match(data.reply,/MIG FARM AI/);
assert.equal(/جرع|مبيد|ملصق/.test(data.reply),false);
console.log("FINAL_PRODUCTION_OS API contract PASS");
