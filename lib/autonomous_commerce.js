import { normalizeAr } from './utils.js';

const VERSION='13.0';

function n(v=''){ return normalizeAr(String(v||'')); }
function num(v){
  const x=Number(String(v??'').replace(/[^0-9.]/g,''));
  return Number.isFinite(x)?x:null;
}
function clamp(v,min=0,max=100){ return Math.max(min,Math.min(max,Number(v)||0)); }
function uniq(items=[],limit=12){
  const out=[],seen=new Set();
  for(const item of items){
    const value=String(item||'').trim();
    if(!value) continue;
    const key=n(value);
    if(!key||seen.has(key)) continue;
    seen.add(key); out.push(value);
    if(out.length>=limit) break;
  }
  return out;
}
function available(p={}){
  const t=n(p.availability||'');
  if(!t) return null;
  if(/غير متوفر|نفد|out of stock|unavailable|sold out/.test(t)) return false;
  if(/متوفر|available|in stock|موجود/.test(t)) return true;
  return null;
}
function cleanProduct(p={}){
  return {
    name:String(p.name||'').slice(0,300),
    price:p.price??'', currency:String(p.currency||'AED').slice(0,20),
    availability:String(p.availability||'').slice(0,120),
    url:String(p.url||'').slice(0,1200), sku:String(p.sku||'').slice(0,120),
    product_template_id:Number(p.product_template_id)||null,
    product_id:Number(p.product_id)||null,
    image:String(p.image||'').slice(0,1200)
  };
}
function parseArea(message=''){
  const t=n(message);
  const m=t.match(/([0-9]+(?:\.[0-9]+)?)\s*(?:متر|م2|م²|sqm|square meter)/);
  return m?Number(m[1]):null;
}
function parseBudget(message='',frame={}){
  const fromFrame=Number(frame?.constraints?.total_budget);
  if(Number.isFinite(fromFrame)&&fromFrame>0) return fromFrame;
  const t=n(message);
  const m=t.match(/(?:ميزاني|budget|معايا|معي|حدود)\D{0,18}([0-9]+(?:\.[0-9]+)?)/);
  return m?Number(m[1]):null;
}
function requestedCount(frame={},message=''){
  const c=Number(frame?.constraints?.requested_count);
  if(Number.isInteger(c)&&c>0) return Math.min(6,c);
  const t=n(message);
  const m=t.match(/([1-6])\s*(?:منتج|منتجات|خيار|خيارات|اصناف|items?|products?|options?)/);
  return m?Number(m[1]):null;
}
function missionKind(message='',analysis={},frame={}){
  const t=n(message),goal=String(frame?.goal||'');
  if(/خطة كاملة|جهزلي|جهز لي|اعمل لي باقة|اعمللي باقة|سلة كاملة|كل اللي احتاجه|كل الي احتاجه|full plan|complete plan/.test(t)) return 'solution_plan';
  if(/قارن|الفرق|compare|vs/.test(t)||goal==='compare') return 'compare';
  if(/ميزاني|ارخص|اوفر|budget|cheap/.test(t)||goal==='optimize_budget') return 'budget_optimize';
  if(/باقة|bundle|مجموعة|سلة/.test(t)||goal==='bundle') return 'bundle';
  if(/اطلب|اشتري|add to cart|buy|order/.test(t)||goal==='purchase') return 'purchase';
  if(/رشح|اختار|انسب|افضل|recommend|best/.test(t)||goal==='recommend') return 'recommend';
  if(['product_search','recommendation'].includes(analysis?.intent)) return 'discover';
  return 'answer';
}
function stageFromMission(kind='',state={},profile={}){
  if(kind==='purchase') return 'commit';
  if(['bundle','budget_optimize','solution_plan'].includes(kind)) return 'design';
  if(kind==='compare') return 'evaluate';
  if(kind==='recommend') return 'consider';
  if(state?.visible_products?.length) return 'consider';
  if(profile?.crop||profile?.category) return 'qualify';
  return 'discover';
}
function missingCritical({kind,frame={},analysis={},profile={},message=''}){
  const c=frame?.constraints||{},missing=[];
  if(['recommend','bundle','budget_optimize','solution_plan'].includes(kind)){
    if(!c.category&&!c.crop&&!analysis?.category&&!analysis?.crop) missing.push('product_or_crop');
  }
  if(kind==='budget_optimize'&&!parseBudget(message,frame)) missing.push('budget');
  if(kind==='solution_plan'&&!c.cultivation&&!profile?.cultivation&&!parseArea(message)) missing.push('cultivation_or_area');
  return missing;
}
function nextQuestion(missing=[],locale='ar'){
  const key=missing[0];
  if(!key) return null;
  if(locale==='en'){
    if(key==='budget') return {field:key,reply:'What total budget should I stay within?',quick_replies:['50 AED','100 AED','200 AED']};
    if(key==='cultivation_or_area') return {field:key,reply:'Is this for open field, greenhouse, or home growing — and roughly what area?',quick_replies:['Open field','Greenhouse','Home growing']};
    return {field:key,reply:'What crop or product category do you want me to build the recommendation around?',quick_replies:['Tomato','Cucumber','Pepper','Fertilizer']};
  }
  if(key==='budget') return {field:key,reply:'تمام، حد الميزانية الإجمالية كام درهم عشان أبني الاختيار عليها؟',quick_replies:['50 درهم','100 درهم','200 درهم']};
  if(key==='cultivation_or_area') return {field:key,reply:'الزراعة عندك مكشوف ولا بيت محمي ولا منزلية؟ ولو تعرف المساحة اكتبها بالمتر.',quick_replies:['مكشوف','بيت محمي','منزلية']};
  return {field:key,reply:'عايزني أبني الترشيح على أي محصول أو قسم بالضبط؟',quick_replies:['طماطم','خيار','فلفل','أسمدة']};
}

export function buildCommerceMission({message='',analysis={},cognition={},state={},profile={},locale='ar'}={}){
  let kind=missionKind(message,analysis,cognition);
  const budget=parseBudget(message,cognition);
  if(budget && ["bundle","recommend"].includes(kind)) kind="budget_optimize";
  const missing=missingCritical({kind,frame:cognition,analysis,profile,message});
  const count=requestedCount(cognition,message);
  const stage=stageFromMission(kind,state,profile);
  const c=cognition?.constraints||{};
  const tasks=[];
  if(['discover','recommend','compare','bundle','budget_optimize','solution_plan','purchase'].includes(kind)) tasks.push('verify_live_catalog');
  if(['compare','recommend','bundle','budget_optimize','solution_plan'].includes(kind)) tasks.push('rank_candidates');
  if(['bundle','budget_optimize','solution_plan'].includes(kind)) tasks.push('optimize_portfolio');
  if(kind==='solution_plan') tasks.push('identify_missing_project_inputs');
  if(kind==='purchase') tasks.push('prepare_purchase_continuation');
  tasks.push('verify_claims_before_reply');
  const toolBudget=kind==='solution_plan'?6:['bundle','budget_optimize'].includes(kind)?5:['compare','recommend'].includes(kind)?4:3;
  return {
    v:13,kind,stage,budget_aed:budget,requested_count:count,
    require_available:Boolean(c.require_available),price_preference:String(c.price_preference||'neutral'),
    category:String(c.category||analysis?.category?.key||state?.category||profile?.category||''),
    crop:String(c.crop||analysis?.crop?.key||state?.crop||profile?.crop||''),
    emirate:String(c.emirate||analysis?.emirate||state?.emirate||profile?.emirate||''),
    cultivation:String(c.cultivation||analysis?.cultivation||state?.cultivation||profile?.cultivation||''),
    area_sqm:parseArea(message),missing_critical:missing,next_question:nextQuestion(missing,locale),
    tasks,tool_budget:toolBudget,
    autonomous_ready:missing.length===0,
    needs_live_catalog:tasks.includes('verify_live_catalog')
  };
}

function rowScore(p={},mission={},index=0){
  const price=num(p.price),stock=available(p); let score=60-index*.3; const basis=[];
  if(stock===true){score+=16;basis.push('متوفر حسب المتجر الحي');}
  if(stock===false){score-=mission.require_available?80:22;basis.push('غير متوفر حسب المتجر الحي');}
  if(mission.require_available&&stock===null) score-=16;
  if(price!==null){
    if(mission.budget_aed&&price<=mission.budget_aed){score+=12;basis.push('داخل الميزانية');}
    if(mission.price_preference==='lower') score+=Math.max(0,22-Math.min(22,price/4));
    if(mission.price_preference==='higher') score+=Math.min(16,price/12);
  }else score-=5;
  return {product:cleanProduct(p),price,stock,score,basis};
}
function combinationRows(rows=[],maxItems=4){
  const out=[];
  function walk(start,chosen){
    if(chosen.length){out.push([...chosen]); if(chosen.length>=maxItems) return;}
    for(let i=start;i<rows.length;i++) walk(i+1,[...chosen,rows[i]]);
  }
  walk(0,[]); return out;
}

export function optimizeLivePortfolio({products=[],mission={},maxItems=null}={}){
  const rows=(products||[]).filter(x=>x?.name).slice(0,12).map((p,i)=>rowScore(p,mission,i));
  const target=Math.max(1,Math.min(4,Number(maxItems||mission.requested_count)||(['bundle','budget_optimize','solution_plan'].includes(mission.kind)?3:1)));
  let candidates=rows.filter(r=>!mission.require_available||r.stock===true);
  if(!candidates.length && !mission.require_available) candidates=rows;
  const budget=Number(mission.budget_aed)||null;
  let selected=[];
  if(budget){
    let best=null;
    for(const combo of combinationRows(candidates,target)){
      if(combo.length>target) continue;
      if(combo.some(x=>x.price===null)) continue;
      const total=combo.reduce((s,x)=>s+x.price,0);
      if(total>budget) continue;
      const value=combo.reduce((s,x)=>s+x.score,0)+(combo.length*8)-Math.abs(budget-total)/Math.max(20,budget)*4;
      if(!best||value>best.value) best={combo,total,value};
    }
    if(best) selected=best.combo;
  }
  if(!selected.length){
    const sorted=[...candidates].sort((a,b)=>{
      if(mission.price_preference==='lower'){
        if(a.price===null&&b.price!==null) return 1;
        if(b.price===null&&a.price!==null) return -1;
        if(a.price!==null&&b.price!==null&&a.price!==b.price) return a.price-b.price;
      }
      return b.score-a.score;
    });
    selected=sorted.slice(0,target);
  }
  const total=selected.every(x=>x.price!==null)?selected.reduce((s,x)=>s+x.price,0):null;
  const excluded=rows.filter(r=>!selected.some(s=>s.product.url&&s.product.url===r.product.url || (!s.product.url&&s.product.name===r.product.name))).slice(0,3);
  return {
    handled:selected.length>0,
    products:selected.map(x=>x.product),
    total_aed:total,
    within_budget:budget&&total!==null?total<=budget:null,
    decision_basis:uniq(selected.flatMap(x=>x.basis),6),
    alternatives:excluded.map(x=>x.product),
    evaluated:rows.length,
    target_count:target,
    confidence:clamp(76+(selected.length*4)+(selected.filter(x=>x.stock===true).length*3)-(selected.filter(x=>x.price===null).length*6),45,97)
  };
}

export function deterministicComparison(products=[],criteria=[]){
  const rows=(products||[]).filter(x=>x?.name).slice(0,6).map((p,i)=>({
    ...cleanProduct(p),numeric_price:num(p.price),available:available(p),position:i+1
  }));
  const priceRows=rows.filter(x=>x.numeric_price!==null).sort((a,b)=>a.numeric_price-b.numeric_price);
  return {
    products:rows,
    cheapest:priceRows[0]||null,
    most_expensive:priceRows[priceRows.length-1]||null,
    available:rows.filter(x=>x.available===true),
    unknown_stock:rows.filter(x=>x.available===null),
    criteria:uniq(criteria,6)
  };
}

function groundedNumbers(products=[],mission={},portfolio=null){
  const nums=[];
  for(const p of products){ const x=num(p.price); if(x!==null) nums.push(x); }
  if(Number(mission?.budget_aed)>0) nums.push(Number(mission.budget_aed));
  if(Number(portfolio?.total_aed)>=0) nums.push(Number(portfolio.total_aed));
  return nums;
}
export function verifyCommerceResponse({reply='',products=[],mission={},portfolio=null}={}){
  const text=String(reply||''); const flags=[];
  const allowed=groundedNumbers(products,mission,portfolio);
  const money=[...text.matchAll(/([0-9]+(?:\.[0-9]+)?)\s*(?:AED|درهم)/gi)].map(m=>Number(m[1]));
  for(const value of money){
    if(!allowed.some(x=>Math.abs(x-value)<0.011)) flags.push(`ungrounded_price:${value}`);
  }
  if(/مضمون\s*100|100%\s*مضمون|افضل\s*منتج\s*في\s*السوق|best\s+on\s+the\s+market|guaranteed\s*100/i.test(text)) flags.push('absolute_unverified_claim');
  if(/جرعة|مل\s*\/\s*لتر|سم3|cc\s*\/\s*l/i.test(text) && !/حسب الملصق|الملصق|label/i.test(text)) flags.push('unverified_dosage_risk');
  const currentCommerce=mission?.needs_live_catalog;
  if(currentCommerce && !products.length && ['recommend','compare','bundle','budget_optimize','solution_plan','purchase'].includes(mission.kind)) flags.push('commerce_answer_without_live_products');
  return {ok:flags.length===0,flags:uniq(flags,10),money_claims:money,grounded_numbers:allowed};
}

export function groundedCommerceFallback({mission={},portfolio=null,products=[],locale='ar'}={}){
  const selected=portfolio?.products?.length?portfolio.products:products.slice(0,Math.max(1,mission.requested_count||3));
  if(!selected.length) return locale==='en'?'I need a verified live product result before I can make that recommendation.':'محتاج نتيجة مؤكدة من المتجر الحي قبل ما أرشح لك اختيار نهائي.';
  const lines=selected.map((p,i)=>{
    const price=p.price!==undefined&&p.price!==''?` — ${p.price} ${p.currency||'AED'}`:'';
    const stock=p.availability?` — ${p.availability}`:'';
    return `${i+1}. ${p.name}${price}${stock}`;
  });
  const total=portfolio?.total_aed!==null&&portfolio?.total_aed!==undefined?portfolio.total_aed:null;
  if(locale==='en') return `Based only on the verified live store results, these are the safest options:\n${lines.join('\n')}${total!==null?`\nVerified visible total: ${total.toFixed(2)} AED.`:''}`;
  return `بناءً على النتائج المؤكدة من المتجر الحي فقط، دول أقوى الخيارات الآمنة حاليًا:\n${lines.join('\n')}${total!==null?`\nالإجمالي الظاهر: ${total.toFixed(2)} درهم.`:''}`;
}

export function autonomousCommerceMeta({mission={},portfolio=null,verification=null}={}){
  return {
    version:VERSION,mode:'autonomous_commerce_executive',mission:mission?.kind||'answer',stage:mission?.stage||'discover',
    autonomous_ready:Boolean(mission?.autonomous_ready),tool_budget:Number(mission?.tool_budget)||3,
    plan:Array.isArray(mission?.tasks)?mission.tasks:[],missing_critical:Array.isArray(mission?.missing_critical)?mission.missing_critical:[],
    portfolio:portfolio?{selected:portfolio.products?.length||0,evaluated:portfolio.evaluated||0,total_aed:portfolio.total_aed,within_budget:portfolio.within_budget,confidence:portfolio.confidence,decision_basis:portfolio.decision_basis||[]}:undefined,
    verification:verification?{ok:Boolean(verification.ok),flags:verification.flags||[]}:undefined
  };
}

export function autonomousCommerceHealth(){
  return {
    version:VERSION,mode:'autonomous_commerce_executive',
    capabilities:['mission_decomposition','autonomous_task_planning','single_question_clarification_gate','live_portfolio_optimizer','budget_constrained_bundle_search','verified_pairwise_comparison','grounded_price_guard','dosage_claim_guard','deterministic_fallback_finalizer','purchase_stage_orchestration','tool_budgeting','counterfactual_alternatives']
  };
}
