import assert from "node:assert/strict";
import { retrieveEnterpriseKnowledgeV28, enterpriseRetrievalHealthV28 } from "../lib/enterprise_retrieval_v28.js";
process.env.MIG_V27_KNOWLEDGE_TRANSPORT="local";
delete process.env.MIG_ENTERPRISE_RETRIEVAL_ENABLED;delete process.env.OPENAI_VECTOR_STORE_ID;
const health=enterpriseRetrievalHealthV28();assert.equal(health.version,"28.0");assert.equal(health.local_ready,true);assert.ok(health.local_megabytes>=400);assert.equal(health.fail_open_to_local,true);
const result=await retrieveEnterpriseKnowledgeV28("بذور خيار للبيت المحمي",{limit:3});assert.equal(result.trace.version,"28.0");assert.equal(result.trace.external_reason,"disabled");assert.ok(Array.isArray(result.items));
console.log("V28 enterprise retrieval PASS");
