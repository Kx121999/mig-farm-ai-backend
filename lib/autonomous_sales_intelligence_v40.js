const VERSION='40.0.0';const RELEASE='AUTONOMOUS_SALES_INTELLIGENCE_V40';
const stats=globalThis.__migV40SalesStats||{plans:0,browse_only:0,purchase_ready:0,technical_first:0,no_pressure:0};globalThis.__migV40SalesStats=stats;
function clean(v='',max=1000){return String(v??'').replace(/[\u0000-\u001f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max);}
function arr(v){return Array.isArray(v)?v:[];}
export function buildSalesPlanV40({semanticCore={},salesTurn=null,conversionDecision=null,autonomousPlan=null,diagnosticFrame=null}={}){
  stats.plans+=1;const intents=arr(semanticCore?.intents);const purchase=intents.some(x=>['purchase','bundle','price','availability'].includes(x));const technical=Boolean(diagnosticFrame?.active);const browseOnly=Boolean(salesTurn?.browse_only||conversionDecision?.browse_only||semanticCore?.constraints?.some?.(x=>/browse|no.?sales/i.test(String(x))));
  if(browseOnly)stats.browse_only+=1;if(purchase)stats.purchase_ready+=1;if(technical)stats.technical_first+=1;
  let mode='assist';if(technical)mode='technical_first';else if(browseOnly)mode='browse_no_pressure';else if(purchase)mode='purchase_assist';
  const shouldSell=mode==='purchase_assist'&&conversionDecision?.should_sell!==false;const questionBudget=Math.max(0,Math.min(1,Number(salesTurn?.conversation_plan?.question_budget??conversionDecision?.question_policy?.max_questions??1)));
  if(!shouldSell)stats.no_pressure+=1;
  return {version:VERSION,release:RELEASE,mode,stage:clean(salesTurn?.stage||conversionDecision?.stage||'unknown',80),should_sell:shouldSell,question_budget:questionBudget,next_best_action:technical?'solve_problem_before_product':browseOnly?'answer_without_pressure':purchase?clean(conversionDecision?.next_best_action||salesTurn?.conversation_plan?.next_best_action||'verify_fit_then_purchase_step',140):'answer_current_request',forbidden_moves:['fabricate_urgency','force_whatsapp_cta','claim_order_executed_without_receipt','sell_before_diagnosis','repeat_known_question'],policy:{answer_first:true,trust_before_sale:true,verified_fit_before_close:true,one_question_max:true,no_forced_sales:true},legacy_guidance:{sales_turn:salesTurn||null,conversion_decision:conversionDecision||null,autonomous_plan:autonomousPlan||null}};
}
export function autonomousSalesHealthV40(){return {version:VERSION,release:RELEASE,ready:true,technical_first:true,no_forced_sales:true,verified_close:true,stats:{...stats}};}
