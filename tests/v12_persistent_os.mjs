import assert from 'node:assert/strict';
import { sanitizePersistentSnapshot, persistentStoreHealth } from '../lib/persistent_store.js';
import {
  hydrateStateFromPersistent, hydrateProfileFromPersistent, buildRetrievalRoute,
  consolidatePersistentSnapshot, persistentMemoryCandidates, temporalMemoryCandidates,
  temporalConflictSummary, cognitiveOSHealth
} from '../lib/cognitive_os.js';
import { neuralBrainHealth } from '../lib/neural_agent.js';
import { sanitizeState } from '../lib/dialogue.js';

const previous={
  v:12,
  profile:{category:'seeds',crop:'tomato',emirate:'العين',cultivation:'greenhouse',budget:100,price_preference:'lower',require_available:true},
  memories:[{id:'m1',kind:'decision',text:'اخترنا طماطم الشمال لأنه متوفر',salience:.95,first_seen_at:'2026-08-16T10:00:00Z',last_seen_at:'2026-08-16T10:00:00Z',source:'decision',count:1}],
  temporal_products:[{name:'طماطم الشمال F1',price:'35',currency:'AED',availability:'متوفر',url:'https://www.migfarm.com/shop/a',observed_at:'2026-08-16T10:00:00Z',last_seen_at:'2026-08-16T10:00:00Z',source:'live'}]
};
const safe=sanitizePersistentSnapshot(previous);
assert.equal(sanitizeState({v:12}).v,12);
assert.equal(safe.v,12);
assert.equal(safe.profile.crop,'tomato');
assert.equal(safe.memories.length,1);

const hydrated=hydrateStateFromPersistent({},safe);
assert.equal(hydrated.crop,'tomato');
assert.equal(hydrated.emirate,'العين');
assert.equal(hydrated.cognitive_memory.constraints.total_budget,100);
assert.equal(hydrateProfileFromPersistent({},safe).cultivation,'greenhouse');

const route=buildRetrievalRoute({message:'فاكر الأرخص اللي اخترناه؟ وهل سعره لسه 35؟',analysis:{intent:'product_memory'},cognition:{goal:'compare'},persistent:safe});
assert.equal(route.requires_live_catalog,true);
assert.equal(route.requires_persistent_memory,true);
assert.ok(route.sources.some(x=>x.source==='live_catalog'));

const next=consolidatePersistentSnapshot({
  previous:safe,
  state:{turn:5,category:'seeds',crop:'tomato',emirate:'العين',cultivation:'greenhouse',cognitive_memory:{constraints:{total_budget:100,price_preference:'lower',require_available:true},last_knowledge_gaps:['مقاومة الحرارة غير موثقة']},hybrid_memory:{active_goal:'recommend',preferences:{budget:100,require_available:true},knowledge_gaps:['مقاومة الحرارة غير موثقة']}},
  profile:{},analysis:{intent:'recommendation',category:{key:'seeds'},crop:{key:'tomato'}},message:'اختار الأرخص المتوفر',source:'cognitive_product_decision',
  results:[{name:'طماطم الشمال F1',price:'39',currency:'AED',availability:'متوفر',url:'https://www.migfarm.com/shop/a'}],
  responseGraph:{nodes:[{id:'product:x',type:'product',label:'طماطم الشمال F1',weight:1}],edges:[]},
  decision:{handled:true,display_reply:'طماطم الشمال هو الاختيار الحالي',decision_basis:['lowest_price','available'],results:[{name:'طماطم الشمال F1',price:'39',currency:'AED',availability:'متوفر',url:'https://www.migfarm.com/shop/a'}]},route
});
assert.ok(next.decisions.length>=1);
assert.ok(next.knowledge_gaps.some(x=>x.text.includes('مقاومة')));
assert.ok(next.temporal_products.length>=2,'changed price should create a temporal observation');
assert.ok(temporalConflictSummary(next).some(x=>x.product.includes('طماطم الشمال')));
assert.ok(persistentMemoryCandidates('ايه اللي اخترناه؟',next,5).length>0);
assert.ok(temporalMemoryCandidates('سعر طماطم الشمال',next,5).length>0);

const nh=neuralBrainHealth();
assert.equal(nh.version,'12.0');
assert.ok(nh.tools.includes('recall_persistent_memory'));
assert.ok(nh.tools.includes('search_temporal_memory'));
const ph=persistentStoreHealth();
assert.equal(ph.version,'12.0');
const os=cognitiveOSHealth(ph);
assert.equal(os.version,'12.0');
assert.ok(os.capabilities.includes('persistent_bounded_memory'));
console.log('MIG FARM V12 Persistent Cognitive OS tests passed');
