import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createInterface } from "node:readline";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildCustomerBrainFrameV27 } from "../lib/customer_brain_v27.js";
import { customerKnowledgeHealthV27, searchCustomerKnowledgeV27 } from "../lib/customer_knowledge_v27.js";

const ROOT=join(dirname(fileURLToPath(import.meta.url)),".."),DIR=join(ROOT,"knowledge_v27");
const manifest=JSON.parse(readFileSync(join(DIR,"manifest.json"),"utf8")),router=JSON.parse(readFileSync(join(DIR,"router.json"),"utf8"));
assert.equal(manifest.version,"27.0");assert.equal(router.version,"27.0");assert.ok(manifest.total_pack_bytes>=400*1024*1024);assert.ok(manifest.packs.length>=20);assert.equal(manifest.github.browser_upload_safe,true);
for(const key of ["customer_journey_case","product_decision_case","agriculture_decision_case","objection_resolution_case","response_correction_case","safety_guard_case","business_fact_case"])assert.ok(manifest.allocations?.[key]?.records>100,`${key} allocation missing`);
let totalBytes=0,totalRecords=0;const types=new Set();
for(const pack of manifest.packs){
  const path=join(DIR,"packs",pack.file);assert.ok(existsSync(path),pack.file);const size=statSync(path).size;assert.equal(size,pack.bytes);assert.ok(size<25*1024*1024);
  const sha=createHash("sha256");for await(const chunk of createReadStream(path))sha.update(chunk);assert.equal(sha.digest("hex"),pack.sha256);
  const lines=createInterface({input:createReadStream(path),crlfDelay:Infinity});let count=0;
  for await(const line of lines){if(!line)continue;const item=JSON.parse(line);count+=1;types.add(item.type);assert.ok(item.id&&item.type&&item.domain&&item.intent&&item.dialect&&item.question&&item.answer,`${pack.file}:${count} contract`);assert.equal(item.response_policy?.one_question_max,true);assert.equal(item.response_policy?.answer_current_turn_first,true);assert.equal(item.response_policy?.live_price_stock_only,true);}
  assert.equal(count,pack.records);totalBytes+=size;totalRecords+=count;
}
assert.equal(totalBytes,manifest.total_pack_bytes);assert.equal(totalRecords,manifest.total_records);assert.equal(types.size,7);assert.ok(Object.keys(router.product_routes||{}).length>=1000);assert.ok(Object.keys(router.signature_routes||{}).length>=5);
const frame=buildCustomerBrainFrameV27({message:"مكانكم فين وهل خيار وفرة متوفر وبكام؟"});assert.equal(frame.is_multi_intent,true);for(const x of ["branches","availability","price"])assert.ok(frame.tasks.some(t=>t.intent===x),x);
const hit=searchCustomerKnowledgeV27("مكانكم فين وهل خيار وفرة متوفر وبكام؟",{limit:4,frame});assert.ok(hit.items.length);assert.ok(hit.packs_scanned.length<=1);
const agronomy=searchCustomerKnowledgeV27("اصفرار الطماطم والجذور والري",{limit:4});assert.ok(agronomy.items.length);
const health=customerKnowledgeHealthV27();assert.equal(health.ready,true);assert.equal(health.megabytes,400);assert.equal(health.records,totalRecords);
console.log(`V27 customer-brain knowledge validation PASS — ${totalRecords} records, ${manifest.packs.length} packs, ${(totalBytes/1048576).toFixed(2)} MiB`);

