import { authenticateAdminV28, adminSecurityHeadersV28 } from "../lib/admin_auth_v28.js";
import { enterpriseTelemetrySnapshotV28 } from "../lib/enterprise_telemetry_v28.js";
import { finalProductionHealth, finalProductionSnapshot, finalPromptRegistry } from "../lib/final_production_os.js";

export async function GET(request){
  const auth=authenticateAdminV28(request);
  if(!auth.ok)return Response.json({ok:false,error:auth.error},{status:auth.status,headers:adminSecurityHeadersV28()});
  const snapshot=await enterpriseTelemetrySnapshotV28({limit:100});
  return new Response(JSON.stringify({exported_at:new Date().toISOString(),version:"31.0.0",release:"FINAL_PRODUCTION_OS",privacy_safe:true,final_production_os:finalProductionHealth(),final_runtime:finalProductionSnapshot(),prompt_registry:finalPromptRegistry(),telemetry:snapshot},null,2),{
    status:200,headers:adminSecurityHeadersV28({"Content-Type":"application/json; charset=utf-8","Content-Disposition":`attachment; filename="mig-farm-final-production-report-${new Date().toISOString().slice(0,10)}.json"`})
  });
}
