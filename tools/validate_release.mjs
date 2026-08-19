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
if(health.mode!=="customer_brain_decision_os_v27")throw new Error(`Unexpected mode: ${health.mode}`);
if(health.autonomous_actions?.version!=="25.0")throw new Error("V25 autonomous action health missing");
if(health.self_learning?.version!=="25.0")throw new Error("V25 self-learning health missing");
if(health.current_turn_router?.version!=="27.0")throw new Error("V27 current-turn router missing");
if(health.customer_brain?.version!=="27.0")throw new Error("V27 customer brain missing");
if(health.customer_memory?.version!=="27.0")throw new Error("V27 customer memory missing");
if(health.response_auditor?.version!=="27.0")throw new Error("V27 response auditor missing");
if(health.conversation_knowledge?.version!=="27.0"||health.conversation_knowledge?.ready!==true||health.conversation_knowledge?.megabytes<400)throw new Error("V27 400 MB customer-brain knowledge missing");

const ui=readFileSync(join(root,"ODOO_CHAT_UI_V27_CUSTOMER_BRAIN_DECISION_OS.txt"),"utf8");
for(const marker of ["UI_VERSION='27.0.0'","mig_ai_session_id_v27","selected_product_contexts:selectedComparisonProducts","autonomous_action_request:opts.actionRequest||null","addAutonomousAction","renderAssistantText","var visibleReply=reply"]){
  if(!ui.includes(marker))throw new Error(`UI contract missing: ${marker}`);
}
if((ui.match(/<!\[CDATA\[/g)||[]).length!==(ui.match(/\]\]>/g)||[]).length)throw new Error("Odoo UI CDATA is unbalanced");
const uiScript=ui.match(/<!\[CDATA\[([\s\S]*?)\]\]>/)?.[1];
if(!uiScript)throw new Error("Odoo UI script CDATA is missing");
try{new Function(uiScript);}catch(error){throw new Error(`Odoo UI JavaScript syntax failed: ${error.message}`);}

console.log(`MIG FARM release validation PASS — ${scripts.length} scripts, ${jsonFiles.length} JSON files, ${health.conversation_knowledge.records} knowledge records, V${health.version}`);
