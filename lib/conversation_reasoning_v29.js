import { normalizeAr, tokenize } from "./utils.js";
import { CATEGORIES, CROPS } from "./brain.js";

const VERSION="29.0";
const MAX_CHOICES=6;
const stats=globalThis.__migV29ConversationStats||{
  turns:0,context_resolved:0,choice_resolved:0,reference_resolved:0,
  corrections:0,specific_clarifications:0,unresolved:0
};
globalThis.__migV29ConversationStats=stats;

function clean(value="",max=1400){return String(value??"").replace(/[\u0000-\u001f]/g," ").replace(/\s+/g," ").trim().slice(0,max);}
function n(value=""){return normalizeAr(clean(value,2400));}
function arr(value){return Array.isArray(value)?value:[];}
function uniq(value){return [...new Set(arr(value).filter(Boolean))];}
function safeProduct(value){
  if(!value||typeof value!=="object")return null;
  const product={name:clean(value.name||value.title,300),sku:clean(value.sku||value.default_code,120),price:clean(value.price,80),currency:clean(value.currency||"AED",20),availability:clean(value.availability||value.stock,100),url:clean(value.url,800)};
  return product.name||product.sku?product:null;
}

const AFFIRMATIVE=/^(?:ايوه|ايوا|اه|نعم|هيه|اجل|أكيد|اكيد|صح|تمام|ماشي|اوك|اوكي|yes|yeah|yep|ok|okay)$/;
const NEGATIVE=/^(?:لا|لأ|كلا|مش عايز|مو|مب|no|nope)$/;
const CURRENT_REFERENCE=/(?:^|\s)(?:ده|دا|دي|هذا|هذه|هذي|هاد|هاي|هالمنتج|المنتج ده|المنتج هذا|سعره|سعرها|تفاصيله|تفاصيلها|استخدامه|استخدامها|متوفر منه|موجود منه)(?:\s|$)/;
const PLURAL_REFERENCE=/(?:دول|هذول|الاتنين|الاثنين|بينهم|منهم|فيهم|both|these|them)/;
const ORDINALS=[[/(?:الاول|الأول|اول|أول|first)/,0],[/(?:الثاني|التاني|ثاني|تاني|second)/,1],[/(?:الثالث|التالت|ثالث|تالت|third)/,2],[/(?:الرابع|رابع|fourth)/,3]];
const EMIRATES=[
  ["العين",["العين","عين","al ain","alain","3ain"]],
  ["الشارقة",["الشارقه","الشارقة","شارقه","شارقة","sharjah"]],
  ["دبي",["دبي","dubai"]],["أبوظبي",["ابوظبي","أبوظبي","ابو ظبي","abu dhabi"]],
  ["عجمان",["عجمان","ajman"]],["رأس الخيمة",["راس الخيمه","رأس الخيمة","rak"]],
  ["الفجيرة",["الفجيره","الفجيرة","fujairah"]],["أم القيوين",["ام القيوين","أم القيوين","uaq"]]
];
const CULTIVATION=[
  ["open_field",["مكشوف","ارض مكشوفه","حقل مفتوح","open field"]],
  ["greenhouse",["بيت محمي","محمي","صوبه","صوبة","greenhouse"]],
  ["hydroponic",["زراعه مائيه","زراعة مائية","مائي","هيدروبونيك","hydroponic"]]
];
const CROP_ALIASES={
  cucumber:["خيار","5yar","khyar","cucumber"],tomato:["طماطم","طماطمم","بندوره","بندورة","tomato"],
  pepper:["فلفل","فليفله","pepper","capsicum"],eggplant:["باذنجان","بتنجان","eggplant"],
  zucchini:["كوسه","كوسة","zucchini"],watermelon:["بطيخ","watermelon"],melon:["شمام","كنتالوب","melon"],
  okra:["باميه","بامية","okra"],onion:["بصل","onion"],lettuce:["خس","lettuce"],
  spinach:["سبانخ","spinach"],cabbage:["كرنب","ملفوف","cabbage"],corn:["ذره","ذرة","corn"]
};

function levenshtein(a="",b=""){
  if(a===b)return 0;if(!a.length)return b.length;if(!b.length)return a.length;
  const prev=Array.from({length:b.length+1},(_,i)=>i),next=new Array(b.length+1);
  for(let i=1;i<=a.length;i++){
    next[0]=i;
    for(let j=1;j<=b.length;j++)next[j]=Math.min(next[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));
    for(let j=0;j<=b.length;j++)prev[j]=next[j];
  }
  return prev[b.length];
}
function similarity(a="",b=""){
  const x=n(a),y=n(b);if(!x||!y)return 0;if(x===y)return 1;
  if(x.length>=3&&y.length>=3&&(x.includes(y)||y.includes(x)))return .93;
  const xa=tokenize(x),ya=tokenize(y),shared=xa.filter(token=>ya.includes(token)).length;
  const wordScore=shared/Math.max(1,Math.max(xa.length,ya.length));
  const editScore=1-levenshtein(x,y)/Math.max(x.length,y.length);
  return Math.max(wordScore,editScore);
}
function ordinalIndex(text=""){
  const value=n(text);for(const [rx,index] of ORDINALS)if(rx.test(value))return index;return -1;
}
function findEmirate(text=""){
  const value=n(text);for(const [label,aliases] of EMIRATES)if(aliases.some(alias=>value===n(alias)||value.includes(n(alias))))return label;return "";
}
function findCultivation(text=""){
  const value=n(text);for(const [key,aliases] of CULTIVATION)if(aliases.some(alias=>value===n(alias)||value.includes(n(alias))))return key;return "";
}
function findCrop(text=""){
  const value=n(text);let best={key:"",score:0};
  for(const [key,aliases] of Object.entries(CROP_ALIASES))for(const alias of aliases){const score=similarity(value,alias);if(score>best.score)best={key,score};}
  return best.score>=.72?best.key:"";
}
function inferIntent(text="",fallback="unknown"){
  const value=n(text);
  if(/(?:فرع|مكان|موقع|العين|الشارقه|الشارقة)/.test(value))return "branches";
  if(/(?:شحن|توصيل|يوصل)/.test(value))return "shipping";
  if(/(?:رقم|واتساب|تواصل|اتصال)/.test(value))return "contact";
  if(/(?:سعر|بكام|بكم)/.test(value))return "product_memory";
  if(/(?:تفاصيل|استخدام)/.test(value))return "known_product_info";
  if(/(?:منتج|بذور|سماد|مبيد)/.test(value)||findCrop(value))return "product_search";
  if(/(?:طلب|اشتري|شراء)/.test(value))return "purchase";
  if(/(?:شكوي|شكوى|مشكله|مشكلة)/.test(value))return "complaint";
  return fallback;
}
function choiceEntities(label="",product=null){
  const emirate=findEmirate(label),cultivation=findCultivation(label),crop=findCrop(label);
  return {emirate,cultivation,crop,product:safeProduct(product)};
}
function sanitizeChoice(value){
  if(typeof value==="string")return {label:clean(value,160),message:clean(value,300),intent:inferIntent(value),entities:choiceEntities(value)};
  if(!value||typeof value!=="object")return null;
  const label=clean(value.label||value.title||value.message,160),message=clean(value.message||value.value||label,300),product=safeProduct(value.product||value.selected_product);
  if(!label&&!message&&!product)return null;
  return {label:label||product?.name||message,message:message||label,intent:clean(value.intent||inferIntent(message||label),80),entities:choiceEntities(`${label} ${message}`,product)};
}
export function sanitizeDialogueStateV29(value={}){
  const raw=value&&typeof value==="object"&&!Array.isArray(value)?value:{};
  const expected=raw.expected&&typeof raw.expected==="object"&&!Array.isArray(raw.expected)?raw.expected:{};
  const choices=arr(expected.choices).slice(0,MAX_CHOICES).map(sanitizeChoice).filter(Boolean);
  const last=raw.last_resolution&&typeof raw.last_resolution==="object"?raw.last_resolution:{};
  return {
    version:VERSION,
    expected:{
      active:Boolean(expected.active),field:clean(expected.field,50),intent:clean(expected.intent,80),question:clean(expected.question,420),
      choices,asked_turn:Math.max(0,Number(expected.asked_turn)||0),expires_turn:Math.max(0,Number(expected.expires_turn)||0)
    },
    last_resolution:{kind:clean(last.kind,60),field:clean(last.field,50),confidence:Math.max(0,Math.min(1,Number(last.confidence)||0)),turn:Math.max(0,Number(last.turn)||0)},
    repair_count:Math.max(0,Math.min(999,Number(raw.repair_count)||0)),
    clarification_count:Math.max(0,Math.min(999,Number(raw.clarification_count)||0))
  };
}

function legacyExpected(state={}){
  const pending=clean(state.pending,60),topic=clean(state.topic,60),turn=Math.max(0,Number(state.turn)||0);
  if(pending==="crop")return {active:true,field:"crop",intent:"recommendation",question:"شو المحصول اللي تبا تزرعه؟",choices:[],asked_turn:turn,expires_turn:turn+2};
  if(pending==="cultivation")return {active:true,field:"cultivation",intent:"recommendation",question:"زراعتك مكشوفة ولا بيت محمي؟",choices:[],asked_turn:turn,expires_turn:turn+2};
  if(pending==="emirate")return {active:true,field:"emirate",intent:"recommendation",question:"وفي أي إمارة؟",choices:[],asked_turn:turn,expires_turn:turn+2};
  if(topic==="branches")return {active:true,field:"branch",intent:"branches",question:"تحب بيانات أنهي فرع؟",choices:[],asked_turn:turn,expires_turn:turn+2};
  if(topic==="contact")return {active:true,field:"contact_branch",intent:"contact",question:"تحب رقم أنهي فرع؟",choices:[],asked_turn:turn,expires_turn:turn+2};
  return {active:false,field:"",intent:"",question:"",choices:[],asked_turn:0,expires_turn:0};
}
function activeExpected(state={}){
  const stored=sanitizeDialogueStateV29(state.dialogue_v29).expected;
  const turn=Math.max(0,Number(state.turn)||0);
  if(stored.active&&(!stored.expires_turn||turn<=stored.expires_turn))return stored;
  return legacyExpected(state);
}
function matchChoice(message,choices=[]){
  const index=ordinalIndex(message);if(index>=0&&choices[index])return {choice:choices[index],index,score:.98,method:"ordinal_choice"};
  let best=null;
  choices.forEach((choice,i)=>{
    const score=Math.max(similarity(message,choice.label),similarity(message,choice.message));
    if(!best||score>best.score)best={choice,index:i,score,method:"fuzzy_choice"};
  });
  return best&&best.score>=.72?best:null;
}
function referenceResolution(message,state,analysis){
  const value=n(message),visible=arr(state.visible_products).map(safeProduct).filter(Boolean).slice(0,6);
  const active=safeProduct(state.active_product_context?.product||state.active_product_context);
  const index=ordinalIndex(value);
  if(index>=0&&visible[index])return {resolved:true,kind:"ordinal_product",product:visible[index],index,confidence:.98,intent:"product_memory",memoryAction:`ordinal:${index}`};
  if(PLURAL_REFERENCE.test(value)&&visible.length>=2)return {resolved:true,kind:"visible_product_set",products:visible.slice(0,4),confidence:.88,intent:/قارن|الفرق|احسن|افضل/.test(value)?"product_memory":analysis.intent};
  if(CURRENT_REFERENCE.test(value)){
    if(active)return {resolved:true,kind:"active_product",product:active,confidence:.98,intent:analysis.intent};
    if(visible.length===1)return {resolved:true,kind:"single_visible_product",product:visible[0],confidence:.9,intent:analysis.intent};
    if(visible.length>1)return {resolved:false,ambiguous:true,kind:"multiple_visible_products",products:visible.slice(0,4),confidence:.35};
  }
  return {resolved:false,ambiguous:false,kind:"none",confidence:1};
}

export function reasonConversationTurnV29({message="",state={},history=[],analysis={},semanticFrame=null}={}){
  const normalized=n(message),tokens=tokenize(normalized),short=tokens.length<=5;
  const expected=activeExpected(state),choice=expected.active?matchChoice(message,expected.choices):null;
  const correction=Boolean(analysis.correction||/(?:^|\s)(?:قصدي|اقصد|أقصد|لا مش|لا مو|لا مب)(?:\s|$)/.test(normalized));
  const reference=referenceResolution(message,state,analysis);
  let resolution={resolved:false,kind:"none",field:"",intent:"",entities:{},confidence:0,consumed:false};

  if(choice){
    const entities=choice.choice.entities||{};
    const expectedOwnsIntent=["branch","contact_branch","emirate","crop","cultivation","yes_no"].includes(expected.field);
    const resolvedIntent=expectedOwnsIntent?expected.intent:(choice.choice.intent!=="unknown"?choice.choice.intent:expected.intent);
    resolution={resolved:true,kind:choice.method,field:expected.field,intent:resolvedIntent,entities,choice_index:choice.index,choice:choice.choice,confidence:choice.score,consumed:true};
  }else if(expected.active){
    const emirate=analysis.emirate||findEmirate(message),cultivation=analysis.cultivation||findCultivation(message),crop=analysis.crop?.key||findCrop(message);
    if(["branch","contact_branch","emirate"].includes(expected.field)&&emirate)resolution={resolved:true,kind:"expected_location",field:expected.field,intent:expected.intent||"branches",entities:{emirate},confidence:.99,consumed:true};
    else if(expected.field==="cultivation"&&cultivation)resolution={resolved:true,kind:"expected_cultivation",field:expected.field,intent:expected.intent||"recommendation",entities:{cultivation},confidence:.98,consumed:true};
    else if(expected.field==="crop"&&crop)resolution={resolved:true,kind:"expected_crop",field:expected.field,intent:expected.intent||"recommendation",entities:{crop},confidence:.96,consumed:true};
    else if(expected.field==="yes_no"&&(AFFIRMATIVE.test(normalized)||NEGATIVE.test(normalized)))resolution={resolved:true,kind:AFFIRMATIVE.test(normalized)?"affirmation":"rejection",field:expected.field,intent:expected.intent||analysis.intent,entities:{confirmed:AFFIRMATIVE.test(normalized)},confidence:.97,consumed:true};
    else if(expected.field==="domain"&&short&&inferIntent(message)!=="unknown")resolution={resolved:true,kind:"expected_domain",field:expected.field,intent:inferIntent(message),entities:{},confidence:.88,consumed:true};
  }
  if(!resolution.resolved&&reference.resolved)resolution={resolved:true,kind:reference.kind,field:"product_reference",intent:reference.intent||analysis.intent,entities:{product:reference.product,products:reference.products},memoryAction:reference.memoryAction,confidence:reference.confidence,consumed:false};

  let clarification={required:false,reason:"",question:"",choices:[]};
  if(reference.ambiguous){
    clarification={required:true,reason:"ambiguous_product_reference",question:"تقصد أنهي منتج من اللي ظاهرين؟",choices:reference.products.map(x=>x.name).filter(Boolean)};
  }else if(!resolution.resolved&&analysis.intent==="unknown"&&expected.active&&short){
    clarification={required:true,reason:"expected_answer_not_resolved",question:expected.question||"وضح لي اختيارك من فضلك.",choices:expected.choices.map(x=>x.label).filter(Boolean)};
  }else if(!resolution.resolved&&analysis.intent==="unknown"&&short&&state.topic==="product"){
    clarification={required:true,reason:"short_product_followup",question:"تقصد سعر المنتج، توفره، استخدامه، ولا المقارنة؟",choices:["السعر","التوفر","الاستخدام","المقارنة"]};
  }

  return {
    version:VERSION,engine:"bounded_contextual_conversation_reasoner",normalized,short,
    expected,resolution,reference,correction,clarification,
    context:{turn:Number(state.turn)||0,history_turns:Math.min(18,arr(history).length),topic:clean(state.topic,60),pending:clean(state.pending,60)},
    confidence:resolution.resolved?resolution.confidence:clarification.required?.62:Number(semanticFrame?.confidence)||.55,
    privacy:{stores_raw_message:false,bounded_expected_answer:true}
  };
}

export function applyConversationReasoningV29(analysis={},reasoning={}){
  if(reasoning?.version!==VERSION)return analysis;
  const resolution=reasoning.resolution||{},entities=resolution.entities||{};
  if(resolution.resolved){
    if(resolution.intent&&resolution.intent!=="unknown")analysis.intent=resolution.intent;
    if(entities.emirate)analysis.emirate=entities.emirate;
    if(entities.cultivation)analysis.cultivation=entities.cultivation;
    if(entities.crop&&CROPS[entities.crop]){
      analysis.crop={key:entities.crop,labelAr:CROPS[entities.crop].labelAr,aliases:CROPS[entities.crop].aliases||[]};
      if(!analysis.category)analysis.category=CATEGORIES.seeds;
    }
    if(entities.product)analysis.v29_reference_product=entities.product;
    if(arr(entities.products).length)analysis.v29_reference_products=entities.products;
    if(resolution.memoryAction){analysis.memoryAction=resolution.memoryAction;analysis.intent="product_memory";}
    analysis.v29_context_consumed=Boolean(resolution.consumed);
    analysis.v29_resolution_kind=resolution.kind;
    analysis.v29_confidence=resolution.confidence;
  }
  if(reasoning.correction){analysis.correction=true;analysis.v29_repair=true;}
  return analysis;
}

function inferField(source="",reply="",choices=[]){
  const src=clean(source,120),text=n(reply);
  if(src==="branches")return {field:"branch",intent:"branches"};
  if(src==="contact")return {field:"contact_branch",intent:"contact"};
  if(src==="recommend_seed_crop")return {field:"crop",intent:"recommendation"};
  if(src==="recommend_seed_cultivation")return {field:"cultivation",intent:"recommendation"};
  if(src==="recommend_seed_emirate")return {field:"emirate",intent:"recommendation"};
  if(src==="complaint_triage")return {field:"complaint_type",intent:"complaint"};
  if(/(?:انهي|أي|اي) فرع|بيانات.*فرع/.test(text))return {field:"branch",intent:"branches"};
  if(/(?:اي|أي|انهي) اماره|في اي اماره/.test(text))return {field:"emirate",intent:"recommendation"};
  if(/مكشوف.*بيت محمي|بيت محمي.*مكشوف/.test(text))return {field:"cultivation",intent:"recommendation"};
  if(/شو المحصول|ايه المحصول|اسم المحصول/.test(text))return {field:"crop",intent:"recommendation"};
  if(/تقصد انهي منتج|حدد اي منتج/.test(text))return {field:"product_selection",intent:"product_memory"};
  if(/(?:نعم|لا)|(?:ايوه|لا)/.test(text)&&choices.length<=3)return {field:"yes_no",intent:"acknowledgment"};
  if(/fallback|clarify_unknown|safe_human_fallback/.test(src))return {field:"domain",intent:"unknown"};
  return {field:choices.length?"choice":"",intent:""};
}
function questionFromReply(reply=""){
  const parts=String(reply||"").split(/\n+/).map(x=>clean(x,500)).filter(Boolean);
  const explicit=[...parts].reverse().find(x=>/[؟?]$/.test(x));
  return clean(explicit||parts.at(-1)||"",420);
}
export function updateDialogueStateV29({previous={},next={},analysis={},message="",source="",payload={},reasoning=null}={}){
  const prior=sanitizeDialogueStateV29(previous.dialogue_v29),turn=Math.max(0,Number(next.turn)||0);
  const rawChoices=arr(payload.quick_replies).slice(0,MAX_CHOICES),choices=rawChoices.map(sanitizeChoice).filter(Boolean);
  const reply=clean(payload.display_reply||payload.reply,4000),fieldInfo=inferField(source,reply,choices);
  const asksQuestion=/[؟?]/.test(reply)||["branches","contact","recommend_seed_crop","recommend_seed_cultivation","recommend_seed_emirate","complaint_triage","clarify_unknown","safe_human_fallback","v29_specific_clarification"].includes(source);
  const expected=asksQuestion&&fieldInfo.field?{
    active:true,field:fieldInfo.field,intent:fieldInfo.intent,question:questionFromReply(reply),choices,asked_turn:turn,expires_turn:turn+2
  }:{active:false,field:"",intent:"",question:"",choices:[],asked_turn:0,expires_turn:0};
  const resolution=reasoning?.resolution||{};
  return sanitizeDialogueStateV29({
    version:VERSION,expected,
    last_resolution:resolution.resolved?{kind:resolution.kind,field:resolution.field,confidence:resolution.confidence,turn}:{...prior.last_resolution},
    repair_count:prior.repair_count+(analysis.v29_repair?1:0),
    clarification_count:prior.clarification_count+(source==="v29_specific_clarification"?1:0)
  });
}

function dedupeReply(value=""){
  const blocks=String(value||"").replace(/\r/g,"").split(/\n{2,}/).map(x=>x.trim()).filter(Boolean),seen=new Set(),out=[];
  for(const block of blocks){const key=n(block);if(!key||seen.has(key))continue;seen.add(key);out.push(block.replace(/^[\-*]\s+/gm,"• "));}
  return out.join("\n\n").replace(/\n{3,}/g,"\n\n").trim();
}
export function composeNaturalResponseV29({payload={},reasoning={},source=""}={}){
  const out={...payload};
  if(reasoning?.clarification?.required&&/(?:fallback|clarify|unknown)/.test(String(source||""))) {
    out.reply=reasoning.clarification.question;
    out.display_reply=reasoning.clarification.question;
    if(reasoning.clarification.choices?.length)out.quick_replies=reasoning.clarification.choices.slice(0,4);
  }else if(typeof out.reply==="string"){
    out.reply=dedupeReply(out.reply);
    if(typeof out.display_reply==="string")out.display_reply=dedupeReply(out.display_reply);
  }
  out.natural_response_v29={version:VERSION,answer_first:true,one_question_max:true,repetition_guard:true,verified_facts_preserved:true,context_resolution:reasoning?.resolution?.kind||"none"};
  return out;
}

export function contextualClarificationV29(reasoning={}){
  if(reasoning?.version!==VERSION||!reasoning.clarification?.required)return null;
  return {reply:reasoning.clarification.question,display_reply:reasoning.clarification.question,quick_replies:reasoning.clarification.choices?.slice(0,4)||[],source:"v29_specific_clarification"};
}

export function trackConversationReasoningV29(reasoning={},source=""){
  stats.turns+=1;
  if(reasoning?.resolution?.resolved){stats.context_resolved+=1;if(/choice/.test(reasoning.resolution.kind))stats.choice_resolved+=1;if(/product/.test(reasoning.resolution.kind))stats.reference_resolved+=1;}
  if(reasoning?.correction)stats.corrections+=1;
  if(reasoning?.clarification?.required)stats.specific_clarifications+=1;
  if(/fallback|unknown|clarify/.test(String(source||""))&&!reasoning?.resolution?.resolved)stats.unresolved+=1;
}
export function conversationReasoningSnapshotV29(){return {...stats,resolution_rate:stats.turns?Number((stats.context_resolved/stats.turns*100).toFixed(1)):0};}
export function conversationReasoningHealthV29(){return {version:VERSION,mode:"bounded_contextual_conversation_reasoning_os",ready:true,capabilities:["expected_answer_memory","bounded_question_state","fuzzy_quick_reply_resolution","short_answer_understanding","egyptian_emirati_gulf_levantine_inputs","arabizi_location_and_crop_aliases","correction_supersession","pronoun_product_reference","ordinal_product_reference","specific_clarification","natural_response_deduplication","one_question_contract","privacy_safe_metrics"],metrics:conversationReasoningSnapshotV29()};}
