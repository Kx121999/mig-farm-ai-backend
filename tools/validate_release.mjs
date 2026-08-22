import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { spawnSync } from "node:child_process";

process.env.AI_PIPELINE_V41="true";
process.env.AI_PIPELINE_V40="true";
process.env.AI_PIPELINE_V33="true";
const { GET }=await import("../api/health.js");

const root=new URL("..",import.meta.url).pathname;
const skip=new Set([".git","node_modules"]);
function walk(dir){
  const out=[];
  for(const entry of readdirSync(dir,{withFileTypes:true})){
    if(skip.has(entry.name))continue;
    const path=join(dir,entry.name);
    if(entry.isDirectory())out.push(...walk(path));else out.push(path);
  }
  return out;
}

const files=walk(root);
const scripts=files.filter(path=>/\.(?:js|mjs)$/.test(path));
for(const path of scripts){
  const result=spawnSync(process.execPath,["--check",path],{cwd:root,encoding:"utf8"});
  if(result.status!==0)throw new Error(`Syntax validation failed: ${relative(root,path)}\n${result.stderr||result.stdout}`);
}

const jsonFiles=files.filter(path=>path.endsWith(".json"));
for(const path of jsonFiles)JSON.parse(readFileSync(path,"utf8"));

const pkg=JSON.parse(readFileSync(join(root,"package.json"),"utf8"));
const health=await (await GET()).json();
if(pkg.version!==health.version)throw new Error(`Version mismatch: package=${pkg.version}, health=${health.version}`);
if(health.mode!=="final_production_closure_v41")throw new Error(`Unexpected mode: ${health.mode}`);
if(health.release!=="MIG_FARM_AI_V41_FINAL_PRODUCTION_CLOSURE"||health.production_closure_v41?.ready!==true||health.production_closure_v41?.enabled!==true)throw new Error("MIG_FARM_AI_V41_FINAL_PRODUCTION_CLOSURE missing");
if(health.production_closure_v41?.universal_canned_final_response!==false)throw new Error("V41 universal canned response guard is not active");
if(health.production_closure_v41?.legacy_response_engines!=="rollback_only_when_AI_PIPELINE_V41_false")throw new Error("Legacy response engines are not rollback-only under V41");
if(!Array.isArray(health.production_closure_v41?.allowed_response_origins)||health.production_closure_v41.allowed_response_origins.includes("STATIC_FAQ_FINAL"))throw new Error("V41 response-origin contract invalid");
if(health.provider_gateway_v41?.ready!==true)throw new Error("V41 provider gateway missing");
if(health.unified_evolution?.ready!==true)throw new Error("MIG_FARM_AI_V40_UNIFIED_EVOLUTION compatibility base missing");
for(const layer of ["semantic_core_v35","advanced_rag_v36","persistent_memory_v37","product_graph_v38","agricultural_diagnostic_v39","autonomous_sales_v40"]){if(health.unified_evolution?.layers?.[layer]?.ready!==true)throw new Error(`V40 layer missing: ${layer}`);}
if(health.unified_intelligence?.ready!==true||health.unified_intelligence?.architecture!=="single_semantic_orchestrator"||health.unified_intelligence?.legacy_pipeline!=="rollback_only")throw new Error("V33 proven base compatibility missing");
if(health.final_production_os?.ready!==true)throw new Error("FINAL_PRODUCTION_OS compatibility layer missing");
if(health.llm_first_orchestrator?.version!=="31.0"||health.llm_first_orchestrator?.ready!==true)throw new Error("V31 LLM-first semantic orchestrator missing");
if(health.natural_conversation?.version!=="32.0"||health.natural_conversation?.ready!==true)throw new Error("V32 natural conversation layer missing");
if(health.autonomous_customer_os?.version!=="30.0"||health.autonomous_customer_os?.ready!==true)throw new Error("V30 autonomous customer OS missing");
if(health.customer_digital_twin?.version!=="30.0"||health.customer_digital_twin?.ready!==true)throw new Error("V30 customer digital twin missing");
if(health.confidence_gateway?.version!=="30.0"||health.confidence_gateway?.ready!==true)throw new Error("V30 confidence gateway missing");
if(health.closed_loop_learning?.version!=="30.0"||health.closed_loop_learning?.ready!==true)throw new Error("V30 closed-loop learning missing");
if(health.conversation_reasoning?.version!=="29.0"||health.conversation_reasoning?.ready!==true)throw new Error("V29 conversational reasoning core missing");
if(health.autonomous_actions?.version!=="25.0")throw new Error("V25 autonomous action health missing");
if(health.self_learning?.version!=="25.0")throw new Error("V25 self-learning health missing");
if(health.current_turn_router?.version!=="27.0")throw new Error("V27 current-turn router missing");
if(health.customer_brain?.version!=="27.0")throw new Error("V27 customer brain missing");
if(health.customer_memory?.version!=="27.0")throw new Error("V27 customer memory missing");
if(health.response_auditor?.version!=="27.0")throw new Error("V27 response auditor missing");
if(health.conversation_knowledge?.version!=="27.0"||health.conversation_knowledge?.ready!==true||health.conversation_knowledge?.megabytes<400)throw new Error("V27 400 MB customer-brain knowledge missing");
if(health.enterprise_supervisor?.version!=="28.0")throw new Error("V28 enterprise supervisor missing");
if(health.enterprise_retrieval?.version!=="28.0"||health.enterprise_retrieval?.local_ready!==true)throw new Error("V28 enterprise retrieval missing");
if(health.enterprise_telemetry?.version!=="28.0")throw new Error("V28 enterprise telemetry missing");
if(health.admin_auth?.version!=="28.0")throw new Error("V28 admin auth missing");

const ui=readFileSync(join(root,"ODOO_CHAT_UI_V31_LLM_FIRST_SEMANTIC_ORCHESTRATOR.txt"),"utf8");
for(const marker of ["UI_VERSION='31.0.0'","STREAM_API=","readBackendResponse","mig_ai_session_id_v31","mig_ai_conversation_state_v31","selected_product_contexts:selectedComparisonProducts","autonomous_action_request:opts.actionRequest||null","addAutonomousAction","renderAssistantText","var visibleReply=reply","function appendSafeInline"]){
  if(!ui.includes(marker))throw new Error(`UI contract missing: ${marker}`);
}
if((ui.match(/<!\[CDATA\[/g)||[]).length!==(ui.match(/\]\]>/g)||[]).length)throw new Error("Odoo UI CDATA is unbalanced");
const uiScript=ui.match(/<!\[CDATA\[([\s\S]*?)\]\]>/)?.[1];
if(!uiScript)throw new Error("Odoo UI script CDATA is missing");
try{new Function(uiScript);}catch(error){throw new Error(`Odoo UI JavaScript syntax failed: ${error.message}`);}

const admin=readFileSync(join(root,"admin","index.html"),"utf8");
for(const marker of ["دخول لوحة التحكم","/api/admin-auth","/api/admin-dashboard","/api/admin-export","الرسائل الخام غير محفوظة"]){if(!admin.includes(marker))throw new Error(`Admin dashboard contract missing: ${marker}`);}
const evalReport=JSON.parse(readFileSync(join(root,"evals","v28_eval_report.json"),"utf8"));
if(evalReport.status!=="pass"||evalReport.passed!==evalReport.total)throw new Error("V28 eval report is not passing");
const conversationEvalReport=JSON.parse(readFileSync(join(root,"evals","v29_eval_report.json"),"utf8"));
if(conversationEvalReport.status!=="pass"||conversationEvalReport.passed!==conversationEvalReport.total)throw new Error("V29 conversation eval report is not passing");
const autonomousEvalReport=JSON.parse(readFileSync(join(root,"evals","v30_eval_report.json"),"utf8"));
if(autonomousEvalReport.status!=="pass"||autonomousEvalReport.passed!==autonomousEvalReport.total)throw new Error("V30 autonomous customer OS eval report is not passing");
const meaningEvalReport=JSON.parse(readFileSync(join(root,"evals","v31_eval_report.json"),"utf8"));
if(meaningEvalReport.status!=="pass"||meaningEvalReport.passed!==meaningEvalReport.total)throw new Error("V31 LLM-first meaning eval report is not passing");
const finalEvalReport=JSON.parse(readFileSync(join(root,"evals","final_eval_report.json"),"utf8"));
if(finalEvalReport.status!=="pass"||finalEvalReport.passed!==finalEvalReport.total||finalEvalReport.total<1000)throw new Error("FINAL_PRODUCTION_OS eval report is not passing 1000+ scenarios");
const v40Eval=JSON.parse(readFileSync(join(root,"V40_EVALUATION_REPORT.json"),"utf8"));
if(v40Eval.passed!==true||v40Eval.cases<120)throw new Error("V40 evaluation report is not passing 120+ cases");
const v40Generalization=JSON.parse(readFileSync(join(root,"V40_DEVELOPMENT_GENERALIZATION_REPORT.json"),"utf8"));
if(v40Generalization.quality_gate?.passed!==true||v40Generalization.score<95||v40Generalization.used_for_development!==true)throw new Error("V40 development generalization quality gate failed");
const v40Sealed=JSON.parse(readFileSync(join(root,"V40_SEALED_HOLDOUT_REPORT.json"),"utf8"));
if(v40Sealed.quality_gate?.passed!==true||v40Sealed.score<95||v40Sealed.engine_frozen_before_dataset_execution!==true)throw new Error("V40 sealed holdout quality gate failed");
const v33Benchmark=JSON.parse(readFileSync(join(root,"V33_BENCHMARK_REPORT.json"),"utf8"));
if(v33Benchmark.quality_gate?.passed!==true)throw new Error("V33 architecture benchmark is not passing");
const hiddenGeneralization=JSON.parse(readFileSync(join(root,"V33_HIDDEN_GENERALIZATION_REPORT.json"),"utf8"));
if(hiddenGeneralization.quality_gate?.passed!==true)throw new Error("V33 hidden generalization report is not passing");
const releaseHoldout=JSON.parse(readFileSync(join(root,"V33_RELEASE_HOLDOUT_REPORT.json"),"utf8"));
if(releaseHoldout.quality_gate?.passed!==true||releaseHoldout.score<90||releaseHoldout.no_post_result_engine_changes!==true)throw new Error("V33 locked release holdout is below 90% or was not kept sealed");
const vercelIgnore=readFileSync(join(root,".vercelignore"),"utf8");
if(!vercelIgnore.includes("knowledge_v27/packs/**"))throw new Error("400 MB packs must remain outside Vercel function bundles");

console.log(`MIG FARM V41 FINAL PRODUCTION CLOSURE validation PASS — ${scripts.length} scripts, ${jsonFiles.length} JSON files, ${health.conversation_knowledge.records} knowledge records, ${finalEvalReport.passed}/${finalEvalReport.total} legacy evals, ${releaseHoldout.passed}/${releaseHoldout.total} locked unseen cases, V${health.version}`);
