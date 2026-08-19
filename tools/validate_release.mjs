import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { spawnSync } from "node:child_process";
import { GET } from "../api/health.js";

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
if(health.mode!=="neural_autonomous_customer_os_v30")throw new Error(`Unexpected mode: ${health.mode}`);
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

const ui=readFileSync(join(root,"ODOO_CHAT_UI_V30_NEURAL_AUTONOMOUS_CUSTOMER_OS.txt"),"utf8");
for(const marker of ["UI_VERSION='30.0.0'","mig_ai_session_id_v30","mig_ai_conversation_state_v30","selected_product_contexts:selectedComparisonProducts","autonomous_action_request:opts.actionRequest||null","addAutonomousAction","renderAssistantText","var visibleReply=reply","function appendSafeInline"]){
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

console.log(`MIG FARM release validation PASS — ${scripts.length} scripts, ${jsonFiles.length} JSON files, ${health.conversation_knowledge.records} knowledge records, V${health.version}`);
