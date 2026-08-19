const VERSION="28.0";
const AGENT_MAP={
  branches:"business_facts",contact:"business_facts",hours:"business_facts",shipping:"business_facts",payment:"business_facts",returns:"business_facts",order_status:"odoo_operations",
  price:"product_truth",availability:"product_truth",comparison:"product_intelligence",product_details:"product_intelligence",product_search:"sales_advisor",purchase:"commerce_orchestrator",
  dosage:"agricultural_safety",agriculture_diagnosis:"senior_agronomist",identity:"conversation",social:"conversation",thanks:"conversation"
};

function clean(value="",max=7000){return String(value??"").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g," ").replace(/[ \t]+/g," ").replace(/\n{3,}/g,"\n\n").trim().slice(0,max);}
function unique(values=[]){return [...new Set(values.filter(Boolean))];}
function replyBlocks(reply=""){
  const blocks=[];
  for(const paragraph of clean(reply,7000).split(/\n\n+/).filter(Boolean)){
    const heading=paragraph.match(/^\*\*([^*]{2,80})\*\*\s*(.*)$/s);
    if(heading){blocks.push({type:"section",title:clean(heading[1].replace(/[:：]\s*$/,"") ,80),text:clean(heading[2],1800)});continue;}
    const lines=paragraph.split("\n").map(x=>x.trim()).filter(Boolean);
    if(lines.length>1&&lines.every(x=>/^[-•–]\s+/.test(x))){blocks.push({type:"list",items:lines.map(x=>clean(x.replace(/^[-•–]\s+/,""),500)).slice(0,8)});continue;}
    blocks.push({type:"paragraph",text:clean(paragraph,2200)});
  }
  return blocks.slice(0,10);
}
function normalizeNaturalReply(reply=""){
  let text=clean(reply,7000);
  text=text.replace(/Odoo Live/gi,"المتجر مباشرة").replace(/Odoo/gi,"المتجر");
  const seen=new Set(),parts=[];
  for(const p of text.split(/\n\n+/)){
    const key=p.toLowerCase().replace(/[\s.*:_-]+/g," ").trim();
    if(!key||seen.has(key))continue;seen.add(key);parts.push(p.trim());
  }
  return parts.join("\n\n");
}

export function createSupervisorPlanV28({message="",frame=null,analysis={},hasImages=false}={}){
  const tasks=(Array.isArray(frame?.tasks)?frame.tasks:[]).map((task,index)=>({
    order:index+1,intent:String(task?.intent||"unknown").slice(0,80),agent:AGENT_MAP[task?.intent]||"general_reasoner",status:"planned"
  }));
  if(hasImages)tasks.unshift({order:0,intent:"visual_evidence",agent:"vision_specialist",status:"planned"});
  const agents=unique(tasks.map(x=>x.agent));
  const safetyRequired=tasks.some(x=>["dosage","agriculture_diagnosis","purchase","order_status"].includes(x.intent));
  return {
    version:VERSION,id:`sup_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`,
    mode:"enterprise_supervisor",message_length:clean(message,4000).length,tasks,agents:[...agents,"quality_critic"],
    multi_intent:tasks.filter(x=>x.order>0).length>1,requires_live_truth:tasks.some(x=>["price","availability","purchase","order_status"].includes(x.intent)),
    safety_required:safetyRequired,context_policy:frame?.topic_switch?"current_turn_quarantine":"bounded_memory",
    answer_contract:{ordered:true,complete:true,natural:true,one_question_max:true,grounded_claims:true,no_internal_jargon:true}
  };
}

export function superviseResponseV28({payload={},plan=null,frame=null,source="",audit={}}={}){
  const next={...(payload&&typeof payload==="object"?payload:{})};
  const reply=normalizeNaturalReply(next.reply||next.display_reply||"");
  if(reply){next.reply=reply;next.display_reply=reply;next.reply_blocks=replyBlocks(reply);}
  const taskNames=(frame?.tasks||[]).map(x=>x.intent);
  const missing=Array.isArray(audit?.missing_tasks)?audit.missing_tasks:[];
  const completed=taskNames.filter(x=>!missing.includes(x));
  const qualityScore=Math.max(0,Math.min(100,Number(audit?.score)||0));
  const flags=unique([
    ...missing.map(x=>`missing:${x}`),audit?.dose_claim_risk?"unsafe_dosage_claim":null,audit?.stale_context_risk?"stale_context":null,
    !reply?"empty_reply":null
  ]);
  if(flags.length&&qualityScore<72)next.escalation=true;
  next.enterprise_supervision={
    version:VERSION,plan_id:plan?.id||"",source:String(source||"").slice(0,120),quality_score:qualityScore,
    passed:qualityScore>=72&&!flags.includes("unsafe_dosage_claim"),completed_tasks:completed,missing_tasks:missing,flags,
    response_shape:next.reply_blocks?.length>1?"structured":"conversational"
  };
  return {payload:next,review:next.enterprise_supervision};
}

export function enterpriseSupervisorHealthV28(){
  return {version:VERSION,mode:"enterprise_multi_agent_supervisor",agents:unique(Object.values(AGENT_MAP)).concat(["vision_specialist","general_reasoner","quality_critic"]),gates:["current_turn","task_completion","live_truth","agricultural_safety","natural_format","quality_before_send"]};
}
