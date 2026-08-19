import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { authenticateAdminV28, adminSecurityHeadersV28, adminAuthHealthV28 } from "../lib/admin_auth_v28.js";
import { enterpriseTelemetrySnapshotV28, enterpriseTelemetryHealthV28 } from "../lib/enterprise_telemetry_v28.js";
import { enterpriseRetrievalHealthV28 } from "../lib/enterprise_retrieval_v28.js";
import { enterpriseSupervisorHealthV28 } from "../lib/supervisor_v28.js";
import { conversationReasoningHealthV29 } from "../lib/conversation_reasoning_v29.js";
import { customerKnowledgeHealthV27 } from "../lib/customer_knowledge_v27.js";
import { persistentStoreHealth } from "../lib/persistent_store.js";
import { autonomousActionHealth } from "../lib/autonomous_action_os.js";
import { selfLearningHealth } from "../lib/self_learning_os.js";

const ROOT=join(dirname(fileURLToPath(import.meta.url)),"..");
function json(body,status=200,extra={}){return Response.json(body,{status,headers:adminSecurityHeadersV28(extra)});}
function configured(name){return Boolean(String(process.env[name]||"").trim());}
function manifest(){try{return JSON.parse(readFileSync(join(ROOT,"knowledge_v28","enterprise_manifest.json"),"utf8"));}catch{return null;}}
function evalReport(){try{return JSON.parse(readFileSync(join(ROOT,"evals","v28_eval_report.json"),"utf8"));}catch{return {status:"not_generated",passed:0,total:0};}}

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
    {key:"conversation",label:"الفهم الحواري V29",ready:conversationReasoningHealthV29().ready,detail:"يفهم الردود القصيرة والسياق"}
  ];
  return json({
    ok:true,version:"29.0.0",mode:"conversational_reasoning_natural_language_os_v29",generated_at:new Date().toISOString(),
    telemetry,
    knowledge:{local:knowledge,enterprise_manifest:enterpriseManifest,retrieval:enterpriseRetrievalHealthV28()},
    quality:{evaluation:evalReport(),self_learning:selfLearningHealth()},
    platform:{conversation_reasoning:conversationReasoningHealthV29(),supervisor:enterpriseSupervisorHealthV28(),telemetry:enterpriseTelemetryHealthV28(),persistence:persistentStoreHealth(),actions:autonomousActionHealth(),auth:adminAuthHealthV28(),services},
    security:{secrets_returned:false,raw_transcripts_returned:false,admin_session:auth.method,cache:"no-store"}
  });
}
