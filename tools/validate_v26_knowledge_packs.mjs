import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { conversationKnowledgeHealth, searchConversationKnowledgeV26 } from "../lib/conversation_knowledge_v26.js";

const ROOT=join(dirname(fileURLToPath(import.meta.url)),"..");
const DIR=join(ROOT,"knowledge_V26");
const manifest=JSON.parse(readFileSync(join(DIR,"manifest.json"),"utf8"));
const router=JSON.parse(readFileSync(join(DIR,"router.json"),"utf8"));
assert.equal(manifest.version,"26.0");
assert.ok(Array.isArray(manifest.packs)&&manifest.packs.length>=20,"missing V26 packs");
assert.ok(manifest.total_pack_bytes>=400*1024*1024,`Knowledge payload is below 400 MiB: ${manifest.total_pack_bytes}`);
assert.ok(router.intent_routes&&router.product_routes&&router.topic_routes,"router is incomplete");
let totalBytes=0,totalRecords=0;
for(const pack of manifest.packs){
  const path=join(DIR,"packs",pack.file);assert.ok(existsSync(path),`missing ${pack.file}`);
  const bytes=readFileSync(path);assert.equal(bytes.length,pack.bytes,`size mismatch ${pack.file}`);
  const records=bytes.toString("utf8").split("\n").filter(Boolean).length;assert.equal(records,pack.records,`record mismatch ${pack.file}`);
  totalBytes+=bytes.length;totalRecords+=records;
}
assert.equal(totalBytes,manifest.total_pack_bytes);assert.equal(totalRecords,manifest.total_records);
const health=conversationKnowledgeHealth();assert.equal(health.ready,true);assert.equal(health.megabytes,400);assert.equal(health.records,totalRecords);assert.equal(health.function_bundle,"manifest_router_only");
const details=await searchConversationKnowledgeV26("عايز تفاصيل خيار وفرة F1",{limit:3});assert.ok(details.items.length,"product knowledge retrieval failed");
const agronomy=await searchConversationKnowledgeV26("اصفرار الطماطم مع مشكلة ري وجذور",{limit:3});assert.ok(agronomy.items.length,"agricultural knowledge retrieval failed");
console.log(`V26 knowledge validation PASS — ${totalRecords} records, ${manifest.packs.length} packs, ${(totalBytes/1048576).toFixed(2)} MiB`);

