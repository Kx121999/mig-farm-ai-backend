import { normalizeAr } from "./utils.js";

function n(v=""){ return normalizeAr(String(v||"")); }
function uniq(items=[],max=8){
  const seen=new Set(),out=[];
  for(const item of items){
    const value=String(item||"").trim();
    if(!value) continue;
    const key=n(value);
    if(!key||seen.has(key)) continue;
    seen.add(key);out.push(value);
    if(out.length>=max) break;
  }
  return out;
}
function signature(value=""){
  const text=n(value).replace(/\s+/g," ").trim();
  let h=2166136261;
  for(let i=0;i<text.length;i++){ h^=text.charCodeAt(i); h=Math.imul(h,16777619); }
  return text?(h>>>0).toString(36):"";
}
function dedupeText(value=""){
  const text=String(value||"").trim();
  if(!text) return "";
  const blocks=text.split(/\n{2,}/).map(x=>x.trim()).filter(Boolean);
  const seenBlocks=new Set(),cleanBlocks=[];
  for(const block of blocks){
    const lines=block.split(/\n+/).map(x=>x.trim()).filter(Boolean);
    const seenLines=new Set(),cleanLines=[];
    for(const line of lines){
      const key=n(line).replace(/^[•\-–—]\s*/,"");
      if(!key||seenLines.has(key)) continue;
      seenLines.add(key);cleanLines.push(line);
    }
    const cleaned=cleanLines.join("\n").trim();
    const blockKey=n(cleaned);
    if(cleaned&&!seenBlocks.has(blockKey)){seenBlocks.add(blockKey);cleanBlocks.push(cleaned);}
  }
  return cleanBlocks.join("\n\n");
}

export function enforceResponseQuality(payload={}){
  const out={...payload};
  if(typeof out.reply==="string") out.reply=dedupeText(out.reply);
  if(typeof out.display_reply==="string") out.display_reply=dedupeText(out.display_reply);
  if(Array.isArray(out.quick_replies)) out.quick_replies=uniq(out.quick_replies,4);
  if(Array.isArray(out.results)){
    const seen=new Set();
    out.results=out.results.filter(p=>{
      const key=n(p?.url)||`${n(p?.name)}|${p?.price??""}`;
      if(!key||seen.has(key)) return false;
      seen.add(key);return true;
    }).slice(0,8);
  }
  return out;
}

export function visibleProducts(results=[],limit=4){
  const seen=new Set(),out=[];
  for(const p of Array.isArray(results)?results:[]){
    if(!p?.name) continue;
    const key=n(p.url)||`${n(p.name)}|${p.price??""}`;
    if(!key||seen.has(key)) continue;
    seen.add(key);out.push(p);
    if(out.length>=limit) break;
  }
  return out;
}

export function responseSignature(payload={}){
  return signature(payload?.display_reply||payload?.reply||"");
}

export function conversationQualityMeta({previous={},next={},analysis={},message="",source="",payload={},results=[]}={}){
  const flags=[];
  const prevCategory=String(previous?.category||"");
  const prevCrop=String(previous?.crop||"");
  const nextCategory=String(next?.category||"");
  const nextCrop=String(next?.crop||"");
  if(analysis?.correction) flags.push("correction");
  if((prevCategory&&nextCategory&&prevCategory!==nextCategory)||(prevCrop&&nextCrop&&prevCrop!==nextCrop)) flags.push("context_switch");
  if(analysis?.intent==="product_memory") flags.push("memory_followup");
  if(Array.isArray(next?.visible_products)&&next.visible_products.length) flags.push("visible_product_memory");
  if(source.includes("fallback")||source.includes("clarify")) flags.push("clarification");
  if(source.includes("no_live")) flags.push("live_data_gap");
  const sig=responseSignature(payload);
  const repeated=Boolean(sig&&previous?.last_reply_signature&&sig===previous.last_reply_signature);
  if(repeated) flags.push("repeated_reply");
  let score=88;
  if(source.includes("fallback")) score-=18;
  if(source.includes("clarify")) score-=8;
  if(source.includes("no_live")) score-=12;
  if(repeated) score-=8;
  if(analysis?.correction) score+=2;
  if(Array.isArray(results)&&results.length) score+=3;
  score=Math.max(35,Math.min(99,score));
  return {score,flags:uniq(flags,8),correction:Boolean(analysis?.correction),context_switch:flags.includes("context_switch"),visible_products_count:Array.isArray(next?.visible_products)?next.visible_products.length:0,response_signature:sig,user_signature:signature(message)};
}
