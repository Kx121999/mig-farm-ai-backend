import assert from 'node:assert/strict';
import { runNeuralAgent } from '../lib/neural_agent.js';

const oldFetch=globalThis.fetch;
const oldKey=process.env.OPENAI_API_KEY;
const oldRounds=process.env.NEURAL_MAX_ROUNDS;
process.env.OPENAI_API_KEY='test-key';
process.env.NEURAL_MAX_ROUNDS='5';

const bodies=[];
let callNo=0;
globalThis.fetch=async (_url,opts={})=>{
  const body=JSON.parse(String(opts.body||'{}'));
  bodies.push(body);
  callNo+=1;
  if(callNo===1){
    return new Response(JSON.stringify({id:'resp-1',output:[{type:'message',role:'assistant',content:[{type:'output_text',text:'تقصد منتج ولا شحن ولا فرع؟'}]}]}),{status:200,headers:{'content-type':'application/json'}});
  }
  if(callNo===2){
    return new Response(JSON.stringify({id:'resp-2',output:[{type:'function_call',name:'match_visual_product',call_id:'call-1',arguments:JSON.stringify({visible_text:'TEST PRODUCT SKU1',candidate_name:'TEST PRODUCT',sku:'SKU1',barcode:'',brand:'',category:'',limit:4})}]}),{status:200,headers:{'content-type':'application/json'}});
  }
  return new Response(JSON.stringify({id:'resp-3',output:[{type:'message',role:'assistant',content:[{type:'output_text',text:'الصورة أقرب لمنتج TEST PRODUCT، وهثبت السعر Live لو سألت عنه.'}]}]}),{status:200,headers:{'content-type':'application/json'}});
};

try{
  const result=await runNeuralAgent({
    message:'ركز',
    locale:'ar',
    context:{vision_context:{has_visual_context:true,has_fresh_images:true,mode:'product_or_label'}},
    images:[{type:'input_image',image_url:'data:image/jpeg;base64,AAAA',detail:'high'}],
    allowedTools:['match_visual_product','get_retake_advice'],
    toolHandlers:{
      match_visual_product:async ()=>({identity_confidence:'high',candidates:[{name:'TEST PRODUCT',sku:'SKU1'}]}),
      get_retake_advice:async ()=>({ask_one:'صورة أوضح'})
    }
  });
  assert.equal(result.handled,true);
  assert.equal(result.visual_grounding_retry,true);
  assert.equal(result.trace.some(x=>x.tool==='match_visual_product'),true);
  assert.match(result.reply,/TEST PRODUCT/);
  assert.equal(bodies.length,3);
  for(const b of bodies){
    const names=(b.tools||[]).map(x=>x.name);
    assert.equal(names.every(x=>['match_visual_product','get_retake_advice'].includes(x)),true,'tool whitelist leaked a disallowed tool');
  }
  const retryText=JSON.stringify(bodies[1].input||[]);
  assert.match(retryText,/ground the visual evidence/i);
  assert.doesNotMatch(result.reply,/منتج ولا شحن ولا فرع/);
  console.log('V22.1 neural visual grounding retry & tool whitelist PASS');
} finally {
  globalThis.fetch=oldFetch;
  if(oldKey===undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY=oldKey;
  if(oldRounds===undefined) delete process.env.NEURAL_MAX_ROUNDS; else process.env.NEURAL_MAX_ROUNDS=oldRounds;
}
