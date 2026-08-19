import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { conversationKnowledgeHealth, searchConversationKnowledgeV26 } from "../lib/conversation_knowledge_v26.js";

const health=conversationKnowledgeHealth();assert.equal(health.version,"26.0");assert.equal(health.ready,true);assert.equal(health.megabytes,400);assert.ok(health.records>=220000);assert.ok(health.packs>=23);assert.equal(health.browser_upload_safe,true);
const manifest=JSON.parse(readFileSync(new URL("../knowledge_v26/manifest.json",import.meta.url),"utf8"));assert.ok(manifest.total_pack_bytes>=400*1024*1024);assert.equal(manifest.packs.length,23);
for(const pack of manifest.packs){const path=new URL(`../knowledge_v26/packs/${pack.file}`,import.meta.url);assert.equal(statSync(path).size,pack.bytes);assert.ok(pack.bytes<25*1024*1024);}

const product=searchConversationKnowledgeV26("ممكن تفاصيل W23805PUM؟",{limit:4});assert.ok(product.items.length);assert.ok(product.packs_scanned.length<=1);
const agriculture=searchConversationKnowledgeV26("اصفرار الطماطم والجذور والري",{limit:4});assert.ok(agriculture.items.length);

const ui=readFileSync(new URL("../ODOO_CHAT_UI_V26_GITHUB_KNOWLEDGE_CONVERSATION_OS.txt",import.meta.url),"utf8");
for(const marker of ["UI_VERSION='26.0.0'","mig_ai_session_id_v26","mig_ai_history_v26","يفهم سؤالك الحالي","renderAssistantText","addAutonomousAction","var visibleReply=reply","price.dir='ltr'"])assert.ok(ui.includes(marker),marker);
const script=ui.match(/<!\[CDATA\[([\s\S]*?)\]\]>/)?.[1];assert.ok(script);new Function(script);
console.log("V26 Knowledge Packs & UI regression PASS");
