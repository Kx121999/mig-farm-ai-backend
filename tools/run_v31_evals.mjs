import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  understandTurnV31, applyMeaningFrameV31, shouldQuarantineContextV31,
  allowLegacyRouteV31, auditMeaningAlignmentV31, enforceMeaningAlignmentV31
} from "../lib/llm_first_orchestrator_v31.js";

const root=new URL("..",import.meta.url).pathname,results=[];
function add(id,category,passed,detail={}){results.push({id,category,passed:Boolean(passed),detail});}
process.env.OPENAI_API_KEY="";
const poisoned={turn:9,topic:"product",crop:"cucumber",last_intent:"known_product_info",selected_product:"مبيد قديم",active_product_context:{product:{name:"مبيد قديم",sku:"OLD"}},dialogue_v29:{expected:{active:true,field:"product_selection",intent:"known_product_info",question:"اسم المنتج؟"}}};

const guarded=[
  ["اسمك ايه؟","identity"],["مين انت","identity"],["انت مين؟","identity"],["شو اسمك","identity"],["ما اسمك؟","identity"],["who are you","identity"],["what is your name?","identity"],
  ["اهلا","greeting"],["هلا","greeting"],["مرحبا","greeting"],["السلام عليكم","greeting"],["hello","greeting"],["hi","greeting"],
  ["شكرا","thanks"],["مشكور","thanks"],["تسلم","thanks"],["thanks","thanks"],
  ["وين مكانكم؟","branches"],["فين مكانكم","branches"],["وين فروعكم","branches"],["اين فروعكم؟","branches"],["مكان الفرع","branches"]
];
for(const [message,intent] of guarded){
  const frame=await understandTurnV31({message,state:poisoned,legacyAnalysis:{intent:"known_product_info"}});
  const analysis={intent:"known_product_info",memoryAction:"current"},semantic={};applyMeaningFrameV31(analysis,semantic,frame);
  add(`guard_${results.length}`,"full_utterance_guard",frame.authoritative&&frame.primary_intent===intent&&analysis.intent===intent&&shouldQuarantineContextV31(frame),{message,intent:frame.primary_intent,provider:frame.provider});
}

for(const [intent,message,bad,expected] of [
  ["identity","اسمك ايه؟","الجرعة لا تتحدد من غير اسم المنتج.",/MIG FARM AI/],
  ["branches","وين مكانكم؟","ابعت صورة ملصق المبيد.",/الشارقة والعين/],
  ["contact","عايز رقمكم","المحصول محتاج فحص الجذور.",/الشارقة|العين/],
  ["shipping","بتوصلوا دبي؟","استخدم 5 مل لكل لتر.",/الإمارة|التوصيل/]
]){
  const frame={version:"31.0",authoritative:true,primary_intent:intent,intents:[{name:intent,confidence:.99}],domain:intent==="identity"?"social":"mig_farm_business",topic_relationship:"new_topic",context_policy:{ignore_old_product:true,ignore_old_agriculture:true},response_plan:{external_facts_required:intent!=="identity"},ambiguity:{required:false},safe_direct_reply:intent==="identity"?"أنا MIG FARM AI، مساعدك للمنتجات والزراعة وخدمات MIG FARM.":null};
  const audit=auditMeaningAlignmentV31({message,frame,payload:{reply:bad},source:"legacy_template"}),fixed=enforceMeaningAlignmentV31({payload:{reply:bad},frame,audit});
  add(`alignment_${intent}`,"alignment_guard",!audit.passed&&expected.test(fixed.reply)&&!/(?:5 مل|فحص الجذور|صورة ملصق)/.test(fixed.reply),{flags:audit.flags,reply:fixed.reply});
}

const routeFrames=[
  ["identity",["identity"],["known_product_info","dosage","branches"]],
  ["branches",["branches"],["known_product_info","identity","dosage"]],
  ["price",["known_product_info"],["branches","identity","diagnosis"]],
  ["availability",["known_product_info"],["shipping","identity","dosage"]],
  ["dosage",["known_product_info"],["branches","identity","shipping"]],
  ["compare",["product_memory"],["identity","branches","diagnosis"]],
  ["bundle",["recommendation"],["identity","contact","dosage"]]
];
for(const [intent,allowed,blocked] of routeFrames){
  const frame={version:"31.0",authoritative:true,primary_intent:intent,intents:[{name:intent,confidence:.95}]};
  for(const route of allowed)add(`route_allow_${intent}_${route}`,"legacy_route_gate",allowLegacyRouteV31(route,frame),{});
  for(const route of blocked)add(`route_block_${intent}_${route}`,"legacy_route_gate",!allowLegacyRouteV31(route,frame),{});
}

for(let i=0;i<30;i++){
  const frame={version:"31.0",authoritative:true,primary_intent:i%2?"identity":"branches",intents:[{name:i%2?"identity":"branches",confidence:.9}],domain:i%2?"social":"mig_farm_business",topic_relationship:"new_topic",context_policy:{ignore_old_product:true,ignore_old_agriculture:true},response_plan:{external_facts_required:!(i%2)},ambiguity:{required:false},safe_direct_reply:i%2?"أنا MIG FARM AI.":null};
  const audit=auditMeaningAlignmentV31({message:i%2?"اسمك ايه":"وين مكانكم",frame,payload:{reply:i%2?"أنا MIG FARM AI.":"إحنا في الشارقة والعين."},source:"aligned"});
  add(`stability_${i}`,"stability",audit.passed&&audit.score>=90&&shouldQuarantineContextV31(frame),{});
}

const passed=results.filter(x=>x.passed).length;
const report={version:"31.0",generated_at:new Date().toISOString(),status:passed===results.length?"pass":"fail",passed,total:results.length,categories:Object.fromEntries([...new Set(results.map(x=>x.category))].map(category=>[category,{passed:results.filter(x=>x.category===category&&x.passed).length,total:results.filter(x=>x.category===category).length}])),results};
mkdirSync(join(root,"evals"),{recursive:true});writeFileSync(join(root,"evals","v31_eval_report.json"),JSON.stringify(report,null,2)+"\n");
if(report.status!=="pass"){console.error(JSON.stringify(report,null,2));process.exit(1);}
console.log(`V31 LLM-first meaning evals PASS — ${passed}/${results.length}`);
