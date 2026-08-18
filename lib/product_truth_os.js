import { readFileSync, statSync } from "node:fs";
import { normalizeAr } from "./utils.js";
import { getProductDossier, searchProductDossiers } from "./product_intelligence.js";

const VERSION="22.1";
const FACT_URL=new URL("../knowledge/MIG_FARM_PRODUCT_FACT_INDEX_V21.json",import.meta.url);
const GRAPH_URL=new URL("../knowledge/MIG_FARM_PRODUCT_RELATIONSHIP_GRAPH_V21.json",import.meta.url);
let FACTS=null,GRAPH=null,FACT_BY_ID=null,NODE_BY_ID=null,NAME_TO_ID=null,SKU_TO_ID=null;

function arr(v){return Array.isArray(v)?v:[];}
function clean(v,max=9000){return String(v??"").replace(/\s+/g," ").trim().slice(0,max);}
function n(v){return normalizeAr(clean(v,5000));}
function num(v){const x=Number(String(v??"").replace(/[^0-9.\-]/g,""));return Number.isFinite(x)?x:null;}
function uniq(xs,limit=20){const out=[],seen=new Set();for(const x of arr(xs)){const k=n(typeof x==="string"?x:JSON.stringify(x));if(!k||seen.has(k))continue;seen.add(k);out.push(x);if(out.length>=limit)break;}return out;}
function grams(s,k=3){const x=` ${n(s)} `;const out=[];for(let i=0;i<=x.length-k;i++)out.push(x.slice(i,i+k));return out;}
function gramSim(a,b){const A=new Set(grams(a)),B=new Set(grams(b));if(!A.size||!B.size)return 0;let hit=0;for(const x of A)if(B.has(x))hit++;return hit/Math.max(1,A.size+B.size-hit);}
function availabilityClass(v=""){const t=n(v);if(!t)return "unknown";if(/غير متوفر|نفد|خلص|out of stock|unavailable|sold out/.test(t))return "out_of_stock";if(/متوفر|موجود|in stock|available/.test(t))return "in_stock";if(/طلب مسبق|preorder/.test(t))return "preorder";return "unknown";}

function load(){
  if(!FACTS) FACTS=JSON.parse(readFileSync(FACT_URL,"utf8"));
  if(!GRAPH) GRAPH=JSON.parse(readFileSync(GRAPH_URL,"utf8"));
  if(!FACT_BY_ID){
    FACT_BY_ID=new Map(arr(FACTS.products).map(x=>[String(x.external_id||""),x]));
    NODE_BY_ID=new Map(arr(GRAPH.nodes).map(x=>[String(x.id||""),x]));
    NAME_TO_ID=new Map();SKU_TO_ID=new Map();
    for(const x of arr(GRAPH.nodes)){
      const name=n(x.name),sku=n(x.sku);if(name&&!NAME_TO_ID.has(name))NAME_TO_ID.set(name,x.id);if(sku&&!SKU_TO_ID.has(sku))SKU_TO_ID.set(sku,x.id);
    }
  }
}
function resolveId(identifier=""){
  load();const raw=clean(identifier,1000),key=n(raw);
  if(NODE_BY_ID.has(raw))return raw;
  if(SKU_TO_ID.has(key))return SKU_TO_ID.get(key);
  if(NAME_TO_ID.has(key))return NAME_TO_ID.get(key);
  const dossier=getProductDossier(raw,{includeFull:false});return dossier?.external_id||null;
}
function liveIdentityScore(dossier={},live={}){
  let score=0;const ds=n(dossier?.sku),ls=n(live?.sku),dn=n(dossier?.name),ln=n(live?.name||live?.title);
  if(ds&&ls&&ds===ls)score+=100;
  if(dn&&ln&&dn===ln)score+=85;
  else if(dn&&ln){const s=gramSim(dn,ln);score+=Math.round(s*70);}
  if(ds&&ls&&ds!==ls)score-=25;
  return score;
}
function bestLiveMatch(dossier={},liveProducts=[]){
  let best=null,bestScore=-999;
  for(const live of arr(liveProducts)){
    const score=liveIdentityScore(dossier,live);if(score>bestScore){bestScore=score;best=live;}
  }
  return {live:best,score:bestScore,verified:Boolean(best&&bestScore>=68)};
}

export function getStructuredProductFacts(identifier=""){
  load();const id=resolveId(identifier);if(!id)return null;const dossier=getProductDossier(id,{includeFull:true});const fact=FACT_BY_ID.get(id)||null;
  if(!dossier)return null;
  return {
    external_id:id,name:dossier.name,sku:dossier.sku,category:dossier.category,supplier:dossier.supplier,type:dossier.type,feature:dossier.feature,
    description_provenance:dossier.description_provenance,
    description_reliability:fact?.description_reliability||dossier.description_reliability||"unknown",
    explicit_facts:arr(fact?.explicit_facts),need_terms:arr(fact?.need_terms).slice(0,40),
    sales_description:dossier.sales_description,ecommerce_description:dossier.ecommerce_description,
    field_provenance:fact?.field_provenance||{},
    policy:"Explicit facts are extracted only from reliable product text/name/taxonomy. Generated completion descriptions are not technical specification evidence. Missing specifications remain unknown. Current price/availability require live Odoo."
  };
}

export function buildProductTruth(identifier="",liveProducts=[]){
  const dossier=getStructuredProductFacts(identifier);if(!dossier)return {found:false,identifier,error:"product_not_found_in_dossier"};
  const match=bestLiveMatch(dossier,liveProducts);const archived=getProductDossier(dossier.external_id,{includeFull:false})?.archived_commerce||{};
  const live=match.verified?match.live:null;
  const livePrice=live?num(live.price):null;const archivedPrice=num(archived.price_aed);
  const conflicts=[];
  if(match.live&&!match.verified)conflicts.push({field:"identity",kind:"unverified_live_match",message:"A live result was found but identity confidence is too low to fuse it with the dossier."});
  if(live&&livePrice!==null&&archivedPrice!==null&&Math.abs(livePrice-archivedPrice)>0.009)conflicts.push({field:"price",kind:"temporal_difference",archived:archivedPrice,live:livePrice,resolution:"live_odoo_wins"});
  const liveAvail=live?availabilityClass(live.availability):"unknown";
  const archivedAvail=availabilityClass(archived.stock_snapshot>0?"متوفر":archived.stock_snapshot===0?"غير متوفر":"");
  if(live&&liveAvail!=="unknown"&&archivedAvail!=="unknown"&&liveAvail!==archivedAvail)conflicts.push({field:"availability",kind:"temporal_difference",archived:archivedAvail,live:liveAvail,resolution:"live_odoo_wins"});
  return {
    found:true,identity:{external_id:dossier.external_id,name:dossier.name,sku:dossier.sku,live_match_score:match.score,live_verified:match.verified},
    current:{price_aed:livePrice,currency:live?.currency||"AED",availability:live?.availability||"",availability_class:liveAvail,url:live?.url||"",image:live?.image||"",product_template_id:live?.product_template_id||null,product_id:live?.product_id||null,source:match.verified?"live_odoo":"unverified"},
    dossier:{category:dossier.category,supplier:dossier.supplier,type:dossier.type,feature:dossier.feature,description_provenance:dossier.description_provenance,description_reliability:dossier.description_reliability||"unknown",explicit_facts:dossier.explicit_facts,sales_description:dossier.sales_description,weight_kg:num(archived.weight_kg)},
    archived_snapshot:{price_aed:archivedPrice,stock_snapshot:num(archived.stock_snapshot),published:Boolean(archived.published),source:"v20_dossier_snapshot_not_current"},
    field_provenance:{name:"v20_product_dossier",sku:"v20_product_dossier",description:dossier.description_provenance,current_price:match.verified?"live_odoo":"not_verified",current_availability:match.verified?"live_odoo":"not_verified",weight:"archived_odoo_qa_snapshot",taxonomy:"odoo_catalog_taxonomy"},
    conflicts,
    truth_policy:"Live Odoo wins for current price/availability. Stored dossier wins for exact stored description/taxonomy. Missing specification stays unknown."
  };
}

export function getProductRelations(identifier="",{relation="all",limit=10}={}){
  load();const id=resolveId(identifier);if(!id)return {found:false,identifier,relations:[]};
  const indexes=arr(GRAPH.adjacency?.[id]);const rows=[];
  for(const idx of indexes){const e=GRAPH.edges?.[idx];if(!e)continue;if(relation!=="all"&&e.relation!==relation)continue;const node=NODE_BY_ID.get(e.to);if(!node)continue;rows.push({external_id:node.id,name:node.name,sku:node.sku,category:node.category,type:node.type,features:node.features,relation:e.relation,score:e.score,basis:e.basis,policy:e.policy});}
  rows.sort((a,b)=>b.score-a.score);
  return {found:true,product:NODE_BY_ID.get(id),relations:rows.slice(0,Math.max(1,Math.min(30,Number(limit)||10))),policy:GRAPH.policy};
}

export function rankLiveAlternatives(identifier="",liveProducts=[],{limit=5}={}){
  const rel=getProductRelations(identifier,{relation:"alternative_candidate",limit:30});if(!rel.found)return {found:false,alternatives:[]};
  const target=getStructuredProductFacts(identifier);const scored=[];
  for(const live of arr(liveProducts)){
    const ln=n(live.name),ls=n(live.sku);let best=null,bestScore=0;
    for(const r of rel.relations){let s=0;if(ls&&n(r.sku)===ls)s+=100;if(ln&&n(r.name)===ln)s+=90;else s+=gramSim(ln,n(r.name))*65;s+=r.score*.35;if(s>bestScore){bestScore=s;best=r;}}
    if(best&&bestScore>=45){scored.push({product:live,relation:best,score:Number(bestScore.toFixed(2)),live_verified:true});}
  }
  scored.sort((a,b)=>b.score-a.score);
  return {found:true,target:{name:target?.name,sku:target?.sku,category:target?.category},alternatives:scored.slice(0,Math.max(1,Math.min(10,Number(limit)||5))),policy:"These are live products that also appear as dossier-similarity candidates. Similarity is not equivalence; verify the decisive specification before recommending."};
}

export function buildVerifiedQuoteDraft(requestedItems=[],liveProducts=[]){
  const lines=[];let total=0;let totalKnown=true;
  for(const req of arr(requestedItems).slice(0,12)){
    const identifier=clean(req?.identifier||req?.name||req?.sku||"",500);const qty=Math.max(1,Math.min(999,Math.floor(Number(req?.quantity)||1)));
    const truth=buildProductTruth(identifier,liveProducts);const price=truth?.current?.price_aed;
    const lineTotal=truth?.identity?.live_verified&&price!==null?Number((price*qty).toFixed(2)):null;
    if(lineTotal===null)totalKnown=false;else total+=lineTotal;
    lines.push({identifier,quantity:qty,product:truth?.identity?.name||identifier,sku:truth?.identity?.sku||"",live_verified:Boolean(truth?.identity?.live_verified),availability:truth?.current?.availability||"",unit_price_aed:price,line_total_aed:lineTotal,issues:truth?.conflicts||[]});
  }
  return {lines,total_aed:totalKnown?Number(total.toFixed(2)):null,all_lines_live_verified:lines.length>0&&lines.every(x=>x.live_verified&&x.unit_price_aed!==null),order_placed:false,policy:"Draft only. It does not place an order. Totals include only live-verified Odoo prices; unresolved lines prevent a final total."};
}

export function productTruthHealth(){
  load();let factBytes=0,graphBytes=0;try{factBytes=statSync(FACT_URL).size}catch{}try{graphBytes=statSync(GRAPH_URL).size}catch{}
  return {version:VERSION,mode:"live_product_truth_and_sales_action_os",products:Number(FACTS?.stats?.products||0),explicit_facts:Number(FACTS?.stats?.explicit_facts||0),need_terms:Number(FACTS?.stats?.need_terms||0),graph_nodes:Number(GRAPH?.stats?.nodes||0),graph_edges:Number(GRAPH?.stats?.edges||0),alternative_edges:Number(GRAPH?.stats?.alternative_edges||0),shopping_adjacent_edges:Number(GRAPH?.stats?.shopping_adjacent_edges||0),fact_index_bytes:factBytes,relationship_graph_bytes:graphBytes,total_megabytes:Number(((factBytes+graphBytes)/1024/1024).toFixed(2)),current_truth_precedence:"live Odoo price/availability > archived snapshot",fact_reliability_policy:"generated completion descriptions excluded from technical-fact extraction",compatibility_policy:"relationship graph never proves compatibility",quote_policy:"draft only; live-verified prices required for totals"};
}
