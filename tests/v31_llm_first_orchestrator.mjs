import assert from "node:assert/strict";
import {
  understandTurnV31, applyMeaningFrameV31, shouldQuarantineContextV31,
  allowLegacyRouteV31, allowLegacyCompoundV31, auditMeaningAlignmentV31,
  enforceMeaningAlignmentV31, llmFirstHealthV31
} from "../lib/llm_first_orchestrator_v31.js";

function structured(overrides={}){
  const primary=overrides.primary_intent||"identity";
  return {
    language:"ar",dialect:"egyptian",domain:"social",primary_intent:primary,intents:[{name:primary,confidence:.99}],speech_act:"question",topic_relationship:"new_topic",
    context_policy:{use_recent_context:false,ignore_old_product:true,ignore_old_agriculture:true,requires_visible_choice:false},
    entities:{emirate:null,crop:null,cultivation:null,category:null,product_name:null,product_reference:null,quantity:null,budget_aed:null,symptoms:[],decision_criteria:[]},
    reference:{requires_context:false,target:"none",resolved_text:null,confidence:0},ambiguity:{required:false,missing_information:null,question:null},
    response_plan:{mode:"social",external_facts_required:false,answer_order:[primary],max_questions:0,tone:"natural Egyptian Arabic"},compound:false,
    safe_direct_reply:"أنا MIG FARM AI، مساعدك للمنتجات والزراعة وخدمات MIG FARM.",meaning_summary:"العميل يسأل عن هوية المساعد",confidence:.99,...overrides
  };
}
function responseJson(value){return {ok:true,status:200,json:async()=>({id:"resp-v31",output:[{type:"message",content:[{type:"output_text",text:JSON.stringify(value)}]}]})};}

process.env.OPENAI_API_KEY="";
const poisonedState={turn:7,topic:"product",last_intent:"known_product_info",selected_product:"مبيد قديم",active_product_context:{product:{name:"مبيد قديم",sku:"OLD-1"}},dialogue_v29:{expected:{active:true,field:"product_selection",intent:"known_product_info",question:"اسم المنتج؟"}}};
let frame=await understandTurnV31({message:"اسمك ايه؟",state:poisonedState,legacyAnalysis:{intent:"known_product_info"}});
assert.equal(frame.primary_intent,"identity");
assert.equal(frame.authoritative,true);
assert.equal(frame.topic_relationship,"new_topic");
assert.equal(frame.context_policy.ignore_old_product,true);
assert.equal(shouldQuarantineContextV31(frame),true);
const analysis={intent:"known_product_info",memoryAction:"current"},semanticFrame={intents:[{name:"known_product_info"}]};
applyMeaningFrameV31(analysis,semanticFrame,frame);
assert.equal(analysis.intent,"identity");
assert.equal(analysis.memoryAction,undefined);
assert.equal(semanticFrame.primary_intent,"identity");
assert.equal(allowLegacyRouteV31("known_product_info",frame),false);
assert.equal(allowLegacyRouteV31("identity",frame),true);
assert.equal(allowLegacyCompoundV31(frame),false);

let audit=auditMeaningAlignmentV31({message:"اسمك ايه؟",frame,payload:{reply:"الجرعة لا تتحدد من غير اسم المنتج وصورة الملصق."},source:"legacy_dose_template"});
assert.equal(audit.passed,false);
assert.ok(audit.flags.includes("stale_agriculture_context_leak"));
let fixed=enforceMeaningAlignmentV31({payload:{reply:"الجرعة لا تتحدد من غير اسم المنتج."},frame,audit});
assert.match(fixed.reply,/MIG FARM AI/);
assert.equal(/جرع|مبيد|ملصق/.test(fixed.reply),false);

frame=await understandTurnV31({message:"وين مكانكم؟",state:poisonedState,legacyAnalysis:{intent:"known_product_info"}});
assert.equal(frame.primary_intent,"branches");
assert.equal(frame.authoritative,true);
assert.equal(allowLegacyRouteV31("branches",frame),true);
assert.equal(allowLegacyRouteV31("known_product_info",frame),false);
audit=auditMeaningAlignmentV31({message:"وين مكانكم؟",frame,payload:{reply:"الجرعة لازم من الملصق."},source:"legacy"});
assert.equal(audit.passed,false);
fixed=enforceMeaningAlignmentV31({payload:{reply:"الجرعة لازم من الملصق."},frame,audit});
assert.match(fixed.reply,/الشارقة والعين/);

const originalFetch=globalThis.fetch;
process.env.OPENAI_API_KEY="test-v31-key";
globalThis.fetch=async (_url,options)=>{
  const body=JSON.parse(options.body);
  assert.equal(body.store,false);
  assert.equal(body.text.format.name,"mig_farm_meaning_v31");
  const incoming=JSON.parse(body.input[0].content[0].text);
  assert.match(incoming.latest_customer_message,/مش بسأل عن الجرعة/);
  return responseJson(structured());
};
frame=await understandTurnV31({message:"أنا مش بسأل عن الجرعة أنا بسأل اسمك إيه",history:[{role:"assistant",content:"ابعت اسم المنتج وصورة الملصق"}],state:poisonedState,legacyAnalysis:{intent:"known_product_info"},legacySemanticFrame:{primary_intent:"known_product_info"}});
assert.equal(frame.provider,"openai");
assert.equal(frame.authoritative,true);
assert.equal(frame.primary_intent,"identity");
assert.equal(frame.context_policy.use_recent_context,false);
globalThis.fetch=originalFetch;
process.env.OPENAI_API_KEY="";

assert.equal(llmFirstHealthV31().version,"31.0");
assert.equal(llmFirstHealthV31().priority,"full_utterance_before_legacy_routes");

process.env.MIG_V27_KNOWLEDGE_TRANSPORT="local";
process.env.MIG_ENTERPRISE_RETRIEVAL_ENABLED="false";
process.env.OPENAI_VECTOR_STORE_ID="";
process.env.ODOO_ACTIONS_ENABLED="false";
const { POST }=await import("../api/chat.js");
async function ask(message,conversationState){
  const response=await POST(new Request("https://backend.example/api/chat",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({session_id:`v31-poison-${message}`,locale:"ar",message,conversation_state:conversationState})}));
  assert.equal(response.status,200);return response.json();
}
const identityResponse=await ask("اسمك ايه؟",poisonedState);
assert.equal(identityResponse.version,"31.0.0");
assert.equal(identityResponse.mode,"llm_first_semantic_orchestrator_v31");
assert.equal(identityResponse.llm_first_orchestrator.current.primary_intent,"identity");
assert.equal(identityResponse.llm_first_orchestrator.current.topic_relationship,"new_topic");
assert.match(identityResponse.reply,/MIG FARM AI/);
assert.equal(/جرع|مبيد|ملصق/.test(identityResponse.reply),false);
assert.equal(identityResponse.conversation_state.v,31);
const branchResponse=await ask("وين مكانكم؟",poisonedState);
assert.equal(branchResponse.llm_first_orchestrator.current.primary_intent,"branches");
assert.match(branchResponse.reply,/الشارقة|العين/);
assert.equal(/جرع|مبيد|ملصق/.test(branchResponse.reply),false);
console.log("V31 LLM-first full-utterance orchestrator PASS");
