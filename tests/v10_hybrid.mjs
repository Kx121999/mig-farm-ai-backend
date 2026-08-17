import assert from "node:assert/strict";
import { buildHybridPlan, mergeHybridMemory, criticReview, applyCriticGuard, hybridResponseMeta } from "../lib/hybrid_brain.js";
import { semanticKnowledgeCandidates, semanticSiteCandidates, fuseRetrieval, composeHybridKnowledgeAnswer } from "../lib/semantic_rag.js";
import { sanitizeState } from "../lib/dialogue.js";

const cognition={goal:"recommend",intent:"recommendation",constraints:{category:"seeds",crop:"tomato",emirate:"العين",total_budget:100,max_unit_price:null,price_preference:"lower",require_available:true,availability_explicit:true},unresolved:[],confidence:88};
const plan=buildHybridPlan({message:"رشحلي بذور طماطم متوفرة في حدود 100 درهم",analysis:{intent:"recommendation",category:{key:"seeds"},crop:{key:"tomato"},emirate:"العين"},cognition,state:{turn:4},profile:{}});
assert.equal(plan.engine,"hybrid_planner_v10");
assert.ok(plan.steps.includes("retrieve_live_catalog"));
assert.ok(plan.steps.includes("apply_constraints_and_rank"));
assert.ok(plan.steps.includes("critic_review"));
assert.equal(plan.requires_reasoning,true);

const knowledge=semanticKnowledgeCandidates("كم التوصيل للعين؟",{locale:"ar",analysis:{intent:"shipping"}} ,5);
assert.ok(knowledge.length>0);
assert.equal(knowledge[0].id,"shipping-uae");
assert.ok(knowledge[0].score>.45);

const pages=semanticSiteCandidates("وين فرع العين؟",[
  {title:"فروع MIG FARM",description:"لدينا فرع في العين وفرع في الشارقة",url:"https://www.migfarm.com/contact"},
  {title:"البذور",description:"تسوق بذور الطماطم والخيار",url:"https://www.migfarm.com/shop/category/seeds"}
],5);
assert.ok(pages.length>0);
assert.match(pages[0].title,/فروع/);

const products=[
  {name:"Tomato A",price:"35",currency:"AED",availability:"متوفر",url:"https://www.migfarm.com/shop/a"},
  {name:"Tomato B",price:"45",currency:"AED",availability:"متوفر",url:"https://www.migfarm.com/shop/b"}
];
const fused=fuseRetrieval({message:"ارخص طماطم متوفر",products,knowledge});
assert.ok(fused.items.length>=2);
assert.ok(fused.sources.includes("live_product"));
assert.ok(fused.confidence>=.5);

const knowledgeOnly=fuseRetrieval({message:"كم التوصيل للعين؟",knowledge});
const answer=composeHybridKnowledgeAnswer(knowledgeOnly,"ar");
assert.ok(answer);
assert.match(answer.reply,/13|التوصيل/);

let memory=mergeHybridMemory({}, {message:"عايز طماطم بميزانية 100 في العين",analysis:{category:{key:"seeds"},crop:{key:"tomato"},emirate:"العين"},cognition,results:products,turn:5,confidence:91,retrieval:fused});
assert.equal(memory.preferences.emirate,"العين");
assert.equal(memory.preferences.budget,100);
assert.ok(memory.last_entities.includes("tomato"));
assert.ok(memory.last_retrieval_sources.includes("live_product"));

memory=mergeHybridMemory(memory,{message:"لا اقصد خيار",analysis:{category:{key:"seeds"},crop:{key:"cucumber"}},cognition:{...cognition,correction:true,context_switch:true,constraints:{...cognition.constraints,crop:"cucumber"}},results:[],turn:6,confidence:80,retrieval:{sources:[]}});
assert.equal(memory.preferences.emirate,"العين");
assert.ok(memory.corrections.length>=1);

const review=criticReview({payload:{reply:"أكيد 100% ده الأفضل على الإطلاق"},source:"safe_human_fallback",results:[],evidence:{confidence:.42,level:"uncertain"},cognition:{goal:"recommend",unresolved:[]},retrieval:{items:[],sources:[],confidence:.2}});
assert.equal(review.action,"guard_response");
assert.ok(review.flags.includes("absolute_claim_without_strong_evidence"));
const guarded=applyCriticGuard({reply:"أكيد 100% ده الأفضل على الإطلاق"},review);
assert.doesNotMatch(guarded.reply,/100%|الأفضل على الإطلاق/);

const state=sanitizeState({hybrid_memory:memory,cognitive_memory:{constraints:{crop:"cucumber"}}});
assert.equal(state.v,10);
assert.equal(state.hybrid_memory.preferences.emirate,"العين");
assert.equal(state.hybrid_memory.preferences.budget,100);

const meta=hybridResponseMeta({plan,memory,review:{score:95,flags:[],passed:true},retrieval:fused,evidence:{confidence:.95},cognition:{confidence:90}});
assert.equal(meta.engine,"hybrid_brain_v10");
assert.ok(meta.confidence>=85);
assert.ok(meta.planner.steps.includes("critic_review"));

console.log("MIG FARM V10 Hybrid Brain tests passed");
