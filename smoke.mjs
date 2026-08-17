import assert from "node:assert/strict";
import { analyzeTurn, sanitizeState, updateState, directReply, productMemoryReply } from "../lib/dialogue.js";
import { filterRankProducts, isMigFarmSeed, buildSearchQuery } from "../lib/catalog.js";

let state=sanitizeState({});
let a=analyzeTurn("عندكم بذور؟",state,[],"ar");
assert.equal(a.intent,"product_search");
assert.equal(a.category.key,"seeds");

state=updateState(state,a,"عندكم بذور؟","test",[
  {name:"خيار JABAARA F1",price:"240",currency:"AED",availability:"متوفر"},
  {name:"ORGANIC KATRINA CUCUMBER SEED",price:"260",currency:"AED",availability:"متوفر"}
]);

a=analyzeTurn("متوفر أسمدة",state,[],"ar");
assert.equal(a.category.key,"fertilizer");
assert.equal(a.intent,"product_search");

const fakeSeeds=[
  {name:"خيار JABAARA F1",price:"240",description:"",url:"https://example.com/shop/jabaara"},
  {name:"ORGANIC KATRINA-CUCUMBER SEED 500 SEEDS",price:"260",description:"",url:"https://example.com/shop/katrina"},
  {name:"طماطم فوكس F1",price:"165",description:"",url:"https://example.com/shop/fox"}
];
const seedAnalysis=analyzeTurn("بذور خيار",sanitizeState({}),[],"ar");
const filtered=filterRankProducts(fakeSeeds,seedAnalysis,sanitizeState({}),"بذور خيار");
assert.equal(filtered.length,1);
assert.match(filtered[0].name,/JABAARA/i);
assert.equal(isMigFarmSeed(fakeSeeds[1]),false);

let ship=analyzeTurn("عندكم شحن للعين؟",sanitizeState({}),[],"ar");
let shipState=updateState(sanitizeState({}),ship,"عندكم شحن للعين؟","shipping",[]);
let follow=analyzeTurn("داخل العين",shipState,[],"ar");
assert.equal(follow.intent,"unknown");
const { ambiguousContextReply } = await import("../lib/dialogue.js");
assert.match(ambiguousContextReply("داخل العين",shipState,follow).reply,/13/);

const fertDose=analyzeTurn("جرعة السماد كام؟",sanitizeState({category:"fertilizer"}),[],"ar");
assert.equal(fertDose.intent,"fertilizer_dose");
assert.match(directReply(fertDose,sanitizeState({category:"fertilizer"}),"جرعة السماد كام؟","s").reply,/تعتمد/);

const pestDose=analyzeTurn("كم ملي من المبيد؟",sanitizeState({category:"pesticide"}),[],"ar");
assert.equal(pestDose.intent,"pesticide_dose");

let memState=sanitizeState({last_products:[
  {name:"A",price:"20",currency:"AED",availability:"متوفر"},
  {name:"B",price:"10",currency:"AED",availability:"متوفر"}
]});
const memA=analyzeTurn("الأرخص فيهم؟",memState,[],"ar");
assert.equal(memA.intent,"product_memory");
assert.match(productMemoryReply(memA,memState,"ar").reply,/10/);

const info=analyzeTurn("ايه تفاصيل MICROPLUS",sanitizeState({}),[],"ar");
assert.equal(info.intent,"known_product_info");
assert.match(directReply(info,sanitizeState({}),"ايه تفاصيل MICROPLUS","s").reply,/15%/);

const gh=analyzeTurn("عايز بيت محمي",sanitizeState({}),[],"ar");
assert.equal(gh.category.key,"greenhouse");

const q=buildSearchQuery(analyzeTurn("متوفر اسمدة",sanitizeState({}),[],"ar"),sanitizeState({}),"متوفر اسمدة");
assert.match(q,/fertilizer/i);


// Recommendation slot flow
let recState=sanitizeState({});
let rec=analyzeTurn("رشحلي بذور",recState,[],"ar");
assert.equal(rec.intent,"recommendation");
let recReply=directReply(rec,recState,"رشحلي بذور","rec");
assert.match(recReply.reply,/المحصول/);
recState=updateState(recState,rec,"رشحلي بذور",recReply.source,[]);
assert.equal(recState.pending,"crop");
rec=analyzeTurn("طماطم",recState,[],"ar");
assert.equal(rec.intent,"recommendation");
recReply=directReply(rec,recState,"طماطم","rec");
assert.match(recReply.reply,/مكشوفة|بيت محمي/);
recState=updateState(recState,rec,"طماطم",recReply.source,[]);
assert.equal(recState.crop,"tomato");
assert.equal(recState.pending,"cultivation");

// Known product dose must go to safety, not generic search
const microDose=analyzeTurn("جرعة MICROPLUS كام",sanitizeState({}),[],"ar");
assert.equal(microDose.intent,"fertilizer_dose");
const edoDose=analyzeTurn("كم ملي Edomec",sanitizeState({}),[],"ar");
assert.equal(edoDose.intent,"pesticide_dose");

// Bare availability follow-up
const bareAvail=analyzeTurn("متوفر؟",memState,[],"ar");
assert.equal(bareAvail.intent,"product_memory");
assert.match(productMemoryReply(bareAvail,memState,"ar").reply,/المتوفر/);

console.log("MIG FARM V6 human-engine smoke tests passed");
