import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { analyzeTurn } from "../lib/dialogue.js";
import { reasonConversationTurnV29, applyConversationReasoningV29 } from "../lib/conversation_reasoning_v29.js";

const root=new URL("..",import.meta.url).pathname;
const results=[];
function evaluate(id,message,state,expected){
  const analysis=analyzeTurn(message,state,[],"ar"),reasoning=reasonConversationTurnV29({message,state,analysis,history:[]});
  applyConversationReasoningV29(analysis,reasoning);
  const checks={
    intent:expected.intent?analysis.intent===expected.intent:true,
    emirate:expected.emirate?analysis.emirate===expected.emirate:true,
    crop:expected.crop?analysis.crop?.key===expected.crop:true,
    cultivation:expected.cultivation?analysis.cultivation===expected.cultivation:true,
    memory_action:expected.memoryAction?analysis.memoryAction===expected.memoryAction:true,
    clarification:expected.clarification===undefined?true:Boolean(reasoning.clarification.required)===expected.clarification,
    resolved:expected.resolved===undefined?true:Boolean(reasoning.resolution.resolved)===expected.resolved
  };
  results.push({id,message,passed:Object.values(checks).every(Boolean),checks,intent:analysis.intent,resolution:reasoning.resolution.kind});
}

const branchState={turn:2,topic:"branches",dialogue_v29:{expected:{active:true,field:"branch",intent:"branches",question:"تحب بيانات أنهي فرع؟",choices:["فرع الشارقة","فرع العين"],asked_turn:2,expires_turn:4}}};
for(const [emirate,aliases] of [["العين",["العين","عين","فرع العين","3ain","alain","al ain"]],["الشارقة",["الشارقه","الشارقة","شارقة","فرع الشارقه","sharjah"]]]){
  aliases.forEach((message,index)=>evaluate(`branch_${emirate}_${index}`,message,branchState,{intent:"branches",emirate,resolved:true}));
}

const cropState={turn:3,pending:"crop",dialogue_v29:{expected:{active:true,field:"crop",intent:"recommendation",question:"شو المحصول؟",choices:["طماطم","خيار","فلفل","باذنجان"],asked_turn:3,expires_turn:5}}};
const crops={cucumber:["خيار","5yar","khyar","cucumber"],tomato:["طماطم","طماطمم","بندوره","بندورة","tomato"],pepper:["فلفل","فليفله","pepper","capsicum"],eggplant:["باذنجان","بتنجان","eggplant"],zucchini:["كوسه","كوسة","zucchini"],okra:["باميه","بامية","okra"]};
for(const [crop,aliases] of Object.entries(crops))aliases.forEach((message,index)=>evaluate(`crop_${crop}_${index}`,message,cropState,{intent:"recommendation",crop,resolved:true}));

const cultivationState={turn:4,pending:"cultivation",dialogue_v29:{expected:{active:true,field:"cultivation",intent:"recommendation",question:"مكشوف ولا بيت محمي؟",choices:["مكشوف","بيت محمي"],asked_turn:4,expires_turn:6}}};
for(const [cultivation,aliases] of [["open_field",["مكشوف","ارض مكشوفه","حقل مفتوح","open field"]],["greenhouse",["محمي","بيت محمي","صوبه","صوبة","greenhouse"]],["hydroponic",["مائي","زراعة مائية","هيدروبونيك","hydroponic"]]])aliases.forEach((message,index)=>evaluate(`cultivation_${cultivation}_${index}`,message,cultivationState,{intent:"recommendation",cultivation,resolved:true}));

const productState={turn:5,topic:"product",visible_products:[{name:"خيار وفرة F1"},{name:"خيار جبارة F1"},{name:"خيار ثالث"},{name:"خيار رابع"}]};
for(const [index,aliases] of [[0,["الاول","الأول","اول","first"]],[1,["التاني","الثاني","تاني","second"]],[2,["التالت","الثالث","third"]],[3,["الرابع","fourth"]]])aliases.forEach((message,i)=>evaluate(`ordinal_${index}_${i}`,message,productState,{intent:"product_memory",memoryAction:`ordinal:${index}`,resolved:true}));

for(const message of ["سعره كام","هو متوفر؟","استخدامه ايه","تفاصيل المنتج ده"])evaluate(`ambiguous_${message}`,message,productState,{clarification:true,resolved:false});

const passed=results.filter(item=>item.passed).length;
const report={version:"29.0",generated_at:new Date().toISOString(),status:passed===results.length?"pass":"fail",passed,total:results.length,categories:{branches:results.filter(x=>x.id.startsWith("branch_")).length,crops:results.filter(x=>x.id.startsWith("crop_")).length,cultivation:results.filter(x=>x.id.startsWith("cultivation_")).length,product_reference:results.filter(x=>x.id.startsWith("ordinal_")||x.id.startsWith("ambiguous_")).length},results};
mkdirSync(join(root,"evals"),{recursive:true});writeFileSync(join(root,"evals","v29_eval_report.json"),JSON.stringify(report,null,2)+"\n");
if(report.status!=="pass"){console.error(JSON.stringify(report,null,2));process.exit(1);}
console.log(`V29 conversational reasoning evals PASS — ${passed}/${results.length}`);
