import { authenticateAdminV28, createAdminSessionV28, clearAdminSessionV28, sameOriginAdminRequestV28, adminSecurityHeadersV28, adminAuthHealthV28 } from "../lib/admin_auth_v28.js";

const attempts=globalThis.__migV28AdminAttempts||new Map();
globalThis.__migV28AdminAttempts=attempts;

function rateAllowed(key=""){
  const now=Date.now(),windowMs=15*60*1000,max=8,current=attempts.get(key);
  if(!current||now-current.startedAt>windowMs){attempts.set(key,{startedAt:now,count:1});return true;}
  current.count+=1;attempts.set(key,current);return current.count<=max;
}
function json(body,status=200,headers={}){return Response.json(body,{status,headers:adminSecurityHeadersV28(headers)});}

export async function GET(request){
  const auth=authenticateAdminV28(request);
  if(!auth.ok)return json({ok:false,authenticated:false,error:auth.error,auth:adminAuthHealthV28()},auth.status);
  return json({ok:true,authenticated:true,expires_at:auth.expires_at,auth:adminAuthHealthV28()});
}

export async function POST(request){
  if(!sameOriginAdminRequestV28(request))return json({ok:false,error:"cross_site_request_blocked"},403);
  let body={};try{body=await request.json();}catch{return json({ok:false,error:"invalid_json"},400);}
  const action=String(body?.action||"login").toLowerCase();
  if(action==="logout")return json({ok:true,authenticated:false},200,{"Set-Cookie":clearAdminSessionV28()});
  if(action!=="login")return json({ok:false,error:"unsupported_action"},400);
  const ip=String(request.headers.get("x-forwarded-for")||"unknown").split(",")[0].trim();
  if(!rateAllowed(ip))return json({ok:false,error:"too_many_login_attempts"},429,{"Retry-After":"900"});
  const session=createAdminSessionV28(body?.token||"");
  if(!session.ok)return json({ok:false,error:session.error},401);
  attempts.delete(ip);
  return json({ok:true,authenticated:true,expires_at:session.expires_at},200,{"Set-Cookie":session.cookie});
}
