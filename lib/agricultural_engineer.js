import { normalizeAr, tokenize } from "./utils.js";
import {
  AGRICULTURAL_ENGINEERING_MODULES,
  AGRICULTURAL_ENGINEERING_CARDS,
  AGRICULTURAL_DIAGNOSTIC_RULES,
  AGRICULTURAL_CALCULATORS,
  AGRICULTURAL_CONCEPT_ALIASES
} from "./agricultural_engineer_knowledge.js";

const VERSION="15.0";
const MAX_TEXT=5000;
const arr=v=>Array.isArray(v)?v:[];
const clean=(v,max=MAX_TEXT)=>String(v||"").replace(/\s+/g," ").trim().slice(0,max);

const DIALECT_REPLACEMENTS=[
  [/الميه|المياة|المياة|الماءه/g,"المياه"],[/الصوبه|الصوبة/g,"بيت محمي"],[/جرين\s*هاوس/g,"بيت محمي"],
  [/مغذي|مغذى/g,"سماد"],[/دابل|دبلان|متهدل|ذابل|ذابله|ذابلة/g,"ذبول"],[/مصفر|بيصفر|يصفر/g,"اصفرار"],
  [/مكرمش|مكعبل|متكور/g,"تجعد"],[/خروم|مخروم/g,"ثقوب"],[/حشره|حشرة/g,"حشره"],
  [/عفن من تحت|اسود من تحت/g,"عفن الطرف الزهري"],[/ملح عالي|املاح عاليه|املاح عالية/g,"ملوحة عالية"],
  [/ري كتير|مية كتير|مياه كتير/g,"ري زائد"],[/ري قليل|مية قليلة|مياه قليله/g,"عجز مائي"],
  [/هيدرو بونيك|هيدروبونيك/g,"زراعة مائية"],[/نقطه|نقاطه|نقاطة/g,"نقاطات"],
  [/الجذور|جذور/g,"الجذر"],[/الأوراق|اوراق/g,"الورق"],[/الشتلات|شتلات/g,"شتله"]
];

export function normalizeAgriculturalLanguage(text=""){
  let t=normalizeAr(clean(text).toLowerCase());
  for(const [re,to] of DIALECT_REPLACEMENTS) t=t.replace(re,to);
  return t.replace(/\s+/g," ").trim();
}

function trigrams(s=""){
  const t=normalizeAgriculturalLanguage(s).replace(/\s+/g," ");
  const out=new Set(); if(t.length<3){if(t)out.add(t);return out;}
  for(let i=0;i<t.length-2;i++) out.add(t.slice(i,i+3));
  return out;
}
function jaccard(a,b){
  if(!a.size||!b.size) return 0; let inter=0;
  for(const x of a) if(b.has(x)) inter++;
  return inter/(a.size+b.size-inter);
}

const ALIAS_INDEX=[];
for(const [concept,aliases] of Object.entries(AGRICULTURAL_CONCEPT_ALIASES)){
  for(const alias of aliases) ALIAS_INDEX.push({concept,alias:normalizeAgriculturalLanguage(alias)});
}

function conceptHits(text=""){
  const t=normalizeAgriculturalLanguage(text); const hits=new Set();
  for(const row of ALIAS_INDEX){
    if(!row.alias) continue;
    // Very short Arabic aliases such as "من" are ambiguous prepositions; only use them in explicit pest wording.
    if(row.alias.length<3 && !["ec","ph"].includes(row.alias)) continue;
    if(t.includes(row.alias)) hits.add(row.concept);
  }
  if(/(?:ماء|مياه|ميه|المياه).*(?:مالح|ملح)|(?:مالح|ملح).*(?:ماء|مياه|ميه|المياه)/.test(t)) hits.add("salinity");
  return [...hits];
}

const CROP_NAMES=[...new Set(AGRICULTURAL_ENGINEERING_CARDS.map(x=>x.crop).filter(Boolean))];
function detectedCrop(text=""){
  const t=normalizeAgriculturalLanguage(text);
  return CROP_NAMES.find(c=>t.includes(normalizeAgriculturalLanguage(c)))||"";
}

function detectSystem(text=""){
  const t=normalizeAgriculturalLanguage(text);
  if(/زراعه مائيه|بدون تربه|nft|dwc|كوكوبيت|روك وول/.test(t)) return "hydroponic";
  if(/بيت محمي|محمي|صوبه/.test(t)) return "greenhouse";
  if(/مكشوف|حقل|ارض مفتوحه/.test(t)) return "open_field";
  if(/اصص|قصاري|حوض منزلي|حديقه منزل/.test(t)) return "container_home";
  return "";
}
function detectZone(text=""){
  const t=normalizeAgriculturalLanguage(text);
  if(/من تحت|سفلي|قديم|الورق القديم|الورق السفلي/.test(t)) return "old_leaves";
  if(/من فوق|قمه|قمة|حديث|جديد|الورق الجديد|النمو الجديد/.test(t)) return "new_leaves";
  if(/الجذر|جذور/.test(t)) return "roots";
  if(/ثمر|الثمره|الثمرة/.test(t)) return "fruit";
  if(/زهر|ازهار|أزهار/.test(t)) return "flowers";
  return "";
}
function detectStage(text=""){
  const t=normalizeAgriculturalLanguage(text);
  if(/بذره|انبات|نبتت|لسه بزرع/.test(t)) return "germination";
  if(/شتله|صينيه|مشتل/.test(t)) return "seedling";
  if(/زهر|تزهير|ازهار|عقد/.test(t)) return "flowering_fruit_set";
  if(/ثمر|تحجيم|نضج/.test(t)) return "fruiting";
  if(/حصاد|قطف|جمع/.test(t)) return "harvest";
  return "";
}
function detectIntent(text=""){
  const t=normalizeAgriculturalLanguage(text);
  if(/ايه المرض|ما المرض|شخص|تشخيص|مشكله|اعراض|اصفرار|ذبول|تجعد|حرق|بقع|عفن|دود|حشره|لازق|هباب|خيوط|فضي|ثقوب|خروم|موزايك|تبرقش/.test(t)) return "diagnosis";
  if(/احسب|حساب|كام لتر|كم لتر|كثافه|عدد نبات|ppm|مسافات/.test(t)) return "calculation";
  if(/ري|مياه|ملوحه|ec|نقاطات|صرف/.test(t)) return "irrigation_water";
  if(/سماد|تسميد|عنصر|نقص|حديد|بوتاسيوم|كالسيوم|نيتروجين|فوسفور|ماغنسيوم/.test(t)) return "nutrition";
  if(/مبيد|افه|حشره|فطر|مرض|فيروس|اكاروس|تربس|ذبابه بيضاء|من /.test(t)) return "crop_protection";
  if(/بيت محمي|تبريد|تهويه|تظليل|رطوبه|vpd/.test(t)) return "protected_culture";
  if(/زراعه مائيه|هيدروبونيك|nft|dwc|كوكوبيت|محلول مغذي/.test(t)) return "hydroponics";
  if(/تربه|قوام|صوديه|ph|كمبوست|ماده عضويه/.test(t)) return "soil";
  if(/بذور|انبات|شتلات|مشتل/.test(t)) return "seed_nursery";
  if(/حصاد|تخزين|تبريد محصول|تعبئه/.test(t)) return "postharvest";
  return "agriculture_general";
}

function extractMeasurements(text=""){
  const raw=clean(text,3000); const found=[];
  const patterns=[
    [/(?:ec|اي\s*سي)\s*[:=]?\s*([0-9]+(?:\.[0-9]+)?)/ig,"ec"],
    [/(?:ph|بي\s*اتش)\s*[:=]?\s*([0-9]+(?:\.[0-9]+)?)/ig,"ph"],
    [/([0-9]+(?:\.[0-9]+)?)\s*(?:ppm|جزء بالمليون)/ig,"ppm"],
    [/([0-9]+(?:\.[0-9]+)?)\s*(?:°?c|درجه|درجة مئويه|مئوية)/ig,"temperature_c"],
    [/([0-9]+(?:\.[0-9]+)?)\s*%\s*(?:رطوبه|رطوبة|rh)?/ig,"percent"],
    [/([0-9]+(?:\.[0-9]+)?)\s*(?:متر مربع|م2|m2|م²)/ig,"area_m2"],
    [/([0-9]+(?:\.[0-9]+)?)\s*(?:لتر|l\b)/ig,"liters"],
    [/([0-9]+(?:\.[0-9]+)?)\s*(?:سم|cm)\b/ig,"cm"]
  ];
  for(const [re,type] of patterns){ let m; while((m=re.exec(raw))&&found.length<20) found.push({type,value:Number(m[1]),raw:m[0]}); }
  return found;
}

export function analyzeAgriculturalRequest(message="",ctx={}){
  const normalized=normalizeAgriculturalLanguage(message); const concepts=conceptHits(normalized);
  const crop=detectedCrop(normalized)||ctx?.analysis?.crop?.labelAr||ctx?.analysis?.crop?.key||ctx?.state?.diagnostic_context_v31?.crop_label||ctx?.state?.crop||"";
  const system=detectSystem(normalized)||ctx?.analysis?.cultivation||ctx?.state?.cultivation||"";
  const stage=detectStage(normalized); const zone=detectZone(normalized); const parsedIntent=detectIntent(normalized);
  const intent=["diagnosis","plant_problem"].includes(String(ctx?.analysis?.intent||""))||ctx?.analysis?.v31_primary_intent==="diagnosis"?"diagnosis":parsedIntent;
  const measurements=extractMeasurements(message);
  const symptomConcepts=concepts.filter(x=>["yellowing","wilting","leaf_curl","burn","root_rot","salinity","waterlogging","drought","whitefly","thrips","mites","aphid","powdery_mildew","downy_mildew","virus","ber"].includes(x));
  const agricultureScore=(crop?3:0)+(system?2:0)+(concepts.length?Math.min(4,concepts.length):0)+(/زراع|نبات|محصول|مزرع|ترب|ري|ماء|مياه|ميه|بير|بئر|مالح|ملوح|نقاط|صرف|سماد|بذور|شتل|ورق|جذر|ثمر|حشر|مبيد|بيت محمي/.test(normalized)?4:0);
  const complexity=Math.min(5,(message.split(/\s+/).length>=8?1:0)+(symptomConcepts.length?2:0)+(measurements.length?1:0)+(crop&&system?1:0));
  return {is_agricultural:agricultureScore>=3,agriculture_score:agricultureScore,intent,crop,system,stage,zone,concepts,symptoms:symptomConcepts,measurements,complexity,normalized};
}

export function isAgriculturalExpertQuery(message=""){
  return analyzeAgriculturalRequest(message).is_agricultural;
}

function scoreCard(query,frame,card){
  const q=frame?.normalized||normalizeAgriculturalLanguage(query); const toks=tokenize(q).filter(x=>x.length>1);
  const topic=normalizeAgriculturalLanguage(card.topic); const aliases=arr(card.aliases).map(normalizeAgriculturalLanguage);
  const hay=normalizeAgriculturalLanguage([card.topic,...arr(card.aliases),card.body_ar,...arr(card.tags),card.crop||""].join(" "));
  let score=0;
  if(topic&&q.includes(topic)) score+=30;
  for(const a of aliases) if(a&&q.includes(a)) score+=18;
  for(const t of toks){ if(hay.includes(t)) score+=Math.min(6,2+t.length/2); }
  for(const c of arr(frame?.concepts)) if(hay.includes(normalizeAgriculturalLanguage(c))) score+=5;
  if(frame?.crop&&card.crop===frame.crop) score+=18;
  if(frame?.intent&&String(card.discipline||"").includes(frame.intent)) score+=5;
  if(frame?.intent==="diagnosis"&&card.discipline==="diagnostics") score+=10;
  if(frame?.intent==="nutrition"&&card.discipline==="plant_nutrition") score+=10;
  if(frame?.intent==="irrigation_water"&&["irrigation","soil_science"].includes(card.discipline)) score+=10;
  if(frame?.intent==="crop_protection"&&["entomology","plant_pathology","pesticide_stewardship"].includes(card.discipline)) score+=10;
  if(frame?.intent==="protected_culture"&&card.discipline==="protected_culture") score+=10;
  if(frame?.intent==="hydroponics"&&card.discipline==="hydroponics") score+=10;
  if(score<14){ const sim=jaccard(trigrams(q),trigrams([card.topic,...arr(card.aliases)].join(" "))); if(sim>.20) score+=sim*24; }
  return score;
}

export function searchAgriculturalEngineering(query="",{limit=10,discipline="",crop=""}={}){
  const frame=analyzeAgriculturalRequest(query); if(crop&&!frame.crop) frame.crop=crop;
  const diagnosticCards=AGRICULTURAL_DIAGNOSTIC_RULES.map(r=>({
    id:r.id,discipline:"diagnostics",topic:r.name,aliases:r.signals,
    body_ar:`تشخيص تفريقي محتمل: ${arr(r.hypotheses).join("؛ ")}. للتأكيد: ${arr(r.confirm).join("؛ ")}. أول فحوص منخفضة المخاطر: ${arr(r.first_steps).join("؛ ")}.`,
    tags:[...arr(r.hypotheses),...arr(r.confirm)],crop:arr(r.crops)[0]||"",source_type:"agricultural_diagnostic_rule"
  }));
  return [...AGRICULTURAL_ENGINEERING_CARDS,...diagnosticCards]
    .filter(c=>(!discipline||c.discipline===discipline)&&(!crop||!c.crop||c.crop===crop))
    .map(c=>({...c,score:Number(scoreCard(query,frame,c).toFixed(3))}))
    .filter(c=>c.score>=8).sort((a,b)=>b.score-a.score||String(a.id).localeCompare(String(b.id)))
    .slice(0,Math.max(1,Math.min(20,Number(limit)||10)));
}

function ruleScore(text,frame,rule){
  const t=frame.normalized; let score=0;
  for(const s of arr(rule.signals)){
    const ns=normalizeAgriculturalLanguage(s);
    if(ns&&t.includes(ns)) score+=28;
    else {
      const st=tokenize(ns).filter(x=>x.length>1);
      const matched=st.filter(x=>t.includes(x)).length;
      if(st.length&&matched>=Math.min(st.length,Math.max(2,Math.ceil(st.length*.55)))) score+=8*matched;
      else { const sim=jaccard(trigrams(t),trigrams(ns)); if(sim>.16) score+=sim*18; }
    }
  }
  if(frame.crop&&arr(rule.crops).includes(frame.crop)) score+=8;
  const rn=normalizeAgriculturalLanguage(rule.name||"");
  if(frame.zone==="old_leaves"){
    if(/قديم|الاوراق القديمه|الورق القديم/.test(rn)) score+=14;
    if(/حديث|جديد/.test(rn)) score-=18;
  }else if(frame.zone==="new_leaves"){
    if(/حديث|جديد/.test(rn)) score+=14;
    if(/قديم/.test(rn)) score-=18;
  }
  if(frame.zone==="roots"&&/جذر/.test(rn)) score+=14;
  if(frame.zone==="fruit"&&/ثمر|طرف زهري/.test(rn)) score+=10;
  for(const concept of frame.symptoms){
    const joined=normalizeAgriculturalLanguage(arr(rule.signals).join(" "));
    const aliases=arr(AGRICULTURAL_CONCEPT_ALIASES[concept]).map(normalizeAgriculturalLanguage);
    if(aliases.some(a=>joined.includes(a))) score+=9;
  }
  return score;
}

export function diagnoseAgriculturalProblem(message="",context={}){
  const frame=analyzeAgriculturalRequest(message,context);
  const matched=AGRICULTURAL_DIAGNOSTIC_RULES.map(r=>({...r,score:ruleScore(message,frame,r)})).filter(r=>r.score>=8).sort((a,b)=>b.score-a.score).slice(0,5);
  const hypotheses=[]; const questions=[]; const firstSteps=[]; const avoid=[];
  for(const r of matched){
    for(const h of arr(r.hypotheses)) hypotheses.push({hypothesis:h,support:r.name,score:r.score,certainty:r.score>=30?"moderate":"possible"});
    questions.push(...arr(r.confirm)); firstSteps.push(...arr(r.first_steps)); avoid.push(...arr(r.avoid));
  }
  const uniq=(xs,n=8)=>[...new Set(xs.map(x=>clean(x,500)).filter(Boolean))].slice(0,n);
  const fallback=matched.length?[]:searchAgriculturalEngineering(message,{limit:5,crop:frame.crop});
  if(!matched.length&&frame.intent==="diagnosis"){
    questions.push("ما الجزء المصاب تحديدًا، وهل العَرَض موضعي أم ينتشر؟");
    firstSteps.push("صوّر الجزء المصاب من قريب ومن بعيد، وافحص الوجه السفلي للأوراق والجذور إن أمكن.","راجع رطوبة التربة والصرف وتوقيت آخر ري قبل إضافة أي علاج.");
    avoid.push("لا تستخدم مبيدًا أو سمادًا علاجيًا عشوائيًا قبل تضييق سبب المشكلة.");
  }
  return {
    handled:Boolean(matched.length||fallback.length||frame.intent==="diagnosis"),frame,
    diagnosis_status:matched.length?"differential_not_confirmed":"insufficient_pattern_match",
    hypotheses:hypotheses.slice(0,10),
    clarification_questions:uniq(questions,6),first_steps:uniq(firstSteps,6),avoid:uniq(avoid,5),
    urgency:matched.some(x=>x.urgency==="high")?"high":"normal",
    supporting_knowledge:fallback.map(x=>({id:x.id,title:x.topic,answer:x.body_ar,score:x.score,source:"agricultural_engineering_curriculum"})),
    safety:"لا تعتبر النتيجة تشخيصاً نهائياً من النص وحده. الجرعات والمبيدات ومنظمات النمو تحتاج ملصقاً/تسجيلًا وبيانات محصول وآفة واضحة."
  };
}

export function agricultureCalculator(operation="",args={}){
  const n=k=>Number(args?.[k]); const finite=(...xs)=>xs.every(Number.isFinite);
  let value=null,unit="",formula="",note="";
  if(operation==="irrigation_volume"){
    const depth=n("depth_mm"),area=n("area_m2"); if(!finite(depth,area)||depth<0||area<=0) return {ok:false,error:"depth_mm_and_area_m2_required"};
    value=depth*area; unit="L"; formula="liters = depth_mm × area_m2"; note="حجم نظري قبل تصحيح كفاءة الري والتوزيع.";
  }else if(operation==="planting_density"){
    const row=n("row_cm"),plant=n("plant_cm"); if(!finite(row,plant)||row<=0||plant<=0) return {ok:false,error:"row_cm_and_plant_cm_required"};
    value=10000/(row*plant); unit="plants/m2"; formula="10000 ÷ (row_cm × plant_cm)"; note="تقريب لشبكة منتظمة، لا يمثل صفوفاً مزدوجة تلقائياً.";
  }else if(operation==="seed_requirement"){
    const target=n("target_plants"),g=n("germination_pct"),s=n("survival_pct"); if(!finite(target,g,s)||target<=0||g<=0||g>100||s<=0||s>100) return {ok:false,error:"valid_target_germination_survival_required"};
    value=Math.ceil(target/(g/100)/(s/100)); unit="seeds"; formula="target ÷ germination_fraction ÷ survival_fraction"; note="أضف هامش تشغيل مناسب لطريقة الزراعة.";
  }else if(operation==="fertilizer_ppm"){
    const ppm=n("target_ppm"),vol=n("volume_l"),pct=n("nutrient_pct"); if(!finite(ppm,vol,pct)||ppm<0||vol<=0||pct<=0||pct>100) return {ok:false,error:"target_ppm_volume_l_nutrient_pct_required"};
    value=ppm*vol/1000/(pct/100); unit="g product"; formula="ppm × liters ÷ 1000 ÷ nutrient_fraction"; note="حساب كيميائي فقط وليس توصية أن هذا ppm مناسب للمحصول أو الخلط.";
  }else if(operation==="flow_time"){
    const liters=n("required_liters"),flow=n("total_flow_lph"); if(!finite(liters,flow)||liters<0||flow<=0) return {ok:false,error:"required_liters_and_total_flow_lph_required"};
    value=liters/flow*60; unit="minutes"; formula="liters ÷ L/h × 60"; note="استخدم التصرف الفعلي وكفاءة توزيع جيدة.";
  }else if(operation==="label_tank_mix"){
    const rate=n("label_rate_per_100l"),tank=n("tank_l"); if(args?.label_confirmed!==true) return {ok:false,error:"official_label_rate_must_be_confirmed"};
    if(!finite(rate,tank)||rate<0||tank<=0) return {ok:false,error:"label_rate_per_100l_and_tank_l_required"};
    value=rate*tank/100; unit=clean(args?.rate_unit||"same label unit",60); formula="label rate per 100 L × tank L ÷ 100"; note="هذا تحويل حسابي لمعدل ملصق قدّمه المستخدم، وليس إنشاء جرعة جديدة. اتبع الملصق ومعدات الوقاية وفترة الأمان.";
  }else return {ok:false,error:"unsupported_operation",supported:["irrigation_volume","planting_density","seed_requirement","fertilizer_ppm","flow_time","label_tank_mix"]};
  return {ok:true,operation,value:Number(value.toFixed(4)),unit,formula,note};
}

export function answerAgriculturalEngineerKnowledge(message="",locale="ar",context={}){
  if(locale==="en") return null;
  const frame=analyzeAgriculturalRequest(message,context);
  if(!frame.is_agricultural) return null;
  // Do not hijack sales/project discovery. "I have a farm and want a greenhouse" must continue through commerce qualification.
  const legacyIntent=String(context?.analysis?.intent||"");
  const commercialRequest=(["product_search","recommendation","purchase"].includes(legacyIntent) || /عايز|اريد|ابغى|احتاج|اشتري|شراء|ميزاني|مشروع|عندي مزرعه|عندي مزرعة|جهزلي|جهز لي|ابني|بناء/.test(frame.normalized));
  const explicitKnowledgeQuestion=/كيف|ليه|لماذا|ما هو|ايه هو|اشرح|مشكله|مشكلة|اعراض|أعراض|مرض|ملوح|ري|تسميد|نقص|تحليل/.test(frame.normalized);
  if(commercialRequest&&!explicitKnowledgeQuestion) return null;
  // Complex diagnosis or multi-factor decisions should go through the neural agent + tools.
  if(frame.intent==="diagnosis"||frame.complexity>=3||/رش|مبيد|جرعه|جرعة|قانون|تصريح|ترخيص/.test(frame.normalized)) return null;
  const rows=searchAgriculturalEngineering(message,{limit:4,crop:frame.crop});
  if(!rows.length||rows[0].score<18) return null;
  const top=rows.slice(0,2);
  return {
    reply:top.map(x=>x.body_ar).join("\n\n"),
    entries:top.map(x=>({id:x.id,topic:x.topic,discipline:x.discipline,score:x.score,source:"agricultural_engineering_curriculum_v15"})),
    frame,source:"agricultural_engineer_v15"
  };
}

export function agriculturalEngineerHealth(){
  const disciplines=[...new Set(AGRICULTURAL_ENGINEERING_CARDS.map(x=>x.discipline))];
  const crops=[...new Set(AGRICULTURAL_ENGINEERING_CARDS.map(x=>x.crop).filter(Boolean))];
  return {
    version:VERSION,mode:"agricultural_engineer_expert_system",
    curriculum_modules:AGRICULTURAL_ENGINEERING_MODULES.length,
    knowledge_cards:AGRICULTURAL_ENGINEERING_CARDS.length,
    diagnostic_rules:AGRICULTURAL_DIAGNOSTIC_RULES.length,
    calculators:AGRICULTURAL_CALCULATORS.length,
    disciplines:disciplines.length,crop_profiles:crops.length,
    language_understanding:"dialect_normalization+concept_aliases+token_semantics+character_trigrams+neural_tool_reasoning",
    diagnosis_policy:"differential_diagnosis_not_single_symptom_guess",
    dosage_policy:"label_or_verified_product_data_only",
    legal_policy:"delegated_to_v14_official_uae_regulatory_layer"
  };
}
