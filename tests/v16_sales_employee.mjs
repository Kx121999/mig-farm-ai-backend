import assert from "node:assert/strict";
import { analyzeSalesConversation, searchSalesPlaybook, salesEmployeeHealth } from "../lib/sales_employee.js";
import { neuralBrainHealth } from "../lib/neural_agent.js";

let x=analyzeSalesConversation("غالي اوي يا باشا",{analysis:{intent:"unknown"}});
assert.equal(x.objection,"price"); assert.equal(x.stage,"objection"); assert.equal(x.user_style.headings,false);
x=analyzeSalesConversation("عامل ايه يا هندسه",{analysis:{intent:"wellbeing"}}); assert.equal(x.social,true); assert.equal(x.user_style.length,"very_short");
x=analyzeSalesConversation("عندكم بذور خيار ولا لا",{analysis:{intent:"product_search",category:{key:"seeds"},crop:{key:"cucumber"}}}); assert.equal(x.commercial,true); assert.equal(x.direct_question,true);
x=analyzeSalesConversation("أنا محتاج حاجة كويسة بس مش عايز أدفع كتير",{analysis:{intent:"recommendation"}}); assert.equal(x.objection,"price");
const hits=searchSalesPlaybook("السعر غالي ومحتاج بديل",{limit:5}); assert.ok(hits.length>=1); assert.ok(hits[0].principle);
const h=salesEmployeeHealth(); assert.ok(["16.0","17.0","18.0","19.0","20.0","21.0","22.2","22.5"].includes(h.version)); assert.ok(h.playbook_entries>=100);
process.env.OPENAI_API_KEY="test"; const nh=neuralBrainHealth(); assert.ok(["16.0","17.0","18.0","19.0","20.0","21.0","22.0","22.1","22.2","22.5"].includes(nh.version)); assert.ok(nh.tools.includes("get_business_fact")); assert.ok(nh.tools.includes("search_sales_playbook"));
console.log("V16 sales employee PASS");
