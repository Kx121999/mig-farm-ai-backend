import { normalizeAr, tokenize } from "./utils.js";
import { searchProductDossiers } from "./product_intelligence.js";

const VERSION="23.0";
const ACTIVE_TTL_TURNS=10;
const COMPARISON_TTL_TURNS=6;

const DETAIL_RX=/(تفاصيل المنتج|تفاصيله|تفاصيلها|استخدامه|استخدامها|بيستخدم|يستخدم في ايه|يستخدم في إيه|فايدته|فائدته|مواصفاته|مواصفاتها|مواصفات المنتج|product details|details|what is it for|use for)/i;
const PRICE_RX=/(بكام|بكم|السعر|سعره|سعرها|الارخص|الأرخص|price|how much|cost|cheapest)/i;
const AVAILABILITY_RX=/(متوفر|متاح|موجود|المخزون|مخزون|خلص|available|availability|in stock|stock)/i;
const DOSAGE_RX=/(جرعه|جرعة|كم ملي|كم مل|نسبه الخلط|نسبة الخلط|معدل الاستخدام|dose|dosage|mix rate|application rate)/i;
const SUITABILITY_RX=/(ينفع|يناسب|مناسب|استخدمه ل|استخدمها ل|يتحط على|للزراعه|للزراعة|للمحصول|suitable|can i use|works for|compatible)/i;
const COMPARISON_RX=/(قارن|مقارنه|مقارنة|الفرق|بينهم|الاتنين|الاثنين|الأرخص بينهم|compare|difference|versus|\bvs\b)/i;
const SWITCH_RX=/(سيبك منه|سيبك منها|فكك منه|فكك منها|غير المنتج|منتج تاني|منتج ثاني|اختار غيره|another product|different product|switch product)/i;
const SEARCH_CUE_RX=/(عندكم|عندك|عايز|عاوزه|عايزة|اريد|أريد|ابي|أبي|ابغى|أبغى|محتاج|هات|دورلي|دور لي|وريني|show me|do you have|i need|looking for)/i;
const REFERENCE_RX=/(هذا|هذي|ده|دي|دا|هالمنتج|المنتج هذا|المنتج ده|سعره|سعرها|تفاصيله|تفاصيلها|استخدامه|استخدامها|عنه|عنها|الأول|الاول|الثاني|التاني|الثالث|التالت|this one|that one|first|second|third)/i;

const GENERIC_PRODUCT_WORDS=new Set([
  "منتج","المنتج","بذور","بذره","بذرة","سماد","اسمده","أسمدة","مبيد","مبيدات","اداه","أداة","ادوات","أدوات",
  "خيار","طماطم","بندوره","بندورة","فلفل","باذنجان","كوسه","كوسة","بطيخ","شمام","باميه","بامية","بصل","خس",
  "seed","seeds","fertilizer","pesticide","product","cucumber","tomato","pepper","eggplant","zucchini","watermelon","melon","onion",
  "f1","kg","gm","g","ml","liter","litre","packet","pack"
]);
const CONTEXT_QUERY_WORDS=new Set([
  "بكام","بكم","سعر","السعر","سعره","سعرها","تفاصيل","تفاصيله","تفاصيلها","استخدام","استخدامه","استخدامها","مواصفات","متوفر","متاح","موجود","مخزون",
  "ينفع","يناسب","مناسب","جرعه","جرعة","كام","كم","قارن","مقارنه","مقارنة","الفرق","بينهم","الاول","الأول","الثاني","التاني",
  "price","details","detail","use","availability","available","stock","suitable","dose","dosage","compare","comparison","first","second"
]);

function clean(value="",max=900){return String(value??"").replace(/\s+/g," ").trim().slice(0,max);}
function n(value=""){return normalizeAr(clean(value,2000));}
function turnNumber(value){const x=Number(value);return Number.isFinite(x)&&x>=0?Math.floor(x):0;}

export function normalizeProductReference(value){
  if(!value||typeof value!=="object"||Array.isArray(value))return null;
  const product={
    name:clean(value.name||value.title,500),sku:clean(value.sku||value.default_code,160),external_id:clean(value.external_id||value?.product_dossier?.external_id,180),
    product_id:Number.isFinite(Number(value.product_id))?Number(value.product_id):null,
    product_template_id:Number.isFinite(Number(value.product_template_id))?Number(value.product_template_id):null,
    price:clean(value.price,100),currency:clean(value.currency||"AED",20),availability:clean(value.availability||value.stock,120),
    description:clean(value.description,1800),url:clean(value.url,1200),category:clean(value.category||value?.product_dossier?.category,220)
  };
  return product.name||product.sku||product.external_id?product:null;
}

export function productIdentityKey(value){
  const p=normalizeProductReference(value);if(!p)return "";
  return n(p.sku)||clean(p.external_id,180)||n(p.name);
}

export function sameProduct(a,b){
  const x=normalizeProductReference(a),y=normalizeProductReference(b);if(!x||!y)return false;
  if(x.external_id&&y.external_id&&x.external_id===y.external_id)return true;
  if(x.sku&&y.sku&&n(x.sku)===n(y.sku))return true;
  return Boolean(x.name&&y.name&&n(x.name)===n(y.name));
}

export function productContextIntent(message=""){
  const text=clean(message,1600);
  if(COMPARISON_RX.test(text))return "comparison";
  if(DOSAGE_RX.test(text))return "dosage";
  if(SUITABILITY_RX.test(text))return "suitability";
  if(PRICE_RX.test(text)&&AVAILABILITY_RX.test(text))return "price_and_availability";
  if(PRICE_RX.test(text))return "price";
  if(AVAILABILITY_RX.test(text))return "availability";
  if(DETAIL_RX.test(text))return "details";
  return "none";
}

function ordinalIndex(message=""){
  const text=n(message);
  const rows=[[/\b(الاول|الأول|اول|أول|first)\b/,0],[/\b(الثاني|التاني|ثاني|second)\b/,1],[/\b(الثالث|التالت|ثالث|third)\b/,2],[/\b(الرابع|رابع|fourth)\b/,3]];
  for(const [rx,index] of rows)if(rx.test(text))return index;
  return null;
}

function productNameAnchors(product={}){
  return tokenize(n(`${product.name||""} ${product.sku||""}`)).filter(token=>token.length>=3&&!GENERIC_PRODUCT_WORDS.has(token)&&!/^\d+$/.test(token));
}

function explicitDossierMention(message=""){
  const text=n(message);if(!text||text.length<3)return null;
  const queryTokens=tokenize(text);
  const hasIdentitySignal=queryTokens.some(token=>token.length>=3&&!GENERIC_PRODUCT_WORDS.has(token)&&!CONTEXT_QUERY_WORDS.has(token));
  if(!hasIdentitySignal)return null;
  let hits=[];try{hits=searchProductDossiers(message,{limit:3,descriptionChars:120});}catch{return null;}
  for(const hit of hits){
    if(Number(hit?.score||0)<95)continue;
    const sku=n(hit?.sku||"");
    const anchors=productNameAnchors(hit);
    const hasSku=Boolean(sku&&sku.length>=3&&text.includes(sku));
    const matchingAnchors=anchors.filter(anchor=>text.includes(anchor));
    if(!hasSku&&!matchingAnchors.length)continue;
    return normalizeProductReference(hit);
  }
  return null;
}

export function sanitizeActiveProductContext(value){
  if(!value||typeof value!=="object"||Array.isArray(value)||value.active===false)return null;
  const product=normalizeProductReference(value.product||value.bound_product||value);if(!product)return null;
  return {
    active:true,version:VERSION,product,identity_key:productIdentityKey(product),source:clean(value.source||"restored",60),
    confidence:["high","medium","low"].includes(value.confidence)?value.confidence:"medium",
    locked_at_turn:turnNumber(value.locked_at_turn),last_used_turn:turnNumber(value.last_used_turn),expires_turn:turnNumber(value.expires_turn),
    switch_count:Math.min(99,turnNumber(value.switch_count)),last_intent:clean(value.last_intent,40),reason:clean(value.reason,100)
  };
}

export function sanitizeComparisonContext(value){
  if(!value||typeof value!=="object"||Array.isArray(value)||value.active===false)return null;
  const products=(Array.isArray(value.products)?value.products:[]).map(normalizeProductReference).filter(Boolean).slice(0,4);
  if(products.length<2)return null;
  return {active:true,version:VERSION,products,started_turn:turnNumber(value.started_turn),last_used_turn:turnNumber(value.last_used_turn),expires_turn:turnNumber(value.expires_turn),source:clean(value.source||"restored",60)};
}

export function bindProductContext(product,{turn=0,source="bound",confidence="high",previous=null,intent="none",reason=""}={}){
  const p=normalizeProductReference(product);if(!p)return null;
  const old=sanitizeActiveProductContext(previous);const currentTurn=turnNumber(turn);
  const switched=Boolean(old&&!sameProduct(old.product,p));
  return {active:true,version:VERSION,product:p,identity_key:productIdentityKey(p),source:clean(source,60),confidence:["high","medium","low"].includes(confidence)?confidence:"high",locked_at_turn:switched||!old?currentTurn:old.locked_at_turn,last_used_turn:currentTurn,expires_turn:currentTurn+ACTIVE_TTL_TURNS,switch_count:(old?.switch_count||0)+(switched?1:0),last_intent:clean(intent,40),reason:clean(reason,100)};
}

function activeAndFresh(state={},turn=0){
  const ctx=sanitizeActiveProductContext(state?.active_product_context);if(!ctx)return null;
  const current=turnNumber(turn||state?.turn);if(ctx.expires_turn&&current>ctx.expires_turn)return null;
  return ctx;
}

function comparisonAndFresh(state={},turn=0){
  const ctx=sanitizeComparisonContext(state?.comparison_context);if(!ctx)return null;
  const current=turnNumber(turn||state?.turn);if(ctx.expires_turn&&current>ctx.expires_turn)return null;
  return ctx;
}

function isExplicitFreshSearch(message="",analysis={}){
  const intent=productContextIntent(message);
  if(intent!=="none")return false;
  if(SWITCH_RX.test(message))return true;
  return Boolean(SEARCH_CUE_RX.test(message)&&["product_search","recommendation","known_product_info","known_seed_info"].includes(String(analysis?.intent||"")));
}

export function resolveProductContext({message="",selectedProduct=null,selectedProducts=[],state={},analysis={}}={}){
  const intent=productContextIntent(message);const currentTurn=turnNumber(state?.turn)+1;
  const active=activeAndFresh(state,currentTurn);const comparison=comparisonAndFresh(state,currentTurn);
  const chosenList=(Array.isArray(selectedProducts)?selectedProducts:[]).map(normalizeProductReference).filter(Boolean).slice(0,4);
  if(SWITCH_RX.test(message)||isExplicitFreshSearch(message,analysis))return {action:"clear",intent,reason:"explicit_product_switch",confidence:"high",product:null,products:[]};

  if(intent==="comparison"){
    if(chosenList.length>=2)return {action:"compare",intent,reason:"client_bound_comparison",confidence:"high",products:chosenList};
    if(comparison?.products?.length>=2)return {action:"compare",intent,reason:"persisted_comparison",confidence:"high",products:comparison.products};
    const visible=(Array.isArray(state?.visible_products)?state.visible_products:[]).map(normalizeProductReference).filter(Boolean);
    if(visible.length===2)return {action:"compare",intent,reason:"two_visible_products",confidence:"medium",products:visible};
  }

  const mentioned=explicitDossierMention(message);
  if(mentioned&&(intent!=="none"||REFERENCE_RX.test(message)))return {action:"bind",intent:intent==="none"?"details":intent,reason:"explicit_product_mention",confidence:"high",product:mentioned,products:[]};

  const selected=normalizeProductReference(selectedProduct);
  if(selected&&intent!=="none")return {action:"bind",intent,reason:"client_selected_product",confidence:"high",product:selected,products:[]};

  const visible=(Array.isArray(state?.visible_products)?state.visible_products:[]).map(normalizeProductReference).filter(Boolean);
  const ordinal=ordinalIndex(message);
  if(ordinal!==null&&visible[ordinal]&&intent!=="comparison")return {action:"bind",intent:intent==="none"?"details":intent,reason:"visible_product_ordinal",confidence:"high",product:visible[ordinal],products:[]};

  if(active&&intent!=="none")return {action:"reuse",intent,reason:"persisted_active_product",confidence:active.confidence||"medium",product:active.product,products:[]};
  if(visible.length===1&&intent!=="none")return {action:"bind",intent,reason:"single_visible_product",confidence:"medium",product:visible[0],products:[]};
  if(intent!=="none"&&visible.length>1)return {action:"ambiguous",intent,reason:"multiple_visible_products",confidence:"low",product:null,products:visible};
  return {action:"none",intent,reason:"no_product_context_action",confidence:"low",product:active?.product||null,products:[]};
}

export function evolveProductContext({previous={},next={},message="",analysis={},source="",results=[],payload={}}={}){
  const currentTurn=turnNumber(next?.turn);let active=activeAndFresh(previous,currentTurn);let comparison=comparisonAndFresh(previous,currentTurn);
  let event={action:active?"preserved":"none",reason:active?"within_ttl":"no_active_product",intent:productContextIntent(message),confidence:active?.confidence||"low"};
  const bound=normalizeProductReference(payload?.bound_product);
  const boundMany=(Array.isArray(payload?.bound_products)?payload.bound_products:[]).map(normalizeProductReference).filter(Boolean).slice(0,4);

  if(boundMany.length>=2){
    comparison={active:true,version:VERSION,products:boundMany,started_turn:currentTurn,last_used_turn:currentTurn,expires_turn:currentTurn+COMPARISON_TTL_TURNS,source:clean(source||"bound_comparison",60)};
    event={action:"comparison_bound",reason:"response_bound_products",intent:"comparison",confidence:"high"};
  }
  if(bound){
    active=bindProductContext(bound,{turn:currentTurn,source:source||"bound_response",confidence:payload?.product_context_confidence||"high",previous:active,intent:payload?.product_context_intent||productContextIntent(message),reason:payload?.product_context_reason||"response_bound_product"});
    event={action:"bound",reason:active.reason,intent:active.last_intent,confidence:active.confidence};
  }else if(SWITCH_RX.test(message)||isExplicitFreshSearch(message,analysis)){
    active=null;comparison=null;event={action:"cleared",reason:"explicit_product_switch",intent:productContextIntent(message),confidence:"high"};
  }else if(Array.isArray(results)&&results.length>1&&["product_search","recommendation"].includes(String(analysis?.intent||""))){
    active=null;comparison=null;event={action:"cleared",reason:"multiple_new_search_results",intent:"none",confidence:"high"};
  }else if(Array.isArray(results)&&results.length===1&&["product_search","recommendation"].includes(String(analysis?.intent||""))){
    active=bindProductContext(results[0],{turn:currentTurn,source:"single_live_result",confidence:"high",previous:active,intent:"selection",reason:"single_new_search_result"});
    event={action:"bound",reason:"single_new_search_result",intent:"selection",confidence:"high"};
  }else if(active){
    active={...active,last_used_turn:currentTurn,last_intent:productContextIntent(message)!=="none"?productContextIntent(message):active.last_intent};
  }

  if(active&&active.expires_turn&&currentTurn>active.expires_turn){active=null;event={action:"expired",reason:"active_product_ttl",intent:"none",confidence:"low"};}
  if(comparison&&comparison.expires_turn&&currentTurn>comparison.expires_turn)comparison=null;
  return {active,comparison,event,health:{version:VERSION,active_ttl_turns:ACTIVE_TTL_TURNS,comparison_ttl_turns:COMPARISON_TTL_TURNS}};
}

export function productContextHealth(){
  return {version:VERSION,mode:"server_authoritative_product_context_intelligence",active_ttl_turns:ACTIVE_TTL_TURNS,comparison_ttl_turns:COMPARISON_TTL_TURNS,features:["server_side_active_product_memory","same_category_product_switch_detection","explicit_dossier_mention_binding","ordinal_visible_product_binding","multi_product_comparison_context","dosage_evidence_guard","suitability_evidence_guard","refresh_safe_context_restore"]};
}
