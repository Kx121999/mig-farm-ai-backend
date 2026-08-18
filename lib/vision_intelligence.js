import { readFileSync, statSync } from "node:fs";
import { normalizeAr, tokenize } from "./utils.js";
import { searchProductDossiers, getProductDossier } from "./product_intelligence.js";

const VERSION="22.5";
const SIGNATURES_URL=new URL("../knowledge/MIG_FARM_VISUAL_PRODUCT_SIGNATURES_V22.json",import.meta.url);
const ATLAS_URL=new URL("../knowledge/AGRICULTURAL_VISUAL_DIAGNOSTIC_ATLAS_V22.json",import.meta.url);
let SIG=null,ATLAS=null;
function arr(v){return Array.isArray(v)?v:[];}
function clean(v,max=12000){return String(v||"").replace(/\s+/g," ").trim().slice(0,max);}
function n(v){return normalizeAr(clean(v));}
function uniq(xs,limit=60){const out=[],seen=new Set();for(const x of arr(xs)){const c=clean(x,800);const k=n(c);if(!k||seen.has(k))continue;seen.add(k);out.push(c);if(out.length>=limit)break;}return out;}
function load(){if(!SIG)SIG=JSON.parse(readFileSync(SIGNATURES_URL,"utf8"));if(!ATLAS)ATLAS=JSON.parse(readFileSync(ATLAS_URL,"utf8"));}
function turnNum(v){const x=Number(v);return Number.isFinite(x)?x:0;}

const VISUAL_FOLLOWUP_RX=/(?:^|\s)(ركز|بص|شوف|شوفها|بص عليها|الصوره|الصورة|الصوره دي|الصورة دي|اللي بعتهالك|اللي بعتها|اللي بعته|اللي فوق|المنتج ده|المنتج دا|المنتج هذا|هالمنتج|دي ايه|دي إيه|ده ايه|ده إيه|ايه ده|إيه ده|شو هذا|وش هذا|اقرا|اقرأ|اقرالي|اقرألي|اقراها|اقرأها|اقرا اللي عليها|اقرأ اللي عليها|اسمها ايه|اسمها إيه|اسمه ايه|اسمه إيه|بكام|بكم|سعره|سعرها|متوفر|موجود|ينفع|يستخدم لايه|يستخدم لإيه|focus|look again|look at it|read it|read the label|this one|what is this)(?:\s|$)/i;
const VISUAL_CANCEL_RX=/(سيبك من الصوره|سيبك من الصورة|فكك من الصوره|فكك من الصورة|انسى الصوره|انسي الصورة|انس الصورة|غير الموضوع|موضوع تاني|مش بتكلم عن الصوره|مش بتكلم عن الصورة|ignore the image|forget the image|new topic)/i;
const VISUAL_EXPLICIT_RX=/(صوره|صورة|الصوره|الصورة|الملصق|الباركود|barcode|label|image|photo|picture|اللي بعتهالك|اللي بعتها|اللي فوق|المنتج ده|المنتج دا|المنتج هذا|هالمنتج|العبوه دي|العبوة دي|الكيس ده|الباكيت ده)/i;
const NEW_TOPIC_INTENT_RX=/(عندكم|عندك|عايز|عاوزه|عايزة|اريد|أريد|ابي|أبي|ابغى|أبغى|احتاج|أحتاج|محتاج|محتاجه|هات|دورلي|وريني|show me|do you have|i need|looking for|need a)/i;
const NEW_TOPIC_NOUN_RX=/(بذور|طماطم|بندور|خيار|فلفل|باذنجان|كوس|بطيخ|شمام|كنتالوب|باميه|بامية|بصل|خس|سبانخ|ملفوف|كرنب|فجل|شمندر|بنجر|ذره|ذرة|فراول|نخيل|تمر|سماد|اسمده|أسمدة|مبيد|مبيدات|خرطوم|خراطيم|مضخه|مضخة|مضخات|تايمر|مؤقت|رشاش|ري|هيدروبونيك|زراعه مائيه|زراعة مائية|اداه|أداة|ادوات|أدوات|مقص|منشار|دريل|seed|tomato|cucumber|pepper|eggplant|zucchini|watermelon|melon|okra|onion|lettuce|fertilizer|pesticide|hose|pump|timer|sprinkler|irrigation|hydroponic|tool)/i;

const VISUAL_INTENT_RX={
  availability:/(متوفر|متاح|موجود|المخزون|مخزون|خلص|available|availability|in stock|stock)/i,
  price:/(بكام|بكم|السعر|سعره|سعرها|سعر|كام سعر|price|cost|how much)/i,
  dosage:/(جرعه|جرعة|معدل الاستخدام|طريقة الاستخدام|كم مل|كم لتر|dose|dosage|application rate|rate per)/i,
  label_read:/(اقرا|اقرأ|اقرالي|اقرألي|الملصق|المكتوب عليه|المكتوب عليها|read the label|read it|what does it say)/i,
  identity:/(ايه ده|إيه ده|ده ايه|ده إيه|دي ايه|دي إيه|شو هذا|وش هذا|اسمه ايه|اسمه إيه|اسمها ايه|اسمها إيه|ما هذا|what is this|what product|product name)/i,
  specifications:/(مواصفات|قدره|قدرة|حجم|وزن|تركيز|مقاس|ضغط|طبقات|واط|حصان|فولت|spec|specification|capacity|size|weight|power|pressure|voltage)/i,
  usage:/(ينفع|يستخدم|استخدامه|استخدامها|بيعمل ايه|بيعمل إيه|فايدته|فائدته|what is it for|use for|can i use)/i,
  purchase:/(عايز ده|عايز دي|هاخده|هاخدها|أبغى هذا|ابي هذا|اطلبه|اشتريه|buy this|order this)/i,
  diagnosis:/(ورق|ورقه|ورقة|نبات|محصول|جذر|ثمر|حشر|افه|آفة|مرض|اصفر|ذبول|بقع|عفن|plant|leaf|root|pest|disease|yellow|wilt)/i,
  focus:/(ركز|بص|شوف|look again|focus)/i
};
const PRODUCT_VISUAL_INTENTS=new Set(["availability","price","identity","label_read","specifications","usage","purchase","dosage"]);

export function detectVisualIntent(message="",activeContext={}){
  const t=n(message);
  if(VISUAL_INTENT_RX.dosage.test(t)) return "dosage";
  if(VISUAL_INTENT_RX.availability.test(t)) return "availability";
  if(VISUAL_INTENT_RX.price.test(t)) return "price";
  if(VISUAL_INTENT_RX.label_read.test(t)) return "label_read";
  if(VISUAL_INTENT_RX.identity.test(t)) return "identity";
  if(VISUAL_INTENT_RX.specifications.test(t)) return "specifications";
  if(VISUAL_INTENT_RX.usage.test(t)) return "usage";
  if(VISUAL_INTENT_RX.purchase.test(t)) return "purchase";
  if(VISUAL_INTENT_RX.diagnosis.test(t)) return "diagnosis";
  if(VISUAL_INTENT_RX.focus.test(t)) return clean(activeContext?.last_visual_intent||"identity",40)||"identity";
  return clean(activeContext?.last_visual_intent||"",40)||"general";
}

function evidenceTarget(intent="",mode=""){
  if(intent==="availability"||intent==="price"||intent==="purchase") return "product_name_or_sku_barcode";
  if(intent==="identity") return "product_name_or_sku_barcode";
  if(intent==="label_read") return "requested_label_panel";
  if(intent==="dosage"||mode==="regulated_label_high_risk") return "dose_and_directions_panel";
  if(intent==="specifications") return "name_plus_requested_spec_panel";
  if(intent==="usage") return "product_name_or_sku_barcode";
  if(intent==="diagnosis"||mode==="plant_diagnostic") return "affected_area_closeup";
  return "decisive_visual_detail";
}

export function normalizeVisionImages(value){
  const input=arr(value).slice(0,4),out=[];
  for(let i=0;i<input.length;i++){
    const x=typeof input[i]==="string"?{url:input[i]}:(input[i]||{});
    const detail=["low","high","auto"].includes(String(x.detail||"").toLowerCase())?String(x.detail).toLowerCase():"high";
    const fileId=clean(x.file_id||x.fileId||"",200);
    const url=clean(x.image_url||x.url||x.data_url||"",6000000);
    const clientImageId=clean(x.client_image_id||x.clientImageId||x.image_id||"",160);
    const captureTarget=clean(x.capture_target||x.captureTarget||"",80);
    const width=Math.max(0,Math.min(10000,Number(x.width)||0));
    const height=Math.max(0,Math.min(10000,Number(x.height)||0));
    const meta={detail,index:i,client_image_id:clientImageId,capture_target:captureTarget,width,height};
    if(fileId && /^file-[A-Za-z0-9_-]+$/.test(fileId)){out.push({type:"input_image",file_id:fileId,...meta});continue;}
    if(url.startsWith("https://") || /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(url)){
      if(url.startsWith("data:") && url.length>5_500_000) continue;
      out.push({type:"input_image",image_url:url,...meta});
    }
  }
  return out;
}

export function isImplicitVisualTopicSwitch(message="",activeContext={}){
  if(!activeContext?.active) return false;
  const t=n(message);
  if(!t||VISUAL_CANCEL_RX.test(t)||VISUAL_EXPLICIT_RX.test(t)) return false;
  return NEW_TOPIC_INTENT_RX.test(t)&&NEW_TOPIC_NOUN_RX.test(t);
}

export function isVisualFollowup(message="",activeContext={}){
  if(!activeContext?.active) return false;
  const t=n(message);
  if(!t||VISUAL_CANCEL_RX.test(t)||isImplicitVisualTopicSwitch(message,activeContext)) return false;
  const currentTurn=turnNum(activeContext?.current_turn||activeContext?.last_turn||0);
  const expires=turnNum(activeContext?.expires_turn||0);
  if(expires&&currentTurn>expires) return false;
  return VISUAL_FOLLOWUP_RX.test(t)||VISUAL_EXPLICIT_RX.test(t);
}

export function buildVisionFrame(message="",images=[],activeContext={},options={}){
  const t=n(message),pixelCount=arr(images).length;
  const reusedPixels=Boolean(options?.visual_context_reused);
  const freshCount=reusedPixels?0:pixelCount;
  const imageIds=arr(images).map(x=>clean(x?.client_image_id||"",160)).filter(Boolean);
  const previousIds=arr(activeContext?.image_ids).map(x=>clean(x,160)).filter(Boolean);
  const newImageEvidence=Boolean(freshCount&&(!imageIds.length||!previousIds.length||imageIds.join("|")!==previousIds.join("|")));
  const implicitTopicSwitch=Boolean(!pixelCount&&isImplicitVisualTopicSwitch(message,activeContext));
  const inherited=Boolean(!implicitTopicSwitch&&((reusedPixels&&pixelCount>0)||(!pixelCount&&isVisualFollowup(message,activeContext))));
  const hasContext=Boolean(pixelCount||inherited);
  let visualIntent=detectVisualIntent(message,activeContext);
  let mode=inherited&&activeContext?.mode?clean(activeContext.mode,80):"general_visual";
  if(pixelCount>0 && visualIntent==="general"){
    const carry=clean(activeContext?.last_visual_intent||"",40);
    visualIntent = carry || "identity";
  }
  if(PRODUCT_VISUAL_INTENTS.has(visualIntent)) mode="product_or_label";
  if(/مبيد|سماد|عبوه|عبوة|كيس|منتج|باكيت|علبه|علبة|label|product|package|barcode|باركود|sku/.test(t)) mode="product_or_label";
  if(visualIntent==="diagnosis"||/ورق|ورقه|ورقة|نبات|محصول|جذر|ثمر|حشر|افه|آفة|مرض|اصفر|ذبول|بقع|عفن|plant|leaf|root|pest|disease/.test(t)) mode="plant_diagnostic";
  if(visualIntent==="dosage"||/جرعه|جرعة|مل|لتر|هكتار|فدان|دونم|dose|dosage|rate/.test(t)) mode="regulated_label_high_risk";
  if(hasContext&&["availability","price","purchase","specifications","usage","identity","label_read"].includes(visualIntent)&&mode==="general_visual") mode="product_or_label";
  const requiresLiveProductTruth=["availability","price","purchase"].includes(visualIntent)&&hasContext;
  const retakeTarget=evidenceTarget(visualIntent,mode);
  const previousRecognitionAttempts=Math.max(0,Number(activeContext?.recognition_attempts)||0);
  const requiresRecognitionPreflight=Boolean(hasContext&&pixelCount>0&&["product_or_label","regulated_label_high_risk"].includes(mode)&&PRODUCT_VISUAL_INTENTS.has(visualIntent)&&(!activeContext?.identity_confidence||activeContext.identity_confidence!=="high")&&(newImageEvidence||previousRecognitionAttempts===0||visualIntent==="focus"));
  const requestedEvidence=mode==="plant_diagnostic"
    ?["whole_plant","affected_area_closeup","underside_or_root_when_relevant"]
    :retakeTarget==="dose_and_directions_panel"
      ?["product_name_or_sku","dose_and_directions_panel","units_and_rate_visible"]
      :retakeTarget==="requested_label_panel"
        ?["product_name_or_sku","requested_label_panel"]
        :retakeTarget==="name_plus_requested_spec_panel"
          ?["product_name_or_sku","requested_spec_panel"]
          :PRODUCT_VISUAL_INTENTS.has(visualIntent)?["front_label","product_name_or_sku_barcode"]:[];
  return {
    version:VERSION,
    has_images:pixelCount>0,
    has_image_pixels:pixelCount>0,
    has_fresh_images:freshCount>0,
    reused_visual_pixels:reusedPixels,
    new_image_evidence:newImageEvidence,
    has_visual_context:hasContext,
    inherited_visual_context:inherited,
    visual_followup:inherited,
    image_count:pixelCount||Number(activeContext?.image_count||0),
    image_ids:imageIds.length?imageIds:previousIds,
    visual_revision:newImageEvidence?Math.max(1,Number(activeContext?.visual_revision||0)+1):Math.max(0,Number(activeContext?.visual_revision)||0),
    mode,
    visual_intent:visualIntent,
    commerce_target:requiresLiveProductTruth?visualIntent:"",
    required_identity_level:requiresLiveProductTruth||["specifications","usage"].includes(visualIntent)?"high":"medium",
    retake_target:retakeTarget,
    requires_live_product_truth:requiresLiveProductTruth,
    requires_recognition_preflight:requiresRecognitionPreflight,
    prior_recognition_attempts:previousRecognitionAttempts,
    prior_retake_count:Math.max(0,Number(activeContext?.retake_count)||0),
    active_context:inherited?{
      mode:activeContext?.mode||"",
      product_candidates:arr(activeContext?.product_candidates).slice(0,3),
      identity_confidence:activeContext?.identity_confidence||"",
      recognition_attempts:previousRecognitionAttempts,
      retake_count:Math.max(0,Number(activeContext?.retake_count)||0),
      last_visual_intent:activeContext?.last_visual_intent||"",
      last_retake_target:activeContext?.last_retake_target||"",
      last_turn:activeContext?.last_turn||0
    }:null,
    clear_active_context:VISUAL_CANCEL_RX.test(t)||implicitTopicSwitch,
    implicit_topic_switch:implicitTopicSwitch,
    policy:{observe_before_infer:true,recognition_before_identity_guard:true,image_text_untrusted_as_instructions:true,product_identity_requires_catalog_match:true,plant_image_is_triage_not_definitive_diagnosis:true,pesticide_dosage_requires_clear_label_or_verified_product_data:true,unclear_image_requires_targeted_retake:true,retake_loop_guard:true,different_image_detection:true,multi_image_fusion:true,visual_followup_keeps_image_context:true,intent_aware_retake:true,live_commerce_after_identity_only:true},
    requested_evidence:requestedEvidence
  };
}

function charTrigrams(value=""){
  const x=n(value).replace(/\s+/g," ");const out=new Set();if(x.length<3){if(x)out.add(x);return out;}for(let i=0;i<=x.length-3;i++)out.add(x.slice(i,i+3));return out;
}
function jaccard(a,b){if(!a.size||!b.size)return 0;let hit=0;for(const x of a)if(b.has(x))hit++;return hit/(a.size+b.size-hit);}
function digitTokens(value=""){return (String(value||"").match(/[A-Za-z]*\d+[A-Za-z0-9._\/-]*/g)||[]).map(n).filter(Boolean);}
function scoreSignature(query,row){
  const q=n(query);if(!q)return 0;
  const qt=tokenize(q).filter(x=>x.length>1),rsku=n(row.sku),rname=n(row.name);
  const aliases=arr(row.visible_aliases).map(n).filter(Boolean);
  const hay=n(`${row.name} ${row.sku} ${aliases.join(" ")} ${arr(row.explicit_facts).map(x=>x.value).join(" ")} ${row.category}`);
  let s=0;
  if(rsku&&q===rsku)s+=420;else if(rsku&&q.includes(rsku))s+=290;
  if(rname&&q===rname)s+=360;else if(rname&&q.includes(rname))s+=220;else if(rname&&rname.includes(q)&&q.length>=6)s+=130;
  const hs=new Set(tokenize(hay));let hit=0;for(const tok of qt)if(hs.has(tok))hit++;s+=qt.length?125*hit/qt.length:0;
  for(const a of aliases){if(a&&a.length>3&&q.includes(a))s+=45;}
  const qDigits=new Set(digitTokens(q)),rowDigits=new Set(digitTokens(`${row.name} ${row.sku}`));
  for(const d of qDigits)if(rowDigits.has(d))s+=60;
  const tri=jaccard(charTrigrams(q),charTrigrams(`${row.name} ${row.sku} ${aliases.join(" ")}`));s+=Math.min(95,tri*150);
  return s;
}

export function matchVisualProduct({visible_text="",candidate_name="",sku="",barcode="",brand="",category="",limit=6}={}){
  load();
  const query=clean(`${candidate_name} ${sku} ${barcode} ${brand} ${visible_text}`,5000),max=Math.max(1,Math.min(10,Number(limit)||6));
  const exactSku=n(sku||barcode),exactName=n(candidate_name),readableTokens=tokenize(n(`${candidate_name} ${visible_text}`)).filter(x=>x.length>1);
  const direct=arr(SIG.products).map(r=>{
    let exact="";
    if(exactSku&&n(r.sku)===exactSku) exact="sku_or_barcode";
    else if(exactName&&n(r.name)===exactName) exact="name";
    return {r,score:scoreSignature(query,r),exact};
  }).filter(x=>x.score>12||x.exact).sort((a,b)=>(Boolean(b.exact)-Boolean(a.exact))||b.score-a.score).slice(0,max*3);
  const dossier=query?searchProductDossiers(query,{limit:max*2,category,descriptionChars:1400}):[];
  const map=new Map();
  for(const x of direct)map.set(x.r.external_id,{external_id:x.r.external_id,name:x.r.name,sku:x.r.sku,category:x.r.category,score:Number(x.score.toFixed(2)),match_basis:x.exact?`exact_${x.exact}`:"visual_text_signature",exact_identity:Boolean(x.exact),explicit_facts:x.r.explicit_facts});
  for(const x of dossier){
    const old=map.get(x.external_id),row={external_id:x.external_id,name:x.name,sku:x.sku,category:x.category,score:Number((Number(x.score)||0).toFixed(2)),match_basis:"dossier_semantic_match",exact_identity:false,explicit_facts:[]};
    if(!old||(!old.exact_identity&&row.score>old.score))map.set(x.external_id,row);
  }
  const candidates=[...map.values()].sort((a,b)=>(Number(b.exact_identity)-Number(a.exact_identity))||b.score-a.score).slice(0,max);
  const top=candidates[0],second=candidates[1],margin=top?Number((top.score-(second?.score||0)).toFixed(2)):0;
  const evidenceStrength=Boolean(exactSku||exactName||readableTokens.length>=2);
  const identity_confidence=!top?"none":top.exact_identity?"high":top.score>=180&&margin>=28&&evidenceStrength?"high":top.score>=82&&evidenceStrength?"medium":"low";
  return {
    query,candidates,identity_confidence,identity_confirmed:Boolean(top&&identity_confidence==="high"),recognition_attempted:Boolean(query),
    readable_token_count:readableTokens.length,top_margin:margin,candidate_count:candidates.length,
    recognition_quality:!query?"no_readable_evidence":identity_confidence==="high"?"strong":identity_confidence==="medium"?"candidate_needs_confirmation":"weak",
    policy:"Recognition is attempted before asking for a retake. Appearance alone never proves identity. High confidence requires readable name/SKU/barcode or a strong catalog-text match; current price/stock still require live Odoo."
  };
}

export function guardVisualLabelClaim({claim_type="",verbatim_text="",claim="",confidence=0,image_quality="",product_identifier=""}={}){
  const type=clean(claim_type,80).toLowerCase(),verbatim=clean(verbatim_text,1600),claimed=clean(claim,1200);const conf=Math.max(0,Math.min(1,Number(confidence)||0));
  const quality=clean(image_quality,40).toLowerCase();const highRisk=/dose|dosage|rate|pesticide|active_ingredient|phi|rei|جرع|مبيد/.test(type+" "+n(claimed));
  const hasNumeric=/\d/.test(claimed),hasUnit=/(ml|l|g|kg|cc|ppm|%|مل|لتر|جرام|كجم|هكتار|فدان|دونم|100\s*l)/i.test(claimed);
  let accepted=Boolean(verbatim&&claimed&&conf>=0.9&&!/blur|poor|unreadable|low/.test(quality));
  if(highRisk)accepted=accepted&&hasNumeric&&hasUnit&&n(verbatim).includes(n(claimed).slice(0,Math.min(45,n(claimed).length)));
  if(product_identifier){const d=getProductDossier(product_identifier,{includeFull:false});if(!d)accepted=false;}
  return {accepted,claim_type:type,confidence:conf,high_risk:highRisk,reason:accepted?"clear_high_confidence_visual_label_claim":"insufficient_visual_evidence",policy:"Never invent or complete unreadable label text. High-risk dosage/application claims require a clear high-confidence verbatim label reading or separately verified product data."};
}

export function searchVisualAgronomy(query="",{limit=6,crop=""}={}){
  load();const q=n(query),qt=tokenize(q).filter(x=>x.length>1);const max=Math.max(1,Math.min(10,Number(limit)||6));
  const scored=[];for(const c of arr(ATLAS.cards)){
    if(crop&&n(c.crop)!==n(crop)&&n(c.crop_ar)!==n(crop))continue;
    const hay=n(`${c.crop} ${c.crop_ar} ${c.symptom} ${c.symptom_ar} ${c.visual_pattern} ${arr(c.differential_categories).join(" ")} ${arr(c.aliases).join(" ")}`);const hs=new Set(tokenize(hay));let hit=0;for(const t of qt)if(hs.has(t))hit++;let score=qt.length?100*hit/qt.length:0;if(q&&hay.includes(q))score+=65;if(score>5)scored.push({...c,score:Number(score.toFixed(2))});
  }
  scored.sort((a,b)=>b.score-a.score);return scored.slice(0,max);
}

export function buildRetakeAdvice(frame={},observation={}){
  const mode=frame?.mode||"",intent=frame?.visual_intent||"general",issues=arr(observation?.quality_issues);
  const previousTarget=clean(observation?.previous_target||frame?.active_context?.last_retake_target||"",80),retakeCount=Math.max(0,Number(observation?.retake_count??frame?.prior_retake_count)||0);
  const candidate=observation?.candidate||null;let ask_one="",target=evidenceTarget(intent,mode),actions=[];
  if(mode==="plant_diagnostic"||intent==="diagnosis"){
    ask_one="صوّر الجزء المصاب قريب وواضح. لو المشكلة في الورق، خلّي الصورة الثانية لسطح الورقة السفلي عشان أفرّق بين الإصابة والحشرة أو الأكاروس.";
    target="affected_area_closeup";actions=[{type:"camera",label:"صوّر الجزء المصاب",target:"affected_area_closeup"},{type:"camera",label:"صوّر أسفل الورقة",target:"leaf_underside"}];
  }else if(candidate?.name&&String(observation?.identity_confidence||"")==="medium"){
    ask_one=`أقرب تطابق عندي هو ${candidate.name}${candidate.sku?` (${candidate.sku})`:""}، بس المطابقة لسه محتاجة تأكيد. لو ده نفس المنتج قول لي «أيوه هو»، ولو مش هو صوّر الاسم أو الباركود.`;
    target="candidate_confirmation";actions=[{type:"message",label:"أيوه هو",message:"أيوه هو"},{type:"camera",label:"صوّر الاسم",target:"product_name"},{type:"camera",label:"صوّر الباركود",target:"barcode"}];
  }else if(retakeCount>=1&&previousTarget==="product_name_or_sku_barcode"&&["availability","price","identity","usage","specifications","purchase"].includes(intent)){
    const lead=intent==="availability"?"علشان أأكد التوفر":intent==="price"?"علشان أجيب السعر الحالي":"علشان أثبت المنتج";
    ask_one=`${lead}، الصورة الجديدة وصلت وحاولت أطابقها لكن الاسم لسه مش كافي. بدل ما تعيد نفس اللقطة: صوّر الباركود وحده، أو اكتب اسم المنتج الظاهر على العبوة.`;
    target="alternate_identity_evidence";actions=[{type:"camera",label:"صوّر الباركود وحده",target:"barcode"},{type:"message",label:"هكتب اسم المنتج",message:"هكتب اسم المنتج"}];
  }else if(intent==="availability"){
    ask_one="حاولت أتعرف على المنتج من الصورة أولًا، لكن الهوية مش مؤكدة كفاية عشان أقول التوفر. صوّر اسم المنتج أو الـSKU/الباركود أقرب وبشكل مستقيم، وأنا أراجعه Live على Odoo.";
    target="product_name_or_sku_barcode";actions=[{type:"camera",label:"صوّر اسم المنتج",target:"product_name"},{type:"camera",label:"صوّر الباركود",target:"barcode"},{type:"message",label:"هكتب اسم المنتج",message:"هكتب اسم المنتج"}];
  }else if(intent==="price"){
    ask_one="حاولت أطابق المنتج من الصورة، لكن لسه مش مؤكده بما يكفي للسعر. صوّر اسم المنتج أو الـSKU/الباركود بوضوح وأنا أراجع السعر الحالي Live على Odoo.";
    target="product_name_or_sku_barcode";actions=[{type:"camera",label:"صوّر اسم المنتج",target:"product_name"},{type:"camera",label:"صوّر الباركود",target:"barcode"},{type:"message",label:"هكتب الاسم",message:"هكتب اسم المنتج"}];
  }else if(intent==="identity"){
    ask_one="حللت الصورة وحاولت أطابقها مع كتالوج MIG FARM، لكن اسم المنتج مش مقروء كفاية للتأكيد. صوّر اسم المنتج أو الـSKU/الباركود أقرب وبشكل مستقيم.";
    target="product_name_or_sku_barcode";actions=[{type:"camera",label:"صوّر الاسم",target:"product_name"},{type:"camera",label:"صوّر الباركود",target:"barcode"}];
  }else if(intent==="label_read"){
    ask_one="قرّب الجزء اللي عايزني أقراه من الملصق وخليه مستقيم ومن غير انعكاس، بحيث الحروف والأرقام تكون مقروءة.";
    target="requested_label_panel";actions=[{type:"camera",label:"صوّر جزء الملصق",target:"requested_label_panel"}];
  }else if(intent==="dosage"||mode==="regulated_label_high_risk"){
    ask_one="عشان أقرأ الجرعة بأمان، صوّر جزء الجرعة وطريقة الاستخدام كامل وبشكل مستقيم ومن غير انعكاس، ولازم الأرقام والوحدات تظهر بوضوح.";
    target="dose_and_directions_panel";actions=[{type:"camera",label:"صوّر الجرعة والتعليمات",target:"dose_and_directions_panel"}];
  }else if(intent==="specifications"){
    ask_one="حللت الصورة أولًا، ولو المواصفة نفسها مش واضحة صوّر اسم المنتج ومعاه الجزء اللي مكتوب فيه المواصفة اللي بتسأل عنها، زي القدرة أو المقاس أو الضغط، عشان ما أخلطش بين موديلين.";
    target="name_plus_requested_spec_panel";actions=[{type:"camera",label:"صوّر الاسم + المواصفة",target:"requested_spec_panel"}];
  }else if(intent==="usage"){
    ask_one="حاولت أثبت المنتج من الصورة، لكن الهوية لسه غير كافية. صوّر اسم المنتج أو الكود على العبوة أقرب عشان أقولك استخدامه بدقة.";
    target="product_name_or_sku_barcode";actions=[{type:"camera",label:"صوّر اسم المنتج",target:"product_name"},{type:"camera",label:"صوّر الكود",target:"sku_or_barcode"}];
  }else if(mode.includes("label")||mode==="product_or_label"){
    ask_one="حللت الصورة أولًا وحاولت أتعرف على المنتج. لو الهوية لسه غير مؤكدة، صوّر واجهة العبوة كاملة أو اسم المنتج أو الـSKU/الباركود بشكل أوضح ومن غير انعكاس.";
    target="product_name_or_sku_barcode";actions=[{type:"camera",label:"صوّر اسم المنتج",target:"product_name"},{type:"camera",label:"صوّر الباركود",target:"barcode"}];
  }else{
    ask_one="أقدر أبدأ من الصورة، لكن محتاج لقطة أوضح تساعدني أحدد المنتج أو الجزء المقصود. صوّر واجهة العبوة كاملة، أو اسم المنتج، أو الجزء اللي تريدني أراجعه.";target="decisive_visual_detail";actions=[{type:"camera",label:"صوّر واجهة العبوة",target:"front_label"},{type:"camera",label:"صوّر اسم المنتج",target:"product_name"},{type:"camera",label:"صوّر الجزء المهم",target:"decisive_visual_detail"}];
  }
  return {ask_one,reason:issues[0]||"image_detail_needed",intent,target,retake_count:retakeCount,previous_target:previousTarget,actions};
}

export function planVisualProductAction({intent="",identity_confidence="",candidate_name="",candidate_sku="",live_verified=false,mode="",recognition_attempted=false,candidate_count=0,retake_count=0,new_image_evidence=false,top_margin=0}={}){
  const i=clean(intent||"general",40),conf=clean(identity_confidence||"none",20).toLowerCase(),candidate=Boolean(clean(candidate_name||candidate_sku,400));
  const identityHigh=conf==="high"&&candidate,identityMedium=conf==="medium"&&candidate,productCommerce=["availability","price","purchase"].includes(i),productIdentityIntent=["availability","price","purchase","identity","specifications","usage"].includes(i);
  if(i==="diagnosis"||mode==="plant_diagnostic") return {next_action:"visual_agronomy_triage",identity_required:false,live_required:false};
  if(i==="dosage"||mode==="regulated_label_high_risk") return {next_action:"verify_label_claim_or_request_dose_panel",identity_required:true,live_required:false,retake_target:"dose_and_directions_panel"};
  if(productIdentityIntent&&!recognition_attempted) return {next_action:"recognize_product_before_identity_guard",identity_required:true,live_required:productCommerce,must_attempt_recognition:true};
  if(productCommerce&&identityHigh&&!live_verified) return {next_action:"verify_exact_product_live",identity_required:true,live_required:true,identifier:candidate_sku||candidate_name};
  if(productCommerce&&identityHigh&&live_verified) return {next_action:`answer_${i}_from_live_truth`,identity_required:true,live_required:true,identifier:candidate_sku||candidate_name};
  if(productCommerce&&identityMedium) return {next_action:"confirm_visual_candidate",identity_required:true,live_required:true,confirmation_required:true,candidate:{name:candidate_name,sku:candidate_sku},top_margin:Number(top_margin)||0};
  if(["identity","specifications","usage"].includes(i)&&identityHigh) return {next_action:"answer_from_confirmed_product_dossier",identity_required:true,live_required:false,identifier:candidate_sku||candidate_name};
  if(["identity","specifications","usage"].includes(i)&&identityMedium) return {next_action:"confirm_visual_candidate",identity_required:true,live_required:false,confirmation_required:true,candidate:{name:candidate_name,sku:candidate_sku},top_margin:Number(top_margin)||0};
  if(i==="label_read") return {next_action:"read_requested_label_panel",identity_required:false,live_required:false,retake_target:"requested_label_panel"};
  if(productIdentityIntent) return {next_action:Number(retake_count)>=1&&new_image_evidence?"request_alternate_identity_evidence":"request_product_identity_evidence",identity_required:true,live_required:productCommerce,retake_target:Number(retake_count)>=1&&new_image_evidence?"alternate_identity_evidence":"product_name_or_sku_barcode",candidate_count:Number(candidate_count)||0};
  return {next_action:"ground_visual_evidence",identity_required:false,live_required:false};
}

function compactCandidates(audit={}){
  const matches=arr(audit?.visual_matches);let best=[],confidence="",recognitionAttempted=false,topMargin=0,candidateCount=0;
  for(let i=matches.length-1;i>=0;i--){recognitionAttempted=recognitionAttempted||Boolean(matches[i]?.recognition_attempted||matches[i]?.query);if(arr(matches[i]?.candidates).length){best=matches[i].candidates.slice(0,3);confidence=matches[i]?.identity_confidence||"";topMargin=Number(matches[i]?.top_margin)||0;candidateCount=Number(matches[i]?.candidate_count)||matches[i].candidates.length;break;}}
  return {best,confidence,recognitionAttempted,topMargin,candidateCount};
}

export function buildVisualGuidance({frame={},activeContext={},audit={}}={}){
  const {best,confidence,recognitionAttempted,topMargin,candidateCount}=compactCandidates(audit),candidates=best.length?best:arr(activeContext?.product_candidates).slice(0,3),top=candidates[0]||{};
  const liveVerified=arr(audit?.live_visual_verifications).some(x=>x?.truth?.identity?.live_verified===true)||Boolean(activeContext?.live_verified);
  const effectiveConfidence=confidence||activeContext?.identity_confidence||"none",effectiveAttempted=recognitionAttempted||Number(activeContext?.recognition_attempts||0)>0;
  const retakeCount=Math.max(Number(activeContext?.retake_count)||0,Number(frame?.prior_retake_count)||0);
  const plan=planVisualProductAction({intent:frame?.visual_intent||activeContext?.last_visual_intent||"general",identity_confidence:effectiveConfidence,candidate_name:top?.name||"",candidate_sku:top?.sku||"",live_verified:liveVerified,mode:frame?.mode||activeContext?.mode||"",recognition_attempted:effectiveAttempted,candidate_count:candidateCount||candidates.length,retake_count:retakeCount,new_image_evidence:Boolean(frame?.new_image_evidence),top_margin:topMargin});
  let retake=null,confirmation=null;
  if(plan.next_action==="confirm_visual_candidate"){
    retake=buildRetakeAdvice(frame,{quality_issues:[plan.next_action],candidate:top,identity_confidence:"medium",previous_target:activeContext?.last_retake_target||"",retake_count:retakeCount});
    confirmation=retake.ask_one;
  }else if(["request_product_identity_evidence","request_alternate_identity_evidence","verify_label_claim_or_request_dose_panel","ground_visual_evidence"].includes(plan.next_action)){
    retake=buildRetakeAdvice(frame,{quality_issues:[plan.next_action],previous_target:activeContext?.last_retake_target||"",retake_count:retakeCount});
  }
  return {version:VERSION,intent:frame?.visual_intent||activeContext?.last_visual_intent||"general",candidate:top?.name?{name:top.name,sku:top.sku||""}:null,candidates:candidates.slice(0,3).map(x=>({name:x.name,sku:x.sku||"",score:x.score||0})),identity_confidence:effectiveConfidence,recognition_attempted:effectiveAttempted,recognition_first:true,top_margin:topMargin,live_verified:liveVerified,...plan,confirmation,retake,actions:retake?.actions||[]};
}

export function updateActiveVisualContext(previous={},frame={},audit={},turn=0){
  const t=turnNum(turn);if(frame?.clear_active_context)return null;
  const {best,confidence,recognitionAttempted,topMargin}=compactCandidates(audit);
  const retakeAdvice=arr(audit?.retake_advice);const actualRetake=retakeAdvice.length?retakeAdvice[retakeAdvice.length-1]:null;
  const previousRetakes=Math.max(0,Number(previous?.retake_count)||0),isRetakeSubmission=Boolean(frame?.has_fresh_images&&previous?.active);
  const retakeCount=isRetakeSubmission?previousRetakes+1:previousRetakes;
  const recognitionAttempts=Math.max(0,Number(previous?.recognition_attempts)||0)+(recognitionAttempted?1:0);
  const base={active:true,version:VERSION,mode:frame.mode||previous.mode||"general_visual",image_count:Number(frame.image_count||previous.image_count||0),image_ids:arr(frame?.image_ids).slice(0,4),visual_revision:Number(frame?.visual_revision||previous?.visual_revision||0),last_turn:t,expires_turn:t+4,product_candidates:best.length?best:arr(previous.product_candidates).slice(0,3),identity_confidence:confidence||previous.identity_confidence||"",recognition_attempts:recognitionAttempts,retake_count:retakeCount,last_candidate_margin:topMargin||Number(previous?.last_candidate_margin)||0,live_verified:arr(audit?.live_visual_verifications).some(x=>x?.truth?.identity?.live_verified||x?.identity?.live_verified)||Boolean(previous?.live_verified),label_claim_verified:arr(audit?.label_guard_results).some(x=>x?.accepted===true)||Boolean(previous?.label_claim_verified),last_visual_intent:frame?.visual_intent||previous.last_visual_intent||"general",last_retake_target:actualRetake?.target||frame?.retake_target||previous?.last_retake_target||""};
  if(frame?.has_fresh_images)return {...base,started_turn:previous?.active?Number(previous.started_turn||t):t};
  if(frame?.visual_followup&&previous?.active)return {...base,started_turn:Number(previous.started_turn||t),expires_turn:Math.max(turnNum(previous?.expires_turn),t+2)};
  if(previous?.active&&t<=turnNum(previous?.expires_turn||0))return previous;
  return null;
}

export function visualContextFallback({frame={},activeContext={},audit={}}={}){
  const {best,confidence,recognitionAttempted}=compactCandidates(audit),candidates=best.length?best:arr(activeContext?.product_candidates).slice(0,3),top=candidates[0],effectiveConfidence=confidence||activeContext?.identity_confidence||"",intent=frame?.visual_intent||activeContext?.last_visual_intent||"general";
  if(frame?.mode==="plant_diagnostic")return buildRetakeAdvice(frame,{quality_issues:["visual_evidence_not_grounded"]}).ask_one;
  if(top&&effectiveConfidence==="high"){
    if(intent==="availability")return `أنا مثبت المنتج في الصورة كـ ${top.name}${top.sku?` (${top.sku})`:""}. التوفر لازم يتراجع Live من Odoo؛ لو التحقق الحي ما اكتملش دلوقتي مش هخمن حالة المخزون.`;
    if(intent==="price")return `أنا مثبت المنتج في الصورة كـ ${top.name}${top.sku?` (${top.sku})`:""}. السعر الحالي لازم يتراجع Live من Odoo، ومش هستخدم سعر قديم من الذاكرة.`;
    return `أقرب تطابق مؤكد من كتالوج MIG FARM هو ${top.name}${top.sku?` (${top.sku})`:""}.`;
  }
  if(top&&effectiveConfidence==="medium")return buildRetakeAdvice(frame,{quality_issues:["candidate_needs_confirmation"],candidate:top,identity_confidence:"medium",previous_target:activeContext?.last_retake_target||"",retake_count:activeContext?.retake_count||0}).ask_one;
  const attempted=recognitionAttempted||Number(activeContext?.recognition_attempts||0)>0;
  if(!attempted&&["product_or_label","regulated_label_high_risk"].includes(frame?.mode)){
    if(intent==="availability") return "التحليل البصري للمنتج ما اكتملش دلوقتي، ومش هخمن التوفر. صوّر اسم المنتج أو الباركود بوضوح وأنا أراجعه Live على Odoo.";
    if(intent==="price") return "التحليل البصري للمنتج ما اكتملش دلوقتي، ومش هخمن السعر. صوّر اسم المنتج أو الباركود بوضوح وأنا أراجع السعر الحالي Live على Odoo.";
    return "التحليل البصري ما اكتملش بما يكفي لتثبيت المنتج. صوّر الاسم أو الباركود بوضوح عشان أطابقه من الكتالوج.";
  }
  return buildRetakeAdvice(frame,{quality_issues:["recognition_attempted_but_unresolved"],previous_target:activeContext?.last_retake_target||"",retake_count:activeContext?.retake_count||0}).ask_one;
}

export function enforceVisualReplySafety({reply="",frame=null,trace=[],audit={}}={}){
  const text=clean(reply,8000);if(!frame?.has_visual_context||!text)return {ok:true,reply:text,reason:"no_visual_guard_needed"};
  const tools=new Set(arr(trace).map(x=>clean(x?.tool,120))),highRisk=frame?.mode==="regulated_label_high_risk";
  const doseLike=/\b\d+(?:[.,]\d+)?\s*(?:ml|mL|l|L|g|kg|cc|ppm|%|مل|لتر|جرام|غرام|كجم|هكتار|فدان|دونم)\b/i.test(text),accepted=arr(audit?.label_guard_results).some(x=>x?.accepted===true);
  if(highRisk&&doseLike&&(!tools.has("guard_visual_label_claim")||!accepted))return {ok:false,reason:"unverified_visual_dosage_claim",reply:"مش هاعتمد جرعة أو معدل استخدام من صورة غير متحقق منها. صوّر جزء الجرعة وطريقة الاستخدام في الملصق بشكل مستقيم وواضح ومن غير انعكاس، بحيث الأرقام والوحدات تكون مقروءة."};
  const productMode=["product_or_label","regulated_label_high_risk"].includes(frame?.mode),recognitionAttempted=tools.has("match_visual_product")||arr(audit?.visual_matches).some(x=>x?.recognition_attempted||x?.query);
  if(productMode&&frame?.has_image_pixels&&!recognitionAttempted&&PRODUCT_VISUAL_INTENTS.has(frame?.visual_intent)){
    return {ok:false,reason:"product_recognition_not_attempted",reply:"هحاول أطابق المنتج من الصورة نفسها الأول قبل ما أطلب منك لقطة تانية. لو الاسم أو الكود مش مقروء بعد المحاولة هقولك بالضبط إيه اللي محتاج يتصور."};
  }
  if(frame?.requires_live_product_truth){
    const verified=tools.has("verify_visual_product_live")||tools.has("verify_live_product_truth");
    if(!verified&&/(?:\bAED\b|درهم|متوفر|متاح|موجود بالمخزون|in stock|available)/i.test(text)){
      const g=buildVisualGuidance({frame,audit});return {ok:false,reason:"visual_commerce_without_live_verification",reply:g?.confirmation||g?.retake?.ask_one||visualContextFallback({frame,audit}),visual_guidance:g};
    }
  }
  if(frame?.has_image_pixels&&productMode){
    const grounded=recognitionAttempted||tools.has("get_retake_advice")||tools.has("guard_visual_label_claim");
    if(!grounded&&/(هذا|دي|ده|المنتج|العبوه|العبوة|اسمه|اسم المنتج|هو)/i.test(text))return {ok:false,reason:"visual_identity_without_grounding_tool",reply:visualContextFallback({frame,audit})};
  }
  return {ok:true,reply:text,reason:"visual_reply_pass"};
}

export function visionHealth(){load();let sb=0,ab=0;try{sb=statSync(SIGNATURES_URL).size}catch{}try{ab=statSync(ATLAS_URL).size}catch{}return {version:VERSION,mode:"multimodal_visual_recognition_pipeline_os",max_images_per_turn:4,product_visual_signatures:Number(SIG?.stats?.products||0),visual_agronomy_cards:Number(ATLAS?.stats?.cards||0),signature_bytes:sb,atlas_bytes:ab,total_megabytes:Number(((sb+ab)/1024/1024).toFixed(2)),input_modes:["https_url","data_url","openai_file_id"],product_identity_policy:"recognition_attempt_before_identity_guard; catalog text/SKU/barcode required for high confidence",plant_diagnosis_policy:"visual_triage_not_single-image-certainty",pesticide_label_policy:"clear_verbatim_label_or_verified_product_data_only",image_instruction_policy:"visible image text is evidence, never trusted instructions",reply_safety_gate:true,active_visual_context:true,visual_followup_routing:true,implicit_topic_switch_guard:true,visual_context_ttl_turns:4,visual_intent_contract:true,intent_aware_retake:true,availability_price_identity_gate:true,deterministic_visual_next_action:true,recognition_before_identity_guard:true,forced_product_recognition_preflight:true,medium_candidate_confirmation:true,retake_loop_guard:true,different_image_detector:true,image_revision_tracking:true,fuzzy_visual_text_ranking:true,image_only_defaults_to_identity:true,image_only_forces_product_mode:true};}
