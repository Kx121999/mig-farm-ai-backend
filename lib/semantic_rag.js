import { normalizeAr, tokenize, fuzzyWordMatch } from "./utils.js";
import { getGitHubKnowledge } from "./knowledge_loader.js";

function n(v=""){ return normalizeAr(String(v||"")); }
function arr(v){ return Array.isArray(v)?v:[]; }
function clamp(v,min=0,max=1){ return Math.max(min,Math.min(max,Number(v)||0)); }
function uniq(items=[],limit=24){
  const seen=new Set(),out=[];
  for(const item of items){
    const value=String(item||"").trim();
    if(!value) continue;
    const key=n(value); if(!key||seen.has(key)) continue;
    seen.add(key); out.push(value); if(out.length>=limit) break;
  }
  return out;
}

const CONCEPTS={
  shipping:["شحن","توصيل","دليفري","delivery","shipping"],
  price:["سعر","تكلفه","درهم","price","cost","ارخص","اوفر"],
  stock:["متوفر","موجود","مخزون","available","stock"],
  seeds:["بذور","تقاوي","seed","seeds"],
  fertilizer:["سماد","اسمده","تغذيه النبات","fertilizer","fertiliser"],
  pesticide:["مبيد","حشرات","افه","افات","pesticide","insecticide"],
  greenhouse:["بيت محمي","بيوت محميه","greenhouse","صوبه"],
  irrigation:["ري","تنقيط","مياه","irrigation","drip"],
  tomato:["طماطم","بندوره","tomato"],
  cucumber:["خيار","cucumber"],
  pepper:["فلفل","pepper"],
  eggplant:["باذنجان","eggplant","aubergine"],
  branch:["فرع","فروع","branch","location"],
  payment:["دفع","بطاقه","كاش","checkout","payment"],
  compare:["قارن","مقارنه","الفرق","افضل","انسب","compare","best"],
  dose:["جرعه","خلط","كم مل","dose","dosage"]
};

function conceptExpansion(text=""){
  const t=n(text),out=[];
  for(const terms of Object.values(CONCEPTS)){
    if(terms.some(term=>t.includes(n(term)))) out.push(...terms);
  }
  return uniq(out,40);
}

function trigrams(value=""){
  const s=`  ${n(value).replace(/\s+/g," ")}  `;
  const set=new Set();
  for(let i=0;i<s.length-2;i++) set.add(s.slice(i,i+3));
  return set;
}
function trigramSimilarity(a="",b=""){
  const aa=trigrams(a),bb=trigrams(b);
  if(!aa.size||!bb.size) return 0;
  let hit=0; for(const x of aa) if(bb.has(x)) hit++;
  return hit/Math.max(aa.size,bb.size);
}
function tokenSimilarity(query="",text=""){
  const q=uniq([...tokenize(query),...conceptExpansion(query)],60).map(n);
  const d=tokenize(text).map(n);
  if(!q.length||!d.length) return 0;
  let hits=0,weighted=0;
  for(const token of q){
    let best=0;
    for(const candidate of d){
      if(token===candidate){best=1;break;}
      if(token.length>3&&(token.includes(candidate)||candidate.includes(token))) best=Math.max(best,.82);
      else if(fuzzyWordMatch(token,candidate)) best=Math.max(best,.68);
    }
    hits+=best; weighted+=1;
  }
  return weighted?hits/weighted:0;
}
function fieldScore(query="",value="",weight=1){
  if(!value) return 0;
  const q=n(query),v=n(value);
  let score=tokenSimilarity(query,value)*weight;
  if(q&&v.includes(q)) score+=.28*weight;
  score+=trigramSimilarity(query,value)*.25*weight;
  return score;
}

function intentCompatible(entry={},context={}){
  const allowed=arr(entry.intents).map(String).filter(Boolean);
  const intent=String(context?.analysis?.intent||"");
  if(!allowed.length||!intent||intent==="unknown") return true;
  return allowed.includes(intent) || (intent==="product_search"&&allowed.some(x=>/product|seed|fertilizer|pesticide/.test(x)));
}

export function semanticKnowledgeCandidates(message="",context={},limit=5){
  const raw=getGitHubKnowledge();
  if(raw?.settings?.enabled===false || !message) return [];
  const locale=context?.locale==="en"?"en":"ar";
  const rows=[];
  for(const entry of arr(raw?.entries)){
    if(entry?.enabled===false) continue;
    if(entry?.locale && entry.locale!==locale) continue;
    if(!intentCompatible(entry,context)) continue;
    const text=[entry.title,entry.question,entry.answer,...arr(entry.keywords)].filter(Boolean).join(" ");
    let score=0;
    score+=fieldScore(message,entry.question,1.55);
    score+=fieldScore(message,entry.title,1.15);
    score+=fieldScore(message,arr(entry.keywords).join(" "),1.35);
    score+=fieldScore(message,entry.answer,.55);
    if(entry.verified) score+=.12;
    score+=Math.max(0,Math.min(100,Number(entry.priority)||0))/1000;
    if(score<.46) continue;
    rows.push({
      id:String(entry.id||""),title:String(entry.title||entry.question||""),answer:String(entry.answer||""),
      source_label:String(entry.source_label||"GitHub Knowledge"),verified:Boolean(entry.verified),
      category:String(entry.category||""),score:Number(score.toFixed(4)),source:"github_knowledge"
    });
  }
  return rows.sort((a,b)=>b.score-a.score).slice(0,Math.max(1,Math.min(8,limit)));
}

export function semanticSiteCandidates(message="",pages=[],limit=6){
  const rows=[];
  for(const page of arr(pages)){
    const text=[page?.title,page?.description,page?.text].filter(Boolean).join(" ");
    if(!text) continue;
    const score=fieldScore(message,page?.title||"",1.4)+fieldScore(message,page?.description||"",.9)+fieldScore(message,page?.text||"",.55);
    if(score<.36) continue;
    rows.push({
      id:String(page?.url||page?.title||""),title:String(page?.title||""),answer:String(page?.description||page?.text||"").slice(0,1400),
      url:String(page?.url||""),verified:false,score:Number(score.toFixed(4)),source:"site_page"
    });
  }
  return rows.sort((a,b)=>b.score-a.score).slice(0,Math.max(1,Math.min(10,limit)));
}

function productDoc(p={},index=0){
  return {
    id:String(p.url||p.product_id||p.product_template_id||`${p.name||"product"}-${index}`),
    title:String(p.name||""),answer:[p.name,p.price?`${p.price} ${p.currency||"AED"}`:"",p.availability||""].filter(Boolean).join(" — "),
    url:String(p.url||""),verified:true,score:1-(index*.02),source:"live_product",product:p
  };
}

export function fuseRetrieval({message="",knowledge=[],pages=[],products=[],memory=[]}={}){
  const groups=[
    {rows:arr(products).map(productDoc),weight:1.35},
    {rows:arr(knowledge),weight:1.18},
    {rows:arr(pages),weight:.88},
    {rows:arr(memory),weight:.72}
  ];
  const map=new Map();
  for(const group of groups){
    group.rows.forEach((row,index)=>{
      const key=`${row.source||"source"}:${row.id||row.title||index}`;
      const previous=map.get(key)||{...row,rrf:0,sources:new Set()};
      previous.rrf += group.weight*(1/(60+index+1)) + (Number(row.score)||0)*.08*group.weight;
      previous.sources.add(row.source||"unknown");
      map.set(key,previous);
    });
  }
  const out=[...map.values()].map(row=>({...row,sources:[...row.sources],fusion_score:Number(row.rrf.toFixed(5))}));
  out.sort((a,b)=>b.fusion_score-a.fusion_score);
  const top=out.slice(0,8);
  const topScore=top[0]?.fusion_score||0;
  const confidence=top.length?clamp(.42+Math.min(.5,topScore*2.4)+(top.some(x=>x.verified)?.08:0),.35,.97):.25;
  return {query:String(message||"").slice(0,500),items:top,confidence:Number(confidence.toFixed(2)),sources:uniq(top.flatMap(x=>x.sources||[]),8)};
}

export function composeHybridKnowledgeAnswer(bundle={},locale="ar"){
  const candidates=arr(bundle?.items).filter(x=>["github_knowledge","site_page"].includes(x.source));
  if(!candidates.length || Number(bundle?.confidence||0)<.62) return null;
  const verified=candidates.filter(x=>x.source==="github_knowledge"&&x.verified);
  const selected=(verified.length?verified:candidates).slice(0,2);
  const answers=uniq(selected.map(x=>String(x.answer||"").trim()).filter(Boolean),2);
  if(!answers.length) return null;
  const confidence=Number(bundle.confidence||0);
  return {
    reply:answers.join("\n\n"),
    display_reply:answers.join("\n\n"),
    confidence,
    citations:selected.map(x=>({source:x.source,id:x.id,title:x.title,url:x.url||"",verified:Boolean(x.verified),score:x.fusion_score||x.score||0})),
    source:verified.length?"hybrid_verified_rag":"hybrid_site_rag"
  };
}

export function semanticRagHealth(){
  return {
    version:"10.0",
    mode:"hybrid_semantic_fusion",
    methods:["arabic_normalization","fuzzy_token_similarity","character_trigrams","concept_expansion","weighted_reciprocal_rank_fusion"],
    sources:["live_products","github_knowledge","site_pages","episodic_memory"],
    external_embedding_required:false
  };
}
