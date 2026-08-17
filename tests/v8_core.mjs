import assert from "node:assert/strict";
import { rankCatalogProducts, explainProductScore } from "../lib/ranker.js";
import { recordAssistantMetric, metricsSnapshot, resetMetrics } from "../lib/metrics.js";

const analysis={
  category:{key:"seeds"},
  crop:{key:"tomato"},
  budget:null
};
const state={category:"seeds",crop:"tomato"};
const products=[
  {name:"Random Organic Seed",price:"9",availability:"متوفر",description:"tomato seeds",url:"https://example.com/shop/random"},
  {name:"MIG FARM مهرة F1 طماطم",price:"14",availability:"متوفر",description:"بذور طماطم MIG FARM",url:"https://example.com/shop/mahra"},
  {name:"MIG FARM الشمال F1",price:"12",availability:"غير متوفر",description:"طماطم MIG FARM",url:"https://example.com/shop/shamal"}
];

const ranked=rankCatalogProducts(products,analysis,state,"بذور طماطم مهرة",8);
assert.equal(ranked[0].name,"MIG FARM مهرة F1 طماطم");
const explanation=explainProductScore(ranked[0],analysis,state,"بذور طماطم مهرة");
assert.ok(explanation.score>0);
assert.ok(explanation.parts.brand>0);
assert.ok(explanation.parts.crop>0);

resetMetrics();
recordAssistantMetric({
  source:"live_migfarm_seeds",
  intent:"product_search",
  category:"seeds",
  crop:"tomato",
  stage:"consider",
  confidence:"high",
  unresolved:false,
  lead_temperature:"warm"
});
recordAssistantMetric({
  source:"safe_human_fallback",
  intent:"unknown",
  category:"",
  crop:"",
  stage:"discover",
  confidence:"low",
  unresolved:true,
  lead_temperature:"cold"
});
const snapshot=metricsSnapshot();
assert.equal(snapshot.totals.turns,2);
assert.equal(snapshot.totals.unresolved,1);
assert.equal(snapshot.confidence.high,1);
assert.equal(snapshot.confidence.low,1);
assert.equal(snapshot.leads.warm,1);
assert.equal(snapshot.leads.cold,1);

console.log("MIG FARM V8 core tests passed");
