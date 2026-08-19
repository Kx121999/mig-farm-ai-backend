import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

const root=new URL("..",import.meta.url).pathname;
const apiKey=String(process.env.OPENAI_API_KEY||"").trim(),vectorStoreId=String(process.env.OPENAI_VECTOR_STORE_ID||"").trim();
const dryRun=process.argv.includes("--dry-run"),maxFiles=Math.max(1,Math.min(100,Number(process.env.MIG_V28_SYNC_MAX_FILES)||100));
if(!dryRun&&(!apiKey||!vectorStoreId)){console.error("Set OPENAI_API_KEY and OPENAI_VECTOR_STORE_ID, or run with --dry-run.");process.exit(2);}
const manifest=JSON.parse(readFileSync(join(root,"knowledge_v27","manifest.json"),"utf8"));
const statePath=join(root,"knowledge_v28","vector_sync_state.json"),previous=existsSync(statePath)?JSON.parse(readFileSync(statePath,"utf8")):{files:{}};
function sha(path){return createHash("sha256").update(readFileSync(path)).digest("hex");}
async function request(path,options={}){const response=await fetch(`https://api.openai.com/v1${path}`,{...options,headers:{Authorization:`Bearer ${apiKey}`,...(options.headers||{})}});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(`${path}: ${response.status} ${data?.error?.message||"request_failed"}`);return data;}
const selected=manifest.packs.slice(0,maxFiles),next={version:"28.0",vector_store_id:vectorStoreId||"dry_run",updated_at:new Date().toISOString(),files:{...previous.files}};let uploaded=0,skipped=0;
for(const pack of selected){
  const path=join(root,"knowledge_v27","packs",pack.file),fingerprint=sha(path),old=previous.files?.[pack.file];
  if(old?.sha256===fingerprint&&old?.vector_store_file_id){skipped+=1;continue;}
  if(dryRun){console.log(`DRY RUN upload ${pack.file} (${pack.megabytes} MB)`);uploaded+=1;continue;}
  const form=new FormData();form.set("purpose","assistants");form.set("file",new Blob([readFileSync(path)],{type:"text/plain"}),basename(pack.file,".jsonl")+".txt");
  const file=await request("/files",{method:"POST",body:form});
  const attached=await request(`/vector_stores/${encodeURIComponent(vectorStoreId)}/files`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({file_id:file.id})});
  next.files[pack.file]={sha256:fingerprint,bytes:pack.bytes,openai_file_id:file.id,vector_store_file_id:attached.id||file.id,synced_at:new Date().toISOString()};
  writeFileSync(statePath,JSON.stringify(next,null,2)+"\n");uploaded+=1;console.log(`Synced ${pack.file}`);
}
if(!dryRun)writeFileSync(statePath,JSON.stringify(next,null,2)+"\n");
console.log(`V28 vector sync ${dryRun?"DRY RUN ":""}PASS — uploaded ${uploaded}, skipped ${skipped}, selected ${selected.length}`);
