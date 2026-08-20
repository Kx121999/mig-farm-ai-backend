import assert from "node:assert/strict";
import { understandTurnV31, applyMeaningFrameV31, parseAgriculturalProblemV31 } from "../lib/llm_first_orchestrator_v31.js";
import { analyzeTurn, updateState, sanitizeState } from "../lib/dialogue.js";

process.env.OPENAI_API_KEY="";
process.env.MIG_V27_KNOWLEDGE_TRANSPORT="local";
process.env.MIG_ENTERPRISE_RETRIEVAL_ENABLED="false";
process.env.OPENAI_VECTOR_STORE_ID="";
process.env.ODOO_ACTIONS_ENABLED="false";

async function meaning(message,state={}){
  const legacy=analyzeTurn(message,state,[],"ar");
  const frame=await understandTurnV31({message,state,legacyAnalysis:legacy});
  applyMeaningFrameV31(legacy,{intents:[]},frame);
  return {frame,analysis:legacy};
}

const cases=[
  ["شتلات الطماطم عليها بقع بنية وبتنتشر","طماطم",/بقع/,/ينتشر/],
  ["النخلة فيها حشرات صغيرة ومادة لزجة","نخيل",/آفة حشرية/,/لزجة/],
  ["جذور الخيار سودا وطرية","خيار",/تعفن/,/الجذور/],
  ["أوراق المانجو مكرمشة والنمو واقف","مانجو",/تجعد/,/توقف النمو/],
  ["عندي شجرة كاكا الورق فيها بقع","كاكا",/بقع/,/الأوراق/]
];
for(const [message,crop,symptom,criterion] of cases){
  const {frame}=await meaning(message);
  assert.equal(frame.primary_intent,"diagnosis",message);
  assert.equal(frame.domain,"agriculture",message);
  assert.equal(frame.entities.crop,crop,message);
  assert.ok(frame.entities.symptoms.some(x=>symptom.test(x)),message);
  assert.ok(criterion.test([...(frame.entities.symptoms||[]),...(frame.entities.decision_criteria||[]),frame.ambiguity.question||""].join(" ")),message);
}

const first=await meaning("عندي شجرة ليمون أوراقها صفراء");
let state=updateState({},first.analysis,"عندي شجرة ليمون أوراقها صفراء","diagnosis_test",[],{reply:"سؤال تشخيصي"});
state=sanitizeState(state);
assert.equal(state.diagnostic_context_v31.active,true);
assert.equal(state.diagnostic_context_v31.crop_label,"ليمون");
assert.ok(state.diagnostic_context_v31.symptoms.includes("اصفرار الأوراق"));

const second=await meaning("القديمة أكتر وبدأ تدريجي",state);
assert.equal(second.frame.primary_intent,"diagnosis");
assert.equal(second.frame.topic_relationship,"answer_to_assistant");
assert.equal(second.frame.entities.crop,"ليمون");
assert.ok(second.frame.entities.symptoms.includes("اصفرار الأوراق"));
assert.ok(second.frame.entities.decision_criteria.some(x=>/القديمة/.test(x)));
assert.ok(second.frame.entities.decision_criteria.some(x=>/تدريجي/.test(x)));
assert.equal(/الجديدة ولا القديمة/.test(second.frame.ambiguity.question||""),false);

const fruitFollowup=parseAgriculturalProblemV31("الثمار بتقع قبل ما تكبر",state);
assert.equal(fruitFollowup.followup,true);
assert.equal(fruitFollowup.crop,"ليمون");
assert.ok(fruitFollowup.symptoms.some(x=>/تساقط/.test(x)));

const order=await meaning("الطلب وصل متأخر والعبوة مكسورة",state);
assert.notEqual(order.frame.primary_intent,"diagnosis");

const { POST }=await import("../api/chat.js");
async function ask(message,conversationState={}){
  const id=`v31-2-${Math.random().toString(36).slice(2)}`;
  const response=await POST(new Request("https://backend.example/api/chat",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({session_id:id,locale:"ar",message,conversation_state:conversationState})}));
  assert.equal(response.status,200,message);
  return response.json();
}
for(const message of ["شتلات الطماطم عليها بقع بنية وبتنتشر","النخلة فيها حشرات صغيرة ومادة لزجة","جذور الخيار سودا وطرية"]){
  const result=await ask(message);
  assert.equal(result.llm_first_orchestrator.current.primary_intent,"diagnosis",message);
  assert.equal(result.conversation_state.diagnostic_context_v31.active,true,message);
  assert.match(result.reply,/فهمت|التشخيص|الاحتمالات|الوصف/,message);
  assert.equal(/منتجات مناسبة|حصلت لك/.test(result.reply),false,message);
}
const lemonApi=await ask("عندي شجرة ليمون أوراقها صفراء");
const lemonFollowupApi=await ask("القديمة أكتر وبدأ تدريجي",lemonApi.conversation_state);
assert.equal(lemonFollowupApi.llm_first_orchestrator.current.primary_intent,"diagnosis");
assert.equal(lemonFollowupApi.llm_first_orchestrator.current.topic_relationship,"answer_to_assistant");
assert.equal(lemonFollowupApi.conversation_state.diagnostic_context_v31.crop_label,"ليمون");
assert.equal(/اسم المحصول|الجديدة ولا القديمة/.test(lemonFollowupApi.reply),false);

console.log("V31.2 universal agricultural problem engine PASS");
