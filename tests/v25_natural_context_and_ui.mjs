import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { POST } from "../api/chat.js";
import { buildSemanticFrame } from "../lib/semantic_human_brain.js";
import { resolveProductContext } from "../lib/product_context_intelligence.js";

delete process.env.OPENAI_API_KEY;
async function ask(message,session){
  const request=new Request("https://backend.example/api/chat",{method:"POST",headers:{"content-type":"application/json","origin":"https://www.migfarm.com"},body:JSON.stringify({message,session_id:session,conversation_state:{turn:7,category:"fertilizer",crop:"tomato",visible_products:[{name:"سماد قديم",sku:"OLD",price:"99"}],active_product_context:{active:true,product:{name:"سماد قديم",sku:"OLD"},expires_turn:20}}})});
  const response=await POST(request);assert.equal(response.status,200);return await response.json();
}

for(const [index,message] of ["ما اسمك","شو اسمك"].entries()){
  const data=await ask(message,`v25-natural-identity-${index}`);
  assert.equal(data.source,"identity");assert.equal(data.semantic_human_brain.frame.primary_intent,"identity");assert.equal(data.semantic_human_brain.frame.context.scope,"current_turn_only");
  assert.match(data.reply,/MIG FARM AI/);assert.doesNotMatch(data.reply,/جرعة|جرعه|طماطم|سماد قديم|99/);
}
const social=await ask("كيفك","v25-natural-social");assert.match(social.source,/smalltalk/);assert.doesNotMatch(social.reply,/جرعة|سماد|طماطم/);

const state={turn:2,visible_products:[{name:"خيار وفرة F1",sku:"WAFRA30"}],active_product_context:{active:true,product:{name:"خيار وفرة F1",sku:"WAFRA30"},expires_turn:12}};
const semantic=buildSemanticFrame({message:"هل متوفر؟",analysis:{intent:"unknown"},state,history:[]});
const focus=resolveProductContext({message:"هل متوفر؟",state,analysis:{intent:"unknown"},semanticFrame:semantic});
assert.equal(focus.action,"reuse");assert.equal(focus.intent,"availability");assert.equal(focus.product.sku,"WAFRA30");

const ui=readFileSync(new URL("../ODOO_CHAT_UI_V25_AUTONOMOUS_SALES_LEARNING_OS.txt",import.meta.url),"utf8");
for(const marker of ["UI_VERSION='25.0.0'","mig_ai_session_id_v25","renderAssistantText","addAutonomousAction","autonomous_action_request:opts.actionRequest||null","var visibleReply=reply","price.dir='ltr'"])assert.ok(ui.includes(marker),marker);
assert.equal(ui.includes("var visibleReply=resultItems.length?compactProductReply(resultItems):reply"),false);
const script=ui.match(/<!\[CDATA\[([\s\S]*?)\]\]>/)?.[1];assert.ok(script);new Function(script);
console.log("V25 Natural Context & Structured UI regression PASS");
