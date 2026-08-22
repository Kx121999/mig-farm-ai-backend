import { normalizeAr } from './utils.js';
const VERSION='38.0.0';const RELEASE='PRODUCT_INTELLIGENCE_GRAPH_V38';
const stats=globalThis.__migV38Stats||{builds:0,nodes:0,edges:0};globalThis.__migV38Stats=stats;
function clean(v='',max=1200){return String(v??'').replace(/[\u0000-\u001f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max);}
function arr(v){return Array.isArray(v)?v:[];}
function canon(v=''){return normalizeAr(clean(v,800)).replace(/[^\p{L}\p{N}]+/gu,' ').replace(/\s+/g,' ').trim();}
function id(p={}){return clean(p.entity_id||p.external_id||p.sku||canon(p.name||p.title),180);}
function node(p={},source='context'){const entity=id(p);if(!entity)return null;const facts={};for(const key of ['category','pack_size','seed_count','size','brand','type','feature','description'])if(p[key]!==undefined&&p[key]!==null&&clean(Array.isArray(p[key])?p[key].join(', '):p[key],600))facts[key]=clean(Array.isArray(p[key])?p[key].join(', '):p[key],600);return {id:entity,name:clean(p.name||p.title,240),sku:clean(p.sku||p.default_code,120),category:clean(p.category,160),source:clean(p.source||source,100),facts,volatile:{price:p.price??null,availability:p.availability??p.stock??null},authority:/live|odoo|structured|truth/i.test(String(p.source||source))?'authoritative':'contextual'};}
function edge(from,to,type,confidence=.8){return from&&to&&from!==to?{from,to,type,confidence}:null;}
export function buildProductGraphV38({conversationState={},results=[],semanticCore={}}={}){
  stats.builds+=1;const sourceItems=[...arr(conversationState?.active_products).map(x=>({...x,source:x.source||'active_state'})),...arr(conversationState?.visible_products).map(x=>({...x,source:x.source||'visible_state'})),...arr(results).map(x=>({...x,source:x.source||'retrieval'}))];
  const map=new Map();for(const p of sourceItems){const n=node(p,p.source);if(n&&!map.has(n.id))map.set(n.id,n);}const nodes=[...map.values()].slice(0,18),edges=[];const active=semanticCore?.active_entity?.entity_id||conversationState?.active_product_id||null;
  for(const n of nodes){if(active&&n.id!==active)edges.push(edge(active,n.id,'visible_alternative',.72));}
  for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){if(nodes[i].category&&canon(nodes[i].category)===canon(nodes[j].category))edges.push(edge(nodes[i].id,nodes[j].id,'same_category',.9));}
  const uniqueEdges=[];const seen=new Set();for(const e of edges.filter(Boolean)){const k=`${e.from}:${e.to}:${e.type}`;if(seen.has(k))continue;seen.add(k);uniqueEdges.push(e);if(uniqueEdges.length>=48)break;}
  stats.nodes+=nodes.length;stats.edges+=uniqueEdges.length;
  return {version:VERSION,release:RELEASE,active_entity_id:active,nodes,edges:uniqueEdges,policy:{volatile_fields_require_live_verification:true,graph_relation_is_not_compatibility_proof:true,entity_facts_must_not_cross_contaminate:true},updated_at:new Date().toISOString()};
}
export function productGraphContextV38(graph={}){return {version:VERSION,active_entity_id:graph?.active_entity_id||null,nodes:arr(graph?.nodes).slice(0,10).map(n=>({id:n.id,name:n.name,sku:n.sku,category:n.category,facts:n.facts,authority:n.authority})),edges:arr(graph?.edges).slice(0,24),policy:graph?.policy||{}};}
export function productGraphHealthV38(){return {version:VERSION,release:RELEASE,ready:true,canonical_entities:true,cross_entity_fact_guard:true,live_volatile_fact_policy:true,stats:{...stats}};}
