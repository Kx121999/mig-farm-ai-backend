import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { customerKnowledgeHealthV27, searchCustomerKnowledgeV27 } from "../lib/customer_knowledge_v27.js";

process.env.MIG_V27_KNOWLEDGE_TRANSPORT="local";

const health=customerKnowledgeHealthV27();assert.equal(health.version,"27.0");assert.equal(health.ready,true);assert.equal(health.megabytes,400);assert.ok(health.records>=200000);assert.equal(health.packs,23);assert.equal(health.browser_upload_safe,true);
const manifest=JSON.parse(readFileSync(new URL("../knowledge_v27/manifest.json",import.meta.url),"utf8"));assert.ok(manifest.total_pack_bytes>=400*1024*1024);assert.equal(manifest.packs.length,23);assert.equal(Object.keys(manifest.allocations).length,7);
for(const pack of manifest.packs){const path=new URL(`../knowledge_v27/packs/${pack.file}`,import.meta.url);assert.equal(statSync(path).size,pack.bytes);assert.ok(pack.bytes<25*1024*1024);}
const compound=await searchCustomerKnowledgeV27("مكانكم فين وهل خيار وفرة متوفر وبكام؟",{limit:4});assert.ok(compound.items.length);assert.ok(compound.packs_scanned.length<=1);
const agriculture=await searchCustomerKnowledgeV27("اصفرار الطماطم والجذور والري",{limit:4});assert.ok(agriculture.items.length);
const ui=readFileSync(new URL("../ODOO_CHAT_UI_V27_CUSTOMER_BRAIN_DECISION_OS.txt",import.meta.url),"utf8");
for(const marker of ["UI_VERSION='27.0.0'","mig_ai_session_id_v27","mig_ai_history_v27","يفهم كل طلبك","renderAssistantText","addAutonomousAction","var visibleReply=reply","price.dir='ltr'"])assert.ok(ui.includes(marker),marker);
const script=ui.match(/<!\[CDATA\[([\s\S]*?)\]\]>/)?.[1];assert.ok(script);new Function(script);
console.log("V27 Knowledge Packs & UI regression PASS");
