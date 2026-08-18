import { selfLearningSnapshot, resetSelfLearning } from "../lib/self_learning_os.js";

function authorized(request){
  const expected=String(process.env.MIG_LEARNING_TOKEN||process.env.MIG_METRICS_TOKEN||"").trim();
  if(!expected)return {ok:false,reason:"learning_token_not_configured"};
  const auth=String(request.headers.get("authorization")||""),header=String(request.headers.get("x-mig-admin-token")||"");
  const bearer=auth.toLowerCase().startsWith("bearer ")?auth.slice(7).trim():"";
  return {ok:bearer===expected||header===expected,reason:"unauthorized"};
}

export async function GET(request){
  const access=authorized(request);if(!access.ok)return Response.json({ok:false,error:access.reason},{status:access.reason==="learning_token_not_configured"?503:401});
  return Response.json({ok:true,service:"MIG FARM V25 Self-Learning Evaluation",privacy_safe:true,learning:selfLearningSnapshot(),time:new Date().toISOString()});
}

export async function POST(request){
  const access=authorized(request);if(!access.ok)return Response.json({ok:false,error:access.reason},{status:access.reason==="learning_token_not_configured"?503:401});
  let body={};try{body=await request.json();}catch{}
  if(body?.action!=="reset")return Response.json({ok:false,error:"unsupported_action"},{status:400});
  return Response.json({ok:true,learning:resetSelfLearning(),time:new Date().toISOString()});
}
