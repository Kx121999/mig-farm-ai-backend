import assert from "node:assert/strict";
process.env.OPENAI_API_KEY="";
process.env.ODOO_ACTIONS_ENABLED="false";
process.env.AI_PIPELINE_V33="true";

const { analyzeTurn }=await import("../lib/dialogue.js");
const { understandTurnV31 }=await import("../lib/llm_first_orchestrator_v31.js");
const { handleAutonomousAction }=await import("../lib/autonomous_action_os.js");
const { POST }=await import("../api/chat.js");
const { GET }=await import("../api/health.js");

const activeProductState={turn:4,intelligence_v33:{version:"33.2.0",turn:4,active_topic:"products",active_product_id:"p1",active_products:[{entity_id:"p1",name:"مياسة F1",sku:"M1"}],visible_products:[{entity_id:"p1",name:"مياسة F1",sku:"M1"}]}};

// Correction remains the primary state/speech-act intent; the substantive replacement goal is preserved separately and routed.
for(const [message,expected] of [
  ["أنا مش بسأل عن الجرعة، أنا بسأل اسمك إيه؟","identity"],
  ["لا مش قصدي ده، قصدي السعر","price"],
  ["لا قصدي التوفر","availability"],
  ["مش السعر، قصدي الجرعة","dosage"]
]){
  const legacy=analyzeTurn(message,activeProductState,[],"ar");
  const frame=await understandTurnV31({message,state:activeProductState,history:[],legacyAnalysis:legacy,locale:"ar"});
  assert.equal(frame.primary_intent,"correction",message);
  assert.equal(frame.corrected_goal_intent,expected,message);
  assert.equal(frame.intents.some(x=>x.name===expected),true,message);
  assert.equal(frame.response_plan.answer_order.includes(expected),true,message);
  assert.equal(frame.speech_act,"correction",message);
  assert.equal(frame.topic_relationship,"correction",message);
}

// A crop named inside a suitability question is a constraint on the active product,
// not a new seed/product-search subject.
{
  const message="هل ينفع للطماطم؟";
  const frame=await understandTurnV31({message,state:activeProductState,history:[],legacyAnalysis:analyzeTurn(message,activeProductState,[],"ar"),locale:"ar"});
  assert.equal(frame.primary_intent,"suitability");
  assert.equal(frame.topic_relationship,"followup");
}

// Pending action transitions are server-authoritative and resolved deterministically.
{
  const pending={active:true,version:"25.0",id:"act-1",kind:"quotation",status:"awaiting_confirmation",created_turn:2,expires_turn:8,attempts:0,summary:"draft",lines:[{name:"مياسة F1",sku:"M1",quantity:1}],required_fields:["name","phone"],result:null};
  const out=await handleAutonomousAction({message:"لا",state:{turn:3,autonomous_action:pending},resolvePendingOnly:true,locale:"ar"});
  assert.equal(out.handled,true);
  assert.equal(out.state.status,"cancelled");
  assert.match(out.payload.reply,/ألغيت|الغيت/);
}

// End-to-end: current correction must beat stale product/dosage context even with provider unavailable.
{
  const poisoned={turn:9,topic:"product",crop:"cucumber",active_product_context:{active:true,product:{name:"مبيد قديم"}},intelligence_v33:{version:"33.2.0",turn:9,active_topic:"products",active_product_id:"old",active_products:[{entity_id:"old",name:"مبيد قديم"}],visible_products:[{entity_id:"old",name:"مبيد قديم"}]}};
  const r=await POST(new Request("https://backend.example/api/chat",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({session_id:"v33-2-correction",message:"أنا مش بسأل عن الجرعة، أنا بسأل اسمك إيه؟",locale:"ar",conversation_state:poisoned,history:[{role:"assistant",content:"ابعت الملصق عشان الجرعة"}]})}));
  const data=await r.json();
  assert.equal(r.status,200);
  assert.equal(data.version,"33.2.0");
  assert.equal(data.mode,"unified_semantic_intelligence_v33");
  assert.match(data.reply,/MIG FARM AI/);
  assert.equal(/أعد المحاولة|اعادة المحاولة|جرع|ملصق/.test(data.reply),false);
}

{
  const health=await (await GET()).json();
  assert.equal(health.version,"33.2.0");
  assert.equal(health.mode,"unified_semantic_intelligence_v33");
  assert.equal(health.release,"UNIFIED_SEMANTIC_INTELLIGENCE_V33");
}

console.log("V33.2 semantic regression PASS");
