import assert from "node:assert/strict";
import {
  buildConversationStateV33,routeIntelligenceV33,rewriteQueryV33,rerankCandidatesV33,
  validateUnifiedResponseV33,runUnifiedIntelligenceV33,unifiedIntelligenceHealthV33
} from "../lib/unified_intelligence_v33.js";

process.env.AI_PIPELINE_V33="true";

function frame({primary="unknown",intents=[primary],domain="unclear",relationship="new_topic",speech="question",product=null,crop=null,reference=null,ignoreProduct=false,ignoreAgriculture=false}={}){
  return {language:"ar",dialect:"egyptian",domain,primary_intent:primary,intents:intents.map(name=>({name,confidence:.94})),speech_act:speech,topic_relationship:relationship,
    context_policy:{use_recent_context:relationship!=="new_topic",ignore_old_product:ignoreProduct,ignore_old_agriculture:ignoreAgriculture,requires_visible_choice:false},
    entities:{emirate:null,crop,cultivation:null,category:null,product_name:product,product_reference:product,quantity:null,budget_aed:null,symptoms:[],decision_criteria:[]},
    reference:reference||{requires_context:false,target:"none",resolved_text:null,confidence:0},ambiguity:{required:false,missing_information:null,question:null},
    response_plan:{mode:"tool_grounded",external_facts_required:domain!=="social",answer_order:intents,max_questions:1,tone:"natural"},compound:intents.length>1,safe_direct_reply:null,meaning_summary:primary,confidence:.94};
}
const productA={entity_id:"p-a",name:"مياسة F1",sku:"A-500",external_id:"a",category:"Seeds / Eggplant Seeds"};
const productB={entity_id:"p-b",name:"مزيونة F1",sku:"B-500",external_id:"b",category:"Seeds / Eggplant Seeds"};
const productC={entity_id:"p-c",name:"عتيق F1",sku:"C-500",external_id:"c",category:"Seeds / Eggplant Seeds"};
const base={turn:4,intelligence_v33:{version:"33.0",turn:4,active_topic:"products",active_subtopic:"product_search",active_products:[productA],visible_products:[productA,productB,productC],active_product_id:"p-a",active_crop:"باذنجان",known_constraints:[],confirmed_facts:[],uncertain_facts:[],last_route:"product_discovery"}};

let cases=0;
const followups=["والسعر؟","والعبوة؟","طب ده؟","ينفع؟","هو موجود؟","والتاني؟","آخر واحد؟","نفسه كام؟","طيب للصوبة؟","عدده إيه؟"];
for(let cycle=0;cycle<4;cycle++)for(const message of followups){
  const ordinal=/التاني/.test(message)?{requires_context:true,target:"visible_product",resolved_text:"مزيونة F1",confidence:.95}:{requires_context:true,target:"active_product",resolved_text:"مياسة F1",confidence:.9};
  const state=buildConversationStateV33({message,state:base,meaningFrame:frame({primary:cycle%2?"product_details":"price",domain:"products",relationship:"followup",reference:ordinal})});
  assert.ok(state.active_product_id,message);assert.ok(state.last_reference_resolution.resolved,message);cases+=1;
}

const correctionMessages=["لا، أقصد الأبيض","مش ده، اللي بعده","صححها لعتيق","قصدي الصنف الثاني","بدّل للأبيض","لا المنتج الآخر","أنا بتكلم عن مزيونة","رجّعني للخيار الثاني","استبدل مياسة بمزيونة","مش مياسة"];
for(const message of correctionMessages){
  const state=buildConversationStateV33({message,state:base,meaningFrame:frame({primary:"correction",domain:"products",relationship:"new_topic",speech:"correction",ignoreProduct:true})});
  assert.equal(state.visible_products.length,3,message);if(/الثاني|بعده|الخيار الثاني/.test(message))assert.equal(state.active_product_id,"p-b",message);else assert.equal(state.active_product_id,null,message);assert.equal(state.last_correction?.supersedes_previous,true,message);cases+=1;
}

const topicSwitches=[
  ["شكراً","thanks","social"],["اسمك إيه","identity","social"],["فين الفرع","branches","mig_farm_business"],["التوصيل للعين؟","shipping","mig_farm_business"],
  ["عندي اصفرار","diagnosis","agriculture"],["عايز تايمر ري","product_search","products"],["الدفع إزاي","payment","mig_farm_business"],["مع السلامة","goodbye","social"],
  ["عايز أكلم موظف","human","social"],["وقت الدوام؟","hours","mig_farm_business"]
];
for(let cycle=0;cycle<3;cycle++)for(const [message,primary,domain] of topicSwitches){
  const state=buildConversationStateV33({message,state:base,meaningFrame:frame({primary,domain,relationship:"new_topic",ignoreProduct:domain!=="products",ignoreAgriculture:domain!=="agriculture"})});
  if(domain!=="products")assert.equal(state.active_products.length,0,message);assert.equal(state.active_topic,domain,message);cases+=1;
}

const routeCases=[
  ["thanks","social","conversation_only"],["branches","mig_farm_business","business"],["price","products","product_exact"],["availability","products","product_exact"],
  ["product_search","products","product_discovery"],["recommendation","products","product_discovery"],["purchase","commerce","commerce"],["diagnosis","agriculture","technical"],
  ["image_analysis","products","multimodal"]
];
for(let cycle=0;cycle<3;cycle++)for(const [primary,domain,expected] of routeCases){
  const state=buildConversationStateV33({message:primary,state:{},meaningFrame:frame({primary,domain})});const route=routeIntelligenceV33({meaningFrame:frame({primary,domain}),conversationState:state,hasImages:primary==="image_analysis"});
  assert.equal(route.kind,expected,primary);cases+=1;
}
const multi=routeIntelligenceV33({meaningFrame:frame({primary:"diagnosis",intents:["diagnosis","price","availability"],domain:"mixed"}),conversationState:base});
assert.equal(multi.kind,"multi_source");assert.equal(multi.tasks.length,3);cases+=1;

for(let i=0;i<12;i++){
  const ranked=rerankCandidatesV33({query:`باذنجان أبيض ${i}`,candidates:[{...productA,description:"باذنجان بنفسجي طويل",score:30},{...productB,description:"باذنجان أبيض",score:25},{...productC,description:"باذنجان طويل",score:20}],conversationState:{active_crop:"باذنجان",active_products:[],visible_products:[]},meaningFrame:frame({primary:"product_search",domain:"products",crop:"باذنجان"})});
  assert.equal(ranked[0].entity_id,"p-b");cases+=1;
}

const rewrite=rewriteQueryV33({message:"والسعر؟",meaningFrame:frame({primary:"price",domain:"products",relationship:"followup",reference:{requires_context:true,target:"active_product",resolved_text:"مياسة F1",confidence:.9}}),conversationState:base.intelligence_v33,route:{intents:["price"]}});
assert.match(rewrite,/مياسة F1/);assert.match(rewrite,/باذنجان/);cases+=1;

for(let i=0;i<12;i++){
  const validation=validateUnifiedResponseV33({message:"سعره كام؟",payload:{reply:`سعر مياسة ${40+i} درهم`},meaningFrame:frame({primary:"price",domain:"products"}),conversationState:base,route:{kind:"product_exact",intents:["price"]},evidence:[{facts:[{value:`${40+i} درهم`}]}],results:[productA]});
  assert.equal(validation.accepted,true);cases+=1;
}
const hallucinated=validateUnifiedResponseV33({message:"سعره؟",payload:{reply:"سعره 999 درهم"},meaningFrame:frame({primary:"price",domain:"products"}),conversationState:base,route:{kind:"product_exact",intents:["price"]},evidence:[{facts:[{value:"35 درهم"}]}],results:[productA]});
assert.equal(hallucinated.accepted,false);assert.ok(hallucinated.hard_blocks.includes("grounding_failure"));cases+=1;

let generations=0;
const run=await runUnifiedIntelligenceV33({message:"سعره كام؟",conversationId:"v33-unit",state:base,meaningFrame:frame({primary:"price",domain:"products",relationship:"followup",reference:{requires_context:true,target:"active_product",resolved_text:"مياسة F1",confidence:.9}}),generate:async context=>{generations+=1;return generations===1?{payload:{reply:"سعره 999 درهم"},source:"mock",results:[productA],evidence:[{facts:[{value:"35 درهم"}]}]}:{payload:{reply:"سعر مياسة F1 هو 35 درهم"},source:"mock_repair",results:[productA],evidence:[{facts:[{value:"35 درهم"}]}]};}});
assert.equal(run.validation.accepted,true);assert.equal(generations,2);assert.equal(run.payload.unified_intelligence_v33.route,"product_exact");cases+=1;

assert.ok(cases>=120,`expected >=120 architecture cases, got ${cases}`);
assert.equal(unifiedIntelligenceHealthV33().architecture,"single_semantic_orchestrator");
console.log(`V33 unified intelligence architecture PASS — ${cases} cases`);
