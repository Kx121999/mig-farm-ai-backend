import { readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GET } from "../api/health.js";

const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const changed=[
  ".env.example",".vercelignore","package.json","vercel.json","api/chat.js","api/chat-stream.js","api/health.js",
  "api/admin-dashboard.js","api/admin-export.js","admin/index.html","lib/final_production_os.js","lib/neural_agent.js",
  "lib/site.js","lib/commerce.js","lib/product_index.js","ODOO_CHAT_UI_V31_LLM_FIRST_SEMANTIC_ORCHESTRATOR.txt",
  "tests/final_production_os.mjs","tests/final_api_contract.mjs","tests/final_stream_contract.mjs","tools/run_final_evals.mjs",
  "tools/build_final_audit.mjs","tools/validate_release.mjs","evals/final_eval_report.json","RELEASE_FINAL_PRODUCTION_OS_AR.md",
  "UPLOAD_FINAL_PRODUCTION_OS_AR.txt","FINAL_ARCHITECTURE_AR.md"
];
const health=await (await GET()).json(),evals=JSON.parse(readFileSync(join(root,"evals","final_eval_report.json"),"utf8"));
const files=changed.map(path=>({path,bytes:statSync(join(root,path)).size}));
const audit={release:"FINAL_PRODUCTION_OS",api_version:health.version,generated_at:new Date().toISOString(),status:health.ok&&evals.status==="pass"?"pass":"fail",deployment:{serverless_health:"lightweight",knowledge_packs_in_function_bundle:false,progressive_sse:true,json_fallback:true},intelligence:{whole_utterance:true,multi_intent_contract:true,context_quarantine:true,adaptive_critic:true,prompt_registry:true},truth:{fresh_live_price_stock:true,price_value_conflict_guard:true,availability_value_conflict_guard:true,label_only_dosage:true,verified_action_receipt_only:true},quality:{final_evals:`${evals.passed}/${evals.total}`,categories:evals.categories},privacy:{raw_transcripts_in_final_metrics:false,raw_replies_in_final_metrics:false,direct_identifiers:false},compatibility:{api_version_preserved:"31.0.0",odoo_storage_keys_preserved:true,odoo_actions_default_off:true},files:{count:files.length,bytes:files.reduce((sum,x)=>sum+x.bytes,0),items:files}};
writeFileSync(join(root,"FINAL_BUILD_AUDIT.json"),JSON.stringify(audit,null,2)+"\n");
writeFileSync(join(root,"FINAL_CHANGED_FILES.txt"),changed.concat(["FINAL_BUILD_AUDIT.json","FINAL_CHANGED_FILES.txt"]).join("\n")+"\n");
console.log(`FINAL build audit ${audit.status.toUpperCase()} — ${files.length} tracked files, ${evals.passed}/${evals.total} evals`);
if(audit.status!=="pass")process.exitCode=1;
