import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const root=new URL("..",import.meta.url).pathname;
const outDir=join(root,"knowledge_v28");
const v27=JSON.parse(readFileSync(join(root,"knowledge_v27","manifest.json"),"utf8"));
const pkg=JSON.parse(readFileSync(join(root,"package.json"),"utf8"));
function sha(path){return createHash("sha256").update(readFileSync(path)).digest("hex");}
function files(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(join(dir,entry.name)):[join(dir,entry.name)]);}
const sourceFiles=[...files(join(root,"knowledge")),join(root,"data","knowledge.json")].filter(path=>statSync(path).isFile());
const manifest={
  version:"28.0",release_version:pkg.version,name:"MIG FARM Enterprise Autonomous Intelligence Knowledge Plane",
  generated_at:new Date().toISOString(),architecture:"hybrid_local_vector_data_plane",
  local_fallback:{version:v27.version,bytes:v27.total_pack_bytes,megabytes:Number((v27.total_pack_bytes/1048576).toFixed(2)),records:v27.total_records,packs:v27.packs.length,manifest_sha256:sha(join(root,"knowledge_v27","manifest.json")),policies:v27.policies},
  curated_sources:{files:sourceFiles.length,bytes:sourceFiles.reduce((sum,path)=>sum+statSync(path).size,0),paths:sourceFiles.map(path=>relative(root,path)).sort()},
  retrieval:{local:"manifest_router+intent_signature+product_topic+bounded_rerank",external:"OpenAI Responses file_search + vector store",fusion:"external-first dedupe with resilient local fallback",external_optional:true,fail_open_to_local:true},
  agents:["enterprise_supervisor","business_facts","product_truth","product_intelligence","sales_advisor","commerce_orchestrator","senior_agronomist","agricultural_safety","vision_specialist","odoo_operations","quality_critic"],
  governance:{raw_transcripts_default:false,pii_redaction:true,hashed_sessions:true,live_price_stock_only:true,official_label_dosage_only:true,admin_auth:"signed_http_only_cookie",continuous_learning:"evaluation_and_human_review_only",automatic_model_training:false},
  scale:{github_code_and_local_fallback:true,large_documents_external_vector_store:true,media_external_blob_storage:true,incremental_sync_by_sha256:true},
  required_for_full_mode:["OPENAI_API_KEY","OPENAI_MODEL","OPENAI_VECTOR_STORE_ID","MIG_ENTERPRISE_RETRIEVAL_ENABLED"],
  optional_enterprise_services:["UPSTASH_REDIS_REST_URL","UPSTASH_REDIS_REST_TOKEN","ODOO_ACTION_URL","ODOO_DB","ODOO_USERNAME","ODOO_API_KEY"]
};
mkdirSync(outDir,{recursive:true});
writeFileSync(join(outDir,"enterprise_manifest.json"),JSON.stringify(manifest,null,2)+"\n");
console.log(`V28 enterprise manifest PASS — ${manifest.local_fallback.megabytes} MB local, ${manifest.curated_sources.files} curated source files`);
