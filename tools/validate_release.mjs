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
if(health.mode!=="server_authoritative_product_context_intelligence_os_v23")throw new Error(`Unexpected mode: ${health.mode}`);

const ui=readFileSync(join(root,"ODOO_CHAT_UI_V23_CONTEXT_INTELLIGENCE_OS.txt"),"utf8");
for(const marker of ["UI_VERSION='23.0.0'","mig_ai_session_id_v23","selected_product_contexts:selectedComparisonProducts","active_product_context","comparisonSelection"]){
  if(!ui.includes(marker))throw new Error(`UI contract missing: ${marker}`);
}
if((ui.match(/<!\[CDATA\[/g)||[]).length!==(ui.match(/\]\]>/g)||[]).length)throw new Error("Odoo UI CDATA is unbalanced");
const uiScript=ui.match(/<!\[CDATA\[([\s\S]*?)\]\]>/)?.[1];
if(!uiScript)throw new Error("Odoo UI script CDATA is missing");
try{new Function(uiScript);}catch(error){throw new Error(`Odoo UI JavaScript syntax failed: ${error.message}`);}

console.log(`MIG FARM release validation PASS — ${scripts.length} scripts, ${jsonFiles.length} JSON files, V${health.version}`);
