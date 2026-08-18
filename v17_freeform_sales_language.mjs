import assert from "node:assert/strict";
import { buildSalesConversationPlan } from "../lib/sales_conversation_os.js";
const cases=[
 ["بكام دي",{intent:"product_search"},"direct_fact"],
 ["بص انا عايز حاجه كويسه بس مش عايز ادفع كتير",{intent:"recommendation"},"recommend"],
 ["مش مقتنع ان ده مناسب ليا",{intent:"unknown"},"objection"],
 ["طب والتاني؟",{intent:"known_seed_comparison"},"compare"],
 ["عايز اخد اتنين خلاص",{intent:"purchase"},"close"],
 ["عندي 2000 متر وعايز اعمل بيت محمي",{intent:"recommendation",category:{key:"greenhouse"}},"project"],
 ["الميه عندي مالحة والنبات واقف مكانه",{intent:"unknown"},"technical"],
 ["تمام يا معلم",{intent:"acknowledgment"},"social"]
];
for(const [message,analysis,expected] of cases){
 const p=buildSalesConversationPlan({message,analysis,profile:{},state:{},history:[],agriculturalContext:{}});
 assert.equal(p.mode,expected,`${message} -> ${p.mode}`);
}
console.log("V17 free-form sales language PASS");
