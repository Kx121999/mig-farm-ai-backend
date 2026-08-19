import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { authenticateAdminV28, adminSecurityHeadersV28, adminAuthHealthV28 } from "../lib/admin_auth_v28.js";
import { enterpriseTelemetrySnapshotV28, enterpriseTelemetryHealthV28 } from "../lib/enterprise_telemetry_v28.js";
import { enterpriseRetrievalHealthV28 } from "../lib/enterprise_retrieval_v28.js";
import { enterpriseSupervisorHealthV28 } from "../lib/supervisor_v28.js";
import { conversationReasoningHealthV29 } from "../lib/conversation_reasoning_v29.js";
import { autonomousCustomerOSHealthV30 } from "../lib/autonomous_customer_os_v30.js";
import { customerDigitalTwinHealthV30 } from "../lib/customer_digital_twin_v30.js";
import { confidenceGatewayHealthV30 } from "../lib/confidence_gateway_v30.js";
import { closedLoopLearningHealthV30, closedLoopLearningSnapshotV30 } from "../lib/closed_loop_learning_v30.js";
import { llmFirstHealthV31 } from "../lib/llm_first_orchestrator_v31.js";
import { finalProductionHealth, finalProductionSnapshot } from "../lib/final_production_os.js";
import { customerKnowledgeHealthV27 } from "../lib/customer_knowledge_v27.js";
import { persistentStoreHealth } from "../lib/persistent_store.js";
import { autonomousActionHealth } from "../lib/autonomous_action_os.js";
import { selfLearningHealth } from "../lib/self_learning_os.js";

const ROOT=join(dirname(fileURLToPath(import.meta.url)),"..");
function json(body,status=200,extra={}){return Response.json(body,{status,headers:adminSecurityHeadersV28(extra)});}
function configured(name){return Boolean(String(process.env[name]||"").trim());}
function manifest(){try{return JSON.parse(readFileSync(join(ROOT,"knowledge_v28","enterprise_manifest.json"),"utf8"));}catch{return null;}}
function evalReport(){try{return JSON.parse(readFileSync(join(ROOT,"evals","v28_eval_report.json"),"utf8"));}catch{return {status:"not_generated",passed:0,total:0};}}
function v30EvalReport(){try{return JSON.parse(readFileSync(join(ROOT,"evals","v30_eval_report.json"),"utf8"));}catch{return {status:"not_generated",passed:0,total:0};}}
function v31EvalReport(){try{return JSON.parse(readFileSync(join(ROOT,"evals","v31_eval_report.json"),"utf8"));}catch{return {status:"not_generated",passed:0,total:0};}}
function finalEvalReport(){try{return JSON.parse(readFileSync(join(ROOT,"evals","final_eval_report.json"),"utf8"));}catch{return {status:"not_generated",passed:0,total:0};}}

export async function GET(request){
  const auth=authenticateAdminV28(request);if(!auth.ok)return json({ok:false,error:auth.error},auth.status);
  const url=new URL(request.url),limit=Math.max(5,Math.min(100,Number(url.searchParams.get("limit"))||30));
  const telemetry=await enterpriseTelemetrySnapshotV28({limit});
  const knowledge=customerKnowledgeHealthV27(),enterpriseManifest=manifest();
  const services=[
    {key:"openai",label:"OpenAI",ready:configured("OPENAI_API_KEY"),detail:configured("OPENAI_API_KEY")?"متصل":"أضف المفتاح في Vercel"},
    {key:"memory",label:"الذاكرة الدائمة",ready:enterpriseTelemetryHealthV28().persistent,detail:enterpriseTelemetryHealthV28().persistent?"Upstash Redis متصل":"وضع الذاكرة المؤقتة"},
    {key:"odoo",label:"Odoo Actions",ready:/^(1|true|yes|on)$/i.test(String(process.env.ODOO_ACTIONS_ENABLED||"false"))&&["ODOO_ACTION_URL","ODOO_DB","ODOO_USERNAME","ODOO_API_KEY"].every(configured),detail:/^(1|true|yes|on)$/i.test(String(process.env.ODOO_ACTIONS_ENABLED||"false"))?"مفعّل":"مؤجل حسب قرارك"},
    {key:"vector",label:"Vector Knowledge",ready:enterpriseRetrievalHealthV28().external_configured,detail:enterpriseRetrievalHealthV28().external_configured?"متصل":"المعرفة المحلية فعالة"},
    {key:"admin",label:"حماية اللوحة",ready:adminAuthHealthV28().configured,detail:"جلسة مشفرة HttpOnly"},
    {key:"conversation",label:"الفهم الحواري V29",ready:conversationReasoningHealthV29().ready,detail:"يفهم الردود القصيرة والسياق"},
    {key:"autonomous_os",label:"العقل المستقل V30",ready:autonomousCustomerOSHealthV30().ready,detail:autonomousCustomerOSHealthV30().neural_configured?"العقل العصبي متصل مع مسار احتياطي":"المسار الحتمي الاحتياطي فعّال"},
    {key:"confidence",label:"بوابة الثقة V30",ready:confidenceGatewayHealthV30().ready,detail:"تراجع الرد قبل الإرسال"},
    {key:"digital_twin",label:"ملف العميل الآمن",ready:customerDigitalTwinHealthV30().ready,detail:"حقائق صريحة فقط بدون بيانات حساسة"}
    ,{key:"llm_first",label:"فهم المعنى V31",ready:llmFirstHealthV31().ready,detail:llmFirstHealthV31().configured?"يفهم الجملة كاملة قبل أي مسار":"OpenAI غير متصل؛ حارس الطوارئ فعّال"}
    ,{key:"final_os",label:"FINAL Production OS",ready:finalProductionHealth().ready,detail:"تحقق حقائق + مراجعة ذاتية + حواجز أمان"}
  ];
  return json({
    ok:true,version:"31.0.0",mode:"llm_first_semantic_orchestrator_v31",release:"FINAL_PRODUCTION_OS",generated_at:new Date().toISOString(),
    telemetry,
    knowledge:{local:knowledge,enterprise_manifest:enterpriseManifest,retrieval:enterpriseRetrievalHealthV28()},
    quality:{evaluation:evalReport(),v30_evaluation:v30EvalReport(),v31_evaluation:v31EvalReport(),final_evaluation:finalEvalReport(),final_runtime:finalProductionSnapshot(),self_learning:selfLearningHealth(),closed_loop:closedLoopLearningSnapshotV30()},
    platform:{final_production_os:finalProductionHealth(),llm_first_orchestrator:llmFirstHealthV31(),autonomous_customer_os:autonomousCustomerOSHealthV30(),customer_digital_twin:customerDigitalTwinHealthV30(),confidence_gateway:confidenceGatewayHealthV30(),closed_loop_learning:closedLoopLearningHealthV30(),conversation_reasoning:conversationReasoningHealthV29(),supervisor:enterpriseSupervisorHealthV28(),telemetry:enterpriseTelemetryHealthV28(),persistence:persistentStoreHealth(),actions:autonomousActionHealth(),auth:adminAuthHealthV28(),services},
    security:{secrets_returned:false,raw_transcripts_returned:false,admin_session:auth.method,cache:"no-store"}
  });
}
