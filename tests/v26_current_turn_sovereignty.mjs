import assert from "node:assert/strict";
import { POST } from "../api/chat.js";
import { buildSemanticFrame } from "../lib/semantic_human_brain.js";
import { detectCurrentTurnPriorityV26, quarantineCurrentTurnStateV26, currentTurnRouterHealth } from "../lib/current_turn_router_v26.js";

delete process.env.OPENAI_API_KEY;
const staleState={
  turn:9,topic:"fertilizer_dose",category:"fertilizer",crop:"tomato",last_intent:"fertilizer_dose",
  last_products:[{name:"سماد قديم",sku:"OLD-1",price:"99"}],visible_products:[{name:"سماد قديم",sku:"OLD-1",price:"99"}],
  active_product_context:{active:true,product:{name:"سماد قديم",sku:"OLD-1"},expires_turn:30},
  comparison_context:{products:[{name:"سماد قديم"},{name:"مبيد قديم"}]}
};

for(const [index,message] of ["مكانكم فين","فين مكانكم","وين موقعكم","عنوانكم إيه","where is your store","mkanokom feen"].entries()){
  const frame=buildSemanticFrame({message,analysis:{intent:"unknown"},state:staleState,history:[]});
  const route=detectCurrentTurnPriorityV26({message,analysis:{intent:"unknown"},semanticFrame:frame});
  assert.equal(route?.intent,"branches",message);assert.equal(route?.isolate,true,message);
  const req=new Request("https://backend.example/api/chat",{method:"POST",headers:{"content-type":"application/json","origin":"https://www.migfarm.com"},body:JSON.stringify({message,session_id:`v26-place-${index}`,conversation_state:staleState})});
  const res=await POST(req);assert.equal(res.status,200);const data=await res.json();
  assert.equal(data.version,"29.0.0");assert.equal(data.mode,"conversational_reasoning_natural_language_os_v29");assert.equal(data.source,"branches");
  assert.match(data.reply,/الشارقة/);assert.match(data.reply,/العين/);assert.doesNotMatch(data.reply,/جرعة|جرعه|سماد قديم|مبيد قديم|99/);
  assert.equal(data.current_turn_router?.mode,"current_turn_sovereignty_and_compound_message_router");assert.equal(data.current_turn_router?.version,"27.0");assert.equal(data.conversation_state.active_product_context,undefined);assert.equal(data.conversation_state.category,"");
}

const productMessage="المنتج ده ينفع في مكان مكشوف؟";
const productFrame=buildSemanticFrame({message:productMessage,analysis:{intent:"unknown"},state:staleState,history:[]});
assert.equal(detectCurrentTurnPriorityV26({message:productMessage,analysis:{intent:"unknown"},semanticFrame:productFrame}),null);
const mixed="جرعة المنتج ده كام ومكانكم فين؟";const mixedFrame=buildSemanticFrame({message:mixed,analysis:{intent:"unknown"},state:staleState,history:[]});
assert.equal(Boolean(mixedFrame.compound.is_multi_intent),true);assert.equal(detectCurrentTurnPriorityV26({message:mixed,analysis:{intent:"unknown"},semanticFrame:mixedFrame}),null);

const clean=quarantineCurrentTurnStateV26(staleState);assert.equal(clean.category,"");assert.equal(clean.active_product_context,undefined);assert.deepEqual(clean.visible_products,[]);
assert.equal(currentTurnRouterHealth().version,"26.0");
console.log("V26 Current-Turn Sovereignty regression PASS");
