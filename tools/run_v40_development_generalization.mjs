import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
process.env.OPENAI_API_KEY='';
process.env.AI_PIPELINE_V33='true';
process.env.AI_PIPELINE_V40='true';
process.env.ODOO_ACTIONS_ENABLED='false';

const {stabilizeMeaningFrameV35,buildSemanticCoreV35}=await import('../lib/semantic_intelligence_core_v35.js');
const {rewriteQueryV36,rerankCandidatesV36}=await import('../lib/advanced_rag_reranker_v36.js');
const {updatePersistentMemoryV37}=await import('../lib/persistent_memory_v37.js');
const {buildProductGraphV38}=await import('../lib/product_intelligence_graph_v38.js');
const {buildDiagnosticFrameV39}=await import('../lib/agricultural_diagnostic_engine_v39.js');
const {buildSalesPlanV40}=await import('../lib/autonomous_sales_intelligence_v40.js');
const {buildEvolutionContextV40}=await import('../lib/unified_evolution_v40.js');

const started=new Date().toISOString();
const product={entity_id:'hidden-miaysa',external_id:'hidden-miaysa',name:'باذنجان مياسة F1',sku:'4022F1',category:'Seeds / Eggplant Seeds',description:'500 seeds',source:'product_dossier_v20'};
const alt={entity_id:'hidden-atiq',external_id:'hidden-atiq',name:'باذنجان عاتق كلاسيكي F1',sku:'401161F1',category:'Seeds / Eggplant Seeds',description:'500 seeds',source:'mig_farm_product_fuzzy_entity_v38',v40_entity_lock_match:true};
const state={turn:9,active_topic:'products',active_product_id:product.entity_id,active_products:[product],visible_products:[product,alt],known_constraints:[]};
function weakFrame(){return {language:'ar',dialect:'egyptian',domain:'unclear',primary_intent:'unknown',corrected_goal_intent:null,intents:[{name:'unknown',confidence:.2}],speech_act:'question',topic_relationship:'new_topic',context_policy:{use_recent_context:false,ignore_old_product:false,ignore_old_agriculture:false,requires_visible_choice:false},entities:{crop:null,cultivation:null,location:null,product_name:null,product_reference:null,quantity:null,decision_criteria:[]},reference:{requires_context:false,target:'none',resolved_text:null,confidence:0},ambiguity:{required:false},clarification:{required:false,missing:[]},response_plan:{external_facts_required:false,max_questions:1},confidence:{overall:.2,intent:.2}};}
const cases=[];function record(id,ok,meta={}){cases.push({id,passed:Boolean(ok),...meta});if(!ok)throw new Error(`Hidden V40 failed: ${id}`);}

const followups=[
 ['h01','جواه كام حبة','pack_size'],['h02','عدد البذور قد إيه','pack_size'],['h03','الباكيت عدده إيه','pack_size'],['h04','كام seed فيه','pack_size'],['h05','هو بكام درهم','price'],['h06','تكلفته قد إيه','price'],['h07','عايز اعرف السعر بس','price'],['h08','cost كام','price'],['h09','لسه موجود؟','availability'],['h10','في منه بالمخزون؟','availability'],['h11','متاح دلوقتي؟','availability'],['h12','stock موجود؟','availability'],['h13','مناسب للصوبة؟','suitability'],['h14','ينفع داخل البيت المحمي','suitability'],['h15','صالح للزراعة المحمية؟','suitability'],['h16','suitable للجرين هاوس؟','suitability'],['h17','المعدل المستخدم كام؟','dosage'],['h18','عايز الجرعة','dosage'],['h19','dose قد ايه','dosage'],['h20','معدل الاستعمال؟','dosage'],['h21','مواصفاته ايه','product_details'],['h22','قولي استخداماته','product_details'],['h23','تفاصيل المنتج ده','product_details'],['h24','بيعمل ايه بالظبط','product_details']
];
for(const [id,message,expected] of followups){const s=stabilizeMeaningFrameV35({message,meaningFrame:weakFrame(),conversationState:state});record(id,s.primary_intent===expected&&s.topic_relationship==='followup',{expected,actual:s.primary_intent});}

const corrections=['لا اقصد عتيق','قصدي عتيق F1','المقصود مزيونة','أقصد مياسة','لا قصدي الصنف عتيق'];
for(let i=0;i<corrections.length;i++){const f=weakFrame();f.primary_intent='correction';f.intents=[{name:'correction',confidence:.55}];f.speech_act='correction';f.topic_relationship='correction';const s=stabilizeMeaningFrameV35({message:corrections[i],meaningFrame:f,conversationState:state});record(`c${i+1}`,s.topic_relationship==='correction'&&Boolean(s.entities.product_name)&&s.corrected_goal_intent==='product_search',{entity:s.entities.product_name});}

for(let i=0;i<8;i++){const f=weakFrame();f.primary_intent='price';f.intents=[{name:'price',confidence:.9}];f.domain='products';f.topic_relationship='followup';f.reference={requires_context:true,target:'active_product',resolved_text:alt.name,confidence:.9};const core=buildSemanticCoreV35({message:'هو بكام',meaningFrame:f,conversationState:{...state,active_product_id:alt.entity_id,active_products:[alt]}});const q=rewriteQueryV36({baseQuery:'هو بكام',semanticCore:core,conversationState:state,route:{intents:['price']}});const ranked=rerankCandidatesV36({query:q,candidates:[{...product,score:700},{...alt,score:200}],conversationState:{...state,active_product_id:alt.entity_id,active_products:[alt]},meaningFrame:f,semanticCore:core,limit:2});record(`r${i+1}`,ranked[0]?.entity_id===alt.entity_id,{top:ranked[0]?.entity_id,query:q});}

let memory={};for(let i=0;i<8;i++){memory=updatePersistentMemoryV37({previous:memory,message:`hidden memory ${i}`,semanticCore:{primary_intent:i%2?'availability':'price',corrected_goal_intent:null,active_entity:i%3===0?{entity_id:product.entity_id,name:product.name,sku:product.sku}:null,slots:{crop:i%2===0?'باذنجان':null,environment:i%4===0?'بيت محمي':null,location:null,quantity:null},constraints:[],reference:{confidence:.9},relationship:'followup',correction:false,clarification:{required:false}},conversationState:{turn:i+1},history:[]});record(`m${i+1}`,memory.semantic_facts.every(x=>x.value!=='null'&&x.value!=='undefined')&&memory.episodes.length<=16,{facts:memory.semantic_facts.length});}

for(let i=0;i<6;i++){const graph=buildProductGraphV38({conversationState:{active_product_id:product.entity_id,active_products:[product],visible_products:[product,alt]},results:[alt],semanticCore:{active_entity:{entity_id:product.entity_id,name:product.name}}});record(`g${i+1}`,graph.nodes.every(n=>typeof n.id==='string'&&n.id)&&graph.edges.every(e=>typeof e.from==='string'&&typeof e.to==='string')&&graph.policy.entity_facts_must_not_cross_contaminate===true,{nodes:graph.nodes.length,edges:graph.edges.length});}

const diag=[
 {id:'d1',core:{intents:['diagnosis'],slots:{crop:'طماطم',problem:{description:'التفاف واصفرار'},environment:'بيت محمي'}},expect:'differential_diagnosis'},
 {id:'d2',core:{intents:['image_analysis'],slots:{crop:'خيار',problem:null,environment:'بيت محمي'}},vision:{has_visual_context:true},expect:'visual_diagnosis'},
 {id:'d3',core:{intents:['dosage'],slots:{crop:'فلفل',problem:null,environment:'بيت محمي'}},expect:'regulated_dosage'},
 {id:'d4',core:{intents:['diagnosis'],slots:{crop:null,problem:{description:'بقع على الورق'},environment:null}},expect:'differential_diagnosis'}
];
for(const row of diag){const d=buildDiagnosticFrameV39({semanticCore:row.core,conversationState:{},visionFrame:row.vision||null,meaningFrame:{}});const safe=row.expect!=='regulated_dosage'||d.missing_evidence.includes('verified_label_or_product_identity');record(row.id,d.active===true&&d.mode===row.expect&&safe,{mode:d.mode,missing:d.missing_evidence});}

for(let i=0;i<5;i++){const p=buildSalesPlanV40({semanticCore:{intents:['diagnosis'],constraints:[]},diagnosticFrame:{active:true},conversionDecision:{should_sell:true,next_best_action:'close'}});record(`sT${i+1}`,p.mode==='technical_first'&&p.should_sell===false&&p.policy.no_forced_sales===true,{mode:p.mode});const b=buildSalesPlanV40({semanticCore:{intents:['product_search'],constraints:['browse_no_sales']},diagnosticFrame:{active:false},salesTurn:{browse_only:true}});record(`sB${i+1}`,b.mode==='browse_no_pressure'&&b.should_sell===false,{mode:b.mode});}

for(let i=0;i<5;i++){const e=buildEvolutionContextV40({message:'موجود ولا لا؟',state:{intelligence_v33:state},history:[],meaningFrame:weakFrame()});record(`e${i+1}`,e.version==='40.0.0'&&e.semantic_core_v35&&e.retrieval_v36&&e.memory_v37&&e.product_graph_v38&&e.diagnostic_v39&&e.sales_v40&&e.compatibility.single_user_facing_orchestrator===true,{version:e.version});}

const passed=cases.filter(x=>x.passed).length;const report={version:'40.0.0',dataset:'development_generalization_v40_after_failure_driven_fix',created_after_initial_v40_implementation:true,used_for_development:true,production_prompt_exposure:false,engine_modified_after_first_run:true,total:cases.length,passed,failed:cases.length-passed,score:Number((passed/cases.length*100).toFixed(2)),quality_gate:{target:95,passed:passed/cases.length>=.95},cases};
writeFileSync('V40_DEVELOPMENT_GENERALIZATION_REPORT.json',JSON.stringify(report,null,2));
assert.equal(report.quality_gate.passed,true);
console.log(`V40 development generalization PASS — ${passed}/${cases.length} (${report.score}%)`);
