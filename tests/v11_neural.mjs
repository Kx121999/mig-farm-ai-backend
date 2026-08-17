import assert from 'node:assert/strict';
import { localEmbedding, cosineSimilarity, mergeSemanticMemory, semanticMemoryCandidates, vectorMemoryHealth } from '../lib/vector_memory.js';
import { buildKnowledgeGraph, knowledgeGraphSummary, knowledgeGraphContext } from '../lib/knowledge_graph.js';
import { neuralBrainHealth, shouldUseNeuralAgent } from '../lib/neural_agent.js';
import { sanitizeState } from '../lib/dialogue.js';

const a=localEmbedding('بذور طماطم متوفرة');
const b=localEmbedding('عندكم بذور للطماطم موجودة');
const c=localEmbedding('رقم فرع الشارقة');
assert.equal(a.length,128);
assert.ok(cosineSimilarity(a,b)>cosineSimilarity(a,c),'semantic-ish local vector should prefer related Arabic text');

let mem=mergeSemanticMemory({}, {
  message:'أبغي بذور طماطم للبيت المحمي وميزانيتي 80 درهم',turn:1,
  analysis:{intent:'recommendation',category:{key:'seeds'},crop:{key:'tomato'},cultivation:'greenhouse'},
  cognition:{constraints:{category:'seeds',crop:'tomato',cultivation:'greenhouse',total_budget:80,require_available:true}},
  payload:{display_reply:'حاضر'},source:'test'
});
mem=mergeSemanticMemory(mem,{
  message:'اختار الأرخص المتوفر',turn:2,
  analysis:{intent:'product_memory'},cognition:{constraints:{total_budget:80,require_available:true}},
  decision:{handled:true,display_reply:'المنتج الأول هو الأرخص المتوفر',decision_basis:['lowest_price','available']},
  payload:{},source:'test'
});
assert.ok(mem.items.length>=3);
const hits=semanticMemoryCandidates('ايه اللي اخترناه وكان متوفر؟',mem,5);
assert.ok(hits.length>0);
assert.ok(hits.some(x=>/المنتج الأول|available|متوفر/.test(x.answer)));

const state=sanitizeState({
  v:11,category:'seeds',crop:'tomato',emirate:'العين',cultivation:'greenhouse',v11_memory:mem,
  visible_products:[{name:'طماطم الشمال F1',price:'35',currency:'AED',availability:'متوفر',url:'https://www.migfarm.com/shop/a'}]
});
assert.equal(state.v,11);
assert.ok(state.v11_memory.items.length>0);

const graph=buildKnowledgeGraph({
  message:'قارن الطماطم',analysis:{intent:'recommendation',category:{key:'seeds'},crop:{key:'tomato'}},state,
  results:state.visible_products,memory:hits
});
const gs=knowledgeGraphSummary(graph);
assert.ok(gs.nodes>=4);
assert.ok(gs.edges>=3);
assert.ok(knowledgeGraphContext(graph).length>0);

const nh=neuralBrainHealth();
assert.equal(nh.version,'11.0');
assert.ok(Array.isArray(nh.tools)&&nh.tools.includes('search_catalog'));
assert.equal(vectorMemoryHealth().version,'11.0');

// Without an API key the neural layer must fail closed and preserve deterministic fallback.
const previous=process.env.OPENAI_API_KEY;
delete process.env.OPENAI_API_KEY;
assert.equal(shouldUseNeuralAgent({message:'قارن لي أفضل خيارين',analysis:{intent:'recommendation'},cognition:{goal:'compare'},plan:{complexity:5}}),false);
if(previous!==undefined) process.env.OPENAI_API_KEY=previous;

console.log('MIG FARM V11 Neural Hybrid tests passed');
