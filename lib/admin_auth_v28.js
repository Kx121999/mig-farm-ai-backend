import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const VERSION="28.0";
const COOKIE_NAME="mig_v28_admin";

function clean(value="",max=4000){return String(value??"").replace(/[\u0000-\u001f]/g,"").trim().slice(0,max);}
function digest(value=""){return createHash("sha256").update(String(value)).digest();}
function safeEqual(a="",b=""){const left=digest(a),right=digest(b);return timingSafeEqual(left,right);}
function token(){return clean(process.env.MIG_ADMIN_TOKEN||process.env.MIG_METRICS_TOKEN||"",4000);}
function sessionSecret(){return clean(process.env.MIG_ADMIN_SESSION_SECRET||token(),4000);}
function sessionHours(){return Math.max(1,Math.min(24,Number(process.env.MIG_ADMIN_SESSION_HOURS)||8));}
function signature(payload=""){return createHmac("sha256",sessionSecret()).update(payload).digest("base64url");}
function cookieValue(request){
  const raw=String(request?.headers?.get?.("cookie")||"");
  for(const item of raw.split(";")){const [name,...value]=item.trim().split("=");if(name===COOKIE_NAME)return value.join("=");}
  return "";
}
function directCredential(request){
  const auth=clean(request?.headers?.get?.("authorization")||"",5000);
  const header=clean(request?.headers?.get?.("x-mig-admin-token")||"",5000);
  return auth.toLowerCase().startsWith("bearer ")?auth.slice(7).trim():header;
}

export function adminAuthConfiguredV28(){return Boolean(token()&&sessionSecret());}

export function createAdminSessionV28(candidate=""){
  if(!adminAuthConfiguredV28()||!safeEqual(clean(candidate,5000),token()))return {ok:false,error:"invalid_credentials"};
  const issued=Math.floor(Date.now()/1000),expires=issued+(sessionHours()*3600);
  const payload=`${issued}.${expires}.${randomBytes(12).toString("base64url")}`;
  const value=`${payload}.${signature(payload)}`;
  return {
    ok:true,
    expires_at:new Date(expires*1000).toISOString(),
    cookie:`${COOKIE_NAME}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${sessionHours()*3600}`
  };
}

export function clearAdminSessionV28(){return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;}

export function authenticateAdminV28(request){
  if(!adminAuthConfiguredV28())return {ok:false,status:503,error:"admin_auth_not_configured"};
  const direct=directCredential(request);
  if(direct&&safeEqual(direct,token()))return {ok:true,method:"token",expires_at:null};
  const value=cookieValue(request),parts=value.split(".");
  if(parts.length!==4)return {ok:false,status:401,error:"admin_session_required"};
  const [issued,expires,nonce,sig]=parts,payload=`${issued}.${expires}.${nonce}`;
  if(!/^\d+$/.test(expires)||Number(expires)<=Math.floor(Date.now()/1000))return {ok:false,status:401,error:"admin_session_expired"};
  if(!safeEqual(sig,signature(payload)))return {ok:false,status:401,error:"invalid_admin_session"};
  return {ok:true,method:"session",expires_at:new Date(Number(expires)*1000).toISOString()};
}

export function sameOriginAdminRequestV28(request){
  const fetchSite=clean(request?.headers?.get?.("sec-fetch-site")||"",40).toLowerCase();
  if(fetchSite&&!["same-origin","same-site","none"].includes(fetchSite))return false;
  const origin=clean(request?.headers?.get?.("origin")||"",500),host=clean(request?.headers?.get?.("host")||"",300);
  if(!origin||!host)return true;
  try{return new URL(origin).host===host;}catch{return false;}
}

export function adminSecurityHeadersV28(extra={}){
  return {"Cache-Control":"private, no-store, max-age=0","X-Content-Type-Options":"nosniff","X-Frame-Options":"DENY","Referrer-Policy":"no-referrer","X-Robots-Tag":"noindex, nofollow",...extra};
}

export function adminAuthHealthV28(){
  return {version:VERSION,configured:adminAuthConfiguredV28(),mode:"http_only_signed_admin_session",session_hours:sessionHours(),same_site:"Strict",secrets_exposed:false};
}
