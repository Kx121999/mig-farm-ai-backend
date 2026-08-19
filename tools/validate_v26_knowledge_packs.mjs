import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createInterface } from "node:readline";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { conversationKnowledgeHealth, searchConversationKnowledgeV26 } from "../lib/conversation_knowledge_v26.js";

const ROOT=join(dirname(fileURLToPath(import.meta.url)),"..");
const DIR=join(ROOT,"knowledge_v26");
const manifest=JSON.parse(readFileSync(join(DIR,"manifest.json"),"utf8"));
const router=JSON.parse(readFileSync(join(DIR,"router.json"),"utf8"));
assert.equal(manifest.version,"26.0");assert.equal(router.version,"26.0");
assert.ok(manifest.total_pack_bytes>=400*1024*1024,`Knowledge payload is below 400 MiB: ${manifest.total_pack_bytes}`);
assert.ok(manifest.packs.length>=20);assert.equal(manifest.github.browser_upload_safe,true);

let totalBytes=0,totalRecords=0;
for(const pack of manifest.packs){
  const path=join(DIR,"packs",pack.file);assert.ok(existsSync(path),pack.file);
  const size=statSync(path).size;assert.equal(size,pack.bytes,`${pack.file} size`);assert.ok(size<25*1024*1024,`${pack.file} exceeds browser upload size`);
  const sha=createHash("sha256");const stream=createReadStream(path);for await(const chunk of stream)sha.update(chunk);assert.equal(sha.digest("hex"),pack.sha256,`${pack.file} sha256`);
  const lines=createInterface({input:createReadStream(path),crlfDelay:Infinity});let count=0;
  for await(const line of lines){
    if(!line)continue;const item=JSON.parse(line);count+=1;
    assert.ok(item.id&&item.type&&item.domain&&item.intent&&item.dialect&&item.question&&item.answer,`${pack.file}:${count} contract`);
    assert.equal(item.response_policy?.one_question_max,true,`${pack.file}:${count} question policy`);
  }
  assert.equal(count,pack.records,`${pack.file} records`);totalBytes+=size;totalRecords+=count;
}
assert.equal(totalBytes,manifest.total_pack_bytes);assert.equal(totalRecords,manifest.total_records);
assert.ok(Object.keys(router.product_routes||{}).length>=1000,"product routes incomplete");
assert.ok(Object.keys(router.topic_routes||{}).length>=100,"topic routes incomplete");
const health=conversationKnowledgeHealth();assert.equal(health.ready,true);assert.equal(health.megabytes,400);assert.equal(health.records,totalRecords);
const details=searchConversationKnowledgeV26("عايز تفاصيل خيار وفرة F1",{limit:3});assert.ok(details.items.length,"product knowledge retrieval failed");
const agronomy=searchConversationKnowledgeV26("اصفرار الطماطم مع مشكلة ري وجذور",{limit:3});assert.ok(agronomy.items.length,"agricultural knowledge retrieval failed");
console.log(`V26 knowledge validation PASS — ${totalRecords} records, ${manifest.packs.length} packs, ${(totalBytes/1048576).toFixed(2)} MiB`);
