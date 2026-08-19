import assert from "node:assert/strict";
import { analyzeTurn } from "../lib/dialogue.js";
import { analyzeHumanConversationTurn } from "../lib/human_conversation_brain.js";
import {
  buildSemanticFrame, enrichAnalysisWithSemanticFrame, mergeHumanTurnWithSemanticFrame,
  semanticFrameForClient, semanticHumanBrainHealth
} from "../lib/semantic_human_brain.js";
import { resolveProductContext } from "../lib/product_context_intelligence.js";

const visible=[{name:"بذور خيار ألفا",sku:"CU-A"},{name:"بذور خيار بيتا",sku:"CU-B"},{name:"بذور خيار جاما",sku:"CU-C"}];
const state={turn:5,visible_products:visible,last_products:visible,active_product_context:{active:true,product:visible[0],expires_turn:15}};

let f=buildSemanticFrame({message:"عندكم بذور خيار تتحمل الحر وكم سعرها وتوصل العين بكرة؟",state});
for(const intent of ["product_search","suitability","price","delivery_time"])assert.ok(f.intents.some(x=>x.name===intent),intent);
assert.equal(f.entities.crops[0],"cucumber");
assert.equal(f.entities.locations[0],"al_ain");
assert.equal(f.reference.kind,"in_turn_product_need");
assert.equal(f.compound.is_multi_intent,true);
assert.deepEqual(f.plan.answer_order,["suitability","product_search","price","delivery_time"]);
assert.ok(f.plan.allowed_tools.includes("verify_live_product_truth"));
assert.ok(f.plan.allowed_tools.includes("get_business_fact"));
assert.equal(f.plan.question_budget,0);

const arabiziMessage="3ayz bzor 5yar bkam w ywsl eln bokra";
const legacyArabizi=analyzeTurn(arabiziMessage,state,[],"ar");
f=buildSemanticFrame({message:arabiziMessage,analysis:legacyArabizi,state});
assert.equal(f.dialect.language,"arabizi");
assert.equal(f.dialect.dialect,"egyptian");
assert.deepEqual(f.entities.crops,["cucumber"]);
assert.ok(f.intents.some(x=>x.name==="shipping"));
enrichAnalysisWithSemanticFrame(legacyArabizi,f);
assert.equal(legacyArabizi.crop.key,"cucumber","semantic Arabizi crop must override partial legacy matches");
assert.equal(legacyArabizi.category.key,"seeds");

f=buildSemanticFrame({message:"بدي أعرف قديش سعر هاد وإذا متوفر",state});
assert.equal(f.dialect.dialect,"levantine");
assert.deepEqual(f.intents.map(x=>x.name),["price","availability"]);
assert.equal(f.reference.product.sku,"CU-A");
assert.equal(f.context.scope,"explicit_reference");

f=buildSemanticFrame({message:"أبغي أعرف هالمنتج متوفر ولا لا",state});
assert.ok(["emirati","gulf"].includes(f.dialect.dialect));
assert.equal(f.reference.status,"resolved");
assert.ok(f.intents.some(x=>x.name==="availability"));

f=buildSemanticFrame({message:"لا مش الطماطم، قصدي الخيار",analysis:analyzeTurn("لا مش الطماطم، قصدي الخيار"),state});
assert.equal(f.repair.supersede_old_topic,true);
assert.deepEqual(f.entities.crops,["cucumber"]);
assert.equal(f.context.scope,"current_turn_only");
assert.ok(!f.entities.crops.includes("tomato"));

f=buildSemanticFrame({message:"قارن الأول والتاني وقولي الأرخص والمتوفر",state:{turn:2,visible_products:visible}});
assert.deepEqual(f.entities.ordinals,[0,1]);
assert.equal(f.reference.status,"resolved");
assert.deepEqual(f.reference.products.map(x=>x.sku),["CU-A","CU-B"]);
assert.equal(f.plan.route,"semantic_multi_intent");

f=buildSemanticFrame({message:"سعره كام؟",state:{visible_products:visible}});
assert.equal(f.reference.status,"ambiguous");
assert.equal(f.plan.clarification.required,true);
assert.equal(f.plan.question_budget,1);
assert.match(f.plan.clarification.question,/[؟?]$/);

f=buildSemanticFrame({message:"أنا مش هشتري دلوقتي، بس بسأل",analysis:analyzeTurn("أنا مش هشتري دلوقتي، بس بسأل"),state});
assert.deepEqual(f.entities.categories,[],"هشتري must not partially match ري");
const legacyHuman=analyzeHumanConversationTurn("أنا مش هشتري دلوقتي، بس بسأل",{analysis:analyzeTurn("أنا مش هشتري دلوقتي، بس بسأل"),state});
const merged=mergeHumanTurnWithSemanticFrame(legacyHuman,f);
assert.equal(merged.mode,"browse_only_social");
assert.equal(merged.tool_policy.mode,"zero_tools");
assert.equal(merged.context_policy.scope,"current_turn_isolated");

const visualLegacy={mode:"visual_analysis",context_policy:{scope:"active_visual_context",history_turns:4,allow_stale_product_context:false,allow_old_agronomy:false},tool_policy:{mode:"vision_priority",allowed:["match_visual_product","plan_visual_product_action"]},response_contract:{length:"compact"}};
f=buildSemanticFrame({message:"ده بكام؟",state});
const visualMerged=mergeHumanTurnWithSemanticFrame(visualLegacy,f);
assert.equal(visualMerged.mode,"visual_analysis");
assert.equal(visualMerged.tool_policy.mode,"vision_priority");
assert.ok(visualMerged.tool_policy.allowed.includes("match_visual_product"));

f=buildSemanticFrame({message:"tafsil da",selectedProduct:visible[1]});
assert.equal(f.reference.kind,"client_selected");
assert.equal(f.reference.product.sku,"CU-B");
assert.ok(f.intents.some(x=>x.name==="product_details"));

const fresh=buildSemanticFrame({message:"عندكم بذور خيار بكام؟",state});
const focus=resolveProductContext({message:"عندكم بذور خيار بكام؟",state,analysis:analyzeTurn("عندكم بذور خيار بكام؟",state),semanticFrame:fresh});
assert.equal(focus.action,"clear");
assert.equal(focus.reason,"semantic_fresh_product_need");

const publicFrame=semanticFrameForClient(fresh);
assert.equal(publicFrame.version,"27.0");
assert.equal(publicFrame.plan.route,"semantic_multi_intent");
assert.equal("raw" in publicFrame,false);

const health=semanticHumanBrainHealth();
assert.equal(health.version,"27.0");
for(const capability of ["arabizi_normalization","multi_intent_decomposition","pronoun_resolution","correction_supersession","unified_tool_budget"])assert.ok(health.capabilities.includes(capability),capability);

console.log("V24 Semantic Human Brain unit & adversarial tests PASS");
