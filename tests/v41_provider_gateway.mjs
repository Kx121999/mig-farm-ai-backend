import assert from 'node:assert/strict';
process.env.OPENAI_API_KEY='test-key';
process.env.OPENAI_MODEL='primary-model';
process.env.OPENAI_FALLBACK_MODEL='fallback-model';
process.env.PROVIDER_V41_CIRCUIT_FAILURES='20';
const originalFetch=global.fetch;
const {callOpenAIResponsesV41,providerGatewayHealthV41}=await import('../lib/provider_gateway_v41.js');

let calls=[];
global.fetch=async (_url,opts={})=>{
  const body=JSON.parse(opts.body||'{}');calls.push(body.model);
  if(calls.length===1)return new Response(JSON.stringify({error:{message:'temporary unavailable'}}),{status:500,headers:{'content-type':'application/json'}});
  return new Response(JSON.stringify({id:'resp_ok',model:body.model,output:[{type:'message',content:[{type:'output_text',text:'OK'}]}]}),{status:200,headers:{'content-type':'application/json'}});
};
let data=await callOpenAIResponsesV41({model:'primary-model',input:'x'},{purpose:'test_retry',max_attempts:2,timeout_ms:3000});
assert.equal(data.id,'resp_ok');assert.deepEqual(calls,['primary-model','primary-model']);

calls=[];
global.fetch=async (_url,opts={})=>{
  const body=JSON.parse(opts.body||'{}');calls.push(body.model);
  if(body.model==='primary-model')return new Response(JSON.stringify({error:{message:'model not found'}}),{status:404,headers:{'content-type':'application/json'}});
  return new Response(JSON.stringify({id:'resp_fallback',model:body.model,output:[]}),{status:200,headers:{'content-type':'application/json'}});
};
data=await callOpenAIResponsesV41({model:'primary-model',input:'x'},{purpose:'test_model_fallback',max_attempts:1,timeout_ms:3000});
assert.equal(data.id,'resp_fallback');assert.deepEqual(calls,['primary-model','fallback-model']);

calls=[];
global.fetch=async()=>new Response(JSON.stringify({error:{message:'invalid key'}}),{status:401,headers:{'content-type':'application/json'}});
let error=null;try{await callOpenAIResponsesV41({model:'primary-model',input:'x'},{purpose:'test_401',max_attempts:1,timeout_ms:3000});}catch(e){error=e;}
assert.ok(error);assert.equal(error.code,'invalid_or_revoked_api_key');assert.equal(error.status,401);
const health=providerGatewayHealthV41();assert.equal(health.ready,true);assert.ok(health.stats.calls>=3);assert.ok(health.stats.retries>=1);assert.ok(health.stats.model_fallbacks>=1);
global.fetch=originalFetch;
console.log('V41 provider gateway PASS');
