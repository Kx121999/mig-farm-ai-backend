const VERSION="25.0";
const TIMEOUT_MS=Math.max(3000,Math.min(20000,Number(process.env.ODOO_ACTION_TIMEOUT_MS)||10000));

const idempotency=globalThis.__migV25OdooIdempotency||new Map();
globalThis.__migV25OdooIdempotency=idempotency;
const inflight=globalThis.__migV25OdooInflight||new Map();
globalThis.__migV25OdooInflight=inflight;
const authCache=globalThis.__migV25OdooAuth||{uid:null,at:0,key:""};
globalThis.__migV25OdooAuth=authCache;

function clean(value="",max=500){return String(value??"").replace(/[\u0000-\u001f]/g," ").replace(/\s+/g," ").trim().slice(0,max);}
function arr(value){return Array.isArray(value)?value:[];}
function digits(value=""){return String(value||"").replace(/\D/g,"").slice(-15);}
function config(){
  const url=clean(process.env.ODOO_ACTION_URL||process.env.ODOO_SITE_URL||"",1000).replace(/\/+$/,"");
  const db=clean(process.env.ODOO_DB||"",160),username=clean(process.env.ODOO_USERNAME||"",240),apiKey=clean(process.env.ODOO_API_KEY||"",500);
  let validUrl=false;try{const u=new URL(url);validUrl=u.protocol==="https:"||(["localhost","127.0.0.1"].includes(u.hostname)&&u.protocol==="http:");}catch{}
  const enabled=String(process.env.ODOO_ACTIONS_ENABLED||"").toLowerCase()==="true";
  return {url,db,username,apiKey,enabled,configured:Boolean(enabled&&validUrl&&db&&username&&apiKey)};
}
function publicConfig(){const c=config();return {enabled:c.enabled,configured:c.configured,url_origin:(()=>{try{return new URL(c.url).origin;}catch{return "";}})(),timeout_ms:TIMEOUT_MS};}

async function jsonRpc(service,method,args=[]){
  const c=config();if(!c.configured)throw new Error("odoo_actions_not_configured");
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),TIMEOUT_MS);
  try{
    const response=await fetch(`${c.url}/jsonrpc`,{method:"POST",signal:controller.signal,headers:{"Content-Type":"application/json","User-Agent":"MIG-FARM-Autonomous-Actions/25.0"},body:JSON.stringify({jsonrpc:"2.0",method:"call",params:{service,method,args},id:crypto.randomUUID()})});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(`odoo_http_${response.status}`);
    if(data?.error)throw new Error(`odoo_rpc_${clean(data?.error?.data?.message||data?.error?.message||"failed",180)}`);
    return data?.result;
  }finally{clearTimeout(timer);}
}

async function authenticate(){
  const c=config();const key=`${c.url}|${c.db}|${c.username}`;
  if(authCache.uid&&authCache.key===key&&Date.now()-authCache.at<10*60*1000)return authCache.uid;
  const uid=Number(await jsonRpc("common","login",[c.db,c.username,c.apiKey]));
  if(!uid)throw new Error("odoo_auth_failed");
  authCache.uid=uid;authCache.at=Date.now();authCache.key=key;return uid;
}

async function executeKw(model,method,args=[],kwargs={}){
  const c=config();const uid=await authenticate();
  return await jsonRpc("object","execute_kw",[c.db,uid,c.apiKey,model,method,args,kwargs]);
}

function purgeIdempotency(){
  const now=Date.now();for(const [key,value] of idempotency){if(now-value.at>30*60*1000)idempotency.delete(key);}
  while(idempotency.size>1000)idempotency.delete(idempotency.keys().next().value);
}
async function once(key,worker){
  const safe=clean(key,180);purgeIdempotency();
  if(safe&&idempotency.has(safe))return {...idempotency.get(safe).result,idempotent_replay:true};
  if(safe&&inflight.has(safe))return {...await inflight.get(safe),idempotent_replay:true};
  const promise=Promise.resolve().then(worker);if(safe)inflight.set(safe,promise);
  try{const result=await promise;if(safe&&result?.ok)idempotency.set(safe,{at:Date.now(),result});return result;}
  finally{if(safe&&inflight.get(safe)===promise)inflight.delete(safe);}
}

async function resolveProduct(line={}){
  const requestedId=Math.max(0,Number(line.product_id)||0);
  let rows=[];
  if(requestedId){
    rows=await executeKw("product.product","search_read",[[["id","=",requestedId],["sale_ok","=",true],["active","=",true]]],{fields:["id","display_name","default_code","list_price","active","sale_ok"],limit:2});
  }else{
    const sku=clean(line.sku,160),name=clean(line.name,300);let domain=[];
    if(sku)domain=[["default_code","=",sku],["sale_ok","=",true],["active","=",true]];
    else if(name)domain=[["name","=",name],["sale_ok","=",true],["active","=",true]];
    if(domain.length)rows=await executeKw("product.product","search_read",[domain],{fields:["id","display_name","default_code","list_price","active","sale_ok"],limit:3});
  }
  if(!Array.isArray(rows)||rows.length!==1)return {ok:false,error:rows?.length>1?"product_identity_ambiguous":"product_not_found"};
  const row=rows[0];return {ok:true,product:{id:Number(row.id),name:clean(row.display_name,300),sku:clean(row.default_code,160),list_price:Number(row.list_price)||0}};
}

async function findOrCreatePartner(customer={}){
  const phone=digits(customer.phone),email=clean(customer.email,240).toLowerCase(),name=clean(customer.name,180);
  let domain=[];if(email)domain=[["email","=",email]];else if(phone)domain=[["phone","ilike",phone.slice(-9)]];
  let rows=domain.length?await executeKw("res.partner","search_read",[domain],{fields:["id","name","phone","email"],limit:3}):[];
  const exact=arr(rows).filter(row=>(email&&clean(row.email,240).toLowerCase()===email)||(phone&&digits(row.phone).endsWith(phone.slice(-7))));
  if(exact.length===1)return Number(exact[0].id);
  if(exact.length>1)throw new Error("customer_identity_ambiguous");
  if(!name||!phone)throw new Error("customer_name_and_phone_required");
  const values={name,phone,...(email?{email}:{})};
  const id=Number(await executeKw("res.partner","create",[values],{}));if(!id)throw new Error("customer_create_failed");return id;
}

export async function createCrmLead({customer={},summary="",description="",idempotency_key=""}={}){
  return await once(idempotency_key,async()=>{
    const name=clean(customer.name,180),phone=digits(customer.phone),email=clean(customer.email,240).toLowerCase();
    if(!name||phone.length<7)return {ok:false,error:"customer_name_and_valid_phone_required"};
    const marker=idempotency_key?clean(`MIG-AI-IDEMPOTENCY:${idempotency_key}`,240):"";
    if(marker){
      const existing=await executeKw("crm.lead","search_read",[[["description","ilike",marker]]],{fields:["id","name"],limit:2});
      if(arr(existing).length===1)return {ok:true,kind:"crm_lead",reference:`LEAD-${existing[0].id}`,message:"طلب التواصل مسجل بالفعل داخل Odoo CRM.",odoo_replay:true};
      if(arr(existing).length>1)return {ok:false,error:"lead_idempotency_conflict"};
    }
    const values={name:clean(`طلب تواصل AI — ${name}`,240),contact_name:name,phone,...(email?{email_from:email}:{}),description:clean(`${summary}\n${description}\n${marker}`,3500),type:"lead"};
    const id=Number(await executeKw("crm.lead","create",[values],{}));if(!id)return {ok:false,error:"lead_create_failed"};
    return {ok:true,kind:"crm_lead",reference:`LEAD-${id}`,message:"تم تسجيل طلب التواصل داخل Odoo CRM."};
  });
}

export async function createQuotationDraft({customer={},lines=[],summary="",idempotency_key=""}={}){
  return await once(idempotency_key,async()=>{
    const safeLines=arr(lines).slice(0,8);if(!safeLines.length)return {ok:false,error:"quote_lines_required"};
    const clientRef=idempotency_key?clean(`MIG-AI-${idempotency_key}`,180):"";
    if(clientRef){
      const existing=await executeKw("sale.order","search_read",[[["client_order_ref","=",clientRef]]],{fields:["id","name","state","amount_total","currency_id"],limit:2});
      if(arr(existing).length===1&&["draft","sent"].includes(String(existing[0].state||""))){const row=existing[0];return {ok:true,kind:"quotation",reference:clean(row.name||`QUOTE-${row.id}`,120),state:String(row.state),amount_total:Number(row.amount_total)||0,currency:clean(Array.isArray(row.currency_id)?row.currency_id[1]:"AED",40)||"AED",order_confirmed:false,message:"مسودة عرض السعر موجودة بالفعل ولم يتم تكرار إنشائها.",odoo_replay:true};}
      if(arr(existing).length)return {ok:false,error:"quotation_idempotency_conflict"};
    }
    const resolved=[];
    for(const line of safeLines){
      const item=await resolveProduct(line);if(!item.ok)return {ok:false,error:item.error,product:clean(line.name||line.sku,200)};
      const quantity=Math.max(1,Math.min(999,Number(line.quantity)||1));resolved.push({...item.product,quantity});
    }
    const partnerId=await findOrCreatePartner(customer);
    const values={partner_id:partnerId,client_order_ref:clientRef,note:clean(`V25 confirmed quotation request. ${summary}`,1500),order_line:resolved.map(item=>[0,0,{product_id:item.id,product_uom_qty:item.quantity}])};
    const orderId=Number(await executeKw("sale.order","create",[values],{}));if(!orderId)return {ok:false,error:"quotation_create_failed"};
    const rows=await executeKw("sale.order","read",[[orderId]],{fields:["name","state","amount_total","currency_id","date_order"]});const row=arr(rows)[0]||{};
    if(!["draft","sent"].includes(String(row.state||"draft")))return {ok:false,error:"unexpected_quote_state"};
    return {ok:true,kind:"quotation",reference:clean(row.name||`QUOTE-${orderId}`,120),state:String(row.state||"draft"),amount_total:Number(row.amount_total)||0,currency:clean(Array.isArray(row.currency_id)?row.currency_id[1]:"AED",40)||"AED",lines:resolved.map(x=>({name:x.name,sku:x.sku,quantity:x.quantity})),order_confirmed:false,message:"تم إنشاء مسودة عرض سعر في Odoo، ولم يتم تأكيدها كطلب بيع."};
  });
}

const ORDER_STATES={draft:"مسودة عرض سعر",sent:"عرض سعر مُرسل",sale:"طلب بيع مؤكد",done:"مكتمل",cancel:"ملغي"};
export async function trackVerifiedOrder({order_ref="",phone=""}={}){
  const ref=clean(order_ref,120).toUpperCase(),provided=digits(phone);if(!ref||provided.length<7)return {ok:false,error:"order_reference_and_phone_required"};
  const orders=await executeKw("sale.order","search_read",[["|",["name","=",ref],["client_order_ref","=",ref]]],{fields:["id","name","state","amount_total","currency_id","date_order","commitment_date","partner_id"],limit:3});
  if(!Array.isArray(orders)||orders.length!==1)return {ok:false,error:"order_not_found_or_ambiguous"};
  const order=orders[0],partnerId=Array.isArray(order.partner_id)?Number(order.partner_id[0]):Number(order.partner_id);
  const partners=await executeKw("res.partner","read",[[partnerId]],{fields:["phone","mobile"]});const partner=arr(partners)[0]||{};
  const stored=[digits(partner.phone),digits(partner.mobile)].filter(Boolean);const verified=stored.some(value=>value.endsWith(provided.slice(-7))||provided.endsWith(value.slice(-7)));
  if(!verified)return {ok:false,error:"identity_verification_failed"};
  return {ok:true,kind:"order_status",reference:clean(order.name,120),state:clean(order.state,30),status_ar:ORDER_STATES[order.state]||"قيد المعالجة",amount_total:Number(order.amount_total)||0,currency:clean(Array.isArray(order.currency_id)?order.currency_id[1]:"AED",40)||"AED",date_order:clean(order.date_order,40),commitment_date:clean(order.commitment_date,40),identity_verified:true};
}

export function odooActionGatewayHealth(){
  return {version:VERSION,mode:"allowlisted_odoo_jsonrpc_action_gateway",...publicConfig(),mutations:["crm_lead_create","draft_quotation_create"],reads:["phone_verified_order_status"],never_calls:["sale_order_action_confirm","payment_capture","stock_write","invoice_post"],security:["https_only","model_method_allowlist","explicit_confirmation_required_upstream","idempotency_cache","phone_order_verification","bounded_fields","timeouts","no_credentials_in_output"]};
}
