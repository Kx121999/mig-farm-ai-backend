import assert from "node:assert/strict";
import { analyzeHumanConversationTurn, isolateStateForCurrentTurn, evaluateCurrentTurnAlignment, safeCurrentTurnFallback, humanConversationHealth } from "../lib/human_conversation_brain.js";

const staleState={category:"fertilizer",crop:"tomato",topic:"product",sales_mode:"normal",visible_products:[{name:"Potassium X",price:"50"}],last_products:[{name:"Potassium X",price:"50"}]};
let h=analyzeHumanConversationTurn("لا يا عم أنا بس بسأل مش هشتري دلوقتي",{analysis:{intent:"unknown"},state:staleState,history:[{role:"assistant",content:"البوتاسيوم مهم للثمار"}]});
assert.equal(h.mode,"browse_only_social");
assert.equal(h.tool_policy.mode,"zero_tools");
assert.equal(h.no_sales_pressure,true);
assert.equal(h.stale_context_quarantine,true);
const isolated=isolateStateForCurrentTurn(staleState,h);
assert.equal(isolated.category,""); assert.equal(isolated.crop,""); assert.equal(isolated.visible_products.length,0);
const bad=evaluateCurrentTurnAlignment("البوتاسيوم مهم لتنظيم الماء وجودة الثمار والكالسيوم مهم.",{message:"لا يا عم أنا بس بسأل مش هشتري دلوقتي",humanTurn:h,history:[]});
assert.equal(bad.aligned,false); assert.ok(bad.flags.includes("stale_agronomy_leak"));
const good=safeCurrentTurnFallback("لا يا عم أنا بس بسأل مش هشتري دلوقتي",h);
assert.match(good,/اسأل|براحتك/); assert.doesNotMatch(good,/بوتاسيوم|كالسيوم|سماد/);

h=analyzeHumanConversationTurn("لا قصدي خيار",{analysis:{intent:"product_search",crop:{key:"cucumber"}},state:staleState});
assert.equal(h.mode,"repair_or_switch"); assert.equal(h.stale_context_quarantine,true); assert.equal(h.current_topic.crop,"cucumber");
const repaired=isolateStateForCurrentTurn(staleState,h); assert.equal(repaired.crop,"cucumber"); assert.equal(repaired.visible_products.length,0);

h=analyzeHumanConversationTurn("طب والتاني؟",{analysis:{intent:"unknown"},state:staleState});
assert.equal(h.mode,"followup"); assert.equal(h.followup_dependency,true); assert.equal(h.context_policy.allow_stale_product_context,true);

const health=humanConversationHealth(); assert.ok(["18.0","22.1"].includes(health.version)); assert.ok(health.capabilities.includes("stale_context_quarantine")); assert.ok(health.capabilities.includes("vision_first_override"));
console.log("V18 current-turn human conversation brain PASS");
