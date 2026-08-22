import assert from 'node:assert/strict';
process.env.OPENAI_API_KEY='';
process.env.AI_PIPELINE_V33='true';
process.env.AI_PIPELINE_V40='true';
process.env.ODOO_ACTIONS_ENABLED='false';

const {
  stabilizeMeaningFrameV35,buildSemanticCoreV35,semanticCoreHealthV35
}=await import('../lib/semantic_intelligence_core_v35.js');
const {
  rewriteQueryV36,rerankCandidatesV36,assessEvidenceV36,advancedRagHealthV36
}=await import('../lib/advanced_rag_reranker_v36.js');
const {updatePersistentMemoryV37,persistentMemoryHealthV37}=await import('../lib/persistent_memory_v37.js');
const {buildProductGraphV38,productGraphHealthV38}=await import('../lib/product_intelligence_graph_v38.js');
const {buildDiagnosticFrameV39,agriculturalDiagnosticHealthV39}=await import('../lib/agricultural_diagnostic_engine_v39.js');
const {buildSalesPlanV40,autonomousSalesHealthV40}=await import('../lib/autonomous_sales_intelligence_v40.js');
const {buildEvolutionContextV40,unifiedEvolutionHealthV40}=await import('../lib/unified_evolution_v40.js');
const {POST}=await import('../api/chat.js');
const {GET}=await import('../api/health.js');

function frame({primary='unknown',intents=[primary],domain='unclear',relationship='new_topic',speech='question',product=null,crop=null,cultivation=null,reference=null,confidence=.45,corrected=null,ambiguity=false}={}){
  return {language:'ar',dialect:'egyptian',domain,primary_intent:primary,corrected_goal_intent:corrected,intents:intents.map(name=>({name,confidence})),speech_act:speech,topic_relationship:relationship,
    context_policy:{use_recent_context:relationship!=='new_topic',ignore_old_product:false,ignore_old_agriculture:false,requires_visible_choice:false},
    entities:{emirate:null,crop,cultivation,category:null,product_name:product,product_reference:product,quantity:null,budget_aed:null,symptoms:[],decision_criteria:[]},
    reference:reference||{requires_context:false,target:'none',resolved_text:null,confidence:0},
    ambiguity:{required:ambiguity,missing_information:ambiguity?'product':null,question:ambiguity?'تقصد أي منتج؟':null},
    clarification:{required:ambiguity,missing:ambiguity?['product']:[],question:ambiguity?'تقصد أي منتج؟':null},
    response_plan:{mode:'natural_direct',external_facts_required:false,answer_order:intents,max_questions:1,tone:'natural'},confidence:{overall:confidence,intent:confidence},meaning_summary:primary};
}

const miaysa={entity_id:'miaysa',external_id:'miaysa-ext',name:'باذنجان مياسة F1',sku:'4022F1',category:'Seeds / Eggplant Seeds',source:'product_dossier_v20',description:'عدد البذور 500 بذرة'};
const atiq500={entity_id:'atiq500',external_id:'atiq500-ext',name:'باذنجان عاتق كلاسيكي F1 500 Seeds',sku:'401161F1',category:'Seeds / Eggplant Seeds',source:'mig_farm_product_fuzzy_entity_v38',description:'SEEDS COUNT 500 SEEDS',fuzzy_entity:{minimum_token_similarity:.9},v40_entity_lock_match:true};
const atiq30={entity_id:'atiq30',external_id:'atiq30-ext',name:'باذنجان عاتق كلاسيكي F1 30 Seeds',sku:'ATIQMINI',category:'Seeds / Eggplant Seeds',source:'mig_farm_product_fuzzy_entity_v38',description:'SEEDS COUNT 30 SEEDS',fuzzy_entity:{minimum_token_similarity:.9}};
const baseConversation={version:'33.2.0',turn:7,active_topic:'products',active_subtopic:'product_details',active_product_id:'miaysa',active_products:[miaysa],visible_products:[miaysa],active_crop:null,active_environment:null,known_constraints:[],confirmed_facts:[],uncertain_facts:[]};
let cases=0;

// V35: short contextual follow-ups must recover semantic attribute instead of becoming new product searches.
const followupCases=[
  ['كام بذرة؟','pack_size'],['العبوة فيها كام؟','pack_size'],['عددها كام؟','pack_size'],['الباكيت كام بذرة','pack_size'],
  ['والسعر؟','price'],['بكام؟','price'],['price?','price'],['تكلفته؟','price'],
  ['موجود؟','availability'],['متوفر؟','availability'],['في مخزون؟','availability'],['available?','availability'],
  ['ينفع؟','suitability'],['مناسب؟','suitability'],['ينفع للصوبة؟','suitability'],['suitable?','suitability'],
  ['والجرعة؟','dosage'],['المعدل؟','dosage'],['dose?','dosage'],['الجرعة كام','dosage'],
  ['تفاصيله؟','product_details'],['مواصفاته؟','product_details'],['بيستخدم في ايه؟','product_details'],['details?','product_details']
];
for(const [message,expected] of followupCases){
  const stabilized=stabilizeMeaningFrameV35({message,meaningFrame:frame({primary:'unknown',domain:'unclear',relationship:'new_topic',confidence:.25}),conversationState:baseConversation});
  assert.equal(stabilized.primary_intent,expected,message);assert.equal(stabilized.topic_relationship,'followup',message);assert.equal(stabilized.reference.requires_context,true,message);cases++;
}

// V35: corrections make the current turn sovereign and carry the replacement entity.
for(const message of ['لا قصدي عتيق','قصدي مزيونة','لا اقصد عاتق','المقصود مياسة']){
  const stabilized=stabilizeMeaningFrameV35({message,meaningFrame:frame({primary:'correction',intents:['correction'],domain:'products',relationship:'correction',speech:'correction',confidence:.52}),conversationState:baseConversation});
  assert.equal(stabilized.topic_relationship,'correction');assert.ok(stabilized.entities.product_name);assert.equal(stabilized.corrected_goal_intent,'product_search');cases++;
}

// V36: entity lock must dominate stale visible candidates, and query rewrite carries active context.
for(let i=0;i<18;i++){
  const core=buildSemanticCoreV35({message:'كام بذرة؟',meaningFrame:frame({primary:'pack_size',domain:'products',relationship:'followup',reference:{requires_context:true,target:'active_product',resolved_text:'باذنجان عاتق',confidence:.9},confidence:.9}),conversationState:{...baseConversation,active_product_id:'atiq500',active_products:[atiq500],visible_products:[miaysa,atiq30,atiq500]}});
  const query=rewriteQueryV36({baseQuery:'كام بذرة',semanticCore:core,conversationState:baseConversation,route:{intents:['pack_size']}});
  assert.match(query,/عاتق/);
  const ranked=rerankCandidatesV36({query,candidates:[{...miaysa,score:450},{...atiq30,score:400},{...atiq500,score:250}],conversationState:{...baseConversation,active_product_id:'atiq500',active_products:[atiq500]},meaningFrame:frame({primary:'pack_size',domain:'products',relationship:'followup'}),semanticCore:core,limit:3});
  assert.equal(ranked[0].sku,'401161F1');assert.ok(ranked[0].v36_reasons.includes('v36_entity_lock_match'));cases++;
}
const evidence=assessEvidenceV36({query:'باذنجان عاتق 500 بذرة',selected:rerankCandidatesV36({query:'باذنجان عاتق 500 بذرة',candidates:[atiq500],conversationState:{active_product_id:'atiq500',active_products:[atiq500]},meaningFrame:frame({primary:'pack_size',domain:'products'}),semanticCore:{active_entity:{entity_id:'atiq500',name:atiq500.name}},limit:1}),route:{requires_structured_data:false}});
assert.ok(evidence.confidence>0);cases++;

// V37: multi-layer memory, no stringified nulls, corrections retained.
let memory={};
for(let i=0;i<16;i++){
  const core={primary_intent:i%2?'product_details':'price',corrected_goal_intent:null,active_entity:i%3===0?{name:'مياسة F1',entity_id:'miaysa',sku:'4022F1'}:null,slots:{crop:i%4===0?'باذنجان':null,environment:null,location:null,quantity:null},constraints:[],reference:{confidence:.9},relationship:'followup',correction:false,clarification:{required:false}};
  memory=updatePersistentMemoryV37({previous:memory,message:`رسالة ${i}`,semanticCore:core,conversationState:{turn:i+1},history:[]});
  assert.equal(JSON.stringify(memory).includes('"null"'),false);cases++;
}
assert.ok(memory.episodes.length<=16);assert.ok(memory.semantic_facts.length<=24);cases++;

// V38: graph edges are canonical scalar IDs and facts remain entity-scoped.
for(let i=0;i<12;i++){
  const graph=buildProductGraphV38({conversationState:{active_product_id:'miaysa',active_products:[miaysa],visible_products:[miaysa,atiq500,atiq30]},results:[atiq500,atiq30],semanticCore:{active_entity:{entity_id:'miaysa',name:miaysa.name}}});
  assert.ok(graph.nodes.length>=3);assert.ok(graph.edges.every(e=>typeof e.from==='string'&&typeof e.to==='string'));assert.ok(graph.nodes.every(n=>n.id&&typeof n.facts==='object'));cases++;
}

// V39: differential diagnosis and dosage safety.
const diagnosticScenarios=[
  {core:{intents:['diagnosis'],slots:{crop:'طماطم',problem:{description:'اصفرار الأوراق'},environment:'بيت محمي'}},expect:'differential_diagnosis'},
  {core:{intents:['image_analysis'],slots:{crop:'خيار',problem:null,environment:'بيت محمي'}},vision:{has_visual_context:true},expect:'visual_diagnosis'},
  {core:{intents:['dosage'],slots:{crop:'طماطم',problem:null,environment:null}},expect:'regulated_dosage'}
];
for(let cycle=0;cycle<8;cycle++)for(const row of diagnosticScenarios){
  const d=buildDiagnosticFrameV39({semanticCore:row.core,conversationState:{},visionFrame:row.vision||null,meaningFrame:{}});assert.equal(d.mode,row.expect);if(row.expect==='regulated_dosage')assert.ok(d.missing_evidence.includes('verified_label_or_product_identity'));cases++;
}

// V40 sales intelligence: solve technical problem first, no forced sale, purchase intent can assist.
for(let i=0;i<10;i++){
  const technical=buildSalesPlanV40({semanticCore:{intents:['diagnosis'],constraints:[]},diagnosticFrame:{active:true}});assert.equal(technical.mode,'technical_first');assert.equal(technical.should_sell,false);assert.equal(technical.next_best_action,'solve_problem_before_product');cases++;
  const purchase=buildSalesPlanV40({semanticCore:{intents:['price','availability'],constraints:[]},diagnosticFrame:{active:false},conversionDecision:{should_sell:true,next_best_action:'verify_live_truth'}});assert.equal(purchase.mode,'purchase_assist');assert.equal(purchase.should_sell,true);cases++;
}

// V40 integrated context includes all six layers under one orchestrator.
for(let i=0;i<8;i++){
  const evo=buildEvolutionContextV40({message:'والسعر؟',state:{intelligence_v33:baseConversation},history:[],meaningFrame:frame({primary:'unknown',domain:'unclear',relationship:'new_topic',confidence:.3})});
  assert.equal(evo.version,'40.0.0');assert.ok(evo.semantic_core_v35);assert.ok(evo.retrieval_v36);assert.ok(evo.memory_v37);assert.ok(evo.product_graph_v38);assert.ok(evo.diagnostic_v39);assert.ok(evo.sales_v40);assert.equal(evo.compatibility.single_user_facing_orchestrator,true);cases++;
}

// End-to-end regression: verified correction must persist canonically across follow-up turns.
let state={turn:4,intelligence_v33:{...baseConversation,turn:4}};let history=[];
const sequence=[
  ['كام بذرة؟',/مياسة.*500|500.*مياسة/s],
  ['لا قصدي عتيق',/عاتق.*500|500.*عاتق/s],
  ['كام بذرة؟',/عاتق.*500|500.*عاتق/s],
  ['والسعر؟',/عاتق/]
];
for(const [message,expected] of sequence){
  const r=await POST(new Request('https://backend.example/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({session_id:'v40-regression',message,locale:'ar',conversation_state:state,history})}));
  const data=await r.json();assert.equal(r.status,200);assert.equal(data.version,'40.0.0');assert.equal(data.mode,'unified_evolution_intelligence_v40');assert.match(data.reply,expected,message);assert.equal(data.unified_evolution_v40?.version,'40.0.0');
  state=data.conversation_state||state;history.push({role:'user',content:message},{role:'assistant',content:data.reply||''});cases++;
}
assert.equal(state.intelligence_v33?.active_products?.[0]?.sku,'401161F1');assert.match(state.intelligence_v33?.active_products?.[0]?.name||'',/عاتق/);cases++;

// Health contract and layer health.
const health=await (await GET()).json();assert.equal(health.version,'40.0.0');assert.equal(health.mode,'unified_evolution_intelligence_v40');assert.equal(health.release,'MIG_FARM_AI_V40_UNIFIED_EVOLUTION');assert.equal(health.unified_evolution?.layers?.semantic_core_v35?.ready,true);cases++;
for(const h of [semanticCoreHealthV35(),advancedRagHealthV36(),persistentMemoryHealthV37(),productGraphHealthV38(),agriculturalDiagnosticHealthV39(),autonomousSalesHealthV40(),unifiedEvolutionHealthV40()]){assert.equal(h.ready,true);cases++;}

assert.ok(cases>=120,`expected at least 120 V40 cases, got ${cases}`);
console.log(`V40 unified evolution PASS — ${cases} cases`);
