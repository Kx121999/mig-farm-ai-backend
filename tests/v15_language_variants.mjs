import assert from "node:assert/strict";
import { analyzeAgriculturalRequest, searchAgriculturalEngineering, diagnoseAgriculturalProblem } from "../lib/agricultural_engineer.js";

const freeForm=[
  "الخيار عندي الورق مكعبل وعليه نقط صفرا صغيرة",
  "يا باشمهندس الشتلات بتقع من عند الساق بعد ما تطلع بيومين",
  "آخر خط التنقيط الميه فيه ضعيفة والنباتات أصغر",
  "الطماطم مش ماسكة زهر مع إن النبات أخضر جامد",
  "المحلول في الهيدروبونيك سخن والجذور لونها بني",
  "الأرض عندي بتعمل قشرة ملح بيضا حوالين النقاط",
  "ورق الفلفل الجديد أصفر بس العروق لسه خضرا",
  "بعد ما رشيت الخلطة امبارح أطراف الورق اتحرقت",
  "البذور مش طالعة ومش عارف العيب من العمق ولا الملوحة",
  "الثمرة مسودة من تحت بس مفيش عفن طري",
  "الورق لازق وعليه سواد زي الهباب",
  "في بودرة بيضا بتزيد على ورق الكوسة",
  "الشتلة مسرحة وطويلة وساقها رفيع",
  "عايز أفهم ليه EC الصرف أعلى بكتير من الدخول",
  "ماء البير مالح وعايز أعرف أبدأ تحليل منين",
  "عندي صوبة في العين والرطوبة بتعلى بالليل",
  "الجذر شكله كويس بس النبات بيدبل وقت الظهر ويرجع بالليل",
  "في خروم وقضم في الورق ومش شايف الحشرة الصبح",
  "الفلفل بيوقع الورد وقت الحر ومش بيمسك ثمر",
  "النقاطات بتسد كل أسبوع وفي ترسيب أبيض",
  "عايز احسب 4 مم ري على 350 متر مربع",
  "عايز أعرف كثافة الزراعة لو 80 سم بين الخطوط و40 بين النباتات",
  "الكالسيوم موجود في السماد وبرضه طرف الطماطم بيسود",
  "الحديد بضيفه بس الورق الجديد لسه أصفر والمياه قلوية",
  "عندي مزرعة صغيرة وعايز أعرف الفرق بين التربة الرملية والكوكوبيت في إدارة الري"
];
for(const q of freeForm){
  const f=analyzeAgriculturalRequest(q);
  assert.equal(f.is_agricultural,true,`failed free-form agricultural detection: ${q}`);
  const hits=searchAgriculturalEngineering(q,{limit:6,crop:f.crop});
  assert.ok(hits.length>0,`no engineering retrieval: ${q}`);
}

const d1=diagnoseAgriculturalProblem("يا باشمهندس النبات مخنوق مع إن الأرض مبلولة والجذر بني");
assert.ok(d1.handled);
const d2=diagnoseAgriculturalProblem("الورق لازق وعليه هباب اسود وفي حشرات صغيرة تحت الورقة");
assert.ok(d2.handled);
console.log("V15 free-form language variants PASS",freeForm.length);
