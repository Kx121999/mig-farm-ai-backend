import { metricsSnapshot, resetMetrics } from "../lib/metrics.js";

function authorized(request){
  const expected=String(process.env.MIG_METRICS_TOKEN||"").trim();
  if(!expected) return {ok:false,reason:"metrics_token_not_configured"};
  const auth=String(request.headers.get("authorization")||"");
  const header=String(request.headers.get("x-mig-admin-token")||"");
  const bearer=auth.toLowerCase().startsWith("bearer ")?auth.slice(7).trim():"";
  return {ok:bearer===expected||header===expected,reason:"unauthorized"};
}

export async function GET(request){
  const access=authorized(request);
  if(!access.ok){
    return Response.json({
      ok:false,
      error:access.reason,
      hint:access.reason==="metrics_token_not_configured"
        ?"Set MIG_METRICS_TOKEN in Vercel before using this endpoint."
        :"Send Authorization: Bearer <token> or x-mig-admin-token."
    },{status:access.reason==="metrics_token_not_configured"?503:401});
  }
  return Response.json({
    ok:true,
    service:"MIG FARM Assistant Runtime Metrics",
    privacy_safe:true,
    metrics:metricsSnapshot(),
    time:new Date().toISOString()
  });
}

export async function POST(request){
  const access=authorized(request);
  if(!access.ok) return Response.json({ok:false,error:access.reason},{status:access.reason==="metrics_token_not_configured"?503:401});
  let body={};
  try{body=await request.json();}catch{}
  if(body?.action!=="reset") return Response.json({ok:false,error:"unsupported_action"},{status:400});
  return Response.json({ok:true,metrics:resetMetrics(),time:new Date().toISOString()});
}
