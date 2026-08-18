import assert from 'node:assert/strict';
import {
  buildCommerceMission,optimizeLivePortfolio,deterministicComparison,verifyCommerceResponse,
  groundedCommerceFallback,autonomousCommerceHealth
} from '../lib/autonomous_commerce.js';
import { neuralBrainHealth } from '../lib/neural_agent.js';

const cognition={goal:'bundle',constraints:{category:'seeds',crop:'tomato',total_budget:100,require_available:true,price_preference:'lower',requested_count:2}};
const mission=buildCommerceMission({message:'اختارلي منتجين طماطم متوفرين في حدود 100 درهم',analysis:{intent:'recommendation',category:{key:'seeds'},crop:{key:'tomato'}},cognition,state:{},profile:{},locale:'ar'});
assert.equal(mission.kind,'budget_optimize');
assert.equal(mission.budget_aed,100);
assert.equal(mission.autonomous_ready,true);
assert.ok(mission.tasks.includes('verify_live_catalog'));

const products=[
  {name:'A',price:'35',currency:'AED',availability:'متوفر',url:'https://x/a'},
  {name:'B',price:'45',currency:'AED',availability:'متوفر',url:'https://x/b'},
  {name:'C',price:'90',currency:'AED',availability:'متوفر',url:'https://x/c'},
  {name:'D',price:'25',currency:'AED',availability:'غير متوفر',url:'https://x/d'}
];
const portfolio=optimizeLivePortfolio({products,mission,maxItems:2});
assert.equal(portfolio.handled,true);
assert.equal(portfolio.products.length,2);
assert.equal(portfolio.within_budget,true);
assert.ok(portfolio.total_aed<=100);
assert.ok(!portfolio.products.some(x=>x.name==='D'));

const comparison=deterministicComparison(products,['price','availability']);
assert.equal(comparison.cheapest.name,'D');
assert.ok(comparison.available.length>=3);

const good='A — 35 AED — متوفر\nB — 45 AED — متوفر\nالإجمالي 80 AED';
const checkGood=verifyCommerceResponse({reply:good,products:portfolio.products,mission,portfolio:{...portfolio,total_aed:80}});
assert.equal(checkGood.ok,true);
const bad='أفضل منتج في السوق وسعره 999 AED ومضمون 100%';
const checkBad=verifyCommerceResponse({reply:bad,products:portfolio.products,mission,portfolio});
assert.equal(checkBad.ok,false);
assert.ok(checkBad.flags.some(x=>x.startsWith('ungrounded_price')));
assert.ok(checkBad.flags.includes('absolute_unverified_claim'));

const safe=groundedCommerceFallback({mission,portfolio,products:portfolio.products,locale:'ar'});
assert.match(safe,/المتجر الحي/);
assert.ok(!safe.includes('999'));

const ah=autonomousCommerceHealth();
assert.equal(ah.version,'13.0');
assert.ok(ah.capabilities.includes('budget_constrained_bundle_search'));
const nh=neuralBrainHealth();
assert.ok(Number(nh.version)>=13,'neural brain must stay at V13 or newer');
assert.ok(nh.tools.includes('optimize_live_bundle'));
assert.ok(nh.tools.includes('compare_live_options'));
assert.ok(nh.tools.includes('prepare_purchase_plan'));
console.log('MIG FARM V13 Autonomous Commerce tests passed');
