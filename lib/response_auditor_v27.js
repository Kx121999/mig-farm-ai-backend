const VERSION="27.0";
const COVERAGE={
  branches:/(?:الشارقه|الشارقة|العين|فرع|موقع)/i,contact:/(?:\+971|sales@|واتساب|تواصل)/i,hours:/(?:الدوام|ساعات|وقت|مؤكد|الفريق)/i,
  shipping:/(?:توصيل|شحن|درهم|delivery)/i,payment:/(?:دفع|checkout|كاش|بطاق)/i,returns:/(?:استرجاع|استبدال|الشروط|الفريق)/i,
  order_status:/(?:رقم الطلب|تتبع|الطلب|تحقق)/i,identity:/(?:MIG FARM AI|ميج فارم)/i,social:/(?:تمام|بخير|الحمد|جاهز)/i,thanks:/(?:العفو|حبيبي|تسلم)/i,
  price:/(?:السعر|درهم|Odoo|اودو|أودو|مباشر)/i,availability:/(?:متوفر|التوفر|المخزون|Odoo|اودو|أودو)/i,product_details:/(?:تفاصيل|مواصفات|استخدام|منتج)/i,
  product_search:/(?:منتج|خيارات|نتائج|أرشح|متجر)/i,purchase:/(?:طلب|شراء|الكمية|سلة)/i,dosage:/(?:جرعة|ملصق|مهندس)/i,agriculture_diagnosis:/(?:تشخيص|سبب|قياس|صورة|جذور|ري)/i
};
function clean(value="",max=5000){return String(value??"").replace(/[\u0000-\u001f]/g," ").replace(/[ \t]+/g," ").replace(/\n{3,}/g,"\n\n").trim().slice(0,max);}
function dedupeParagraphs(text){const seen=new Set(),out=[];for(const part of text.split(/\n\n+/)){const key=part.toLowerCase().replace(/\s+/g," ").trim();if(!key||seen.has(key))continue;seen.add(key);out.push(part.trim());}return out.join("\n\n");}
function limitQuestions(text,max=1){let count=0;return text.replace(/[؟?]/g,m=>{count+=1;return count<=max?m:".";});}

export function auditCustomerResponseV27({reply="",frame=null,source="",state={}}={}){
  const text=clean(reply,8000),tasks=Array.isArray(frame?.tasks)?frame.tasks:[];const missing=[];
  for(const task of tasks){const rx=COVERAGE[task.intent];if(rx&&!rx.test(text))missing.push(task.intent);}
  const questionCount=(text.match(/[؟?]/g)||[]).length;
  const doseClaim=tasks.some(x=>x.intent==="dosage")&&/\b\d+(?:[.,]\d+)?\s*(?:مل|ملي|لتر|جرام|جم|كجم|kg|ml|l)\b/i.test(text)&&!/(?:ملصق|label|موثق|مكتوب)/i.test(text);
  const staleTerms=[state?.category,state?.crop].filter(x=>String(x||"").length>2);const staleLeak=Boolean(frame?.topic_switch&&staleTerms.some(x=>text.includes(String(x))&&!String(frame?.message||"").includes(String(x))));
  const score=Math.max(0,100-(missing.length*18)-(Math.max(0,questionCount-1)*8)-(doseClaim?35:0)-(staleLeak?22:0));
  return {version:VERSION,score,passed:score>=72&&!doseClaim,missing_tasks:missing,question_count:questionCount,dose_claim_risk:doseClaim,stale_context_risk:staleLeak,source:clean(source,100)};
}

export function enforceCustomerResponseV27(payload={},frame=null){
  if(!payload||typeof payload!=="object")return payload;
  let reply=dedupeParagraphs(clean(payload.reply||payload.display_reply||"",5000));
  reply=limitQuestions(reply,Number(frame?.answer_contract?.one_question_max===false?3:1));
  if(reply){payload.reply=reply;if(payload.display_reply)payload.display_reply=reply;}
  return payload;
}

export function responseAuditorHealthV27(){return {version:VERSION,mode:"pre_send_customer_response_auditor",checks:["multi_intent_completion","one_question_max","dosage_label_grounding","stale_context_leak","duplicate_paragraphs"],policy:"audit_then_bounded_rewrite"};}

