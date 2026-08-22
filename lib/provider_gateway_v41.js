const VERSION="41.0.0";
const stats=globalThis.__migProviderGatewayV41||{
  calls:0,success:0,failures:0,retries:0,model_fallbacks:0,timeouts:0,circuit_rejects:0,
  consecutive_failures:0,circuit_open_until:0,last_error:null,last_model:null,last_status:null,last_success_at:null
};
globalThis.__migProviderGatewayV41=stats;

function clean(v="",max=500){return String(v??"").replace(/[\u0000-\u001f]/g," ").replace(/\s+/g," ").trim().slice(0,max);}
function boolEnv(name,def=true){const value=process.env[name];return value===undefined?def:/^(1|true|yes|on)$/i.test(String(value));}
function intEnv(name,def,min,max){const n=Number(process.env[name]);return Math.max(min,Math.min(max,Number.isFinite(n)?n:def));}
function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
export function normalizeProviderModelV41(value=""){const requested=clean(value||"gpt-5-mini",120);return /^gpt-5\.6$/i.test(requested)?"gpt-5-mini":requested||"gpt-5-mini";}
function fallbackModel(primary=""){
  const configured=normalizeProviderModelV41(process.env.OPENAI_FALLBACK_MODEL||"");
  if(configured&&configured!==primary)return configured;
  const safe="gpt-5-mini";return primary!==safe?safe:"";
}
function circuitOpen(){return Number(stats.circuit_open_until)>Date.now();}
function classify(status=0,message="",errorName=""){
  if(errorName==="AbortError")return "timeout";
  if(status===401)return "invalid_or_revoked_api_key";
  if(status===403)return "provider_permission_denied";
  if(status===404)return "model_or_endpoint_not_found";
  if(status===408)return "provider_timeout";
  if(status===409)return "provider_conflict";
  if(status===429)return /quota|billing|credit|insufficient/i.test(message)?"quota_or_billing":"rate_limited";
  if(status>=500)return "provider_unavailable";
  if(status>=400)return "provider_request_rejected";
  return "network_or_provider_failure";
}
function retryable(code){return new Set(["timeout","provider_timeout","provider_conflict","rate_limited","provider_unavailable","network_or_provider_failure"]).has(code);}
function noteSuccess(model,status){stats.success+=1;stats.consecutive_failures=0;stats.circuit_open_until=0;stats.last_error=null;stats.last_model=model;stats.last_status=status;stats.last_success_at=new Date().toISOString();}
function noteFailure(error){stats.failures+=1;stats.consecutive_failures+=1;stats.last_error=clean(error?.code||error?.message||"provider_failure",180);stats.last_status=error?.status??null;stats.last_model=error?.model||stats.last_model;if(error?.code==="timeout")stats.timeouts+=1;const threshold=intEnv("PROVIDER_V41_CIRCUIT_FAILURES",5,2,20);if(stats.consecutive_failures>=threshold&&!["invalid_or_revoked_api_key","quota_or_billing"].includes(error?.code)){stats.circuit_open_until=Date.now()+intEnv("PROVIDER_V41_CIRCUIT_MS",30000,5000,180000);}}

export class ProviderGatewayErrorV41 extends Error{
  constructor(message,{code="provider_failure",status=null,model="",attempt=0,purpose="general"}={}){super(message);this.name="ProviderGatewayErrorV41";this.code=code;this.status=status;this.model=model;this.attempt=attempt;this.purpose=purpose;}
}

async function oneCall(body,{model,timeout_ms,purpose,attempt}){
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeout_ms);
  try{
    const response=await fetch("https://api.openai.com/v1/responses",{
      method:"POST",signal:controller.signal,
      headers:{"Content-Type":"application/json","Authorization":`Bearer ${process.env.OPENAI_API_KEY}`},
      body:JSON.stringify({...body,model})
    });
    const data=await response.json().catch(()=>({}));
    if(response.ok){noteSuccess(model,response.status);return data;}
    const message=clean(data?.error?.message||data?.error||"request_failed",300);
    const code=classify(response.status,message,"");
    throw new ProviderGatewayErrorV41(`openai_${response.status}:${message||code}`,{code,status:response.status,model,attempt,purpose});
  }catch(error){
    if(error instanceof ProviderGatewayErrorV41)throw error;
    const code=classify(0,clean(error?.message,200),error?.name||"");
    throw new ProviderGatewayErrorV41(code==="timeout"?"provider_timeout":clean(error?.message||code,240),{code,status:null,model,attempt,purpose});
  }finally{clearTimeout(timer);}
}

export async function callOpenAIResponsesV41(body={},options={}){
  stats.calls+=1;
  if(!clean(process.env.OPENAI_API_KEY,80))throw new ProviderGatewayErrorV41("OPENAI_API_KEY not configured",{code:"not_configured",purpose:options.purpose||"general"});
  if(circuitOpen()&&!options.bypass_circuit){stats.circuit_rejects+=1;throw new ProviderGatewayErrorV41("provider_circuit_open",{code:"circuit_open",purpose:options.purpose||"general"});}
  const purpose=clean(options.purpose||"general",80),timeout_ms=Math.max(2000,Math.min(30000,Number(options.timeout_ms)||15000));
  const maxAttempts=Math.max(1,Math.min(3,Number(options.max_attempts)||2));
  const primary=normalizeProviderModelV41(body?.model||process.env.OPENAI_MODEL||"gpt-5-mini");
  const models=[primary];const fallback=fallbackModel(primary);if(fallback)models.push(fallback);
  let lastError=null;
  for(let modelIndex=0;modelIndex<models.length;modelIndex++){
    const model=models[modelIndex];if(modelIndex>0)stats.model_fallbacks+=1;
    for(let attempt=1;attempt<=maxAttempts;attempt++){
      try{return await oneCall(body,{model,timeout_ms,purpose,attempt});}
      catch(error){lastError=error;noteFailure(error);
        const canFallbackModel=error.code==="model_or_endpoint_not_found"&&modelIndex<models.length-1;
        if(canFallbackModel)break;
        if(attempt<maxAttempts&&retryable(error.code)){stats.retries+=1;await sleep(Math.min(1200,150*Math.pow(2,attempt-1)));continue;}
        break;
      }
    }
    if(lastError?.code!=="model_or_endpoint_not_found")break;
  }
  throw lastError||new ProviderGatewayErrorV41("provider_failure",{code:"provider_failure",purpose});
}

export async function probeProviderGatewayV41(){
  const configured=Boolean(clean(process.env.OPENAI_API_KEY,80)),model=normalizeProviderModelV41(process.env.OPENAI_MODEL||"gpt-5-mini");
  if(!configured)return {ok:false,version:VERSION,configured:false,provider:"openai_responses_api",model,error_code:"not_configured",gateway:providerGatewayHealthV41()};
  try{
    const data=await callOpenAIResponsesV41({model,store:false,input:"Return exactly OK.",max_output_tokens:16},{purpose:"live_probe",timeout_ms:10000,max_attempts:1,bypass_circuit:true});
    return {ok:true,version:VERSION,configured:true,provider:"openai_responses_api",model:normalizeProviderModelV41(data?.model||model),http_status:200,error_code:null,response_id:clean(data?.id,120)||null,secret_exposed:false,gateway:providerGatewayHealthV41()};
  }catch(error){return {ok:false,version:VERSION,configured:true,provider:"openai_responses_api",model:error?.model||model,http_status:error?.status??null,error_code:error?.code||"provider_failure",error_message:clean(error?.message,180),secret_exposed:false,gateway:providerGatewayHealthV41()};}
}

export function providerGatewayHealthV41(){return {version:VERSION,ready:true,configured:Boolean(clean(process.env.OPENAI_API_KEY,80)),primary_model:normalizeProviderModelV41(process.env.OPENAI_MODEL||"gpt-5-mini"),fallback_model:fallbackModel(normalizeProviderModelV41(process.env.OPENAI_MODEL||"gpt-5-mini"))||null,retry_enabled:boolEnv("PROVIDER_V41_RETRY_ENABLED",true),circuit_open:circuitOpen(),stats:{...stats,circuit_open_until:stats.circuit_open_until?new Date(stats.circuit_open_until).toISOString():null}};}
