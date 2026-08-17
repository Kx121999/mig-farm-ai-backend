import { createRequire } from "node:module";
import { normalizeAr, tokenize, fuzzyWordMatch } from "./utils.js";

const require=createRequire(import.meta.url);
const raw=require("../data/knowledge.json");

const HIGH_RISK_RE=/(جرع|جرعة|dose|dosage|mix rate|نسبة الخلط|كم مل|كم ملي|سموم|toxicity)/i;

function n(v=""){ return normalizeAr(String(v||"")); }
function arr(v){ return Array.isArray(v)?v:[]; }
function clone(v){ return JSON.parse(JSON.stringify(v)); }
function num(v,fallback=0){ const x=Number(v); return Number.isFinite(x)?x:fallback; }

export function validateGitHubKnowledge(input=raw){
  const errors=[],warnings=[];
  const ids=new Set();
  const entries=arr(input?.entries);
  entries.forEach((entry,index)=>{
    const at=`entries[${index}]`;
    if(!entry?.id) errors.push(`${at}: id مطلوب`);
    if(entry?.id && ids.has(entry.id)) errors.push(`${at}: id مكرر`);
    if(entry?.id) ids.add(entry.id);
    if(!entry?.title && !entry?.question) errors.push(`${at}: title أو question مطلوب`);
    if(!entry?.answer) errors.push(`${at}: answer مطلوب`);
    const all=[entry?.title,entry?.question,entry?.answer,...arr(entry?.keywords)].join(" ");
    if(HIGH_RISK_RE.test(all) && !entry?.safety_approved){
      errors.push(`${at}: محتوى جرعات/خلط يحتاج safety_approved=true`);
    }
    if(!arr(entry?.keywords).length && !entry?.question){
      warnings.push(`${at}: أضف keywords لتحسين المطابقة`);
    }
  });
  return {ok:errors.length===0,errors,warnings};
}

const validation=validateGitHubKnowledge(raw);
if(!validation.ok){
  console.error("MIG_GITHUB_KNOWLEDGE_INVALID",JSON.stringify(validation.errors));
}

function phraseScore(hay="",needle=""){
  const h=n(hay),q=n(needle);
  if(!h||!q) return 0;
  if(h===q) return 18;
  if(h.includes(q)||q.includes(h)) return q.includes(" ")?12:7;
  return 0;
}

function similarity(a="",b=""){
  const aa=tokenize(a),bb=tokenize(b);
  if(!aa.length||!bb.length) return 0;
  let hit=0;
  for(const x of aa){
    if(bb.some(y=>x===y||x.includes(y)||y.includes(x)||fuzzyWordMatch(x,y))) hit++;
  }
  return (hit/Math.max(aa.length,bb.length))*14;
}

function scoreEntry(entry,message,locale,context={}){
  if(entry?.enabled===false) return -999;
  if(entry?.locale && entry.locale!==locale) return -50;

  // Optional intent guard prevents generic words such as emirate names from
  // making a shipping/branch entry hijack a greenhouse or product question.
  const allowedIntents=arr(entry?.intents).map(String).filter(Boolean);
  const currentIntent=String(context?.analysis?.intent||"");
  if(allowedIntents.length && currentIntent && !allowedIntents.includes(currentIntent)) return -999;

  let semantic=0;
  semantic+=phraseScore(message,entry?.question)*1.5;
  semantic+=similarity(message,entry?.question)*1.5;
  for(const keyword of arr(entry?.keywords)){
    semantic+=phraseScore(message,keyword)*1.1;
    semantic+=similarity(message,keyword)*0.65;
  }
  semantic+=similarity(message,entry?.title)*0.45;

  // Priority is only a tie-break/boost AFTER a real semantic match.
  // It must never make an unrelated entry match a greeting or random message.
  if(semantic<2) return -999;
  return semantic + Math.max(-20,Math.min(100,num(entry?.priority,10)))*0.12;
}

export function githubKnowledgeStatus(){
  return {
    edition:"github",
    enabled:raw?.settings?.enabled!==false,
    entries_count:arr(raw?.entries).length,
    updated_at:raw?.updated_at||null,
    valid:validation.ok,
    errors_count:validation.errors.length,
    warnings_count:validation.warnings.length
  };
}

export function getGitHubKnowledge(){
  return clone(raw);
}

export function answerGitHubKnowledge(message="",context={}){
  if(!validation.ok || raw?.settings?.enabled===false || !message) return null;
  const locale=context?.locale==="en"?"en":"ar";
  const min=Math.max(4,Math.min(60,num(raw?.settings?.min_match_score,10)));
  const max=Math.max(1,Math.min(4,num(raw?.settings?.max_answer_entries,2)));

  const ranked=arr(raw.entries)
    .map(entry=>({entry,score:scoreEntry(entry,message,locale,context)}))
    .filter(x=>x.score>=min)
    .sort((a,b)=>b.score-a.score || num(b.entry?.priority)-num(a.entry?.priority))
    .slice(0,max);

  if(!ranked.length) return null;

  return {
    reply:ranked.map(x=>String(x.entry.answer||"").trim()).filter(Boolean).join("\n\n"),
    entries:ranked.map(x=>({
      id:x.entry.id,
      title:x.entry.title||x.entry.question||"",
      verified:Boolean(x.entry.verified),
      source_label:x.entry.source_label||"",
      score:Number(x.score.toFixed(2))
    })),
    source:"github_knowledge",
    confidence:ranked[0].entry?.verified?"high":"medium"
  };
}
