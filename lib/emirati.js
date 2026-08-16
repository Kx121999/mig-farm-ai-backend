import { normalizeAr, tokenize, fuzzyWordMatch } from "./utils.js";

const STOP=new Set([
  "في","من","على","علي","عن","الى","إلى","هذا","هذي","هذه","ده","دي","هو","هي","و","او","أو","مع",
  "عندكم","عندك","هل","شو","وش","ايش","إيش","ايه","إيه","ابي","ابغي","ابغى","ابا","عايز","عاوز","ممكن",
  "please","what","where","how","do","you","is","are","the","a","an","in","on","of","to","for"
]);

function terms(value=""){
  return tokenize(value).filter(x=>x.length>1 && !STOP.has(x));
}

export function formatProducts(products,locale="ar"){
  const en=locale==="en";
  if(!products.length){
    return en?"I couldn't confirm a matching product in the live store.":"ما حصلت منتج مؤكد مطابق في المتجر.";
  }

  const shown=products.slice(0,8);
  const heading=en
    ? `I found ${shown.length} matching product${shown.length===1?"":"s"} on MIG FARM:`
    : `حصلت لك ${shown.length} ${shown.length===1?"منتج":"منتجات"} على موقع MIG FARM:`;

  const rows=shown.map(p=>{
    const price=p.price ? `${p.price} ${p.currency||"AED"}` : (en?"price not shown":"السعر مب ظاهر");
    const availability=p.availability ? ` - ${p.availability}` : "";
    return `• ${p.name} — ${price}${availability}`;
  });

  return `${heading}\n${rows.join("\n")}`;
}

function sentenceSplit(text=""){
  return String(text)
    .split(/(?<=[.!؟])\s+|\n+/)
    .map(x=>x.trim())
    .filter(x=>x.length>28 && x.length<700);
}

function sentenceScore(sentence,queryTerms){
  const normalized=normalizeAr(sentence);
  const sentenceTokens=tokenize(normalized);
  let score=0,matched=0;
  for(const term of queryTerms){
    let hit=false;
    if(normalized.includes(term)){score+=5;hit=true;}
    else{
      for(const token of sentenceTokens){
        if(fuzzyWordMatch(token,term)){score+=2;hit=true;break;}
      }
    }
    if(hit) matched++;
  }
  return {score,matched,coverage:queryTerms.length?matched/queryTerms.length:0};
}

export function extractPageAnswer(pages,message,locale="ar"){
  if(!pages.length) return null;
  const queryTerms=terms(message);
  if(!queryTerms.length) return null;

  const candidates=[];
  for(const page of pages){
    const titleScore=sentenceScore(`${page.title} ${page.description||""}`,queryTerms);
    for(const sentence of sentenceSplit(`${page.description||""}. ${page.text||""}`)){
      const x=sentenceScore(sentence,queryTerms);
      const total=x.score + titleScore.score*0.35;
      if(x.matched>0) candidates.push({sentence,page,score:total,coverage:x.coverage,matched:x.matched});
    }
  }
  candidates.sort((a,b)=>b.score-a.score);
  if(!candidates.length) return null;

  const best=candidates[0];
  // Strong guardrail: do not manufacture an answer from a weakly related page.
  if(best.score<5 || (queryTerms.length>=3 && best.coverage<0.34)) return null;

  const samePage=candidates.filter(x=>x.page.url===best.page.url && x.score>=Math.max(4,best.score*0.45));
  const unique=[]; const seen=new Set();
  for(const item of samePage){
    const key=normalizeAr(item.sentence).slice(0,140);
    if(seen.has(key)) continue;
    seen.add(key); unique.push(item.sentence);
    if(unique.length>=3) break;
  }
  if(!unique.length) return null;

  const reply=locale==="en"
    ? `According to ${best.page.title}:\n${unique.join("\n")}`
    : `حسب المعلومات الموجودة في الموقع عن ${best.page.title}:\n${unique.join("\n")}`;

  return {reply,page:best.page,confidence:Math.min(1,best.score/20)};
}
