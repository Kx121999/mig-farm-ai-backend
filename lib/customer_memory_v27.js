import { isCredibleProductReferenceV32 } from "./natural_conversation_v32.js";

const VERSION="27.0";
function clean(value="",max=300){return String(value??"").replace(/[\u0000-\u001f]/g," ").replace(/\s+/g," ").trim().slice(0,max);}
function list(value,max=8){return [...new Set((Array.isArray(value)?value:[]).map(x=>clean(x,100)).filter(Boolean))].slice(-max);}

export function sanitizeCustomerMemoryV27(value={}){
  const productReference=clean(value.last_product_reference,260);
  return {
    version:VERSION,preferred_dialect:clean(value.preferred_dialect,30),emirate:clean(value.emirate,40),crop:clean(value.crop,80),category:clean(value.category,80),
    quantity:Number.isFinite(Number(value.quantity))?Math.max(0,Number(value.quantity)):null,budget_aed:Number.isFinite(Number(value.budget_aed))?Math.max(0,Number(value.budget_aed)):null,
    last_goal:clean(value.last_goal,80),last_product_reference:isCredibleProductReferenceV32(productReference,{productTask:true})?productReference:"",recent_goals:list(value.recent_goals,8),objections:list(value.objections,6),
    updated_turn:Math.max(0,Number(value.updated_turn)||0)
  };
}

export function mergeCustomerMemoryV27(previous={},frame={},turn=0){
  const old=sanitizeCustomerMemoryV27(previous),entities=frame?.entities||{},goals=(frame?.tasks||[]).map(x=>x.intent).filter(Boolean);
  const objections=[...old.objections];
  const message=String(frame?.message||"");
  if(/غالي|سعره عالي|expensive/i.test(message))objections.push("price");
  if(/مش واثق|متأكد|اضمن|أضمن|trust|sure/i.test(message))objections.push("trust");
  if(/هفكر|بفكر|later|think about/i.test(message))objections.push("delay");
  return sanitizeCustomerMemoryV27({
    ...old,preferred_dialect:frame?.dialect||old.preferred_dialect,emirate:entities.emirate||old.emirate,crop:entities.crop||old.crop,category:entities.category||old.category,
    quantity:entities.quantity??old.quantity,budget_aed:entities.budget??old.budget_aed,last_goal:goals[0]||old.last_goal,
    last_product_reference:entities.product_reference_verified&&isCredibleProductReferenceV32(entities.product_reference,{productTask:true})?entities.product_reference:old.last_product_reference,recent_goals:[...old.recent_goals,...goals],objections,updated_turn:turn
  });
}

export function customerMemoryHealthV27(){return {version:VERSION,mode:"privacy_bounded_customer_memory",stored:["dialect","emirate","crop","category","quantity","budget","goal","product_reference","objection_class"],excluded:["payment_data","passwords","private_order_data","raw_phone_memory"],limits:{recent_goals:8,objections:6}};}
