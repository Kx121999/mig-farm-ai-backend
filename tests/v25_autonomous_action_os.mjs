import assert from "node:assert/strict";
import { handleAutonomousAction, sanitizeAutonomousActionState, autonomousActionHealth } from "../lib/autonomous_action_os.js";

const product={name:"سماد اختبار",sku:"TEST-25",product_id:25,price:"42",currency:"AED",availability:"متوفر"};
let calls=0;
const gateway={
  async createQuotationDraft(input){calls+=1;return {ok:true,kind:"quotation",reference:"S00025",state:"draft",amount_total:84,currency:"AED",input};},
  async createCrmLead(){calls+=1;return {ok:true,kind:"crm_lead",reference:"LEAD-25"};},
  async trackVerifiedOrder(){calls+=1;return {ok:false,error:"identity_verification_failed"};}
};

let outcome=await handleAutonomousAction({message:"عايز عرض سعر للمنتج ده",state:{turn:3},selectedProduct:product});
assert.equal(outcome.handled,true);assert.equal(outcome.state.kind,"quotation");assert.equal(outcome.state.status,"awaiting_confirmation");
assert.equal(outcome.payload.autonomous_action.requires_confirmation,true);assert.equal(outcome.state.lines[0].product_id,25);
assert.doesNotMatch(JSON.stringify(outcome.state),/0501234567|customer@example/);

let rejected=await handleAutonomousAction({message:"تأكيد",state:{turn:4,autonomous_action:outcome.state},actionRequest:{action_id:"forged",confirm:true,consent:true,customer:{name:"عميل",phone:"0501234567"}},gateway});
assert.match(rejected.source,/rejected/);assert.equal(calls,0);

let invalid=await handleAutonomousAction({message:"تأكيد",state:{turn:4,autonomous_action:outcome.state},actionRequest:{action_id:outcome.state.id,confirm:true,consent:false,customer:{name:"",phone:"12"}},gateway});
assert.deepEqual(new Set(invalid.payload.validation_errors),new Set(["name","phone","consent"]));assert.equal(calls,0);

let executed=await handleAutonomousAction({message:"تأكيد",state:{turn:4,autonomous_action:outcome.state},actionRequest:{action_id:outcome.state.id,confirm:true,consent:true,customer:{name:"عميل اختبار",phone:"0501234567",email:"customer@example.com"},lines:[{key:"25",quantity:2}]},gateway});
assert.equal(executed.state.status,"executed");assert.equal(executed.payload.action_receipt.reference,"S00025");assert.match(executed.payload.reply,/مسودة فقط/);assert.equal(calls,1);

let lead=await handleAutonomousAction({message:"خلي المندوب يكلمني",state:{turn:1}});assert.equal(lead.state.kind,"crm_lead");
let cancelled=await handleAutonomousAction({message:"إلغاء الإجراء",state:{turn:2,autonomous_action:lead.state}});assert.equal(cancelled.state.status,"cancelled");assert.equal(calls,1);

let tracking=await handleAutonomousAction({message:"عايز أعرف حالة طلبي",state:{turn:1}});assert.equal(tracking.state.kind,"order_status");
let privateFailure=await handleAutonomousAction({message:"تأكيد",state:{turn:2,autonomous_action:tracking.state},actionRequest:{action_id:tracking.state.id,confirm:true,consent:true,customer:{order_ref:"S00025",phone:"0500000000"}},gateway});
assert.equal(privateFailure.state.status,"failed");assert.match(privateFailure.payload.reply,/مش هعرض أي معلومات/);assert.equal(calls,2);

let missing=await handleAutonomousAction({message:"جهزلي عرض سعر",state:{turn:1}});assert.equal(missing.source,"v25_action_quote_needs_product");
assert.equal(sanitizeAutonomousActionState({kind:"hack"}),null);
assert.equal(autonomousActionHealth().guarantees.includes("no_order_confirmation"),true);
console.log("V25 Autonomous Action OS PASS");
