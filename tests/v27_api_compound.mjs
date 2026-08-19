import assert from "node:assert/strict";
import { POST } from "../api/chat.js";

async function ask(message,id){
  const req=new Request("https://backend.example/api/chat",{method:"POST",headers:{"content-type":"application/json","origin":"https://www.migfarm.com"},body:JSON.stringify({message,session_id:id,conversation_state:{category:"fertilizer",crop:"tomato",active_product_context:{name:"Old Fertilizer"},last_products:[{name:"Old Fertilizer"}]}})});
  const res=await POST(req);assert.equal(res.status,200);return await res.json();
}
const identity=await ask("إنت مين ومكانكم فين؟","v27-compound-identity");
assert.equal(identity.version,"30.0.0");assert.equal(identity.mode,"neural_autonomous_customer_os_v30");assert.equal(identity.source,"v27_customer_brain_compound");
assert.match(identity.reply,/MIG FARM AI/i);assert.match(identity.reply,/الشارق[هة]/);assert.match(identity.reply,/العين/);assert.equal(identity.customer_brain.frame.is_multi_intent,true);assert.deepEqual(identity.customer_brain.frame.tasks.map(x=>x.intent),["identity","branches"]);assert.deepEqual(identity.response_auditor.current.missing_tasks,[]);assert.ok(identity.response_auditor.current.question_count<=1);assert.notEqual(identity.conversation_state.active_product_context?.name,"Old Fertilizer");

const logistics=await ask("الدفع إزاي والشحن بكام؟","v27-compound-logistics");
assert.equal(logistics.source,"v27_customer_brain_compound");assert.match(logistics.reply,/الدفع/);assert.match(logistics.reply,/التوصيل|الشحن/);assert.match(logistics.reply,/13/);assert.deepEqual(logistics.customer_brain.frame.tasks.map(x=>x.intent),["payment","shipping"]);assert.equal(logistics.customer_brain_execution.complete,true);
console.log("V27 Compound API execution PASS");

