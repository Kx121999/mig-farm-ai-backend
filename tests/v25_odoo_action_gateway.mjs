import assert from "node:assert/strict";

process.env.ODOO_ACTIONS_ENABLED="true";
process.env.ODOO_ACTION_URL="https://odoo.example.test";
process.env.ODOO_DB="mig-test";
process.env.ODOO_USERNAME="ai-actions@example.test";
process.env.ODOO_API_KEY="SECRET-NEVER-EXPOSE";

const calls=[];
globalThis.fetch=async (_url,options={})=>{
  const rpc=JSON.parse(options.body);const {service,method,args}=rpc.params;calls.push({service,method,args});
  let result;
  if(service==="common"&&method==="login")result=7;
  else{
    const [, , ,model,modelMethod,modelArgs]=args;
    if(model==="crm.lead"&&modelMethod==="search_read")result=[];
    else if(model==="crm.lead"&&modelMethod==="create")result=77;
    else if(model==="product.product"&&modelMethod==="search_read")result=[{id:25,display_name:"سماد اختبار",default_code:"TEST-25",list_price:42,active:true,sale_ok:true}];
    else if(model==="res.partner"&&modelMethod==="search_read")result=[];
    else if(model==="res.partner"&&modelMethod==="create")result=88;
    else if(model==="sale.order"&&modelMethod==="create")result=99;
    else if(model==="sale.order"&&modelMethod==="read")result=[{id:99,name:"S00025",state:"draft",amount_total:84,currency_id:[1,"AED"],date_order:"2026-08-18"}];
    else if(model==="sale.order"&&modelMethod==="search_read"&&JSON.stringify(modelArgs).includes("MIG-AI-quote-test-25"))result=[];
    else if(model==="sale.order"&&modelMethod==="search_read")result=[{id:99,name:"S00025",state:"sale",amount_total:84,currency_id:[1,"AED"],partner_id:[88,"عميل"],commitment_date:"2026-08-20"}];
    else if(model==="res.partner"&&modelMethod==="read")result=[{id:88,phone:"+971501234567",mobile:""}];
    else throw new Error(`Unexpected RPC ${model}.${modelMethod} ${JSON.stringify(modelArgs)}`);
  }
  return new Response(JSON.stringify({jsonrpc:"2.0",id:rpc.id,result}),{status:200,headers:{"content-type":"application/json"}});
};

const gateway=await import("../lib/odoo_action_gateway.js");
let result=await gateway.createCrmLead({customer:{name:"عميل",phone:"0501234567"},idempotency_key:"lead-test-25"});
assert.equal(result.reference,"LEAD-77");
const countAfterLead=calls.length;
result=await gateway.createCrmLead({customer:{name:"عميل",phone:"0501234567"},idempotency_key:"lead-test-25"});
assert.equal(result.idempotent_replay,true);assert.equal(calls.length,countAfterLead);
const beforeConcurrent=calls.filter(x=>JSON.stringify(x).includes('crm.lead')&&JSON.stringify(x).includes('create')).length;
const concurrent=await Promise.all([1,2].map(()=>gateway.createCrmLead({customer:{name:"عميل متزامن",phone:"0501111111"},idempotency_key:"lead-concurrent-25"})));
assert.equal(concurrent.every(x=>x.ok),true);assert.equal(concurrent.some(x=>x.idempotent_replay),true);
assert.equal(calls.filter(x=>JSON.stringify(x).includes('crm.lead')&&JSON.stringify(x).includes('create')).length,beforeConcurrent+1);

result=await gateway.createQuotationDraft({customer:{name:"عميل",phone:"0501234567"},lines:[{product_id:25,name:"سماد اختبار",quantity:2}],idempotency_key:"quote-test-25"});
assert.equal(result.ok,true);assert.equal(result.state,"draft");assert.equal(result.order_confirmed,false);assert.equal(result.reference,"S00025");
assert.equal(calls.some(x=>JSON.stringify(x).includes("action_confirm")),false);

result=await gateway.trackVerifiedOrder({order_ref:"S00025",phone:"0501234567"});assert.equal(result.identity_verified,true);assert.equal(result.state,"sale");
result=await gateway.trackVerifiedOrder({order_ref:"S00025",phone:"0509999999"});assert.equal(result.ok,false);assert.equal(result.error,"identity_verification_failed");

const health=gateway.odooActionGatewayHealth();assert.equal(health.configured,true);assert.equal(JSON.stringify(health).includes(process.env.ODOO_API_KEY),false);assert.ok(health.never_calls.includes("sale_order_action_confirm"));
console.log("V25 Odoo Action Gateway PASS");
