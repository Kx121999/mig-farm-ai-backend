import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT=join(dirname(fileURLToPath(import.meta.url)),"..");
const OUT=join(ROOT,"knowledge_v26");
const PACKS=join(OUT,"packs");
const TARGET_BYTES=400*1024*1024;
const PACK_TARGET=18*1024*1024;
const VERSION="26.0";

const dossiers=JSON.parse(readFileSync(join(ROOT,"knowledge","MIG_FARM_PRODUCT_DOSSIERS_V20.json"),"utf8"));
const master=JSON.parse(readFileSync(join(ROOT,"knowledge","AGRICULTURAL_MASTER_KNOWLEDGE_V18.json"),"utf8"));
const products=Array.isArray(dossiers.products)?dossiers.products:[];
const cards=Array.isArray(master.cards)?master.cards:[];
if(products.length!==704)throw new Error(`Expected 704 product dossiers, received ${products.length}`);
if(cards.length<2500)throw new Error(`Agricultural master knowledge is incomplete: ${cards.length}`);

const DIALECTS=["egyptian","emirati","gulf","levantine","msa","english","arabizi","code_switch"];
const PRODUCT_INTENTS=["details","usage","suitability","price","availability","comparison","alternatives","dosage","safety","purchase","shipping","troubleshooting"];
const AGRI_INTENTS=["diagnosis","irrigation","nutrition","climate","root_zone","greenhouse","hydroponics","ipm","measurements","prevention","decision","followup"];
const BUYER_STAGES=["browsing","learning","comparing","uncertain","objection","ready","after_sale"];
const CONTEXTS=["fresh_question","old_product_context","old_dosage_context","old_crop_context","selected_card","pronoun_followup","topic_switch","no_context"];

function clean(value="",max=5000){return String(value??"").replace(/[\u0000-\u001f]/g," ").replace(/\s+/g," ").trim().slice(0,max);}
function norm(value=""){return clean(value,1000).toLowerCase().normalize("NFKD").replace(/[ًٌٍَُِّْـ]/g,"").replace(/[أإآ]/g,"ا").replace(/ة/g,"ه").replace(/ى/g,"ي").replace(/[^\p{L}\p{N}]+/gu," ").trim();}
function hash(value){return createHash("sha1").update(String(value)).digest("hex").slice(0,16);}
function pick(items,index){return items[((index%items.length)+items.length)%items.length];}
function compactArray(value,max=12){return (Array.isArray(value)?value:[]).map(x=>clean(x,600)).filter(Boolean).slice(0,max);}

function productQuestion(product,intent,dialect,seq){
  const name=clean(product.name,300),sku=clean(product.sku,120);const id=sku?`${name} (${sku})`:name;
  const variants={
    details:[`ممكن تقولي تفاصيل ${id}؟`,`إيه أهم المعلومات عن ${id}؟`,`عايز أفهم المنتج ${name} ببساطة`],
    usage:[`${name} بيستخدم في إيه؟`,`استخدام ${name} إيه بالضبط؟`,`محتاج أعرف فايدة ${name}`],
    suitability:[`هل ${name} ينفع لاحتياجي؟`,`إزاي أعرف إن ${name} مناسب لي؟`,`هل ${name} مناسب ولا محتاج منتج تاني؟`],
    price:[`${name} بكام دلوقتي؟`,`عايز السعر الحالي لـ ${name}`,`كام سعر ${name} النهارده؟`],
    availability:[`هل ${name} متوفر دلوقتي؟`,`موجود من ${name}؟`,`عايز أتأكد من مخزون ${name}`],
    comparison:[`قارن ${name} بالبدائل من غير تخمين`,`إيه الفرق بين ${name} والمنتجات المشابهة؟`,`ساعدني أقارن ${name} على المواصفات المثبتة`],
    alternatives:[`لو ${name} مش موجود إيه البديل؟`,`في بديل قريب من ${name}؟`,`رشح بديل لـ ${name} مع توضيح الفرق`],
    dosage:[`جرعة ${name} كام؟`,`أستخدم قد إيه من ${name}؟`,`معدل استخدام ${name} إيه؟`],
    safety:[`إيه احتياطات الأمان مع ${name}؟`,`عايز أستخدم ${name} بأمان`,`في تحذيرات مهمة قبل استعمال ${name}؟`],
    purchase:[`عايز أطلب ${name}`,`جهزلي ${name} للشراء`,`إيه الخطوة الصح عشان أشتري ${name}؟`],
    shipping:[`هل ينفع توصيل ${name} عندي؟`,`الشحن متاح مع ${name}؟`,`لو طلبت ${name} إيه نظام التوصيل؟`],
    troubleshooting:[`لو ${name} ما حلش المشكلة أراجع إيه؟`,`إيه الأخطاء الشائعة في استخدام ${name}؟`,`ساعدني أفهم المشكلة قبل ما أعتمد على ${name}`]
  };
  const ar=pick(variants[intent]||variants.details,seq);
  if(dialect==="english")return ({price:`What is the current live price of ${id}?`,availability:`Is ${id} currently available?`,details:`What verified details do you have for ${id}?`,usage:`What is ${id} used for?`,dosage:`What is the verified label rate for ${id}?`,comparison:`Compare ${id} using documented facts only.`,alternatives:`What verified alternatives are available for ${id}?`}[intent]||`Help me decide about ${id} using verified information.`);
  if(dialect==="arabizi")return ({price:`${id} bkam delwa2ty?`,availability:`${id} mwgood delwa2ty?`,details:`3ayz tafaseel ${id}`,usage:`${id} byst5dm fe eh?`,dosage:`gor3et ${id} kam?`,comparison:`2aren ${id} bel bada2el`,alternatives:`fe badel le ${id}?`}[intent]||`3ayz a3rf aktar 3an ${id}`);
  if(dialect==="code_switch")return `${ar} وعايز الإجابة تكون based on verified data only`;
  if(dialect==="emirati")return ar.replace(/ممكن تقولي|عايز|محتاج|إيه|إزاي|دلوقتي|النهارده/g,x=>({"ممكن تقولي":"ممكن تقول لي","عايز":"أبغي","محتاج":"محتاج","إيه":"شو","إزاي":"كيف","دلوقتي":"الحين","النهارده":"اليوم"}[x]));
  if(dialect==="gulf")return ar.replace(/عايز|إيه|إزاي|دلوقتي/g,x=>({"عايز":"أبي","إيه":"وش","إزاي":"شلون","دلوقتي":"الحين"}[x]));
  if(dialect==="levantine")return ar.replace(/عايز|محتاج|إيه|إزاي|دلوقتي/g,x=>({"عايز":"بدي","محتاج":"بدي","إيه":"شو","إزاي":"كيف","دلوقتي":"هلأ"}[x]));
  if(dialect==="msa")return ar.replace(/عايز|محتاج|إيه|إزاي|دلوقتي|بكام/g,x=>({"عايز":"أريد","محتاج":"أحتاج","إيه":"ما","إزاي":"كيف","دلوقتي":"حاليًا","بكام":"ما سعره"}[x]));
  return ar;
}

function productAnswer(product,intent){
  const name=clean(product.name,300),sku=clean(product.sku,120),prov=clean(product.descriptions?.provenance,80);
  const exact=clean(product.descriptions?.sales_exact||product.descriptions?.ecommerce_text_exact||"",3400);
  const category=clean(product.taxonomy?.category,300);const supplier=compactArray(product.taxonomy?.supplier,4).join("، ");const type=compactArray(product.taxonomy?.type,4).join("، ");
  const identity=`${name}${sku?` — SKU: ${sku}`:""}`;const documented=[category&&`الفئة: ${category}`,supplier&&`المورد: ${supplier}`,type&&`النوع: ${type}`].filter(Boolean).join(". ");
  if(intent==="price")return `السعر الحالي لـ ${identity} لا يُؤخذ من هذه الحزمة؛ يجب التحقق من Odoo Live وقت السؤال. لا تستخدم سعر الأرشيف كسعر حالي.`;
  if(intent==="availability")return `التوفر الحالي لـ ${identity} يحتاج تحققًا مباشرًا من Odoo Live. لا تحوّل لقطة المخزون المؤرشفة إلى ادعاء حالي.`;
  if(intent==="dosage")return `لا تذكر جرعة لـ ${identity} إلا إذا كانت مكتوبة صراحة في ملصق رسمي واضح أو في بيانات منتج موثقة. إذا لم توجد الجرعة صراحة، اطلب صورة لوحة الجرعة أو أحِل السؤال للمهندس.`;
  if(intent==="comparison")return `ابدأ بهوية ${identity}. قارن فقط ${documented||"الحقول الموثقة في الملف"}. أي خاصية غير مذكورة تظل غير مؤكدة، والسعر والتوفر الحاليان من Odoo Live فقط.`;
  if(intent==="alternatives")return `ابحث عن بدائل ${identity} كمرشحين فقط، ثم تحقق من الخاصية الحاسمة والسعر والتوفر. التشابه في الفئة لا يثبت التوافق أو التكافؤ.`;
  if(intent==="purchase")return `يمكن تجهيز اختيار ${identity} للعميل بعد التحقق من السعر والتوفر والكمية. لا تقل إن الطلب تم أو إن الدفع حصل بدون إيصال تنفيذ موثوق.`;
  if(intent==="shipping")return `أجب عن معلومات ${identity} من ملفه، لكن سياسة الشحن معلومة مستقلة يجب أخذها من حقائق MIG FARM الحالية. لا تستنتجها من المنتج.`;
  if(intent==="safety")return `استخدم ${identity} وفق الملصق وتعليمات السلامة الموثقة. لا تستنتج معدات الوقاية أو الخلط أو الجرعات من وصف عام. ${documented}`;
  if(intent==="suitability")return `${identity}. الملاءمة لا تثبت من اسم الفئة وحده. استخدم الوصف الموثق التالي فقط ثم اسأل عن العامل الحاسم إن كان ناقصًا: ${exact||documented||"لا يوجد وصف تفصيلي موثق؛ يلزم توضيح الاحتياج والتحقق."}`;
  if(intent==="troubleshooting")return `قبل الحكم على ${identity}، افصل بين عطل المنتج وسوء الاختيار أو التركيب أو الاستخدام. اعتمد على المواصفات المكتوبة فقط: ${exact||documented||"المواصفات التفصيلية غير موثقة في الملف."}`;
  return `${identity}. ${documented}${exact?`\nالوصف المخزن: ${exact}`:"\nلا يوجد وصف تفصيلي موثق في هذا الملف."}${prov==="generated_202"?"\nهذا وصف إكمال عام؛ لا يُستخدم لإثبات مواصفات فنية غير مكتوبة صراحة.":""}`;
}

function productRecord(seq,dialect,intent,stage,context){
  const product=products[(seq*17+Math.floor(seq/7))%products.length];
  const name=clean(product.name,300),sku=clean(product.sku,120),category=clean(product.taxonomy?.category,260);
  return {
    id:`v26-p-${String(seq).padStart(8,"0")}-${hash(`${name}:${intent}:${dialect}:${stage}:${context}:${seq}`)}`,
    type:"product_conversation_case",domain:"mig_farm_products",intent,dialect,buyer_stage:stage,context_mode:context,
    title:`${name} — ${intent} — ${dialect}`,question:productQuestion(product,intent,dialect,seq),answer:productAnswer(product,intent),
    product:{name,sku,external_id:clean(product.external_id,180),category,description_provenance:clean(product.descriptions?.provenance,80)},
    keywords:[name,sku,category,intent,dialect,...compactArray(product.retrieval?.aliases,8)],
    evidence:{source:"MIG_FARM_PRODUCT_DOSSIERS_V20.json",source_product:clean(product.external_id||sku||name,220),description_provenance:clean(product.descriptions?.provenance,80),current_price:"live_odoo_required",current_stock:"live_odoo_required"},
    response_policy:{answer_current_turn_first:true,mirror_dialect:true,one_question_max:true,no_invented_specifications:true,no_archived_price_as_current:true,dosage_requires_label:true,ignore_stale_context:context.includes("old_")||context==="topic_switch"}
  };
}

function agricultureQuestion(card,intent,dialect,seq){
  const crop=clean(card.crop_ar||card.crop||"المحصول",120),title=clean(card.title_ar||card.summary_ar,500);
  let q=pick([
    `عندي سؤال عن ${crop}: ${title}، أبدأ منين؟`,
    `إزاي أتعامل صح مع ${title}؟`,
    `محتاج قرار عملي بخصوص ${title} من غير تشخيص متسرع`,
    `إيه القياسات اللي تفرق في حالة ${title}؟`
  ],seq+AGRI_INTENTS.indexOf(intent));
  if(intent==="diagnosis")q=`${crop} عندي فيه أعراض ومش عايز أرش عشوائي؛ إزاي نشخص الحالة خطوة بخطوة؟`;
  if(intent==="irrigation")q=`إزاي أراجع الري وإدارة المياه في ${crop} قبل ما أغير البرنامج؟`;
  if(intent==="nutrition")q=`إزاي أفرق بين مشكلة تغذية ومشكلة جذور أو ري في ${crop}؟`;
  if(dialect==="english")return `Give me an evidence-first ${intent} decision for ${clean(card.title_en||title,400)} without guessing a pesticide rate.`;
  if(dialect==="arabizi")return `3ayz afhm ${crop} fe ${intent} mn 8er ta5meen aw rash 3shwa2y`;
  if(dialect==="code_switch")return `${q} وخلّي القرار evidence-first`;
  if(dialect==="emirati")return q.replace(/إزاي|محتاج|إيه|عندي/g,x=>({"إزاي":"كيف","محتاج":"أبغي","إيه":"شو","عندي":"عندي"}[x]));
  if(dialect==="gulf")return q.replace(/إزاي|محتاج|إيه/g,x=>({"إزاي":"شلون","محتاج":"أبي","إيه":"وش"}[x]));
  if(dialect==="levantine")return q.replace(/إزاي|محتاج|إيه/g,x=>({"إزاي":"كيف","محتاج":"بدي","إيه":"شو"}[x]));
  if(dialect==="msa")return q.replace(/إزاي|محتاج|إيه|منين/g,x=>({"إزاي":"كيف","محتاج":"أحتاج","إيه":"ما","منين":"من أين"}[x]));
  return q;
}

function agricultureRecord(seq,dialect,intent,stage,context){
  const card=cards[(seq*29+Math.floor(seq/11))%cards.length];const title=clean(card.title_ar||card.title_en,600),crop=clean(card.crop_ar||card.crop,120),domain=clean(card.domain,120);
  const answer=[clean(card.summary_ar,1000),clean(card.details_ar,3200),compactArray(card.decision_steps,8).length?`خطوات القرار: ${compactArray(card.decision_steps,8).join(" ← ")}`:"",compactArray(card.measurements,8).length?`القياسات المفيدة: ${compactArray(card.measurements,8).join("، ")}`:"",clean(card.safety,800)].filter(Boolean).join("\n");
  return {
    id:`v26-a-${String(seq).padStart(8,"0")}-${hash(`${card.id}:${intent}:${dialect}:${stage}:${context}:${seq}`)}`,
    type:"agricultural_engineering_case",domain,intent,dialect,buyer_stage:stage,context_mode:context,title,question:agricultureQuestion(card,intent,dialect,seq),answer,
    crop,stage:clean(card.stage_ar||card.stage,120),keywords:[crop,domain,intent,dialect,...compactArray(card.aliases,12),...compactArray(card.measurements,8)],
    evidence:{source:"AGRICULTURAL_MASTER_KNOWLEDGE_V18.json",source_card:clean(card.id,100),evidence_level:clean(card.evidence_level,100),verified_at:clean(card.verified_at||master.verified_at,40)},
    response_policy:{differential_diagnosis:true,observation_before_inference:true,measure_before_guess:true,one_best_next_question:true,one_question_max:true,no_pesticide_rate_without_label:true,uae_legal_claim_requires_current_official_source:true,ignore_stale_context:context.includes("old_")||context==="topic_switch"}
  };
}

const BUSINESS_CASES=[
  {intent:"branches",questions:["مكانكم فين","فين مكانكم","وين موقعكم","عندكم فروع وين","where is your store"],answer:"إحنا MIG FARM وموجودين في الشارقة والعين. اسأل العميل أي فرع يقصد إذا احتاج بيانات فرع محدد."},
  {intent:"contact",questions:["رقمكم إيه","كيف أتواصل معكم","واتسابكم","عايز رقم الفرع","contact MIG FARM"],answer:"العين: +971 58 176 8215. الشارقة: +971 54 702 5904. البريد: sales@migfarm.com."},
  {intent:"shipping",questions:["عندكم توصيل","الشحن بكام","توصلون الإمارات كلها","فيه دليفري","do you deliver"],answer:"التوصيل القياسي الموثق داخل الإمارات ورسومه 13 درهم. لا تخترع مدة أو شحنًا دوليًا غير مؤكد."},
  {intent:"hours",questions:["بتفتحوا إمتى","متى الدوام","ساعات العمل","open now","الفرع فاتح"],answer:"أوقات العمل غير مؤكدة في البيانات الحالية؛ اطلب من العميل التأكد من الفريق قبل التحرك بدل إعطائه وقتًا مخمنًا."},
  {intent:"payment",questions:["الدفع إزاي","في كاش عند الاستلام","طرق الدفع","payment methods","ينفع فيزا"],answer:"طرق الدفع الفعلية هي الخيارات الظاهرة في Checkout. لا تعد بخيار غير ظاهر."},
  {intent:"identity",questions:["اسمك إيه","مين إنت","شو اسمك","who are you","إنت روبوت"],answer:"أنا MIG FARM AI 🌱، مساعدك للمنتجات والزراعة والطلبات على الموقع."},
  {intent:"social",questions:["عامل إيه","كيفك","شلونك","تمام يا عم","how are you"],answer:"رد قصير وطبيعي على الكلام الاجتماعي نفسه، بدون جرعات أو منتجات أو ضغط بيع."},
  {intent:"order_status",questions:["طلبي فين","وين الطلب","عايز أتتبع الطلب","track my order","حالة طلبي"],answer:"لا تعرض بيانات طلب خاصة من جلسة عامة. استخدم التحقق الآمن أو حوّل العميل للفريق برقم الطلب."},
  {intent:"returns",questions:["ينفع أرجع المنتج","في استبدال","سياسة الاسترجاع","refund policy","عايز أبدل"],answer:"اعتمد على الشروط الحالية في الموقع أو الفريق؛ لا تخترع مدة أو استثناءًا."},
  {intent:"company",questions:["مين MIG FARM","بتعملوا إيه","عرفني عنكم","about MIG FARM","من نحن"],answer:"MIG FARM متخصصة في مستلزمات وحلول الزراعة في الإمارات: بذور، أسمدة ومغذيات، مبيدات، ري وزراعة مائية، أدوات ومعدات، بيوت محمية وخدمات زراعية."}
];

function conversationRecord(seq,dialect,stage,context){
  const item=BUSINESS_CASES[(seq*7)%BUSINESS_CASES.length];const question=pick(item.questions,seq);
  const stale=pick(["كنا بنتكلم عن جرعة سماد للطماطم","كان فيه منتج مبيد محدد","ظهرت قبلها كروت بذور خيار","المحادثة السابقة كانت عن تشخيص اصفرار","لا يوجد سياق سابق"],seq);
  return {
    id:`v26-c-${String(seq).padStart(8,"0")}-${hash(`${item.intent}:${question}:${dialect}:${stage}:${context}:${seq}`)}`,
    type:"current_turn_sovereignty_case",domain:"mig_farm_business_and_conversation",intent:item.intent,dialect,buyer_stage:stage,context_mode:context,
    title:`${item.intent} — current turn first`,question,answer:item.answer,stale_context_fixture:stale,
    keywords:[item.intent,question,"MIG FARM","current turn","stale context"],
    evidence:{source:"MIG_FARM_V26_VERIFIED_BUSINESS_FACTS",business_fact:true},
    response_policy:{latest_message_controls:true,ignore_stale_product:true,ignore_stale_dosage:true,answer_directly:true,mirror_dialect:true,one_question_max:true,no_unrelated_agronomy:true}
  };
}

rmSync(OUT,{recursive:true,force:true});mkdirSync(PACKS,{recursive:true});
let packNo=1,packLines=[],packBytes=0,totalBytes=0,totalRecords=0,seq=0;
const packMeta=[];const routes={version:VERSION,product_routes:{},topic_routes:{},intent_routes:{},domain_routes:{}};
function packName(){return `knowledge-pack-${String(packNo).padStart(3,"0")}.jsonl`;}
function route(bucket,key,file){const k=norm(key);if(k.length<2)return;const table=routes[bucket];table[k]??=[];if(!table[k].includes(file)&&table[k].length<3)table[k].push(file);}
function register(record,file){
  route("intent_routes",record.intent,file);route("domain_routes",record.domain,file);
  for(const key of [record.crop,record.stage,...(record.keywords||[]).slice(0,18)])route("topic_routes",key,file);
  if(record.product){route("product_routes",record.product.name,file);route("product_routes",record.product.sku,file);route("product_routes",record.product.external_id,file);}
}
function flush(){
  if(!packLines.length)return;const file=packName(),content=packLines.join("");const bytes=Buffer.byteLength(content);
  writeFileSync(join(PACKS,file),content);
  packMeta.push({file,bytes,megabytes:Number((bytes/1048576).toFixed(2)),records:packLines.length,sha256:createHash("sha256").update(content).digest("hex")});
  packNo+=1;packLines=[];packBytes=0;
}
while(totalBytes<TARGET_BYTES){
  const dialect=DIALECTS[seq%DIALECTS.length],stage=BUYER_STAGES[Math.floor(seq/3)%BUYER_STAGES.length],context=CONTEXTS[Math.floor(seq/5)%CONTEXTS.length];
  const slot=seq%20;let record;
  if(slot<11)record=productRecord(seq,dialect,PRODUCT_INTENTS[Math.floor(seq/2)%PRODUCT_INTENTS.length],stage,context);
  else if(slot<18)record=agricultureRecord(seq,dialect,AGRI_INTENTS[Math.floor(seq/2)%AGRI_INTENTS.length],stage,context);
  else record=conversationRecord(seq,dialect,stage,context);
  const line=`${JSON.stringify(record)}\n`;const bytes=Buffer.byteLength(line);
  if(packBytes&&packBytes+bytes>PACK_TARGET)flush();
  const file=packName();packLines.push(line);packBytes+=bytes;totalBytes+=bytes;totalRecords+=1;register(record,file);seq+=1;
}
flush();
const maxPack=Math.max(...packMeta.map(x=>x.bytes));
const manifest={
  version:VERSION,name:"MIG FARM V26 GitHub Sharded Conversation Knowledge OS",generated_at:new Date().toISOString(),format:"jsonl_utf8",target_megabytes:400,target_bytes:TARGET_BYTES,
  total_pack_bytes:totalBytes,total_pack_megabytes:Number((totalBytes/1048576).toFixed(2)),total_records:totalRecords,max_pack_bytes:maxPack,max_pack_megabytes:Number((maxPack/1048576).toFixed(2)),
  sources:{product_dossiers:products.length,agricultural_master_cards:cards.length,business_conversation_cases:BUSINESS_CASES.length},
  policies:{current_turn_first:true,live_price_stock_only:true,official_label_dosage_only:true,no_generated_description_as_technical_fact:true,one_question_max:true,dialect_mirroring:true},
  github:{browser_upload_safe:maxPack<25*1024*1024,individual_file_limit_safe:maxPack<100*1024*1024,pack_target_megabytes:18},packs:packMeta
};
writeFileSync(join(OUT,"manifest.json"),`${JSON.stringify(manifest,null,2)}\n`);
writeFileSync(join(OUT,"router.json"),`${JSON.stringify(routes)}\n`);
console.log(JSON.stringify({ok:true,version:VERSION,total_records:totalRecords,total_pack_bytes:totalBytes,total_pack_megabytes:manifest.total_pack_megabytes,packs:packMeta.length,max_pack_megabytes:manifest.max_pack_megabytes,router_bytes:Buffer.byteLength(JSON.stringify(routes))},null,2));
