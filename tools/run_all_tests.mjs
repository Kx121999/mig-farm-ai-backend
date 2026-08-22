import { readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root=new URL("..",import.meta.url);
const testsDir=new URL("../tests/",import.meta.url);
const files=readdirSync(testsDir).filter(name=>name.endsWith(".mjs")).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true,sensitivity:"base"}));

let passed=0;
for(const file of files){
  const path=join(testsDir.pathname,file);
  const v40=file.startsWith("v40_");
  const v33=file.startsWith("v33_");
  const result=spawnSync(process.execPath,[path],{cwd:root.pathname,stdio:"inherit",env:{...process.env,AI_PIPELINE_V40:v40?"true":"false",AI_PIPELINE_V33:(v40||v33)?"true":"false"}});
  if(result.status!==0){
    console.error(`\nFAILED: ${file}`);
    process.exit(result.status||1);
  }
  passed+=1;
}
console.log(`\nMIG FARM test runner PASS — ${passed}/${files.length} suites`);
