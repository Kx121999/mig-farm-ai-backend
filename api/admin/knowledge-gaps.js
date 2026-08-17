import { readTopKnowledgeGaps, persistentStoreHealth } from '../../lib/persistent_store.js';

function tokenFrom(request){
  const auth=String(request.headers.get('authorization')||'').trim();
  if(/^Bearer\s+/i.test(auth)) return auth.replace(/^Bearer\s+/i,'').trim();
  return String(request.headers.get('x-mig-admin-token')||'').trim();
}

export async function GET(request){
  const expected=String(process.env.ADMIN_API_TOKEN||'').trim();
  if(!expected) return Response.json({ok:false,error:'admin_api_disabled'},{status:503});
  if(tokenFrom(request)!==expected) return Response.json({ok:false,error:'unauthorized'},{status:401});
  const store=persistentStoreHealth();
  if(!store.configured) return Response.json({ok:false,error:'persistent_store_not_configured',persistent_store:store},{status:503});
  const url=new URL(request.url); const limit=Math.max(1,Math.min(100,Number(url.searchParams.get('limit'))||25));
  const result=await readTopKnowledgeGaps(limit);
  return Response.json({ok:true,version:'12.0.0',items:result.items,reason:result.reason,persistent_store:{configured:store.configured,provider:store.provider},time:new Date().toISOString()});
}
