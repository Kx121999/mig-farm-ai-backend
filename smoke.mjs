import assert from "node:assert/strict";
import { analyzeTurn, sanitizeState } from "../lib/dialogue.js";
import { extractCustomerSignals, mergeCustomerProfile, sanitizeCustomerProfile, customerRepairReply } from "../lib/customer.js";
import { leadScore, journeyStage, nextBestQuestion, buildHandoffSummary, buildWhatsAppHandoff, purchaseContinuation } from "../lib/sales.js";
import { extendedKnowledgeReply, knowledgeStats } from "../lib/human_knowledge.js";
import { buildLearningEvent } from "../lib/learning.js";

let state=sanitizeState({});
let analysis=analyzeTurn("عندي مزرعة 2000 متر في العين وعايز بيت محمي",state,[],"ar");
let signals=extractCustomerSignals("عندي مزرعة 2000 متر في العين وعايز بيت محمي",analysis,state);
let profile=mergeCustomerProfile({},signals,analysis,state);
assert.equal(profile.project_type,"farm");
assert.match(profile.area,/2000/);
assert.equal(profile.emirate,"العين");
assert.equal(profile.category,"greenhouse");

let stage=journeyStage({analysis,profile,state,message:"عندي مزرعة 2000 متر في العين وعايز بيت محمي"});
assert.ok(["explore","qualify"].includes(stage));
let next=nextBestQuestion({analysis,profile,state,stage});
assert.equal(next.field,"crop");

analysis=analyzeTurn("أبغي عرض سعر",state,[],"ar");
signals=extractCustomerSignals("أبغي عرض سعر",analysis,state);
profile=mergeCustomerProfile(profile,signals,analysis,state);
const lead=leadScore({analysis,profile,state,message:"أبغي عرض سعر"});
assert.equal(lead.temperature,"hot");
assert.ok(lead.score>=55);
assert.equal(journeyStage({analysis,profile,state,message:"أبغي عرض سعر"}),"ready");

const summary=buildHandoffSummary({profile,state,analysis,message:"أبغي عرض سعر"});
assert.match(summary,/العين/);
assert.match(summary,/2000/);
assert.match(summary,/عرض سعر/);
const wa=buildWhatsAppHandoff({profile,state,analysis,message:"أبغي عرض سعر"});
assert.equal(wa.type,"whatsapp");
assert.match(wa.url,/text=/);

const f1=extendedKnowledgeReply("شو يعني F1؟","ar",{sessionId:"x"});
assert.ok(f1);
assert.match(f1.reply,/هجين|الجيل الأول/);

const first=extendedKnowledgeReply("أنا أول مرة أزرع","ar",{sessionId:"x"});
assert.ok(first);
assert.match(first.reply,/المحصول|تزرع/);

const correctionAnalysis=analyzeTurn("غلط",sanitizeState({category:"seeds"}),[],"ar");
const correctionSignals=extractCustomerSignals("غلط",correctionAnalysis,sanitizeState({category:"seeds"}));
const repair=customerRepairReply(correctionSignals,correctionAnalysis,sanitizeCustomerProfile({category:"seeds"}));
assert.ok(repair);
assert.match(repair.reply,/صحح/);

const readyState=sanitizeState({last_products:[{name:"طماطم مهرة F1",price:"290",currency:"AED",availability:"متوفر"}]});
const buyAnalysis=analyzeTurn("أبغي أطلب",readyState,[],"ar");
const buySignals=extractCustomerSignals("أبغي أطلب",buyAnalysis,readyState);
const buyProfile=mergeCustomerProfile({},buySignals,buyAnalysis,readyState);
const continuation=purchaseContinuation({profile:buyProfile,state:readyState,analysis:buyAnalysis,message:"أبغي أطلب"});
assert.ok(continuation);
assert.match(continuation.reply,/آخر المنتجات|الأول/);

const stats=knowledgeStats();
assert.ok(stats.seed_varieties>=30);
assert.ok(stats.known_products>=20);
assert.ok(stats.glossary_topics>=15);

const event=buildLearningEvent({sessionId:"secret-session",message:"مش فاهم",analysis:{intent:"unknown"},profile:{},source:"safe_human_fallback",stage:"discover",lead:{temperature:"cold"}});
assert.equal(event.unresolved,true);
assert.equal(Object.prototype.hasOwnProperty.call(event,"message"),false);
assert.ok(event.query_hash);

console.log("MIG FARM V7 sales-agent smoke tests passed");
