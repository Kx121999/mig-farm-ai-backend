import { normalizeAr } from "./utils.js";

function n(v=""){ return normalizeAr(String(v||"")); }
function arr(v){ return Array.isArray(v)?v:[]; }
function idFor(type,label){ return `${type}:${n(label).replace(/\s+/g,"_").slice(0,90)}`; }
function addNode(map,type,label,meta={}){
  const value=String(label||"").trim(); if(!value) return null;
  const id=idFor(type,value); const prev=map.get(id)||{id,type,label:value,weight:0,meta:{}};
  prev.weight=Math.max(prev.weight,Number(meta.weight)||.5); prev.meta={...prev.meta,...meta}; map.set(id,prev); return id;
}
function addEdge(edges,from,to,relation,weight=.6){ if(!from||!to||from===to) return; edges.push({from,to,relation,weight:Number(weight)||.6}); }

export function buildKnowledgeGraph({message="",analysis={},state={},profile={},results=[],retrieval={},memory=[]}={}){
  const nodes=new Map(),edges=[];
  const user=addNode(nodes,"actor","customer",{weight:1});
  const category=analysis?.category?.key||state?.category||profile?.category||"";
  const crop=analysis?.crop?.key||state?.crop||profile?.crop||"";
  const emirate=analysis?.emirate||state?.emirate||profile?.emirate||"";
  const cultivation=analysis?.cultivation||state?.cultivation||profile?.cultivation||"";
  const goal=state?.cognitive_memory?.active_goal||state?.hybrid_memory?.active_goal||analysis?.intent||"";
  const catId=addNode(nodes,"category",category,{weight:.9}); if(catId) addEdge(edges,user,catId,"interested_in",.9);
  const cropId=addNode(nodes,"crop",crop,{weight:.95}); if(cropId) addEdge(edges,user,cropId,"growing",.95);
  if(catId&&cropId) addEdge(edges,cropId,catId,"belongs_to",.8);
  const emId=addNode(nodes,"emirate",emirate,{weight:.82}); if(emId) addEdge(edges,user,emId,"located_in",.82);
  const culId=addNode(nodes,"cultivation",cultivation,{weight:.8}); if(culId) addEdge(edges,user,culId,"uses_method",.8);
  const goalId=addNode(nodes,"goal",goal,{weight:.9}); if(goalId) addEdge(edges,user,goalId,"has_goal",.9);

  for(const p of arr(results).slice(0,8)){
    const pid=addNode(nodes,"product",p?.name,{weight:1,price:p?.price,currency:p?.currency,availability:p?.availability,url:p?.url});
    if(pid&&catId) addEdge(edges,pid,catId,"product_category",.85);
    if(pid&&cropId) addEdge(edges,pid,cropId,"candidate_for",.78);
    if(pid&&goalId) addEdge(edges,goalId,pid,"considers",.86);
  }
  for(const item of arr(retrieval?.items).slice(0,10)){
    const sid=addNode(nodes,"evidence",item?.title||item?.id,{weight:Number(item?.fusion_score||item?.score)||.55,source:item?.source,verified:Boolean(item?.verified)});
    if(sid&&goalId) addEdge(edges,sid,goalId,"supports",item?.verified?.9:.62);
  }
  for(const item of arr(memory).slice(0,6)){
    const mid=addNode(nodes,"memory",item?.title||item?.id,{weight:Number(item?.score)||.5,text:item?.answer});
    if(mid&&goalId) addEdge(edges,mid,goalId,"recalls",.58);
  }
  // Deduplicate edges.
  const edgeMap=new Map();
  for(const edge of edges){ const key=`${edge.from}|${edge.relation}|${edge.to}`; const prev=edgeMap.get(key); if(!prev||edge.weight>prev.weight) edgeMap.set(key,edge); }
  const outNodes=[...nodes.values()].sort((a,b)=>b.weight-a.weight).slice(0,32);
  const valid=new Set(outNodes.map(x=>x.id));
  const outEdges=[...edgeMap.values()].filter(x=>valid.has(x.from)&&valid.has(x.to)).sort((a,b)=>b.weight-a.weight).slice(0,48);
  return {version:"11.0",query:String(message||"").slice(0,300),nodes:outNodes,edges:outEdges};
}

export function knowledgeGraphSummary(graph={}){
  const nodes=arr(graph?.nodes),edges=arr(graph?.edges);
  return {
    nodes:nodes.length,edges:edges.length,
    entity_types:[...new Set(nodes.map(x=>x.type))].slice(0,12),
    top_entities:nodes.slice(0,8).map(x=>({type:x.type,label:x.label,weight:x.weight})),
    top_relations:edges.slice(0,10).map(x=>x.relation)
  };
}

export function knowledgeGraphContext(graph={}){
  const nodes=new Map(arr(graph?.nodes).map(x=>[x.id,x]));
  return arr(graph?.edges).slice(0,16).map(e=>{
    const a=nodes.get(e.from),b=nodes.get(e.to); if(!a||!b) return "";
    return `${a.type}:${a.label} --${e.relation}--> ${b.type}:${b.label}`;
  }).filter(Boolean);
}

export function knowledgeGraphHealth(){
  return {version:"11.0",mode:"ephemeral_evidence_graph",max_nodes:32,max_edges:48,persistent:false};
}
