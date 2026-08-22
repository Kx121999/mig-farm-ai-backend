import assert from 'node:assert/strict';
process.env.AI_PIPELINE_V41='true';
process.env.AI_PIPELINE_V40='true';
process.env.AI_PIPELINE_V33='true';
process.env.UNIFIED_SEMANTIC_V33_ENABLED='true';
delete process.env.OPENAI_API_KEY;
const {runProductionClosureV41,buildSemanticDegradedResponseV41,productionClosureHealthV41}=await import('../lib/production_closure_v41.js');

function frame(primary,domain='social'){
  return {language:'ar',dialect:'egyptian',domain,primary_intent:primary,corrected_goal_intent:null,intents:[{name:primary,confidence:.95}],speech_act:'question',topic_relationship:'new_topic',context_policy:{use_recent_context:false,ignore_old_product:true,ignore_old_agriculture:true,requires_visible_choice:false},entities:{emirate:null,crop:null,cultivation:null,category:null,product_name:null,product_reference:null,quantity:null,budget_aed:null,symptoms:[],decision_criteria:[]},reference:{requires_context:false,target:'none',resolved_text:null,confidence:0},ambiguity:{required:false,missing_information:null,question:null},response_plan:{mode:'social',external_facts_required:false,answer_order:[primary],max_questions:1,tone:'natural'},compound:false,safe_direct_reply:null,meaning_summary:primary,confidence:.95};
}

for(const [intent,message,rx] of [['identity','انتا مين',/MIG FARM AI/],['wellbeing','كيفك',/.{4,}/],['help_request','ممكن تساعدني',/.{4,}/]]){
  const semantic=buildSemanticDegradedResponseV41({message,meaningFrame:frame(intent),conversationState:{},route:{}});
  assert.match(semantic.reply,rx);assert.equal(/التحليل الذكي غير متاح|خدمة الفهم الذكي متوقفة/i.test(semantic.reply),false);
}

const universal='وصلني كلامك: «انتا مين». التحليل الذكي غير متاح للحظة، فالأفضل تعيد المحاولة بدل ما أرد عليك بتخمين.';
const result=await runProductionClosureV41({message:'انتا مين',conversationId:'v41-unit',state:{},history:[],meaningFrame:frame('identity'),semanticFrame:{},analysis:{intent:'identity',v31_primary_intent:'identity'},generate:async()=>null,fallback:async()=>({payload:{reply:universal,display_reply:universal},source:'unified_degraded_v33',results:[],evidence:[]})});
assert.equal(/التحليل الذكي غير متاح|خدمة الفهم الذكي متوقفة/i.test(result.payload.reply),false);
assert.equal(result.payload.__production_closure_v41,true);assert.equal(result.payload.production_closure_v41.single_final_orchestrator,true);assert.equal(result.response_origin_v41,'SEMANTIC_DEGRADED');
const health=productionClosureHealthV41();assert.equal(health.enabled,true);assert.equal(health.universal_canned_final_response,false);
console.log('V41 production closure PASS');
