import assert from "node:assert/strict";
import { filterRankProducts } from "../lib/catalog.js";
import { CATEGORIES } from "../lib/brain.js";

const products=[
  {name:"خيار جبارة F1 JABAARA",description:"MIG FARM seeds tomato cucumber vegetables",url:"https://example.com/shop/jabaara",price:"35",availability:"متوفر"},
  {name:"باذنجان مياسة F1",description:"MIG FARM seeds tomato eggplant vegetables",url:"https://example.com/shop/miasa",price:"35",availability:"متوفر"},
  {name:"طماطم مهرة F1 MAHRA",description:"MIG FARM tomato seeds",url:"https://example.com/shop/mahra",price:"35",availability:"متوفر"},
  {name:"طماطم الشمال F1 SHAMAL",description:"MIG FARM tomato seeds",url:"https://example.com/shop/shamal",price:"35",availability:"متوفر"}
];
const analysis={category:CATEGORIES.seeds,crop:{key:"tomato"},pepperType:"",budget:null};
const state={category:"seeds",crop:"tomato"};
const ranked=filterRankProducts(products,analysis,state,"عندكم بذور طماطم؟");
assert.ok(ranked.length>=1);
assert.ok(ranked.every(p=>!/جبارة|JABAARA|مياسة/i.test(p.name)));
assert.ok(ranked.some(p=>/مهرة|MAHRA/i.test(p.name)));
console.log("MIG FARM V8.1.1 crop isolation regression test passed");
