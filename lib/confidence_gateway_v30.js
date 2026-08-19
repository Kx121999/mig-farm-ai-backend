import { normalizeAr } from "./utils.js";

const VERSION="30.0";
function clean(value="",max=5000){return String(value??"").replace(/[\u0000-\u001f]/g," ").replace(/\s+/g," ").trim().slice(0,max);}
function clamp(value,min=0,max=100){return Math.max(min,Math.min(max,Math.round(Number(value)||0)));}
function has(rx,value){return rx.test(normalizeAr(clean(value,6000)));}

export function evaluateConfidenceGatewayV30({payload={},plan={},source="",results=[],audit={},review={},evidence={},reasoning={}}={}){
  const reply=clean(payload?.display_reply||payload?.reply),risk=plan?.risk||{},flags=new Set([...(audit?.flags||[]),...(review?.flags||[])]);
  if(audit?.dose_claim_risk)flags.add("unsafe_dosage_claim");
  if(audit?.stale_context_risk)flags.add("stale_context");
  const missing=Array.isArray(audit?.missing_tasks)?audit.missing_tasks:[];
  let score=92;
  if(!reply)score-=70;
  if(/(?:fallback|unknown|repair|no_live)/.test(String(source)))score-=16;
  score-=Math.min(24,missing.length*8);
  score-=Math.min(22,flags.size*7);
  if(risk.live_commerce&&!Array.isArray(results))score-=12;
  if(risk.live_commerce&&Array.isArray(results)&&results.length===0&&!/business|branch|contact|shipping/.test(String(source)))score-=10;
  if(risk.dosage&&!plan?.evidence_contract?.label_evidence)score-=30;
  if(reasoning?.clarification?.required)score=Math.min(score,72);
  if(Number(audit?.score)>0)score=Math.round(score*.55+Number(audit.score)*.45);
  if(Number(review?.quality_score)>0)score=Math.round(score*.7+Number(review.quality_score)*.3);
  const unsafeDosage=risk.dosage&&(flags.has("unsafe_dosage_claim")||has(/\b\d+(?:[.,]\d+)?\s*(?:مل|سم3|جرام|غم)\s*(?:\/|لكل|في)/,reply))&&!has(/(?:حسب الملصق|تعليمات الملصق|صورة الملصق|غير مؤكده|غير مؤكدة)/,reply);
  const fabricatedAction=has(/(?:تم تأكيد الطلب|تم الدفع|طلبك اتنفذ|تم تنفيذ الطلب)/,reply)&&!payload?.autonomous_action?.verified;
  const hardBlock=unsafeDosage||fabricatedAction;
  let decision="answer",reason="confidence_target_met";
  if(hardBlock){decision="block";reason=unsafeDosage?"unverified_dosage_claim":"unverified_action_claim";score=Math.min(score,25);}
  else if(reasoning?.clarification?.required){decision="clarify";reason="specific_context_missing";}
  else if(risk.level==="high"&&score<65){decision="handoff";reason="high_risk_low_confidence";}
  else if(score<55){decision="clarify";reason="insufficient_grounding";}
  const target=Math.round((Number(plan?.confidence_target)||.82)*100);
  return {version:VERSION,score:clamp(score),target,passed:decision==="answer"&&score>=Math.min(target,80),decision,reason,flags:[...flags].slice(0,12),missing_tasks:missing.slice(0,8),risk_level:risk.level||"low",grounding:{source:clean(source,100),result_count:Array.isArray(results)?results.length:0,evidence_present:Boolean(evidence&&Object.keys(evidence).length)},privacy:{raw_reply_stored:false}};
}

export function enforceConfidenceGatewayV30({payload={},assessment={},reasoning={}}={}){
  const out={...payload};
  if(assessment.decision==="block"){
    const reply=assessment.reason==="unverified_action_claim"
      ?"ما أقدرش أقول إن الطلب أو الدفع اتنفّذ من غير تأكيد رسمي ظاهر. أقدر أجهز لك الخطوة التالية الآمنة أو أحوّلك للفريق."
      :"الجرعة لازم تتحدد من اسم المنتج والمحصول ومرحلة الاستخدام وتعليمات الملصق. ابعت اسم المنتج أو صورة الملصق، وأنا أراجعها بدون تخمين.";
    out.reply=reply;out.display_reply=reply;out.escalation=assessment.risk_level==="high";
  }else if(assessment.decision==="clarify"&&(!clean(out.reply)||assessment.reason==="specific_context_missing")){
    const reply=clean(reasoning?.clarification?.question,500)||"وضح لي المنتج أو الهدف المقصود بكلمتين عشان أديك إجابة دقيقة.";
    out.reply=reply;out.display_reply=reply;
  }else if(assessment.decision==="handoff"){
    const existing=clean(out.reply,3500);
    const suffix="المعلومة دي حساسة ومحتاجة تحقق إضافي؛ أقدر أحوّلك لمختص MIG FARM مع ملخص واضح.";
    out.reply=existing?`${existing}\n\n${suffix}`:suffix;out.display_reply=out.reply;out.escalation=true;
  }
  out.confidence_gateway_v30=assessment;
  return out;
}

export function confidenceGatewayHealthV30(){return {version:VERSION,ready:true,mode:"calibrated_pre_send_decision_gateway",decisions:["answer","clarify","handoff","block"],hard_guards:["unverified_dosage","unverified_order_or_payment_claim"],preserves_verified_reply:true};}
