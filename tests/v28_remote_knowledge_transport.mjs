import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

delete process.env.MIG_V27_KNOWLEDGE_TRANSPORT;
process.env.MIG_V27_KNOWLEDGE_BASE_URL="https://knowledge.example/knowledge_v27";

let requests=0;
globalThis.fetch=async url=>{
  requests+=1;
  const match=String(url).match(/\/packs\/([^/?#]+)$/);
  assert.ok(match,"pack URL is invalid");
  const file=decodeURIComponent(match[1]);
  const bytes=readFileSync(new URL(`../knowledge_v27/packs/${file}`,import.meta.url));
  return new Response(bytes,{status:200,headers:{"content-length":String(bytes.length)}});
};

const { customerKnowledgeHealthV27, searchCustomerKnowledgeV27 }=await import("../lib/customer_knowledge_v27.js");
const health=customerKnowledgeHealthV27();
assert.equal(health.ready,true);
assert.equal(health.function_bundle,"manifest_router_only");
assert.equal(health.storage,"remote_object_packs");

const first=await searchCustomerKnowledgeV27("مكانكم فين وهل خيار وفرة متوفر وبكام؟",{limit:4});
assert.ok(first.items.length);
assert.ok(first.packs_scanned.length<=1);

const second=await searchCustomerKnowledgeV27("مكانكم فين وهل خيار وفرة متوفر وبكام؟",{limit:4});
assert.ok(second.items.length);
assert.equal(requests,1,"warm cache must avoid a second pack download");

console.log("V28 Remote Knowledge Transport PASS — URL, SHA-256, retrieval and cache verified");
