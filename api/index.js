import { rebuildProductIndex, loadProductIndex, productIndexStatus, productIndexPersistenceMode } from "../lib/product_index.js";

function access(request){
  const expected=String(process.env.MIG_INDEX_TOKEN||process.env.MIG_METRICS_TOKEN||"").trim();
  if(!expected) return {ok:false,status:503,error:"index_token_not_configured"};
  const auth=String(request.headers.get("authorization")||"");
  const header=String(request.headers.get("x-mig-admin-token")||"");
  const bearer=auth.toLowerCase().startsWith("bearer ")?auth.slice(7).trim():"";
  return (bearer===expected||header===expected)?{ok:true}:{ok:false,status:401,error:"unauthorized"};
}

export async function GET(request){
  const a=access(request); if(!a.ok) return Response.json({ok:false,error:a.error},{status:a.status});
  const loaded=await loadProductIndex();
  return Response.json({ok:true,status:productIndexStatus(),persistence:productIndexPersistenceMode(),loaded:Boolean(loaded),time:new Date().toISOString()});
}

export async function POST(request){
  const a=access(request); if(!a.ok) return Response.json({ok:false,error:a.error},{status:a.status});
  let body={}; try{body=await request.json();}catch{}
  const action=String(body?.action||"rebuild");
  if(action!=="rebuild") return Response.json({ok:false,error:"unsupported_action"},{status:400});
  const result=await rebuildProductIndex({maxProducts:Number(body?.max_products)||undefined,force:true});
  return Response.json({ok:true,result,status:productIndexStatus(),time:new Date().toISOString()});
}
