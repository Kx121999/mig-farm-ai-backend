import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir=new URL("../tests/",import.meta.url).pathname;
for(const name of readdirSync(dir).filter(x=>x.endsWith(".mjs"))){
  const path=join(dir,name);let text=readFileSync(path,"utf8");
  const before=text;
  text=text
    .replaceAll('"25.0.0"].includes','"25.0.0","26.0.0"].includes')
    .replaceAll("'25.0.0'].includes","'25.0.0','26.0.0'].includes")
    .replaceAll('"25.0"].includes','"25.0","26.0"].includes')
    .replaceAll("'25.0'].includes","'25.0','26.0'].includes")
    .replaceAll('"autonomous_sales_learning_agent_os_v25"].includes','"autonomous_sales_learning_agent_os_v25","github_knowledge_natural_conversation_os_v26"].includes')
    .replaceAll("'autonomous_sales_learning_agent_os_v25'].includes","'autonomous_sales_learning_agent_os_v25','github_knowledge_natural_conversation_os_v26'].includes")
    .replaceAll('"secure_autonomous_natural_conversation_agent"].includes','"secure_autonomous_natural_conversation_agent","secure_github_knowledge_natural_conversation_agent"].includes');

  for(const target of ["h","r","health","result"]){
    text=text.replaceAll(`assert.equal(${target}.version,"25.0.0")`,`assert.equal(${target}.version,"26.0.0")`);
    text=text.replaceAll(`assert.equal(${target}.version,'25.0.0')`,`assert.equal(${target}.version,'26.0.0')`);
    text=text.replaceAll(`assert.equal(${target}.mode,"autonomous_sales_learning_agent_os_v25")`,`assert.equal(${target}.mode,"github_knowledge_natural_conversation_os_v26")`);
    text=text.replaceAll(`assert.equal(${target}.mode,'autonomous_sales_learning_agent_os_v25')`,`assert.equal(${target}.mode,'github_knowledge_natural_conversation_os_v26')`);
  }
  text=text
    .replaceAll('assert.equal(h.neural_brain?.version,"25.0")','assert.equal(h.neural_brain?.version,"26.0")')
    .replaceAll('assert.equal(health.neural_brain?.version,"25.0")','assert.equal(health.neural_brain?.version,"26.0")')
    .replaceAll('assert.equal(health.semantic_human_brain?.version,"25.0")','assert.equal(health.semantic_human_brain?.version,"26.0")');
  if(name==="v24_semantic_human_brain.mjs")text=text.replaceAll('assert.equal(publicFrame.version,"25.0")','assert.equal(publicFrame.version,"26.0")').replaceAll('assert.equal(health.version,"25.0")','assert.equal(health.version,"26.0")');
  if(text!==before)writeFileSync(path,text);
}
console.log("V26 test expectations upgraded");
