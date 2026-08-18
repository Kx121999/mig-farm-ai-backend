import assert from "node:assert/strict";
import { analyzeSalesConversation, searchSalesPlaybook } from "../lib/sales_employee.js";
const samples=[
  "يا هندسه انا محتار اخد انهي واحد",
  "بص انا عايز حاجه كويسه بس السعر يفرق معايا",
  "هو ده موجود ولا هلف عالفاضي",
  "لا لا مش قصدي الطماطم انا بتكلم عالخيار",
  "الزرع عندي شكله مخنوق والورق الجديد مكعبل",
  "محتاج 3 علب بس لو في سعر احسن",
  "انا عندي 500 متر وعايز اعمل حاجه مظبوطه من الاول",
  "طيب تمام هاتلي اللي متوفر",
  "مش مقتنع ليه ده اغلى من التاني",
  "هو انتو بتوصلوا العين ولا لا"
];
for(const s of samples){const a=analyzeSalesConversation(s,{analysis:{intent:"unknown"}}); assert.ok(a.response_contract.answer_first); assert.equal(a.response_contract.max_clarifying_questions,1); const hits=searchSalesPlaybook(s,{limit:3}); assert.ok(hits.length>0);}
console.log("V16 natural language PASS");
