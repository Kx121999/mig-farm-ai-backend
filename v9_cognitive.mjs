import assert from "node:assert/strict";
import {
  buildCognitiveFrame, mergeCognitiveMemory, cognitiveProductDecision,
  cognitiveVisibleSetDecision, cognitiveResponseMeta, rankProductsCognitively
} from "../lib/cognition.js";
import { evidenceSummary, detectEvidenceRisks } from "../lib/evidence.js";
import { sanitizeState } from "../lib/dialogue.js";

const products=[
  {name:"Tomato A",price:"35",currency:"AED",availability:"متوفر",url:"https://www.migfarm.com/shop/a"},
  {name:"Tomato B",price:"45",currency:"AED",availability:"متوفر",url:"https://www.migfarm.com/shop/b"},
  {name:"Tomato C",price:"30",currency:"AED",availability:"غير متوفر",url:"https://www.migfarm.com/shop/c"},
  {name:"Tomato D",price:"60",currency:"AED",availability:"متوفر",url:"https://www.migfarm.com/shop/d"}
];

let frame=buildCognitiveFrame({
  message:"عايز 2 منتجات طماطم متوفرين تحت 50 درهم",
  analysis:{intent:"product_search",category:{key:"seeds"},crop:{key:"tomato"},budget:null},
  state:{},profile:{},history:[]
});
assert.equal(frame.constraints.requested_count,2);
assert.equal(frame.constraints.max_unit_price,50);
assert.equal(frame.constraints.require_available,true);
assert.equal(frame.goal,"bundle");

let decision=cognitiveProductDecision({products,frame,locale:"ar"});
assert.equal(decision.handled,true);
assert.equal(decision.results.length,2);
assert.ok(decision.results.every(p=>Number(p.price)<=50));
assert.ok(decision.results.every(p=>!String(p.availability).includes("غير متوفر")));

frame=buildCognitiveFrame({
  message:"ميزانيتي 70 درهم وعايز 2 منتجات",
  analysis:{intent:"product_search",category:{key:"seeds"}},state:{category:"seeds"},profile:{}
});
decision=cognitiveProductDecision({products,frame,locale:"ar"});
assert.equal(decision.results.length,2);
assert.ok(decision.results.reduce((s,p)=>s+Number(p.price),0)<=70);

const mem1=mergeCognitiveMemory({},buildCognitiveFrame({message:"عايز بذور طماطم بميزانية 100",analysis:{intent:"product_search",category:{key:"seeds"},crop:{key:"tomato"}}}),1);
assert.equal(mem1.constraints.total_budget,100);
assert.equal(mem1.constraints.crop,"tomato");
const mem2=mergeCognitiveMemory(mem1,buildCognitiveFrame({message:"ويكون متوفر",analysis:{intent:"unknown"},state:{category:"seeds",crop:"tomato"}}),2);
assert.equal(mem2.constraints.total_budget,100);
assert.equal(mem2.constraints.require_available,true);

const reset=mergeCognitiveMemory(mem2,buildCognitiveFrame({message:"لا اقصد خيار",analysis:{intent:"product_search",correction:true,category:{key:"seeds"},crop:{key:"cucumber"}},state:{category:"seeds",crop:"tomato"}}),3);
assert.equal(reset.constraints.crop,"cucumber");
assert.equal(reset.constraints.total_budget,null);

const visibleState={visible_products:products.slice(0,4)};
frame=buildCognitiveFrame({message:"اختارلي ارخص واحد فيهم",analysis:{intent:"product_memory"},state:visibleState,profile:{}});
const visibleDecision=cognitiveVisibleSetDecision({state:visibleState,frame,locale:"ar"});
assert.equal(visibleDecision.handled,true);
assert.equal(visibleDecision.results.length,1);
assert.equal(visibleDecision.results[0].name,"Tomato C");

frame=buildCognitiveFrame({message:"اختارلي ارخص واحد فيهم ويكون متوفر",analysis:{intent:"product_memory"},state:visibleState,profile:{}});
const availableDecision=cognitiveVisibleSetDecision({state:visibleState,frame,locale:"ar"});
assert.equal(availableDecision.results[0].name,"Tomato A");


frame=buildCognitiveFrame({message:"رشحلي اتنين منتجات ويكونوا متوفرين",analysis:{intent:"product_search",category:{key:"seeds"}},state:{category:"seeds"},profile:{}});
assert.equal(frame.constraints.requested_count,2);
assert.equal(frame.constraints.require_available,true);
let memoryWithAvailability=mergeCognitiveMemory({},frame,1);
const clearAvailabilityFrame=buildCognitiveFrame({message:"مش شرط متوفر",analysis:{intent:"unknown"},state:{category:"seeds"},profile:{}});
memoryWithAvailability=mergeCognitiveMemory(memoryWithAvailability,clearAvailabilityFrame,2);
assert.equal(memoryWithAvailability.constraints.require_available,false);

const ranked=rankProductsCognitively(products,frame);
assert.ok(ranked[0].available);

const liveEvidence=evidenceSummary({source:"live_migfarm_seeds",results:products});
assert.equal(liveEvidence.level,"live_verified");
assert.ok(liveEvidence.confidence>=.94);
const fallbackEvidence=evidenceSummary({source:"safe_human_fallback"});
assert.equal(fallbackEvidence.level,"uncertain");
assert.ok(fallbackEvidence.confidence<.6);

const risks=detectEvidenceRisks({source:"safe_human_fallback",payload:{reply:"أكيد ده الأفضل على الإطلاق ومضمون 100%"},results:[]});
assert.ok(risks.includes("overconfidence_without_evidence"));

const state=sanitizeState({cognitive_memory:{active_goal:"recommend",constraints:{crop:"tomato",total_budget:100,require_available:true},decision_count:3}});
assert.equal(state.v,10);
assert.equal(state.cognitive_memory.constraints.crop,"tomato");
assert.equal(state.cognitive_memory.constraints.total_budget,100);
assert.equal(state.cognitive_memory.decision_count,3);

const meta=cognitiveResponseMeta({frame,memory:state.cognitive_memory,decision:availableDecision,evidence:liveEvidence,risks:[]});
assert.equal(meta.engine,"cognitive_v9");
assert.ok(meta.confidence>=80);
assert.ok(Array.isArray(meta.decision_basis));

console.log("MIG FARM V9 Cognitive Intelligence tests passed");
