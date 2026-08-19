import { searchCustomerKnowledgeV27, customerKnowledgeHealthV27 } from "./customer_knowledge_v27.js";

const VERSION="28.0";
function clean(value="",max=7000){return String(value??"").replace(/[\u0000-\u001f]/g," ").replace(/\s+/g," ").trim().slice(0,max);}
function enabled(){return /^(1|true|yes|on)$/i.test(String(process.env.MIG_ENTERPRISE_RETRIEVAL_ENABLED||"false"));}
function config(){
  return {enabled:enabled(),apiKey:clean(process.env.OPENAI_API_KEY||"",5000),model:clean(process.env.OPENAI_MODEL||"",200),vectorStoreId:clean(process.env.OPENAI_VECTOR_STORE_ID||"",300),timeout:Math.max(1500,Math.min(15000,Number(process.env.MIG_ENTERPRISE_RETRIEVAL_TIMEOUT_MS)||6000))};
}
function fileSearchText(item={}){
  if(typeof item?.text==="string")return item.text;
  if(Array.isArray(item?.content))return item.content.map(x=>x?.text||x?.content||"").filter(Boolean).join(" ");
  return item?.filename||item?.file_name||"";
}
async function externalFileSearch(query,limit){
  const cfg=config();
  if(!cfg.enabled)return {items:[],reason:"disabled"};
  if(!cfg.apiKey||!cfg.model||!cfg.vectorStoreId)return {items:[],reason:"not_configured"};
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),cfg.timeout);
  try{
    const response=await fetch("https://api.openai.com/v1/responses",{
      method:"POST",signal:controller.signal,
      headers:{Authorization:`Bearer ${cfg.apiKey}`,"Content-Type":"application/json"},
      body:JSON.stringify({
        model:cfg.model,input:[{role:"user",content:[{type:"input_text",text:clean(query,4000)}]}],
        tools:[{type:"file_search",vector_store_ids:[cfg.vectorStoreId],max_num_results:limit}],
        tool_choice:{type:"file_search"},include:["file_search_call.results"]
      })
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok)return {items:[],reason:`openai_${response.status}`};
    const calls=(Array.isArray(data?.output)?data.output:[]).filter(x=>x?.type==="file_search_call");
    const rows=calls.flatMap(x=>Array.isArray(x?.results)?x.results:[]).slice(0,limit);
    return {items:rows.map((x,index)=>({id:clean(x?.file_id||`external_${index}`,160),title:clean(x?.filename||x?.file_name||"Enterprise knowledge",500),answer:clean(fileSearchText(x),5000),score:Number(x?.score)||0,source:"openai_vector_store_v28",verified:true})).filter(x=>x.answer),reason:"ok",response_id:clean(data?.id,160)};
  }catch(error){return {items:[],reason:error?.name==="AbortError"?"timeout":clean(error?.message||"external_error",160)};}
  finally{clearTimeout(timer);}
}
function dedupe(items=[],limit=8){
  const out=[],seen=new Set();
  for(const item of items){const key=clean(`${item?.title||""}|${item?.answer||""}`,1000).toLowerCase();if(!key||seen.has(key))continue;seen.add(key);out.push(item);if(out.length>=limit)break;}
  return out;
}

export async function retrieveEnterpriseKnowledgeV28(query="",{limit=6,domain="",frame=null}={}){
  const started=Date.now(),cap=Math.max(1,Math.min(10,Number(limit)||6));
  const [local,external]=await Promise.all([
    searchCustomerKnowledgeV27(query,{limit:cap,domain,frame}),
    externalFileSearch(query,cap)
  ]);
  const items=dedupe([...(external.items||[]),...(local.items||[])],cap);
  return {query:clean(query,1000),items,trace:{version:VERSION,mode:external.reason==="ok"?"hybrid_vector_plus_local":"local_resilient_fallback",external_reason:external.reason,external_hits:external.items?.length||0,local_hits:local.items?.length||0,packs_scanned:local.packs_scanned||[],latency_ms:Date.now()-started}};
}

export function enterpriseRetrievalHealthV28(){
  const cfg=config(),local=customerKnowledgeHealthV27();
  return {version:VERSION,mode:"hybrid_enterprise_retrieval",enabled:cfg.enabled,external_configured:Boolean(cfg.apiKey&&cfg.model&&cfg.vectorStoreId),vector_store_configured:Boolean(cfg.vectorStoreId),local_ready:local.ready,local_megabytes:local.megabytes,local_records:local.records,fail_open_to_local:true,credentials_exposed:false};
}
