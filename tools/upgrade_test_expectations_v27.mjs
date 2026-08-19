import { readdirSync,readFileSync,writeFileSync } from "node:fs";
import { join } from "node:path";
const dir=new URL("../tests/",import.meta.url);
for(const name of readdirSync(dir).filter(x=>x.endsWith(".mjs"))){
  const path=join(dir.pathname,name);let text=readFileSync(path,"utf8");
  text=text
    .replaceAll('"25.0.0","26.0.0"].includes','"25.0.0","26.0.0","27.0.0"].includes')
    .replaceAll("'25.0.0','26.0.0'].includes","'25.0.0','26.0.0','27.0.0'].includes")
    .replaceAll('"25.0","26.0"].includes','"25.0","26.0","27.0"].includes')
    .replaceAll("'25.0','26.0'].includes","'25.0','26.0','27.0'].includes")
    .replaceAll('"github_knowledge_natural_conversation_os_v26"].includes','"github_knowledge_natural_conversation_os_v26","customer_brain_decision_os_v27"].includes')
    .replaceAll("'github_knowledge_natural_conversation_os_v26'].includes","'github_knowledge_natural_conversation_os_v26','customer_brain_decision_os_v27'].includes")
    .replaceAll('"secure_github_knowledge_natural_conversation_agent"].includes','"secure_github_knowledge_natural_conversation_agent","customer_brain_decision_neural_agent"].includes')
    .replaceAll("'secure_github_knowledge_natural_conversation_agent'].includes","'secure_github_knowledge_natural_conversation_agent','customer_brain_decision_neural_agent'].includes");
  for(const target of ["h","r","health","result"]){
    text=text.replaceAll(`assert.equal(${target}.version,"26.0.0")`,`assert.equal(${target}.version,"27.0.0")`).replaceAll(`assert.equal(${target}.version,'26.0.0')`,`assert.equal(${target}.version,'27.0.0')`);
    text=text.replaceAll(`assert.equal(${target}.mode,"github_knowledge_natural_conversation_os_v26")`,`assert.equal(${target}.mode,"customer_brain_decision_os_v27")`).replaceAll(`assert.equal(${target}.mode,'github_knowledge_natural_conversation_os_v26')`,`assert.equal(${target}.mode,'customer_brain_decision_os_v27')`);
  }
  text=text.replaceAll('assert.equal(h.neural_brain?.version,"26.0")','assert.equal(h.neural_brain?.version,"27.0")').replaceAll('assert.equal(health.neural_brain?.version,"26.0")','assert.equal(health.neural_brain?.version,"27.0")');
  text=text.replaceAll('assert.equal(health.semantic_human_brain?.version,"26.0")','assert.equal(health.semantic_human_brain?.version,"27.0")');
  if(name==="v24_semantic_human_brain.mjs")text=text.replaceAll('assert.equal(publicFrame.version,"26.0")','assert.equal(publicFrame.version,"27.0")').replaceAll('assert.equal(health.version,"26.0")','assert.equal(health.version,"27.0")');
  writeFileSync(path,text);
}
console.log("V27 test expectations upgraded");

