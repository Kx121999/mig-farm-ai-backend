import { createHash } from "node:crypto";

const VERSION="30.0";
const metrics=globalThis.__migV30ClosedLoopMetrics||{turns:0,answered:0,clarified:0,handed_off:0,blocked:0,context_resolved:0,provider_fallbacks:0,corrected_turns:0,grounded_turns:0,sources:{},fingerprints:{}};
globalThis.__migV30ClosedLoopMetrics=metrics;
function clean(value="",max=160){return String(value??"").replace(/[\u0000-\u001f]/g," ").replace(/\s+/g," ").trim().slice(0,max);}
function fingerprint(parts=[]){return createHash("sha256").update(parts.map(x=>clean(x,80)).join("|")).digest("hex").slice(0,20);}
function boundedMap(map={},max=80){const entries=Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,max);return Object.fromEntries(entries);}

export function recordClosedLoopOutcomeV30({analysis={},reasoning={},plan={},assessment={},source="",results=[]}={}){
  const decision=clean(assessment?.decision,30)||"answer",src=clean(source,80)||"unknown";
  metrics.turns+=1;
  if(decision==="answer")metrics.answered+=1;
  if(decision==="clarify")metrics.clarified+=1;
  if(decision==="handoff")metrics.handed_off+=1;
  if(decision==="block")metrics.blocked+=1;
  if(reasoning?.resolution?.resolved)metrics.context_resolved+=1;
  if(/fallback|provider_unavailable|timeout/.test(src))metrics.provider_fallbacks+=1;
  if(reasoning?.correction||analysis?.correction)metrics.corrected_turns+=1;
  if((Array.isArray(results)&&results.length>0)||assessment?.grounding?.evidence_present)metrics.grounded_turns+=1;
  metrics.sources[src]=(metrics.sources[src]||0)+1;
  const fp=fingerprint([analysis?.intent,plan?.mission?.primary,decision,assessment?.reason,src]);
  metrics.fingerprints[fp]=(metrics.fingerprints[fp]||0)+1;
  metrics.sources=boundedMap(metrics.sources,40);metrics.fingerprints=boundedMap(metrics.fingerprints,80);
  return {version:VERSION,recorded:true,outcome:{decision,confidence:Number(assessment?.score)||0,source:src,context_resolved:Boolean(reasoning?.resolution?.resolved),grounded:Boolean((Array.isArray(results)&&results.length)||assessment?.grounding?.evidence_present)},fingerprint:fp,privacy:{raw_message:false,raw_reply:false,session_id:false,personal_identifiers:false}};
}

export function closedLoopLearningSnapshotV30(){
  const turns=Math.max(1,metrics.turns);
  return {version:VERSION,ready:true,turns:metrics.turns,rates:{answered:Number((metrics.answered/turns).toFixed(4)),clarified:Number((metrics.clarified/turns).toFixed(4)),handoff:Number((metrics.handed_off/turns).toFixed(4)),blocked:Number((metrics.blocked/turns).toFixed(4)),context_resolution:Number((metrics.context_resolved/turns).toFixed(4)),grounded:Number((metrics.grounded_turns/turns).toFixed(4)),provider_fallback:Number((metrics.provider_fallbacks/turns).toFixed(4))},sources:{...metrics.sources},pattern_count:Object.keys(metrics.fingerprints).length,privacy:{aggregate_only:true,hashed_patterns:true,raw_transcripts:false,direct_identifiers:false}};
}

export function closedLoopLearningHealthV30(){return {version:VERSION,ready:true,mode:"privacy_safe_closed_loop_outcome_learning",signals:["gateway_decision","confidence","context_resolution","grounding","provider_fallback","correction"],stores_raw_messages:false,stores_raw_replies:false};}
