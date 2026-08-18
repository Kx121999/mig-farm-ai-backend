import assert from "node:assert/strict";
import { analyzeTurn, updateState, productMemoryReply, sanitizeState } from "../lib/dialogue.js";
import { enforceResponseQuality, conversationQualityMeta } from "../lib/quality.js";

const products=[
{name:"A",price:"40",currency:"AED",availability:"متوفر",url:"https://x/a",product_template_id:1},
{name:"B",price:"35",currency:"AED",availability:"متوفر",url:"https://x/b",product_template_id:2},
{name:"C",price:"45",currency:"AED",availability:"متوفر",url:"https://x/c",product_template_id:3},
{name:"D",price:"50",currency:"AED",availability:"متوفر",url:"https://x/d",product_template_id:4},
{name:"HIDDEN CHEAP",price:"5",currency:"AED",availability:"متوفر",url:"https://x/hidden",product_template_id:5}
];
let analysis=analyzeTurn("عندكم بذور طماطم؟",{},[],"ar");
let state=updateState({},analysis,"عندكم بذور طماطم؟","product_search",products,{reply:"نتائج"});
assert.equal(state.last_products.length,5);assert.equal(state.visible_products.length,4);assert.equal(state.visible_products.some(p=>p.name==="HIDDEN CHEAP"),false);
analysis=analyzeTurn("الأرخص فيهم؟",state,[],"ar");assert.equal(analysis.intent,"product_memory");let reply=productMemoryReply(analysis,state,"ar");assert.match(reply.reply,/35 AED/);assert.match(reply.reply,/B/);assert.doesNotMatch(reply.reply,/HIDDEN CHEAP/);
analysis=analyzeTurn("الأول ولا التاني؟",state,[],"ar");assert.equal(analysis.memoryAction,"compare_pair:0:1");reply=productMemoryReply(analysis,state,"ar");assert.match(reply.reply,/A/);assert.match(reply.reply,/B/);
analysis=analyzeTurn("التاني أحسن؟",state,[],"ar");assert.equal(analysis.memoryAction,"better:1");reply=productMemoryReply(analysis,state,"ar");assert.match(reply.reply,/B/);
analysis=analyzeTurn("لا اقصد خيار اقصد طماطم",state,[],"ar");assert.equal(analysis.correction,true);assert.equal(analysis.crop?.key,"tomato");assert.equal(analysis.category?.key,"seeds");assert.equal(analysis.intent,"product_search");
const seedState=sanitizeState({...state,category:"seeds",crop:"tomato"});analysis=analyzeTurn("طيب أسمدة",seedState,[],"ar");assert.equal(analysis.category?.key,"fertilizer");const switched=updateState(seedState,analysis,"طيب أسمدة","recommend_fertilizer_clarify",[],{reply:"حدد المحصول"});assert.equal(switched.category,"fertilizer");assert.equal(switched.crop,"");assert.equal(switched.visible_products.length,0);
const cleaned=enforceResponseQuality({reply:"نفس السطر\nنفس السطر\n\nفقرة\n\nفقرة",quick_replies:["أ","أ","ب","ج","د","هـ"]});assert.equal(cleaned.reply,"نفس السطر\n\nفقرة");assert.deepEqual(cleaned.quick_replies,["أ","ب","ج","د"]);
const meta=conversationQualityMeta({previous:seedState,next:switched,analysis,message:"طيب أسمدة",source:"recommend_fertilizer_clarify",payload:{reply:"حدد المحصول"},results:[]});assert.equal(meta.context_switch,true);assert.ok(meta.flags.includes("context_switch"));assert.ok(meta.score>=35&&meta.score<=99);
console.log("MIG FARM V8 Phase 4 Conversation Quality tests passed");
