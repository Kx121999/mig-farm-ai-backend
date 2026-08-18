import assert from "node:assert/strict";
import { productIntelligenceHealth, searchProductDossiers, getProductDossier, compareProductDossiers } from "../lib/product_intelligence.js";

const h=productIntelligenceHealth();
assert.ok(["20.0","22.1","22.2"].includes(h.version));
assert.equal(h.products,704);
assert.equal(h.descriptions,704);
assert.equal(h.original_descriptions,502);
assert.equal(h.generated_completed_descriptions,202);
assert.ok(h.retrieval_chunks>=1400);
assert.ok(h.total_megabytes>=7);

const pump=getProductDossier("W23805PUM",{includeFull:true});
assert.equal(pump.name,"0.5 HP CLEAN WATER PUMP 350F");
assert.equal(pump.description_provenance,"original_502");
assert.match(pump.sales_description,/Submersible Pump/i);
assert.match(pump.live_data_policy,/live Odoo/i);

const generated=getProductDossier('1" MAX FLOT hose connector',{includeFull:true});
assert.equal(generated.description_provenance,"generated_202");
assert.match(generated.sales_description,/irrigation component|مكوّن ري/i);
assert.equal(generated.description_reliability,"generated_catalog_copy_not_technical_spec");

const cucumber=searchProductDossiers("بذور خيار F1",{limit:5});
assert.ok(cucumber.some(x=>/خيار|cucumber/i.test(x.name)));
const hose=searchProductDossiers("خرطوم ري ضغط عالي",{limit:5});
assert.ok(hose.some(x=>/HIGH PRESSURE|HOSE/i.test(x.name)));
const cmp=compareProductDossiers(["W23805PUM",'1" MAX FLOT hose connector'],["description","weight"]);
assert.equal(cmp.items.length,2);
assert.match(cmp.policy,/documented/i);
console.log("V20 Product Intelligence PASS");
