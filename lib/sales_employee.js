import { normalizeAr, tokenize } from "./utils.js";
import { SALES_EMPLOYEE_PLAYBOOK } from "./sales_employee_knowledge.js";
import { buildSalesConversationPlan, evaluateNaturalSalesReply, salesConversationOSHealth } from "./sales_conversation_os.js";
import { analyzeHumanConversationTurn, evaluateCurrentTurnAlignment } from "./human_conversation_brain.js";

const VERSION="20.0";
function clean(v,max=1200){return String(v||"").replace(/\s+/g," ").trim().slice(0,max)}
function arr(v){return Array.isArray(v)?v:[]}
function n(v){return normalizeAr(String(v||""))}
function tri(s){const x=`  ${n(s)}  `;const out=[];for(let i=0;i<x.length-2;i++)out.push(x.slice(i,i+3));return out}
function sim(a,b){const A=new Set(tri(a)),B=new Set(tri(b));if(!A.size||!B.size)return 0;let hit=0;for(const x of A)if(B.has(x))hit++;return hit/(A.size+B.size-hit)}

function objection(t){
  if(/غالي|غالية|كتير|كثير|ميزاني|سعر عالي/.test(t)) return "price";
  if(/مش مقتنع|مو مقتنع|مش واثق|ثقه|ثقة|مضمون/.test(t)) return "trust";
  if(/مش موجود|خلص|غير متوفر|مو متوفر/.test(t)) return "availability";
  if(/مش فاهم|محتار|ما ادري|ما أدري/.test(t)) return "uncertainty";
  if(/وقت|متاخر|متأخر|مستعجل|اليوم|بكره|بكرة/.test(t)) return "timing";
  return "";
}
function mood(t){
  if(/غلط|زهقت|سيئ|وحش|مش فاهمين|خربان/.test(t)) return "frustrated";
  if(/ممتاز|تمام|حلو|جميل|اوكي|أوكي|شكرا|شكراً/.test(t)) return "positive";
  if(/محتار|مش عارف|ما ادري|ما أدري/.test(t)) return "uncertain";
  if(/عايز اطلب|ابغى اطلب|هطلب|اشتري|شراء|اخذ|آخذ/.test(t)) return "ready";
  return "neutral";
}
function style(message){
  const words=clean(message).split(/\s+/).filter(Boolean).length;
  if(words<=4) return {length:"very_short",target_sentences:"1-3",headings:false};
  if(words<=12) return {length:"short",target_sentences:"2-5",headings:false};
  if(words<=35) return {length:"normal",target_sentences:"3-8",headings:false};
  return {length:"detailed",target_sentences:"as_needed",headings:true};
}
function stage({analysis={},profile={},state={},message=""}={}){
  const t=n(message); const intent=String(analysis?.intent||"");
  if(/عايز اطلب|ابغى اطلب|اشتري|شراء|هطلب|اخذ|آخذ/.test(t)||["purchase"].includes(intent)) return "commit";
  if(/قارن|فرق|ولا|احسن|أفضل|افضل|ارخص|أرخص/.test(t)||["recommendation","known_seed_comparison"].includes(intent)) return "evaluate";
  if(objection(t)) return "objection";
  if(analysis?.category||analysis?.crop||/عندكم|احتاج|عايز|ابغى|رشح/.test(t)) return "discover";
  if(["greeting","wellbeing","thanks","acknowledgment"].includes(intent)) return "social";
  return profile?.lead_score>=60?"consider":"discover";
}

export function analyzeSalesConversation(message="",context={}){
  const t=n(message), words=clean(message).split(/\s+/).filter(Boolean).length;
  const q=(String(message).match(/[؟?]/g)||[]).length;
  const askDirect=/^(هل|عندكم|فيه|في |سعر|بكم|بكام|كم|وين|فين|متى|ازاي|كيف|شو|وش|ايه|إيه)/.test(t);
  const obj=objection(t), st=stage({...context,message});
  const tone=mood(t), s=style(message);
  const commercial=Boolean(context?.analysis?.category||context?.analysis?.crop||/سعر|شراء|اشتري|اطلب|متوفر|عندكم|رشح|اختار|فرق|مشروع|بيت محمي|مزرعه|مزرعة|شحن|توصيل/.test(t));
  const technical=/اصفر|ذبول|تجعد|مكرمش|جذر|مرض|حشر|فطر|ملوح|تسميد|ري|تحليل|تربه|تربة/.test(t);
  const social=["greeting","wellbeing","thanks","goodbye","acknowledgment","negative_ack"].includes(String(context?.analysis?.intent||""));
  const human_turn=context?.humanTurn||analyzeHumanConversationTurn(message,{analysis:context?.analysis||{},profile:context?.profile||{},state:context?.state||{},history:context?.history||[],agriculturalContext:context?.agriculturalContext||{}});
  const conversation_plan=buildSalesConversationPlan({message,analysis:context?.analysis||{},profile:context?.profile||{},state:context?.state||{},history:context?.history||[],agriculturalContext:context?.agriculturalContext||{}});
  if(human_turn?.no_sales_pressure){conversation_plan.should_sell=false;conversation_plan.question_budget=0;conversation_plan.micro_commitment=false;conversation_plan.next_best_action="respond_without_sales_pressure";conversation_plan.forbidden_moves=[...new Set([...(conversation_plan.forbidden_moves||[]),"product_push","sales_pitch","forced_whatsapp_cta"])];}
  if(["social","browse_only_social"].includes(human_turn?.mode)){conversation_plan.mode="social";conversation_plan.response_shape="one_liner";conversation_plan.question_budget=0;conversation_plan.should_sell=false;}
  return {
    version:VERSION,stage:st,mood:tone,objection:obj,commercial,technical,social,human_turn,conversation_plan,
    user_style:s,word_count:words,question_count:q,direct_question:askDirect,
    response_contract:{
      answer_first:true,mirror_user_length:true,mirror_dialect:true,avoid_canned_opening:true,
      max_clarifying_questions:1,headings:s.headings,cta:"only_when_natural",
      product_claims:"live_evidence_only",technical_claims:"engineering_evidence",legal_claims:"official_uae_source"
    }
  };
}

export function shouldUseAdaptiveSalesAgent(message="",salesTurn={}){
  if(!clean(message)) return false;
  // V17 lets the neural employee phrase normal in-domain turns while the Conversation OS controls the sales move and response shape.
  return true;
}

function scoreEntry(query,entry){
  const t=n(query), toks=tokenize(t).filter(x=>x.length>1); let score=0;
  for(const s of arr(entry.signals)){const ns=n(s);if(ns&&t.includes(ns))score+=18;else score+=sim(t,ns)*8;}
  const hay=n(`${entry.title} ${entry.principle} ${entry.stage_strategy}`);
  for(const tok of toks) if(hay.includes(tok)) score+=2;
  return score;
}
export function searchSalesPlaybook(query="",{limit=6,stage=""}={}){
  return SALES_EMPLOYEE_PLAYBOOK.filter(x=>!stage||x.stage===stage)
    .map(x=>({...x,score:Number(scoreEntry(query,x).toFixed(3))}))
    .sort((a,b)=>b.score-a.score).slice(0,Math.max(1,Math.min(10,Number(limit)||6)));
}

export function salesReplyQuality(reply="",salesTurn={}){
  const plan=salesTurn?.conversation_plan||{};
  const natural=evaluateNaturalSalesReply(reply,{plan,message:salesTurn?.raw||"",history:salesTurn?.history||[]});
  const text=clean(reply,8000), legacy=[];
  if(/^(أهلا بك في MIG FARM|هلا بك في MIG FARM|حسب المعلومات الموجودة|بناء على طلبك)/.test(text)) legacy.push("canned_opening_risk");
  const human=salesTurn?.human_turn||null;
  const align=human?evaluateCurrentTurnAlignment(reply,{message:salesTurn?.raw||"",humanTurn:human,history:salesTurn?.history||[]}):{score:100,flags:[],aligned:true};
  const flags=[...new Set([...(natural.flags||[]),...legacy,...(align.flags||[])])];
  const score=Math.max(0,Math.min(natural.score??100,align.score??100,100-flags.length*12));
  return {...natural,version:VERSION,score,flags,semantic_alignment:align,stage:salesTurn?.stage||"",mood:salesTurn?.mood||""};
}

export function salesEmployeeHealth(){
  return {version:VERSION,mode:"conversion_aware_adaptive_human_sales_employee",playbook_entries:SALES_EMPLOYEE_PLAYBOOK.length,conversation_os:salesConversationOSHealth(),capabilities:["free_form_conversation","adaptive_response_length","dialect_mirroring","consultative_sales","objection_handling","single_question_qualification","natural_closing","technical_to_commerce_transition","no_forced_cta","non_template_response_policy","next_best_action","buyer_readiness","response_shape_variation","history_aware_followup","naturalness_quality_gate","current_turn_semantic_priority","stale_context_quarantine","zero_tool_casual_mode","conversion_decision_integration","ethical_close_timing","product_dossier_grounding"]};
}
