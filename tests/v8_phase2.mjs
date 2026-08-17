import assert from "node:assert/strict";
import { extractOdooProductIds } from "../lib/site.js";
import { clientProduct } from "../lib/commerce.js";
import { writeServerSession, readServerSession, deleteServerSession, mergeSessionState } from "../lib/session_store.js";
import { primeProductIndex, searchProductIndex, productIndexStatus } from "../lib/product_index.js";

const html=`<div data-product-template-id="321" data-product-product-id="654"></div>`;
assert.deepEqual(extractOdooProductIds(html),{product_template_id:321,product_id:654});
const hidden=`<input name="product_template_id" value="77"><input name="product_id" value="88">`;
assert.deepEqual(extractOdooProductIds(hidden),{product_template_id:77,product_id:88});

const p=clientProduct({name:"Test",price:"12",currency:"AED",url:"https://example.com/shop/test",product_template_id:77,product_id:88,image:"https://example.com/a.jpg"});
assert.equal(p.commerce.can_attempt_cart,true);
assert.equal(p.product_template_id,77);

const sid="test-session-v8-phase2";
await writeServerSession(sid,{conversation_state:{category:"seeds",crop:"tomato"},customer_profile:{emirate:"العين"}});
const saved=await readServerSession(sid);
assert.equal(saved.conversation_state.crop,"tomato");
assert.equal(saved.customer_profile.emirate,"العين");
assert.equal(mergeSessionState(saved,{category:"fertilizer"}).category,"fertilizer");
await deleteServerSession(sid);

await primeProductIndex([
  {name:"MIG FARM مهرة F1 طماطم",price:"14",currency:"AED",availability:"متوفر",description:"بذور طماطم MIG FARM",url:"https://example.com/shop/mahra",product_template_id:1,product_id:2},
  {name:"KATABLOOM 12-12-17",price:"20",currency:"AED",availability:"متوفر",description:"سماد",url:"https://example.com/shop/kata",product_template_id:3,product_id:4}
],{test:true});
assert.equal(productIndexStatus().ready,true);
const result=await searchProductIndex("بذور طماطم",{category:{key:"seeds"},crop:{key:"tomato"}},{category:"seeds",crop:"tomato"},4);
assert.ok(result.products.length>=1);
assert.match(result.products[0].name,/مهرة/);

console.log("MIG FARM V8 Phase 2 tests passed");
