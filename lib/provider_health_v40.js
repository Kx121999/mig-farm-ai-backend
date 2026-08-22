import { probeProviderGatewayV41, providerGatewayHealthV41 } from "./provider_gateway_v41.js";

const VERSION="40.3.0";
export async function probeOpenAIProviderV40(){
  const result=await probeProviderGatewayV41();
  return {...result,version:VERSION,gateway_version:"41.0.0",compatibility:"delegated_to_provider_gateway_v41"};
}
export function providerHealthV40(){return {version:VERSION,ready:true,compatibility:"delegated_to_provider_gateway_v41",gateway:providerGatewayHealthV41()};}
