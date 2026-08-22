const VERSION="40.3.0";
function clean(v="",max=220){return String(v??"").replace(/[\u0000-\u001f]/g," ").replace(/\s+/g," ").trim().slice(0,max);}
function model(){const requested=clean(process.env.OPENAI_MODEL||"gpt-5-mini",100);return /^gpt-5\.6$/i.test(requested)?"gpt-5-mini":requested;}
function classify(status,message=""){
  if(status===401)return "invalid_or_revoked_api_key";
  if(status===403)return "provider_permission_denied";
  if(status===404)return "model_or_endpoint_not_found";
  if(status===429)return /quota|billing|credit/i.test(message)?"quota_or_billing":"rate_limited";
  if(status>=500)return "provider_unavailable";
  if(status>=400)return "provider_request_rejected";
  return "ok";
}
export async function probeOpenAIProviderV40(){
  const configured=Boolean(clean(process.env.OPENAI_API_KEY,40));
  if(!configured)return {ok:false,version:VERSION,configured:false,model:model(),provider:"openai_responses_api",error_code:"not_configured"};
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),10000);
  try{
    const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",signal:controller.signal,headers:{"Content-Type":"application/json","Authorization":`Bearer ${process.env.OPENAI_API_KEY}`},body:JSON.stringify({model:model(),store:false,input:"Return exactly OK.",max_output_tokens:16})});
    const data=await response.json().catch(()=>({}));
    const message=clean(data?.error?.message||"",180),code=classify(response.status,message);
    return {ok:response.ok,version:VERSION,configured:true,provider:"openai_responses_api",model:model(),http_status:response.status,error_code:response.ok?null:code,error_type:clean(data?.error?.type||"",80)||null,error_message:response.ok?null:message||code,secret_exposed:false};
  }catch(error){
    const timeout=error?.name==="AbortError";return {ok:false,version:VERSION,configured:true,provider:"openai_responses_api",model:model(),http_status:null,error_code:timeout?"timeout":"network_or_provider_failure",error_type:timeout?"AbortError":clean(error?.name||"Error",80),error_message:timeout?"Provider probe timed out":clean(error?.message||"Provider request failed",180),secret_exposed:false};
  }finally{clearTimeout(timer);}
}
