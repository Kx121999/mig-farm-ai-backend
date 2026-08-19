import { readdirSync,readFileSync,writeFileSync } from "node:fs";
import { join } from "node:path";
const dir=new URL("../tests/",import.meta.url),vars=["h","r","health","result","identity","data","r1"];
for(const name of readdirSync(dir).filter(x=>x.endsWith(".mjs")&&!x.startsWith("v28_"))){
  const path=join(dir.pathname,name);let text=readFileSync(path,"utf8");
  text=text.replaceAll('"27.0.0"].includes','"27.0.0","28.0.0"].includes').replaceAll("'27.0.0'].includes","'27.0.0','28.0.0'].includes");
  text=text.replaceAll('"customer_brain_decision_os_v27"].includes','"customer_brain_decision_os_v27","enterprise_autonomous_intelligence_platform_v28"].includes').replaceAll("'customer_brain_decision_os_v27'].includes","'customer_brain_decision_os_v27','enterprise_autonomous_intelligence_platform_v28'].includes");
  for(const variable of vars){
    text=text.replaceAll(`assert.equal(${variable}.version,"27.0.0")`,`assert.equal(${variable}.version,"28.0.0")`).replaceAll(`assert.equal(${variable}.version,'27.0.0')`,`assert.equal(${variable}.version,'28.0.0')`);
    text=text.replaceAll(`assert.equal(${variable}.mode,"customer_brain_decision_os_v27")`,`assert.equal(${variable}.mode,"enterprise_autonomous_intelligence_platform_v28")`).replaceAll(`assert.equal(${variable}.mode,'customer_brain_decision_os_v27')`,`assert.equal(${variable}.mode,'enterprise_autonomous_intelligence_platform_v28')`);
  }
  writeFileSync(path,text);
}
console.log("V28 API test expectations upgraded");
