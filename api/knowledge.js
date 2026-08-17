import {
  getKnowledgeDocument, saveKnowledgeDocument, validateKnowledgeDocument,
  listKnowledgeVersions, rollbackKnowledgeDocument, resetKnowledgeDocument,
  adminKnowledgeStatus, knowledgePersistenceMode
} from "../lib/admin_knowledge.js";

function tokenFrom(request){
  const auth=String(request.headers.get("authorization")||"");
  if(auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  return String(request.headers.get("x-mig-admin-token")||"").trim();
}
function authorize(request){
  const expected=String(process.env.MIG_ADMIN_TOKEN||"").trim();
  if(!expected) return {ok:false,status:503,error:"admin_token_not_configured"};
  const got=tokenFrom(request);
  if(!got || got!==expected) return {ok:false,status:401,error:"unauthorized"};
  return {ok:true};
}
function who(request,body={}){
  return String(body?.updated_by||request.headers.get("x-mig-admin-user")||"admin").slice(0,120);
}
function json(data,status=200){
  return Response.json(data,{status,headers:{"Cache-Control":"no-store"}});
}

export async function GET(request){
  const auth=authorize(request);
  if(!auth.ok) return json({ok:false,error:auth.error},auth.status);
  const url=new URL(request.url);
  const action=url.searchParams.get("action")||"get";

  if(action==="status"){
    return json({ok:true,status:await adminKnowledgeStatus()});
  }
  if(action==="versions"){
    const versions=await listKnowledgeVersions(Number(url.searchParams.get("limit")||10));
    return json({ok:true,versions,persistence:knowledgePersistenceMode()});
  }
  if(action==="template"){
    const doc=await getKnowledgeDocument();
    return json({ok:true,doc:{...doc,entries:[]}});
  }

  const doc=await getKnowledgeDocument({force:true});
  const validation=validateKnowledgeDocument(doc);
  return json({
    ok:true,
    doc,
    validation:{ok:validation.ok,errors:validation.errors,warnings:validation.warnings},
    status:await adminKnowledgeStatus()
  });
}

export async function POST(request){
  const auth=authorize(request);
  if(!auth.ok) return json({ok:false,error:auth.error},auth.status);

  let body={};
  try{body=await request.json();}catch{return json({ok:false,error:"invalid_json"},400);}
  const action=String(body?.action||"save");

  if(action==="validate"){
    const result=validateKnowledgeDocument(body?.doc||{});
    return json({ok:result.ok,errors:result.errors,warnings:result.warnings,doc:result.doc},result.ok?200:422);
  }
  if(action==="save"){
    const result=await saveKnowledgeDocument(body?.doc||{},{updated_by:who(request,body)});
    return json({ok:Boolean(result.saved),...result},result.saved?200:422);
  }
  if(action==="rollback"){
    const result=await rollbackKnowledgeDocument(body?.revision,{updated_by:who(request,body)});
    return json({ok:Boolean(result.saved),...result},result.saved?200:404);
  }
  if(action==="reset"){
    if(body?.confirm!=="RESET") return json({ok:false,error:"reset_confirmation_required"},400);
    const result=await resetKnowledgeDocument({updated_by:who(request,body)});
    return json({ok:Boolean(result.saved),...result},result.saved?200:422);
  }

  return json({ok:false,error:"unsupported_action"},400);
}
