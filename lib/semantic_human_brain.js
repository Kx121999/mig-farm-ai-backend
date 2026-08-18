import { normalizeAr, tokenize } from "./utils.js";

const VERSION="25.0";

function clean(value="",max=6000){return String(value??"").replace(/[\u0000-\u001f]/g," ").replace(/\s+/g," ").trim().slice(0,max);}
function n(value=""){return normalizeAr(clean(value,7000));}
function arr(value){return Array.isArray(value)?value:[];}
function uniq(value){return [...new Set(arr(value).filter(x=>x!==null&&x!==undefined&&x!==""))];}
function safeProduct(value){
  if(!value||typeof value!=="object")return null;
  const product={name:clean(value.name||value.title,500),sku:clean(value.sku||value.default_code,160),price:clean(value.price,80),currency:clean(value.currency||"AED",20),availability:clean(value.availability||value.stock,100),url:clean(value.url,1000)};
  return product.name||product.sku?product:null;
}

const ARABIZI_WORDS=new Map([
  ["3ayz","عايز"],["3ayez","عايز"],["3awez","عاوز"],["3awz","عاوز"],["ayz","عايز"],["awz","عاوز"],
  ["3ayza","عايزه"],["3awza","عاوزه"],["abgha","ابغي"],["abghy","ابغي"],["abi","ابي"],["bdi","بدي"],
  ["3ndkm","عندكم"],["3andkom","عندكم"],["3andkum","عندكم"],["3ndko","عندكم"],["andkom","عندكم"],
  ["bkam","بكام"],["bekam","بكام"],["b2am","بكام"],["kam","كم"],["se3r","سعر"],["s3r","سعر"],
  ["bzor","بذور"],["bozor","بذور"],["bezor","بذور"],["seeds","بذور"],["5yar","خيار"],["khyar","خيار"],
  ["tomatm","طماطم"],["tamatem","طماطم"],["banadora","بندوره"],["felfel","فلفل"],["batenjan","باذنجان"],
  ["mta7","متاح"],["motah","متاح"],["mawgod","موجود"],["mwgood","موجود"],["stock","مخزون"],
  ["ywsl","يوصل"],["ywsal","يوصل"],["twslo","توصلوا"],["delivery","توصيل"],["shipping","شحن"],
  ["bokra","بكره"],["bukra","بكره"],["elyom","اليوم"],["emta","امتي"],["mta","امتي"],
  ["3ain","العين"],["alain","العين"],["eln","العين"],["dubai","دبي"],["sharjah","الشارقه"],
  ["da","ده"],["dah","ده"],["deh","ده"],["di","دي"],["hada","هذا"],["hatha","هذا"],["tany","تاني"],
  ["awel","الاول"],["tani","الثاني"],["tany","الثاني"],["talet","الثالث"],["nafs","نفس"],
  ["ynf3","ينفع"],["yenfa3","ينفع"],["monaseb","مناسب"],["tafsil","تفاصيل"],["tafaseel","تفاصيل"],
  ["gar3a","جرعه"],["gor3a","جرعه"],["dose","جرعه"],["est5dam","استخدام"],["istikhdam","استخدام"],
  ["msh","مش"],["mesh","مش"],["mo4","مش"],["asdy","قصدي"],["2asdy","قصدي"],["a2sd","اقصد"],
  ["2aren","قارن"],["qaren","قارن"],["a7sn","احسن"],["ahsan","احسن"],["ar5s","ارخص"],
  ["eih","ايه"],["eh","ايه"],["leh","ليه"],["ezay","ازاي"],["shokran","شكرا"],["salam","سلام"]
]);

function canonicalize(message=""){
  const raw=clean(message,5000);
  let mapped=0;
  const expanded=raw.toLowerCase().replace(/([\p{L}\p{N}]+)/gu,token=>{
    const replacement=ARABIZI_WORDS.get(token);
    if(replacement){mapped+=1;return replacement;}
    return token;
  });
  return {raw,canonical:n(expanded),arabizi_tokens:mapped};
}

const DIALECTS={
  egyptian:[/(?:^|\s)(?:عايز|عاوز)(?:\s|$)/,/(?:^|\s)بكام(?:\s|$)/,/دلوقتي/,/ازاي/,/(?:^|\s)ايه(?:\s|$)/,/يا عم|يا راجل/,/(?:^|\s)مش(?:\s|$)/,/كده/,/(?:^|\s)(?:ده|دي)(?:\s|$)/,/التاني/,/قصدي/],
  emirati:[/(?:^|\s)ابا(?:\s|$)/,/ابغي/,/(?:^|\s)شو(?:\s|$)/,/وين/,/هال/,/(?:^|\s)(?:هيه|مب)(?:\s|$)/,/رمسه/,/توصلون/,/عندكم/,/عقب/],
  gulf:[/(?:^|\s)ابي(?:\s|$)/,/ابغي/,/(?:^|\s)وش(?:\s|$)/,/شلون/,/هال/,/(?:^|\s)مو(?:\s|$)/,/وين/,/عندكم/,/توصلون/,/يعطيك العافيه/],
  levantine:[/(?:^|\s)بدي(?:\s|$)/,/(?:^|\s)شو(?:\s|$)/,/(?:^|\s)هاد(?:\s|$)/,/(?:^|\s)هاي(?:\s|$)/,/هيك/,/(?:^|\s)مو(?:\s|$)/,/قديش/,/وين/,/بندوره/],
  msa:[/(?:^|\s)اريد(?:\s|$)/,/هل لديكم/,/ما هو|ما هي/,/يرجي|ارجو/,/يمكنني/,/متاح/,/تفاصيل/]
};

function detectDialect({raw,canonical,arabizi_tokens}){
  const arabic=(raw.match(/[\u0600-\u06ff]/g)||[]).length;
  const latin=(raw.match(/[a-z]/gi)||[]).length;
  const scored=Object.entries(DIALECTS).map(([name,patterns])=>({name,score:patterns.reduce((s,re)=>s+(re.test(canonical)?1:0),0)})).sort((a,b)=>b.score-a.score);
  let language="ar";
  if(arabizi_tokens>0)language="arabizi";
  else if(latin>arabic*1.4&&latin>4)language="en";
  else if(latin>3&&arabic>3)language="mixed";
  const top=scored[0];
  const dialect=language==="en"?"english":top?.score?top.name:"neutral_arabic";
  return {language,dialect,code_switch:Boolean(latin>3&&arabic>3),arabizi:Boolean(arabizi_tokens),confidence:top?.score?Math.min(.98,.62+top.score*.09):.55};
}

const CROP_ALIASES={
  cucumber:["خيار","cucumber"],tomato:["طماطم","بندوره","بندورة","tomato"],pepper:["فلفل","فليفله","فليفلة","pepper","capsicum"],
  eggplant:["باذنجان","eggplant"],zucchini:["كوسه","كوسة","zucchini"],watermelon:["بطيخ","watermelon"],melon:["شمام","كنتالوب","melon"],
  okra:["باميه","بامية","okra"],onion:["بصل","onion"],lettuce:["خس","lettuce"],spinach:["سبانخ","spinach"],
  cabbage:["كرنب","ملفوف","cabbage"],strawberry:["فراوله","فراولة","strawberry"],corn:["ذره","ذرة","corn"],date_palm:["نخيل","تمر","date palm"]
};
const CATEGORY_ALIASES={
  seeds:["بذور","بذره","بذرة","seed","seeds"],fertilizer:["سماد","اسمده","أسمدة","fertilizer"],pesticide:["مبيد","مبيدات","pesticide"],
  irrigation:["ري","تنقيط","خرطوم","drip","irrigation"],hydroponics:["هيدروبونيك","زراعه مائيه","زراعة مائية","hydroponic"],
  greenhouse:["بيت محمي","بيوت محميه","صوبه","صوبة","greenhouse"],tools:["ادوات","أدوات","مقص","جهاز قياس","tools"]
};
const LOCATIONS={dubai:["دبي","dubai"],abu_dhabi:["ابوظبي","أبوظبي","ابو ظبي","abu dhabi"],al_ain:["العين","al ain"],sharjah:["الشارقه","الشارقة","sharjah"],ajman:["عجمان","ajman"],ras_al_khaimah:["راس الخيمه","رأس الخيمة","ras al khaimah","rak"],fujairah:["الفجيره","الفجيرة","fujairah"],umm_al_quwain:["ام القيوين","أم القيوين","umm al quwain"]};

function mentions(canonical,dictionary){
  const out=[];const tokens=new Set(tokenize(canonical));
  for(const [key,aliases] of Object.entries(dictionary))if(aliases.some(alias=>{const q=n(alias);return q.includes(" ")?canonical.includes(q):[q,`ال${q}`,`و${q}`,`وال${q}`].some(v=>tokens.has(v));} ))out.push(key);
  return out;
}
function extractNumbers(canonical){
  const quantities=[];
  const rx=/(\d+(?:\.\d+)?)\s*(كرتون|كرتونه|عبوه|عبوة|باكيت|كيس|كيلو|كجم|kg|قطعه|قطعة|حبه|حبة|مل|لتر|packet|pack)/g;
  for(const match of canonical.matchAll(rx))quantities.push({value:Number(match[1]),unit:match[2]});
  const budget=canonical.match(/(?:ميزانيه|حدود|تحت|اقل من|budget|under)\s*(\d+(?:\.\d+)?)/);
  return {quantities:quantities.slice(0,4),budget_aed:budget?Number(budget[1]):null};
}
function ordinalIndexes(canonical){
  const defs=[["الاول",0],["اول",0],["first",0],["الثاني",1],["التاني",1],["تاني",1],["second",1],["الثالث",2],["التالت",2],["third",2],["الرابع",3],["fourth",3]];
  return uniq(defs.filter(([word])=>canonical.includes(n(word))).map(([,index])=>index));
}

const INTENT_DEFS=[
  ["correction",/(?:^|\s)(?:لا|لأ|مش|مو|مب).{0,18}(?:قصدي|اقصد)|(?:قصدي|اقصد|غير الموضوع|سيبك من|خلينا في)/],
  ["identity",/^(?:منو انت|مين انت|انت مين|ما اسمك|شو اسمك|وش اسمك|ايش اسمك|اسمك شو|اسمك ايه|شو وظيفتك|what(?:'s| is) your name|who are you)[\s.!؟?]*$/],
  ["order_status",/(?:حاله|حالة|تتبع|وين|اين).{0,12}(?:طلبي|الطلب)|(?:track|order status)/],
  ["purchase",/(?:عايز|عاوز|ابي|ابغي|بدي|اريد).{0,10}(?:اطلب|اشتري|اخد)|(?:اطلب|اشتري|جهزلي|ابعت الرابط|ارسل الرابط|اضف للسله|checkout)/],
  ["comparison",/(?:قارن|مقارنه|الفرق|بينهم|الاتنين|الاثنين|ولا|احسن|افضل).{0,40}|(?:compare|versus|\bvs\b|difference)/],
  ["dosage",/(?:جرعه|كم ملي|كم مل|نسبه الخلط|معدل الاستخدام|dose|dosage|mix rate)/],
  ["diagnosis",/(?:اصفرار|اصفر|ذبول|بقع|مكرمش|متجعد|عفن|حشر|افه|مرض|النبات تعبان|تشخيص|symptom|diagnos)/],
  ["suitability",/(?:ينفع|يناسب|مناسب|يتحمل|تتحمل|تحمل الحر|متحمل|مقاوم|استخدمه ل|للحر|للملوحه|suitable|resistant|tolerant|can i use)/],
  ["recommendation",/(?:رشح|ترشح|تنصح|انسب|افضل|اختارلي|اختار لي|recommend|best option)/],
  ["price",/(?:بكام|بكم|كام سعر|كم سعر|سعر|السعر|سعره|سعرها|قديش|تكلفه|price|how much|cost)/],
  ["availability",/(?:متوفر|متاح|موجود|المخزون|في ستوك|خلص|available|availability|in stock|stock)/],
  ["delivery_time",/(?:بكره|غدا|اليوم|امتي|متي|كم يوم|كام يوم|وقت التوصيل|مده الشحن|متى يوصل|delivery time|tomorrow|how long)/],
  ["shipping",/(?:شحن|توصيل|يوصل|توصلون|دليفري|shipping|delivery)/],
  ["branches",/(?:وينكم|فينكم|موقعكم|فروع|اقرب فرع|location|branches?)/],
  ["hours",/(?:ساعات العمل|اوقات العمل|دوام|متي تفتح|متى تفتح|working hours|open now)/],
  ["payment",/(?:دفع|كاش|بطاقه|فيزا|ماستر|payment|cash on delivery|cod)/],
  ["returns",/(?:استرجاع|استبدال|ارجاع|refund|return|exchange)/],
  ["contact",/(?:رقمكم|واتساب|هاتف|تواصل|phone|whatsapp|contact)/],
  ["product_details",/(?:تفاصيل|مواصفات|استخدامه|استخدامها|بيستخدم|فايدته|what is it for|product details|specifications)/],
  ["social",/^(?:عامل ايه|اخبارك|شلونك|كيفك|كيف الحال|شكرا|تسلم|مشكور|تمام|اوكي|ماشي|thanks|thank you|how are you)$/],
  ["greeting",/^(?:اهلا|هلا|مرحبا|السلام عليكم|سلام|هاي|hello|hi|hey|صباح الخير|مساء الخير)$/]
];

const SEARCH_CUE=/(?:عندكم|عندك|عايز|عاوز|ابي|ابغي|بدي|اريد|محتاج|دورلي|وريني|show me|do you have|i need|looking for)/;
const CURRENT_REF=/(?:المنتج\s*(?:ده|دا|هذا|هذي)|البذور\s*(?:دي|هذي)|ده|دا|دي|هذا|هذي|هالمنتج|سعره|سعرها|تفاصيله|تفاصيلها|استخدامه|استخدامها|عنه|عنها|نفسه|نفسها|this one|that one)/;
const PLURAL_REF=/(?:دول|هذول|فيهم|منهم|بينهم|الاتنين|الاثنين|these|them|both)/;
const GENERIC_PRODUCT_ANCHORS=new Set(["بذور","بذره","خيار","طماطم","بندوره","فلفل","باذنجان","كوسه","بطيخ","شمام","باميه","بصل","سماد","اسمده","مبيد","منتج","المنتج","seed","seeds","cucumber","tomato","pepper","fertilizer","pesticide","packet","pack"]);

function detectIntents(canonical,entities){
  const found=[];
  for(const [name,rx] of INTENT_DEFS){const match=canonical.match(rx);if(match)found.push({name,confidence:.94,evidence:clean(match[0],100)});}
  if((entities.crops.length||entities.categories.length)&&SEARCH_CUE.test(canonical)&&!found.some(x=>["diagnosis","dosage"].includes(x.name)))found.push({name:"product_search",confidence:.91,evidence:"product need + search cue"});
  const boundAttribute=found.some(x=>["diagnosis","dosage","suitability","product_details"].includes(x.name));
  if((entities.categories.length||(entities.crops.length&&!boundAttribute))&&!found.some(x=>["diagnosis","dosage","product_search","product_details"].includes(x.name)))found.push({name:"product_search",confidence:.74,evidence:"explicit agricultural product entity"});
  if(!found.length)found.push({name:"general_question",confidence:.62,evidence:"open semantic request"});
  if(found.some(x=>x.name==="greeting")&&found.length>1)return found.filter(x=>x.name!=="greeting");
  return found.filter((item,index,self)=>self.findIndex(x=>x.name===item.name)===index);
}

function resolveReference(canonical,{state={},selectedProduct=null,selectedProducts=[]}={}){
  const visible=arr(state?.visible_products).map(safeProduct).filter(Boolean).slice(0,6);
  const active=safeProduct(state?.active_product_context?.product||state?.active_product_context);
  const selected=safeProduct(selectedProduct);
  const selectedMany=arr(selectedProducts).map(safeProduct).filter(Boolean).slice(0,4);
  const ordinals=ordinalIndexes(canonical);
  if(selectedMany.length>=2&&PLURAL_REF.test(canonical))return {kind:"selected_set",status:"resolved",confidence:"high",products:selectedMany,depends_on_context:false};
  if(selected)return {kind:"client_selected",status:"resolved",confidence:"high",product:selected,depends_on_context:false};
  if(ordinals.length){
    const products=ordinals.map(i=>visible[i]).filter(Boolean);
    if(products.length===ordinals.length)return {kind:ordinals.length>1?"ordinal_set":"ordinal",status:"resolved",confidence:"high",product:products.length===1?products[0]:undefined,products:products.length>1?products:undefined,indexes:ordinals,depends_on_context:true};
    return {kind:"ordinal",status:"unresolved",confidence:"low",indexes:ordinals,depends_on_context:true,reason:"ordinal_outside_visible_set"};
  }
  const direct=visible.find(product=>{
    const anchors=tokenize(product.name).filter(x=>x.length>=3&&!GENERIC_PRODUCT_ANCHORS.has(x)&&!/^(?:f1|\d+)$/.test(x));
    return anchors.length&&anchors.some(x=>canonical.includes(x));
  });
  if(direct)return {kind:"explicit_visible_name",status:"resolved",confidence:"high",product:direct,depends_on_context:false};
  if(PLURAL_REF.test(canonical)){
    const comparison=arr(state?.comparison_context?.products).map(safeProduct).filter(Boolean);
    const products=comparison.length>=2?comparison:visible;
    return products.length>=2?{kind:"plural",status:"resolved",confidence:"medium",products:products.slice(0,4),depends_on_context:true}:{kind:"plural",status:"unresolved",confidence:"low",depends_on_context:true,reason:"no_visible_product_set"};
  }
  if(CURRENT_REF.test(canonical)){
    if(active)return {kind:"current",status:"resolved",confidence:"high",product:active,depends_on_context:true};
    if(visible.length===1)return {kind:"current",status:"resolved",confidence:"medium",product:visible[0],depends_on_context:true};
    return {kind:"current",status:visible.length>1?"ambiguous":"unresolved",confidence:"low",products:visible.slice(0,4),depends_on_context:true,reason:visible.length>1?"multiple_visible_products":"no_active_product"};
  }
  return {kind:"none",status:"not_needed",confidence:"high",depends_on_context:false};
}

const TASKS={
  product_search:{tool:"search_product_dossiers",evidence:"catalog_match"},price:{tool:"verify_live_product_truth",evidence:"live_price"},availability:{tool:"verify_live_product_truth",evidence:"live_stock"},
  product_details:{tool:"get_product_dossier",evidence:"documented_product_facts"},suitability:{tool:"get_product_dossier",evidence:"documented_fit"},dosage:{tool:"get_product_dossier",evidence:"verified_label_rate"},
  recommendation:{tool:"search_product_dossiers",evidence:"need_to_product_fit"},comparison:{tool:"compare_product_dossiers",evidence:"documented_comparison"},shipping:{tool:"get_business_fact",evidence:"shipping_policy"},
  delivery_time:{tool:"get_business_fact",evidence:"delivery_policy"},branches:{tool:"get_business_fact",evidence:"branch_fact"},hours:{tool:"get_business_fact",evidence:"hours_fact"},payment:{tool:"get_business_fact",evidence:"payment_fact"},
  returns:{tool:"get_business_fact",evidence:"returns_policy"},contact:{tool:"get_business_fact",evidence:"contact_fact"},order_status:{tool:"get_business_fact",evidence:"order_status_process"},
  diagnosis:{tool:"diagnose_crop_problem",evidence:"differential_diagnosis"},purchase:{tool:"prepare_purchase_plan",evidence:"verified_purchase_plan"}
};
const INTENT_PRIORITY=["correction","identity","order_status","purchase","diagnosis","dosage","comparison","recommendation","suitability","product_search","product_details","price","availability","shipping","delivery_time","branches","hours","payment","returns","contact","social","greeting","general_question"];
const PRODUCT_BOUND=new Set(["price","availability","product_details","suitability","dosage"]);

function buildPlan(intents,reference,entities,{dialect,canonical}){
  const names=intents.map(x=>x.name);
  const ordered=INTENT_PRIORITY.filter(name=>names.includes(name));
  const tasks=ordered.filter(name=>TASKS[name]).map((name,index)=>({id:index+1,intent:name,...TASKS[name]}));
  const toolSet=new Set(tasks.map(x=>x.tool));
  if(names.includes("comparison")){toolSet.add("compare_live_options");toolSet.add("verify_live_product_truth");}
  if(names.includes("recommendation")||names.includes("product_search")){toolSet.add("search_catalog");toolSet.add("verify_live_product_truth");}
  if(names.includes("diagnosis")){toolSet.add("search_agricultural_engineering");toolSet.add("search_agricultural_master");}
  const productNeedsReference=names.some(name=>PRODUCT_BOUND.has(name));
  const hasFreshProductEntity=entities.crops.length||entities.categories.length||names.includes("product_search");
  let clarification={required:false,reason:"",question:"",choices:[]};
  if(names.includes("comparison")&&reference.status!=="resolved"&&!hasFreshProductEntity){
    clarification={required:true,reason:"comparison_targets_missing",question:dialect==="english"?"Which two products should I compare?":"تحب أقارن بين أنهي منتجين؟",choices:[]};
  }else if(productNeedsReference&&reference.status==="ambiguous"){
    clarification={required:true,reason:"multiple_product_references",question:dialect==="english"?"Which product do you mean?":"تقصد أنهي منتج بالضبط؟",choices:arr(reference.products).map(x=>x.name).filter(Boolean).slice(0,4)};
  }else if(productNeedsReference&&reference.status==="unresolved"&&!hasFreshProductEntity){
    clarification={required:true,reason:"product_identity_missing",question:dialect==="english"?"Which product do you mean?":"تقصد أنهي منتج؟",choices:[]};
  }
  const multi=ordered.filter(x=>!["correction","identity","social","greeting","general_question"].includes(x)).length>1;
  let route="general_conversation";
  if((names.includes("greeting")||names.includes("social")||names.includes("identity"))&&names.length===1)route="social";
  else if(names.includes("correction"))route="repair_current_turn";
  else if(names.includes("diagnosis")||names.includes("dosage"))route="agricultural_expert";
  else if(multi)route="semantic_multi_intent";
  else if(names.some(x=>["shipping","delivery_time","branches","hours","payment","returns","contact","order_status"].includes(x)))route="business_fact";
  else if(names.some(x=>["purchase","comparison","recommendation","suitability","product_search","product_details","price","availability"].includes(x)))route="commerce";
  return {route,tasks,allowed_tools:[...toolSet],tool_budget:Math.max(2,Math.min(8,tasks.length+2)),answer_order:ordered.filter(x=>!["correction"].includes(x)),question_budget:clarification.required?1:0,clarification,multi_intent:multi,canonical_summary:clean(canonical,500)};
}

function repairFrame(canonical){
  const match=canonical.match(/(?:قصدي|اقصد)\s+(.+)$/);
  return {explicit:Boolean(match||/(?:غير الموضوع|سيبك من|خلينا في)/.test(canonical)),replacement:clean(match?.[1]||"",500),supersede_old_topic:Boolean(match||/(?:غير الموضوع|سيبك من|خلينا في)/.test(canonical))};
}

export function buildSemanticFrame({message="",analysis={},state={},history=[],selectedProduct=null,selectedProducts=[]}={}){
  const normalized=canonicalize(message);
  const dialect=detectDialect(normalized);
  const repair=repairFrame(normalized.canonical);
  const entityText=repair.replacement||normalized.canonical;
  const semanticCrops=mentions(entityText,CROP_ALIASES);const semanticCategories=mentions(entityText,CATEGORY_ALIASES);
  const attributeReferenceCue=/(?:ينفع|يناسب|مناسب|جرعه|تفاصيله|استخدامه|سعره|سعرها|متوفر|موجود|suitable|dose|details|price|available)/.test(normalized.canonical)&&!SEARCH_CUE.test(normalized.canonical);
  const crops=uniq([...(semanticCrops.length?semanticCrops:(!repair.explicit&&!dialect.arabizi?[analysis?.crop?.key]:[]))].filter(Boolean));
  const categories=uniq([...(semanticCategories.length?semanticCategories:(!repair.explicit&&!dialect.arabizi&&!attributeReferenceCue?[analysis?.category?.key]:[]))].filter(Boolean));
  const locations=mentions(normalized.canonical,LOCATIONS);
  const numberFrame=extractNumbers(normalized.canonical);
  const entities={crops,categories,locations,emirate:clean(analysis?.emirate||"",80),cultivation:clean(analysis?.cultivation||"",80),quantities:numberFrame.quantities,budget_aed:numberFrame.budget_aed,ordinals:ordinalIndexes(normalized.canonical),time:{today:/(?:اليوم|today)/.test(normalized.canonical),tomorrow:/(?:بكره|غدا|tomorrow)/.test(normalized.canonical),urgent:/(?:ضروري|مستعجل|اليوم|بكره|urgent|asap)/.test(normalized.canonical)}};
  const intents=detectIntents(normalized.canonical,entities);
  let reference=resolveReference(normalized.canonical,{state,selectedProduct,selectedProducts});
  if(intents.some(x=>x.name==="product_search")&&(entities.crops.length||entities.categories.length)&&reference.kind==="current")reference={kind:"in_turn_product_need",status:"resolved",confidence:"high",entity:{crops:entities.crops,categories:entities.categories},depends_on_context:false};
  const plan=buildPlan(intents,reference,entities,{dialect:dialect.dialect,canonical:normalized.canonical});
  const contextScope=repair.supersede_old_topic||plan.route==="social"?"current_turn_only":reference.depends_on_context?"explicit_reference":"current_topic_plus_relevant_history";
  const primary=plan.answer_order[0]||intents[0]?.name||"general_question";
  return {
    version:VERSION,engine:"semantic_human_conversation_orchestrator",normalized,dialect,
    primary_intent:primary,intents,entities,reference,repair,
    context:{scope:contextScope,history_turns:contextScope==="current_turn_only"?0:reference.depends_on_context?8:5,used_reference:Boolean(reference.depends_on_context),recent_turns_available:Math.min(18,arr(history).length)},
    compound:{is_multi_intent:plan.multi_intent,intent_count:plan.answer_order.length,answer_order:plan.answer_order},plan,
    response_contract:{answer_first:!plan.clarification.required,mirror_dialect:true,dialect:dialect.dialect,language:dialect.language,question_budget:plan.question_budget,one_question_only:true,no_canned_intro:true,no_repeated_question:true,preserve_verified_facts:true},
    confidence:Math.min(.98,.72+Math.min(4,intents.length)*.05+(reference.status==="resolved"?.05:0))
  };
}

export function mergeHumanTurnWithSemanticFrame(humanTurn={},frame={}){
  if(!frame||frame.version!==VERSION)return humanTurn;
  const route=frame.plan?.route||"general_conversation";
  const visual=["visual_analysis","visual_followup"].includes(humanTurn.mode);
  const protectedCasual=["social","browse_only_social"].includes(humanTurn.mode);
  const mode=visual||protectedCasual?humanTurn.mode:route==="social"?"social":route==="repair_current_turn"?"repair_or_switch":route==="agricultural_expert"?"technical":route==="business_fact"?"general_conversation":route.includes("commerce")||route==="semantic_multi_intent"?(frame.primary_intent==="purchase"?"purchase":"commerce"):humanTurn.mode;
  const isolated=protectedCasual||frame.context?.scope==="current_turn_only";
  const allowed=route==="social"||protectedCasual?[]:uniq([...(humanTurn.tool_policy?.allowed||[]),...(frame.plan?.allowed_tools||[])]);
  return {
    ...humanTurn,mode,semantic_version:VERSION,semantic_orchestrator:frame.engine,current_turn_priority:1,
    followup_dependency:Boolean(frame.reference?.depends_on_context),answer_current_message_only:!frame.reference?.depends_on_context,
    current_topic:{...(humanTurn.current_topic||{}),mode,crops:frame.entities?.crops||[],category:frame.entities?.categories?.[0]||humanTurn.current_topic?.category||"",crop:frame.entities?.crops?.[0]||humanTurn.current_topic?.crop||"",intent:frame.primary_intent},
    context_policy:{...(humanTurn.context_policy||{}),scope:visual?humanTurn.context_policy?.scope:isolated?"current_turn_isolated":frame.reference?.depends_on_context?"explicit_followup":"current_topic_plus_relevant_context",history_turns:visual?humanTurn.context_policy?.history_turns:isolated?0:frame.context?.history_turns??5,allow_stale_product_context:visual?humanTurn.context_policy?.allow_stale_product_context:!isolated,allow_old_agronomy:visual?humanTurn.context_policy?.allow_old_agronomy:!isolated},
    tool_policy:{mode:route==="social"||protectedCasual?"zero_tools":visual?humanTurn.tool_policy?.mode:route,allowed},
    response_contract:{...(humanTurn.response_contract||{}),...frame.response_contract,length:frame.compound?.is_multi_intent?"adaptive_compact":humanTurn.response_contract?.length||"compact"},
    stale_context_quarantine:isolated,explicit_repair:Boolean(frame.repair?.explicit),debug_reason:`v24:${route}`
  };
}

export function semanticFrameForClient(frame={}){
  if(!frame||frame.version!==VERSION)return null;
  return {version:frame.version,engine:frame.engine,primary_intent:frame.primary_intent,intents:arr(frame.intents).map(x=>x.name),dialect:frame.dialect,entities:frame.entities,reference:frame.reference,context:frame.context,compound:frame.compound,plan:{route:frame.plan?.route,tasks:arr(frame.plan?.tasks),tool_budget:frame.plan?.tool_budget,answer_order:frame.plan?.answer_order,question_budget:frame.plan?.question_budget,clarification:frame.plan?.clarification},response_contract:frame.response_contract,confidence:frame.confidence};
}

const LEGACY_INTENTS={greeting:"greeting",identity:"identity",order_status:"order_status",purchase:"purchase",diagnosis:"plant_problem",recommendation:"recommendation",product_search:"product_search",shipping:"shipping",delivery_time:"delivery_time",branches:"branches",hours:"hours",payment:"payment",returns:"returns",contact:"contact"};
const CATEGORY_LABELS={seeds:"البذور",fertilizer:"الأسمدة",pesticide:"المبيدات",irrigation:"الري",hydroponics:"الزراعة المائية",greenhouse:"البيوت المحمية",tools:"الأدوات"};
const CROP_LABELS={cucumber:"الخيار",tomato:"الطماطم",pepper:"الفلفل",eggplant:"الباذنجان",zucchini:"الكوسة",watermelon:"البطيخ",melon:"الشمام",okra:"البامية",onion:"البصل",lettuce:"الخس",spinach:"السبانخ",cabbage:"الكرنب",strawberry:"الفراولة",corn:"الذرة",date_palm:"النخيل"};
const LOCATION_LABELS={dubai:"دبي",abu_dhabi:"أبوظبي",al_ain:"العين",sharjah:"الشارقة",ajman:"عجمان",ras_al_khaimah:"رأس الخيمة",fujairah:"الفجيرة",umm_al_quwain:"أم القيوين"};

export function enrichAnalysisWithSemanticFrame(analysis={},frame={}){
  if(!frame||frame.version!==VERSION)return analysis;
  const out=analysis;
  const category=frame.entities?.categories?.[0];const crop=frame.entities?.crops?.[0];const location=frame.entities?.locations?.[0];
  if(category&&(!out.category||frame.dialect?.arabizi||frame.repair?.explicit))out.category={key:category,labelAr:CATEGORY_LABELS[category]||category,aliases:[]};
  if(crop&&(!out.crop||frame.dialect?.arabizi||frame.repair?.explicit))out.crop={key:crop,labelAr:CROP_LABELS[crop]||crop,aliases:[]};
  if(!out.emirate&&location)out.emirate=LOCATION_LABELS[location]||location;
  if(frame.repair?.explicit){out.correction=true;out.correctionText=frame.repair.replacement||out.correctionText||"";out.hardSwitch=Boolean(frame.repair.supersede_old_topic);}
  if(["unknown","agriculture_general"].includes(String(out.intent||""))){
    const semanticNames=frame.intents?.map(x=>x.name)||[];
    const selected=["identity","order_status","purchase","diagnosis","recommendation","product_search","delivery_time","shipping","branches","hours","payment","returns","contact","greeting"].find(name=>semanticNames.includes(name));
    if(selected)out.intent=LEGACY_INTENTS[selected]||out.intent;
  }
  out.semantic_intent=frame.primary_intent;out.semantic_intents=frame.intents?.map(x=>x.name)||[];out.semantic_dialect=frame.dialect?.dialect||"";
  return out;
}

export function semanticHumanBrainHealth(){
  return {version:VERSION,mode:"natural_semantic_conversation_orchestrator_os_v25",capabilities:["egyptian_dialect","emirati_dialect","gulf_dialect","levantine_dialect","msa","english","arabizi_normalization","code_switch_detection","identity_and_social_isolation","multi_intent_decomposition","pronoun_resolution","ordinal_product_resolution","correction_supersession","current_turn_isolation","one_question_clarification","evidence_task_planning","unified_tool_budget","answer_order_contract","live_truth_routing","natural_dialect_mirroring"]};
}
