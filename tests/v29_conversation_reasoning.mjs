import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { analyzeTurn, updateState } from "../lib/dialogue.js";
import {
  reasonConversationTurnV29, applyConversationReasoningV29, updateDialogueStateV29,
  composeNaturalResponseV29, contextualClarificationV29, conversationReasoningHealthV29
} from "../lib/conversation_reasoning_v29.js";

function resolve(message,state){
  const analysis=analyzeTurn(message,state,[],"ar");
  const reasoning=reasonConversationTurnV29({message,state,analysis,history:[]});
  applyConversationReasoningV29(analysis,reasoning);
  return {analysis,reasoning};
}

const branchState={turn:2,topic:"branches",dialogue_v29:{expected:{active:true,field:"branch",intent:"branches",question:"تحب بيانات أنهي فرع؟",choices:["فرع الشارقة","فرع العين"],asked_turn:2,expires_turn:4}}};
for(const [message,emirate] of [["العين","العين"],["3ain","العين"],["فرع الشارقه","الشارقة"],["sharjah","الشارقة"]]){
  const {analysis,reasoning}=resolve(message,branchState);
  assert.equal(analysis.intent,"branches",message);
  assert.equal(analysis.emirate,emirate,message);
  assert.equal(reasoning.resolution.resolved,true,message);
  assert.equal(reasoning.resolution.consumed,true,message);
}

const cropState={turn:4,pending:"crop",dialogue_v29:{expected:{active:true,field:"crop",intent:"recommendation",question:"شو المحصول؟",choices:["طماطم","خيار","فلفل","باذنجان"],asked_turn:4,expires_turn:6}}};
for(const [message,crop] of [["خيار","cucumber"],["5yar","cucumber"],["بندورة","tomato"],["بتنجان","eggplant"],["فليفلة","pepper"]]){
  const {analysis}=resolve(message,cropState);
  assert.equal(analysis.intent,"recommendation",message);
  assert.equal(analysis.crop?.key,crop,message);
  assert.equal(analysis.category?.key,"seeds",message);
}

const cultivationState={turn:5,pending:"cultivation",dialogue_v29:{expected:{active:true,field:"cultivation",intent:"recommendation",question:"مكشوف ولا بيت محمي؟",choices:["مكشوف","بيت محمي"],asked_turn:5,expires_turn:7}}};
for(const [message,value] of [["محمي","greenhouse"],["صوبة","greenhouse"],["مكشوف","open_field"],["open field","open_field"]]){
  const {analysis}=resolve(message,cultivationState);assert.equal(analysis.cultivation,value,message);assert.equal(analysis.intent,"recommendation",message);
}

const productState={turn:3,topic:"product",visible_products:[{name:"خيار وفرة F1",price:"35"},{name:"خيار جبارة F1",price:"35"}]};
let result=resolve("التاني",productState);
assert.equal(result.analysis.intent,"product_memory");
assert.equal(result.analysis.memoryAction,"ordinal:1");
assert.equal(result.analysis.v29_reference_product.name,"خيار جبارة F1");

result=resolve("سعره كام",productState);
assert.equal(result.reasoning.reference.ambiguous,true);
assert.equal(result.reasoning.clarification.required,true);
assert.match(contextualClarificationV29(result.reasoning).reply,/أنهي منتج/);

const next=updateState({},analyzeTurn("وين مكانكم",{},[],"ar"),"وين مكانكم","branches",[],{reply:"إحنا موجودين في الشارقة والعين. تحب بيانات أنهي فرع؟",quick_replies:["فرع الشارقة","فرع العين"]});
next.dialogue_v29=updateDialogueStateV29({previous:{},next,analysis:{intent:"branches"},message:"وين مكانكم",source:"branches",payload:{reply:"إحنا موجودين في الشارقة والعين. تحب بيانات أنهي فرع؟",quick_replies:["فرع الشارقة","فرع العين"]}});
assert.equal(next.dialogue_v29.expected.active,true);
assert.equal(next.dialogue_v29.expected.field,"branch");
assert.equal(next.dialogue_v29.expected.choices.length,2);

const natural=composeNaturalResponseV29({payload:{reply:"متوفر عندنا.\n\nمتوفر عندنا.\n\nتحب التفاصيل؟"},reasoning:{resolution:{kind:"expected_crop"}},source:"test"});
assert.equal((natural.reply.match(/متوفر عندنا/g)||[]).length,1);
assert.equal(natural.natural_response_v29.version,"29.0");
assert.equal(conversationReasoningHealthV29().ready,true);

const ui=readFileSync(new URL("../ODOO_CHAT_UI_V30_NEURAL_AUTONOMOUS_CUSTOMER_OS.txt",import.meta.url),"utf8");
for(const marker of ["UI_VERSION='30.0.0'","mig_ai_session_id_v30","function appendSafeInline","white-space:nowrap"])assert.ok(ui.includes(marker),marker);
const uiScript=ui.match(/<!\[CDATA\[([\s\S]*?)\]\]>/)?.[1];assert.ok(uiScript);new Function(uiScript);

process.env.MIG_V27_KNOWLEDGE_TRANSPORT="local";
process.env.MIG_ENTERPRISE_RETRIEVAL_ENABLED="false";
process.env.OPENAI_API_KEY="";
process.env.OPENAI_VECTOR_STORE_ID="";
process.env.ODOO_ACTIONS_ENABLED="false";
const { POST }=await import("../api/chat.js");
const sessionId=`v29-api-${Date.now()}`;
async function ask(body){
  const response=await POST(new Request("https://backend.example/api/chat",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({session_id:sessionId,locale:"ar",...body})}));
  assert.equal(response.status,200);return response.json();
}
const first=await ask({message:"وين مكانكم"});
assert.equal(first.version,"30.0.0");
assert.equal(first.mode,"neural_autonomous_customer_os_v30");
assert.equal(first.conversation_state.dialogue_v29.expected.field,"branch");
const second=await ask({message:"3ain",conversation_state:first.conversation_state,history:[{role:"user",content:"وين مكانكم"},{role:"assistant",content:first.reply}]});
assert.match(second.reply,/\+971 58 176 8215/);
assert.equal(second.conversation_reasoning.current.resolution.kind,"expected_location");
assert.equal(second.reply.includes("ما قدرت أثبت"),false);

console.log("V29 conversational reasoning and natural response PASS");
