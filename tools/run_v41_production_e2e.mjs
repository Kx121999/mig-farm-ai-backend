import assert from 'node:assert/strict';
const base=String(process.env.MIG_E2E_BASE_URL||'').replace(/\/$/,'');
if(!base)throw new Error('Set MIG_E2E_BASE_URL=https://<production-host> before running V41 production E2E');
const full=/^(1|true|yes|on)$/i.test(String(process.env.MIG_E2E_FULL||''));
const banned=/التحليل الذكي غير متاح|خدمة الفهم الذكي متوقفة|intelligence service is temporarily unavailable|smart analysis is unavailable/i;
async function json(url,opts){const r=await fetch(url,opts);const text=await r.text();let data={};try{data=JSON.parse(text);}catch{throw new Error(`${url} returned non-JSON ${r.status}: ${text.slice(0,200)}`);}return {r,data};}
const health=(await json(`${base}/api/health`)).data;
assert.equal(health.version,'41.0.0');assert.equal(health.mode,'final_production_closure_v41');assert.equal(health.production_closure_v41?.enabled,true);assert.equal(health.production_closure_v41?.universal_canned_final_response,false);
const provider=await json(`${base}/api/health?provider=1`);assert.equal(provider.r.status,200,JSON.stringify(provider.data));assert.equal(provider.data.ok,true,JSON.stringify(provider.data));
let seq=0;
async function ask(message,{history=[],state={},session=`v41-prod-${Date.now()}-${seq++}`}={}){
  const {r,data}=await json(`${base}/api/chat`,{method:'POST',headers:{'content-type':'application/json','origin':'https://edu-mig-for-agriculture.odoo.com'},body:JSON.stringify({session_id:session,locale:'ar',message,history,conversation_state:state})});
  assert.equal(r.status,200,`${message}: ${JSON.stringify(data).slice(0,500)}`);assert.equal(data.version,'41.0.0',message);assert.equal(data.mode,'final_production_closure_v41',message);assert.ok(String(data.reply||'').trim().length>1,message);assert.equal(banned.test(data.reply),false,`${message} => ${data.reply}`);assert.ok(['LLM','LLM_PLUS_RAG','STRUCTURED_DATA','SEMANTIC_DEGRADED'].includes(data.production_closure_v41?.response_origin),message);return data;
}
const singles=[
  ['انتا مين',/MIG FARM AI/i],['مين اللي بيرد عليا هنا',/MIG FARM AI|مساعد/i],['كيفك',/.+/],['ممكن تساعدني في حاجة',/.+/],['أنا محتار ومش عارف أبدأ منين',/.+/],['شكرا يا غالي',/.+/],['وين فروعكم؟',/.+/],['عندكم بذور باذنجان؟',/.+/],['عايز أعرف لو في نوع باذنجان طويل',/.+/],['ورق النبات مصفر ومش فاهم السبب',/.+/],['لو كتبتلك كلام ناقص هتفهمني؟',/.+/],['مش المنتج ده اللي بعده',/.+/]
];
if(full){
  const extras=['عامل ايه يا صاحبي','منو انت بالضبط','أنا عندي سؤال بس مش عارف أصيغه','اللي قلتلك عليه من شوية عايز تفاصيله','السعر الحالي للنوع اللي كنا بنتكلم عليه؟','طب لو للصوبة؟','مش عايز الحار','هاتلي اختيارين وقارن بينهم','في حاجة بيضا بتطير لما ألمس الورقة','النمو الجديد متجعد شوية','الموضوع بدأ فجأة','العبوة عددها قد ايه','المخزون متاح ولا لأ','لا قصدي الصنف التاني','خلينا نسيب ده ونتكلم عن الري','عايز أشغل الري أوتوماتيك','المنتج ده استخدامه ايه','أنا مش فاكر اسمه بس كان أبيض','الشحن للعين بياخد قد ايه','طرق الدفع عندكم ايه','لو هطلب كمية كبيرة أبدأ ازاي','أنا قصدي المنتج مش الخدمة','تمام كمل','لا الكلام ده مش اللي بسأل عنه','ممكن تجاوبني على آخر سؤال بس','عايز رد مختصر','قولها بالمصري','عندي بيت محمي ومشكلة في الخيار','الجذور شكلها غامق','الأعراض في الورق القديم','بدأت تنتشر','محتاج تشخيص مش ترشيح منتج','ينفع ابعتلك صورة؟','لو السعر مش متأكد منه متخمنش','إيه المتوفر من بذور الفلفل','الحلو مش الحار','والأصفر؟','العبوة كام بذرة','طب الأخضر','قارنهم في اللي موثق بس'];
  for(const q of extras)singles.push([q,/.+/]);
}
for(const [q,rx] of singles){const d=await ask(q);assert.match(d.reply,rx,q);}

const sessionScripts=[
 ['عندكم بذور باذنجان؟','الطويل؟','كام بذرة؟','طب الأبيض؟','هو كام بذرة؟'],
 ['عايز مياسة','لا قصدي عتيق','والسعر؟'],
 ['عندي مشكلة في ورق الطماطم','في حاجة صغيرة بيضا تحت الورق','بيت محمي','استخدم ايه؟'],
 ['عايز حاجة للري','محتاجه أوتوماتيك','طب لو أكتر من منطقة؟'],
 ['عندكم فلفل؟','مش عايز الحار','والأصفر؟','كام بذرة؟']
];
if(full){
  const templates=[['عندكم بذور خيار؟','المناسب للبيت المحمي؟','تفاصيله؟'],['عايز أعرف عن منتج','مش فاكر اسمه','كان للرش','إيه المعلومة اللي محتاجها مني؟'],['محتاج مبيد','لأ مش مبيد زراعي','قصدي صحة عامة','عندي حشرة زاحفة'],['وين فروعكم؟','العين','والدوام؟'],['عايز أشتري','لسه مش محدد المنتج','خلينا نختار الأول'],['عندي اصفرار','في الورق القديم','وبيزيد بالتدريج'],['عايز تقارنلي منتجين','الأول اللي ظهر فوق','والتاني اللي بعده'],['محتاج بذور باذنجان','الأبيض','لا قصدي الطويل','كام بذرة'],['عندي مشكلة ري','التربة بتفضل مبلولة','أعمل ايه أول حاجة؟'],['محتاج عرض سعر','لسه ما اخترتش الكمية','خلينا نحددها الأول']];
  while(sessionScripts.length<25)sessionScripts.push(templates[(sessionScripts.length-5)%templates.length]);
}
for(let i=0;i<sessionScripts.length;i++){
  const session=`v41-prod-session-${Date.now()}-${i}`;let history=[],state={};
  for(const q of sessionScripts[i]){const d=await ask(q,{history,state,session});history.push({role:'user',content:q},{role:'assistant',content:d.reply});state=d.conversation_state||state;}
}
console.log(`V41 PRODUCTION E2E PASS — provider live, ${singles.length} single-turn, ${sessionScripts.length} multi-turn sessions`);
