import assert from "node:assert/strict";
import { productTruthHealth, getStructuredProductFacts, buildProductTruth, getProductRelations, rankLiveAlternatives, buildVerifiedQuoteDraft } from "../lib/product_truth_os.js";

const h=productTruthHealth();
assert.ok(["21.0","22.1"].includes(h.version));
assert.equal(h.products,704);
assert.equal(h.graph_nodes,704);
assert.ok(h.graph_edges>10000);
assert.ok(h.explicit_facts>=700);
assert.ok(h.need_terms>=16000);
assert.ok(h.total_megabytes>3);
assert.match(String(h.fact_reliability_policy||""),/generated|technical/i);

const facts=getStructuredProductFacts("W23805PUM");
assert.equal(facts.name,"0.5 HP CLEAN WATER PUMP 350F");
assert.ok(facts.explicit_facts.some(x=>/0\.5\s*HP/i.test(x.value||"")));
assert.equal(facts.field_provenance.current_price,"live_odoo_required");

const live=[{name:"0.5 HP CLEAN WATER PUMP 350F",sku:"W23805PUM",price:"325",currency:"AED",availability:"متوفر",url:"https://www.migfarm.com/shop/pump",product_template_id:1416,product_id:2001}];
const truth=buildProductTruth("W23805PUM",live);
assert.equal(truth.found,true);
assert.equal(truth.identity.live_verified,true);
assert.equal(truth.current.price_aed,325);
assert.equal(truth.current.source,"live_odoo");
assert.ok(truth.conflicts.some(x=>x.field==="price"&&x.resolution==="live_odoo_wins"));

const rel=getProductRelations("W23805PUM",{relation:"alternative_candidate",limit:8});
assert.equal(rel.found,true);
assert.ok(rel.relations.length>0);
assert.ok(rel.relations.every(x=>x.policy.includes("not_equivalence")));

const fakeAlternatives=rel.relations.slice(0,3).map((r,i)=>({name:r.name,sku:r.sku,price:String(200+i*20),currency:"AED",availability:"متوفر",url:`https://www.migfarm.com/shop/a${i}`}));
const ranked=rankLiveAlternatives("W23805PUM",fakeAlternatives,{limit:3});
assert.equal(ranked.found,true);
assert.ok(ranked.alternatives.length>0);
assert.ok(ranked.alternatives.every(x=>x.live_verified));

const quote=buildVerifiedQuoteDraft([{identifier:"W23805PUM",quantity:2}],live);
assert.equal(quote.all_lines_live_verified,true);
assert.equal(quote.total_aed,650);
assert.equal(quote.order_placed,false);
const unresolved=buildVerifiedQuoteDraft([{identifier:"W23805PUM",quantity:2}],[]);
assert.equal(unresolved.total_aed,null);
assert.equal(unresolved.order_placed,false);
console.log("V21 Product Truth OS PASS");
