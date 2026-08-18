import assert from "node:assert/strict";
import {
  productContextIntent, resolveProductContext, bindProductContext,
  evolveProductContext, sanitizeActiveProductContext, productContextHealth
} from "../lib/product_context_intelligence.js";

const jabara={name:"خيار جبارة f1 (CUCUMBER JABAARA F1)",sku:"287F1"};
const wafra={name:"خيار وفرة F1 ( CUCUMBER F1)",sku:"5041F1"};
const state={turn:3,visible_products:[jabara,wafra],active_product_context:bindProductContext(jabara,{turn:2,source:"card"})};

assert.equal(productContextIntent("بكام؟"),"price");
assert.equal(productContextIntent("هل متوفر وبكام؟"),"price_and_availability");
assert.equal(productContextIntent("هل ينفع للطماطم؟"),"suitability");
assert.equal(productContextIntent("الجرعة كام مل؟"),"dosage");
assert.equal(productContextIntent("قارن بينهم"),"comparison");

let focus=resolveProductContext({message:"تفاصيله",state,analysis:{intent:"unknown"}});
assert.equal(focus.action,"reuse");
assert.equal(focus.product.sku,"287F1");

focus=resolveProductContext({message:"بكام خيار الوفرة؟",selectedProduct:jabara,state,analysis:{intent:"product_search"}});
assert.equal(focus.action,"bind");
assert.equal(focus.reason,"explicit_product_mention");
assert.equal(focus.product.sku,"5041F1");

focus=resolveProductContext({message:"وريني خيار الوفرة",selectedProduct:jabara,state,analysis:{intent:"product_search"}});
assert.equal(focus.action,"clear");
assert.equal(focus.reason,"explicit_product_switch");

focus=resolveProductContext({message:"قارن المنتجين",selectedProducts:[jabara,wafra],state,analysis:{intent:"product_memory"}});
assert.equal(focus.action,"compare");
assert.deepEqual(focus.products.map(x=>x.sku),["287F1","5041F1"]);

const next={turn:4};
let evolved=evolveProductContext({previous:state,next,message:"تفاصيله",analysis:{intent:"unknown"},source:"v23_bound_product_dossier",payload:{bound_product:jabara,product_context_intent:"details"}});
assert.equal(evolved.active.product.sku,"287F1");
assert.equal(evolved.event.action,"bound");
assert.ok(evolved.active.expires_turn>next.turn);

evolved=evolveProductContext({previous:{...state,turn:20,active_product_context:{...state.active_product_context,expires_turn:5}},next:{turn:21},message:"تمام",analysis:{intent:"acknowledgment"},source:"human_ack",payload:{}});
assert.equal(evolved.active,null);

const sanitized=sanitizeActiveProductContext({...state.active_product_context,product:{...jabara,description:"x".repeat(5000)}});
assert.equal(sanitized.product.description.length,1800);
assert.equal(productContextHealth().mode,"server_authoritative_product_context_intelligence");
console.log("V23 product context intelligence unit PASS");

