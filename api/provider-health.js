import { probeOpenAIProviderV40 } from "../lib/provider_health_v40.js";
export async function GET(){
  const result=await probeOpenAIProviderV40();
  return Response.json({service:"MIG FARM AI Provider Health",...result,time:new Date().toISOString()},{status:result.ok?200:503,headers:{"Cache-Control":"no-store, max-age=0","X-Content-Type-Options":"nosniff"}});
}
