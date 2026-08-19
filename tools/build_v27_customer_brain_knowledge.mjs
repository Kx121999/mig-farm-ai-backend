import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT=join(dirname(fileURLToPath(import.meta.url)),"..");
const OUT=join(ROOT,"knowledge_v27"),PACKS=join(OUT,"packs");
const TARGET_BYTES=400*1024*1024,PACK_TARGET=18*1024*1024,VERSION="27.0";
const dossiers=JSON.parse(readFileSync(join(ROOT,"knowledge","MIG_FARM_PRODUCT_DOSSIERS_V20.json"),"utf8"));
const master=JSON.parse(readFileSync(join(ROOT,"knowledge","AGRICULTURAL_MASTER_KNOWLEDGE_V18.json"),"utf8"));
const products=Array.isArray(dossiers.products)?dossiers.products:[],cards=Array.isArray(master.cards)?master.cards:[];
if(products.length!==704)throw new Error(`Expected 704 product dossiers, received ${products.length}`);
if(cards.length<2500)throw new Error(`Agricultural master knowledge is incomplete: ${cards.length}`);

const DIALECTS=["egyptian","emirati","gulf","levantine","msa","english","arabizi","code_switch"];
const STAGES=["discover","learn","compare","hesitate","object","ready","after_sale"];
const CONTEXTS=["fresh","old_product","old_dosage","old_crop","topic_switch","pronoun_followup","selected_card","returning_customer"];
const OBJECTIONS=[
  ["price","السعر عالي شوية ومش عارف يستاهل ولا لا","ابدأ بتفهم سبب الاعتراض: هل المقارنة على السعر فقط أم على الكمية والمواصفات؟ اشرح القيمة بالحقائق الموثقة من غير خصم وهمي أو ضغط."],
  ["trust","أنا أول مرة أتعامل معاكم ومش متأكد","اعترف بالتردد وقدّم معلومة قابلة للتحقق: هوية المنتج وSKU والوصف المسجل وبيانات التواصل. لا تختلق تقييمات أو ضمانات."],
  ["delay","هفكر وأرجع لكم بعدين","احترم قرار العميل ولخّص العامل الحاسم في سطر واحد. لا تصنع استعجالًا أو ندرة غير حقيقية."],
  ["choice","الاختيارات كتير ومش عارف أختار","قلّل الاختيارات حسب الاستخدام والمحصول والبيئة والكمية، ثم اسأل سؤالًا حاسمًا واحدًا فقط إن كانت المعلومة ناقصة."],
  ["previous_failure","جربت منتج قبل كده وما نفعش","لا تدافع أو تلوم العميل. افصل بين خطأ التشخيص والاختيار والجرعة والتطبيق، واطلب دليلًا واحدًا يغيّر القرار."],
  ["availability","لو مش موجود مش عايز بديل مختلف","تحقق من Odoo Live أولًا. البديل يظل مرشحًا ولا يُعرض كبديل مكافئ إلا مع مقارنة الخاصية الحاسمة."],
  ["delivery","خايف التوصيل يتأخر","اذكر فقط سياسة التوصيل الموثقة، ولا تعد بموعد غير مؤكد. اقترح التحقق من الفريق إذا كان الموعد حاسمًا."],
  ["safety","قلقان أستخدمه غلط على الزرع","لا تعطِ جرعة من الذاكرة. اربط الإرشاد بالملصق الرسمي، والمحصول والمرحلة وطريقة التطبيق."]
];
const BUSINESS=[
  {intent:"branches",qs:["مكانكم فين","وين فروعكم","where is your store","mkanokom feen"],a:"إحنا MIG FARM وموجودين في الشارقة والعين 🌱 إذا احتاج العميل بيانات فرع محدد، اسأله أي فرع يقصد."},
  {intent:"contact",qs:["رقمكم إيه","واتسابكم","كيف أتواصل","contact MIG FARM"],a:"العين: +971 58 176 8215. الشارقة: +971 54 702 5904. البريد: sales@migfarm.com."},
  {intent:"shipping",qs:["عندكم توصيل","الشحن بكام","do you deliver","توصلون الإمارات؟"],a:"التوصيل القياسي الموثق داخل الإمارات ورسومه 13 درهم. لا تعد بمدة أو نطاق غير مؤكد."},
  {intent:"hours",qs:["بتفتحوا إمتى","متى الدوام","open now"],a:"أوقات العمل غير مؤكدة في الحزمة الحالية؛ وجّه العميل للتأكد من الفريق قبل التحرك."},
  {intent:"payment",qs:["الدفع إزاي","في كاش","payment methods"],a:"طرق الدفع الفعلية هي الخيارات الظاهرة في Checkout. لا تعد بخيار غير ظاهر."},
  {intent:"identity",qs:["اسمك إيه","مين إنت","who are you"],a:"أنا MIG FARM AI 🌱، مساعدك للمنتجات والزراعة والطلبات على الموقع."},
  {intent:"order_status",qs:["طلبي فين","عايز أتتبع الطلب","track my order"],a:"لا تعرض بيانات طلب خاصة من جلسة عامة. اطلب رقم الطلب عبر مسار تحقق آمن أو حوّل العميل للفريق."},
  {intent:"returns",qs:["ينفع أرجع المنتج","في استبدال","refund policy"],a:"اعتمد على الشروط الحالية في الموقع أو الفريق، ولا تخترع مدة أو استثناءًا."}
];
const COMPOUND=[
  {intents:["branches","availability","price"],q:n=>`مكانكم فين وهل ${n} متوفر وبكام؟`,a:n=>`ابدأ بمكان الفروع، ثم افصل التحقق الحالي من ${n}: السعر والمخزون من Odoo Live فقط. أجب عن الأجزاء الثلاثة بنفس ترتيب السؤال.`},
  {intents:["shipping","availability"],q:n=>`هل ${n} موجود وعندكم توصيل لعجمان؟`,a:n=>`تحقق من توفر ${n} من Odoo Live، ثم اذكر سياسة التوصيل داخل الإمارات. لا تجعل سؤال التوصيل يضيع بسبب سياق المنتج.`},
  {intents:["product_details","dosage"],q:n=>`إيه استخدام ${n} وجرعته كام؟`,a:n=>`اشرح الاستخدام من وصف ${n} الموثق، لكن الجرعة لا تُذكر إلا من ملصق رسمي أو حقل جرعة صريح. إذا لم توجد، اطلب صورة لوحة الجرعة فقط.`},
  {intents:["comparison","price","availability"],q:n=>`قارن ${n} بمنتج شبهه وقولي السعر والتوفر`,a:n=>`قارن المواصفات الموثقة أولًا، ثم افصل السعر والتوفر الحاليين من Odoo Live. التشابه في الفئة لا يثبت التكافؤ.`},
  {intents:["product_search","shipping"],q:n=>`عايز منتج مناسب زي ${n} وهل التوصيل متاح؟`,a:n=>`اعرض ترشيحًا مبنيًا على الاحتياج الموثق، ثم أجب عن التوصيل. اسأل سؤالًا حاسمًا واحدًا فقط إن كان الاختيار غير ممكن.`},
  {intents:["identity","branches"],q:()=>"إنت مين ومكانكم فين؟",a:()=>"عرّف نفسك في سطر، ثم اذكر فرعي الشارقة والعين. لا تدخل في منتج أو جرعة من سياق سابق."},
  {intents:["payment","shipping"],q:()=>"الدفع إزاي والشحن بكام؟",a:()=>"اذكر أن طرق الدفع هي الظاهرة في Checkout، ثم اذكر رسوم التوصيل القياسية الموثقة 13 درهم داخل الإمارات."},
  {intents:["purchase","availability","price"],q:n=>`عايز أطلب ${n}، موجود وسعره كام؟`,a:n=>`تحقق من هوية ${n} والسعر والتوفر من Odoo Live، ثم جهّز خطوة الشراء. لا تقل إن الطلب تم قبل إيصال تنفيذ موثوق.`}
];

function clean(value="",max=5000){return String(value??"").replace(/[\u0000-\u001f]/g," ").replace(/\s+/g," ").trim().slice(0,max);}
function norm(value=""){return clean(value,1200).toLowerCase().normalize("NFKD").replace(/[ًٌٍَُِّْـ]/g,"").replace(/[أإآ]/g,"ا").replace(/ة/g,"ه").replace(/ى/g,"ي").replace(/[^\p{L}\p{N}]+/gu," ").trim();}
function hash(v){return createHash("sha1").update(String(v)).digest("hex").slice(0,16);}
function pick(a,i){return a[((i%a.length)+a.length)%a.length];}
function arr(v,max=12){return (Array.isArray(v)?v:[]).map(x=>clean(x,700)).filter(Boolean).slice(0,max);}
function productAt(seq,offset=0){return products[(seq*17+Math.floor(seq/7)+offset*97)%products.length];}
function nameOf(p){return clean(p.name,300)+(p.sku?` (${clean(p.sku,100)})`:"");}
function dialectize(text,dialect){
  if(dialect==="english")return text.replace(/مكانكم فين/g,"Where is your store").replace(/متوفر وبكام/g,"available and what is the current price").replace(/هل /g,"Is ").replace(/عايز/g,"I need");
  if(dialect==="arabizi")return text.replace(/مكانكم فين/g,"mkanokom feen").replace(/عايز/g,"3ayz").replace(/بكام/g,"bkam").replace(/متوفر/g,"mwgod");
  if(dialect==="emirati")return text.replace(/عايز|إيه|فين|دلوقتي/g,x=>({"عايز":"أبغي","إيه":"شو","فين":"وين","دلوقتي":"الحين"}[x]));
  if(dialect==="gulf")return text.replace(/عايز|إيه|فين|إزاي/g,x=>({"عايز":"أبي","إيه":"وش","فين":"وين","إزاي":"شلون"}[x]));
  if(dialect==="levantine")return text.replace(/عايز|إيه|فين|إزاي/g,x=>({"عايز":"بدي","إيه":"شو","فين":"وين","إزاي":"كيف"}[x]));
  if(dialect==="msa")return text.replace(/عايز|إيه|فين|بكام/g,x=>({"عايز":"أريد","إيه":"ما","فين":"أين","بكام":"ما سعره"}[x]));
  if(dialect==="code_switch")return `${text} وعايز الرد based on verified current data`;
  return text;
}
function policy(extra={}){return {answer_current_turn_first:true,answer_every_intent:true,answer_in_message_order:true,mirror_dialect:true,one_question_max:true,no_stale_context_leak:true,no_invented_specifications:true,live_price_stock_only:true,dosage_requires_label:true,...extra};}
function base(seq,type,domain,intent,dialect,stage,context,title,question,answer,keywords=[],extra={}){
  return {id:`v27-${type.slice(0,2)}-${String(seq).padStart(8,"0")}-${hash(`${type}:${title}:${intent}:${dialect}:${seq}`)}`,type,domain,intent,dialect,buyer_stage:stage,context_mode:context,title,question:dialectize(question,dialect),answer,keywords:[intent,dialect,...keywords].filter(Boolean),response_policy:policy(extra),...extra.record};
}
function productFacts(p){
  const exact=clean(p.descriptions?.sales_exact||p.descriptions?.ecommerce_text_exact||"",3000),cat=clean(p.taxonomy?.category,260),supplier=arr(p.taxonomy?.supplier,3).join("، ");
  return [cat&&`الفئة: ${cat}`,supplier&&`المورد: ${supplier}`,exact&&`الوصف المخزن: ${exact}`].filter(Boolean).join("\n");
}
function customerRecord(seq,dialect,stage,context){
  const p=productAt(seq),flow=pick(COMPOUND,seq);const name=nameOf(p),q=flow.q(name),answer=flow.a(name);
  return base(seq,"customer_journey_case","customer_conversation",flow.intents.join("+"),dialect,stage,context,`رسالة مركبة: ${flow.intents.join(" + ")}`,q,answer,[...flow.intents,p.name,p.sku,"multi intent","current turn"],{record:{expected_intents:flow.intents,answer_contract:{ordered:true,complete:true,question_budget:1},stale_context_fixture:pick(["جرعة سماد قديمة","منتج مبيد سابق","بطاقات بذور سابقة","تشخيص اصفرار قديم","لا يوجد سياق"],seq),customer_memory_update:{dialect,goal:flow.intents[0]}}});
}
function productRecord(seq,dialect,stage,context){
  const a=productAt(seq),b=productAt(seq,1);const intent=pick(["decision","comparison","suitability","alternative","details","purchase"],seq);const na=nameOf(a),nb=nameOf(b);
  const q=intent==="comparison"?`قارن ${na} مع ${nb} على المعلومات الموثقة`:intent==="suitability"?`هل ${na} مناسب لاحتياجي وإيه المعلومة اللي لازم أحددها؟`:`ساعدني أخد قرار صح بخصوص ${na}`;
  const answer=`المنتج الأول: ${na}\n${productFacts(a)||"لا توجد مواصفات تفصيلية مؤكدة."}\n\n${intent==="comparison"?`المنتج الثاني: ${nb}\n${productFacts(b)||"لا توجد مواصفات تفصيلية مؤكدة."}\n\n`:""}قاعدة القرار: استخدم الحقول الموثقة فقط. السعر والمخزون الحاليان من Odoo Live، والجرعة من الملصق الرسمي. أي فرق غير مكتوب يظل غير مؤكد.`;
  return base(seq,"product_decision_case","mig_farm_product_decisions",intent,dialect,stage,context,`${na} — ${intent}`,q,answer,[a.name,a.sku,b.name,b.sku,clean(a.taxonomy?.category,200)],{record:{product:{name:clean(a.name,300),sku:clean(a.sku,100),external_id:clean(a.external_id,160)},compared_product:intent==="comparison"?{name:clean(b.name,300),sku:clean(b.sku,100)}:null,evidence:{source:"MIG_FARM_PRODUCT_DOSSIERS_V20.json",description_provenance:clean(a.descriptions?.provenance,80),current_price:"live_odoo_required",current_stock:"live_odoo_required"}}});
}
function agricultureRecord(seq,dialect,stage,context){
  const card=cards[(seq*29+Math.floor(seq/11))%cards.length],crop=clean(card.crop_ar||card.crop||"المحصول",120),title=clean(card.title_ar||card.title_en,600),intent=pick(["diagnosis","irrigation","nutrition","root_zone","climate","prevention","measurement"],seq);
  const q=`عندي ${title} في ${crop}، إزاي أوصل لقرار من غير رش أو تسميد عشوائي؟`;
  const answer=[clean(card.summary_ar,1200),clean(card.details_ar,3200),arr(card.decision_steps,8).length?`خطوات القرار: ${arr(card.decision_steps,8).join(" ← ")}`:"",arr(card.measurements,8).length?`القياسات المفيدة: ${arr(card.measurements,8).join("، ")}`:"",clean(card.safety,900),"لا تعطِ جرعة مبيد من العرض وحده؛ ثبّت التشخيص والمنتج والملصق."].filter(Boolean).join("\n");
  return base(seq,"agriculture_decision_case",clean(card.domain,120)||"agriculture",intent,dialect,stage,context,title,q,answer,[crop,clean(card.domain,120),...arr(card.aliases,8),...arr(card.measurements,6)],{record:{crop,evidence:{source:"AGRICULTURAL_MASTER_KNOWLEDGE_V18.json",source_card:clean(card.id,100),evidence_level:clean(card.evidence_level,80),verified_at:clean(card.verified_at||master.verified_at,40)}}});
}
function objectionRecord(seq,dialect,stage,context){
  const p=productAt(seq),o=pick(OBJECTIONS,seq),name=nameOf(p),q=`بالنسبة لـ ${name}: ${o[1]}`;
  const answer=`رد طبيعي مقترح: فاهم ترددك. ${o[2]}\n\nمرجع المنتج:\n${productFacts(p)||"لا توجد تفاصيل كافية، فلا تخترع سبب شراء."}`;
  return base(seq,"objection_resolution_case","ethical_sales",`objection_${o[0]}`,dialect,stage,context,`${name} — اعتراض ${o[0]}`,q,answer,[p.name,p.sku,o[0],"ethical sales","no pressure"],{record:{objection:o[0],product:{name:clean(p.name,300),sku:clean(p.sku,100)},forbidden:["fake urgency","fake discount","invented guarantee","pressure close"]}});
}
function correctionRecord(seq,dialect,stage,context){
  const p=productAt(seq),name=nameOf(p),kind=pick(["stale_context","missed_intent","invented_dosage","archived_price","too_many_questions","unnatural_format"],seq);
  const fixtures={
    stale_context:["مكانكم فين؟","الجرعة لا تتحدد بدون اسم المنتج والمحصول.","إحنا موجودين في الشارقة والعين 🌱"],
    missed_intent:[`هل ${name} متوفر وبكام وعندكم توصيل؟`,`المنتج متوفر.`,`تحقق من السعر والتوفر من Odoo Live ثم أجب عن التوصيل؛ لا تترك جزءًا من السؤال.`],
    invented_dosage:[`جرعة ${name} كام؟`,`استخدم 5 مل لكل لتر.`,`الجرعة غير مؤكدة بدون ملصق رسمي واضح؛ اطلب صورة لوحة الجرعة.`],
    archived_price:[`${name} بكام؟`,`سعره القديم 35 درهم.`,`تحقق من Odoo Live ولا تعرض سعرًا مؤرشفًا كأنه حالي.`],
    too_many_questions:[`عايز منتج مناسب`,`زرعك فين؟ والمحصول إيه؟ والمساحة كام؟ والميزانية؟`,`اسأل السؤال الواحد الأكثر تأثيرًا في القرار، ثم تابع بعد الإجابة.`],
    unnatural_format:[`عرفني عن ${name}`,`المواصفات المؤكدة من بيانات المنتج: ${productFacts(p)}`,`ابدأ بخلاصة طبيعية قصيرة، ثم نقطتين أو ثلاثًا عند الحاجة بدل نسخ ملف طويل.`]
  };
  const [q,bad,good]=fixtures[kind];
  return base(seq,"response_correction_case","self_evaluation",kind,dialect,stage,context,`تصحيح رد: ${kind}`,q,good,[kind,p.name,p.sku,"bad answer","corrected answer"],{record:{bad_answer:bad,critique:`فشل ${kind}: الرد لا يحقق عقد الإجابة الآمنة والطبيعية.`,corrected_answer:good,evaluator_checks:["intent coverage","current turn","evidence","question budget","natural formatting"]}});
}
function safetyRecord(seq,dialect,stage,context){
  const p=productAt(seq),name=nameOf(p),kind=pick(["dosage","pesticide","compatibility","legal","visual_label"],seq),q=`اديني قرار سريع عن ${kind} للمنتج ${name}`;
  const answer=`هوية المنتج: ${name}. لا تحوّل وصفًا عامًا أو صورة غير واضحة إلى جرعة أو توافق أو ادعاء قانوني. الجرعة والخلط من الملصق الرسمي المسجل، والسعر والمخزون من Odoo Live، والمتطلبات القانونية من مصدر رسمي حديث.`;
  return base(seq,"safety_guard_case","safety_and_grounding",kind,dialect,stage,context,`${name} — ${kind} safety`,q,answer,[p.name,p.sku,kind,"label","live odoo"],{record:{risk_class:kind,requires_human_review:["unclear label","high risk application","legal uncertainty"],evidence:{source:"MIG_FARM_V27_SAFETY_POLICY"}}});
}
function businessRecord(seq,dialect,stage,context){
  const item=pick(BUSINESS,seq),q=pick(item.qs,seq);return base(seq,"business_fact_case","mig_farm_business",item.intent,dialect,stage,context,`${item.intent} — verified business fact`,q,item.a,[item.intent,"MIG FARM","current turn"],{record:{evidence:{source:"MIG_FARM_V27_VERIFIED_BUSINESS_FACTS",business_fact:true}}});
}

rmSync(OUT,{recursive:true,force:true});mkdirSync(PACKS,{recursive:true});
let packNo=1,lines=[],packBytes=0,totalBytes=0,totalRecords=0,seq=0;const packMeta=[],typeBytes={},typeRecords={};
const routes={version:VERSION,product_routes:{},topic_routes:{},intent_routes:{},domain_routes:{},signature_routes:{}};
function packName(){return `customer-brain-pack-${String(packNo).padStart(3,"0")}.jsonl`;}
function addRoute(bucket,key,file){const k=norm(key);if(k.length<2)return;const table=routes[bucket];table[k]??=[];if(!table[k].includes(file)&&table[k].length<3)table[k].push(file);}
function register(record,file){
  addRoute("intent_routes",record.intent,file);addRoute("domain_routes",record.domain,file);
  for(const key of (record.keywords||[]).slice(0,20))addRoute("topic_routes",key,file);
  if(record.product){addRoute("product_routes",record.product.name,file);addRoute("product_routes",record.product.sku,file);}
  if(Array.isArray(record.expected_intents))addRoute("signature_routes",[...record.expected_intents].sort().join("+"),file);
}
function flush(){if(!lines.length)return;const file=packName(),content=lines.join(""),bytes=Buffer.byteLength(content);writeFileSync(join(PACKS,file),content);packMeta.push({file,bytes,megabytes:Number((bytes/1048576).toFixed(2)),records:lines.length,sha256:createHash("sha256").update(content).digest("hex")});packNo+=1;lines=[];packBytes=0;}
while(totalBytes<TARGET_BYTES){
  const dialect=pick(DIALECTS,seq),stage=pick(STAGES,Math.floor(seq/3)),context=pick(CONTEXTS,Math.floor(seq/5)),slot=seq%100;let record;
  if(slot<28)record=customerRecord(seq,dialect,stage,context);
  else if(slot<48)record=productRecord(seq,dialect,stage,context);
  else if(slot<66)record=agricultureRecord(seq,dialect,stage,context);
  else if(slot<81)record=objectionRecord(seq,dialect,stage,context);
  else if(slot<91)record=correctionRecord(seq,dialect,stage,context);
  else if(slot<96)record=safetyRecord(seq,dialect,stage,context);
  else record=businessRecord(seq,dialect,stage,context);
  const line=`${JSON.stringify(record)}\n`,bytes=Buffer.byteLength(line);if(packBytes&&packBytes+bytes>PACK_TARGET)flush();const file=packName();lines.push(line);packBytes+=bytes;totalBytes+=bytes;totalRecords+=1;typeBytes[record.type]=(typeBytes[record.type]||0)+bytes;typeRecords[record.type]=(typeRecords[record.type]||0)+1;register(record,file);seq+=1;
}
flush();
const allocations=Object.fromEntries(Object.keys(typeBytes).sort().map(k=>[k,{records:typeRecords[k],bytes:typeBytes[k],megabytes:Number((typeBytes[k]/1048576).toFixed(2)),percent:Number((typeBytes[k]/totalBytes*100).toFixed(1))}]));
const maxPack=Math.max(...packMeta.map(x=>x.bytes));
const manifest={version:VERSION,name:"MIG FARM V27 Customer Brain & Decision Knowledge OS",generated_at:new Date().toISOString(),format:"jsonl_utf8",target_megabytes:400,target_bytes:TARGET_BYTES,total_pack_bytes:totalBytes,total_pack_megabytes:Number((totalBytes/1048576).toFixed(2)),total_records:totalRecords,max_pack_bytes:maxPack,max_pack_megabytes:Number((maxPack/1048576).toFixed(2)),allocations,sources:{product_dossiers:products.length,agricultural_master_cards:cards.length,business_facts:BUSINESS.length,compound_templates:COMPOUND.length,objection_classes:OBJECTIONS.length},policies:{multi_intent_completion:true,current_turn_first:true,privacy_bounded_memory:true,pre_send_audit:true,live_price_stock_only:true,official_label_dosage_only:true,ethical_sales:true,one_question_max:true},github:{browser_upload_safe:maxPack<25*1024*1024,individual_file_limit_safe:maxPack<100*1024*1024,pack_target_megabytes:18},packs:packMeta};
writeFileSync(join(OUT,"manifest.json"),`${JSON.stringify(manifest,null,2)}\n`);writeFileSync(join(OUT,"router.json"),`${JSON.stringify(routes)}\n`);
writeFileSync(join(OUT,"README.md"),`# MIG FARM V27 Customer Brain Knowledge\n\n400 MiB of sharded JSONL customer journeys, product decisions, agricultural decisions, ethical objection handling, response corrections, safety guards, and verified business facts.\n\n- Runtime reads only routed packs.\n- Current price and stock always require Odoo Live.\n- Dosage always requires an official label or explicit verified product field.\n- Every response contract allows at most one necessary question.\n`);
console.log(JSON.stringify({ok:true,version:VERSION,total_records:totalRecords,total_pack_bytes:totalBytes,total_pack_megabytes:manifest.total_pack_megabytes,packs:packMeta.length,max_pack_megabytes:manifest.max_pack_megabytes,router_bytes:Buffer.byteLength(JSON.stringify(routes)),allocations},null,2));

