import { normalizeAr, tokenize } from "./utils.js";

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
    .filter(x=>x.length>25);
}

export function extractPageAnswer(pages,message,locale="ar"){
  if(!pages.length) return "";
  const terms=tokenize(message).filter(x=>x.length>1);
  const scored=[];

  for(const page of pages){
    for(const sentence of sentenceSplit(`${page.description}. ${page.text}`)){
      const n=normalizeAr(sentence);
      let score=0;
      for(const term of terms){
        if(n.includes(term)) score+=3;
      }
      if(score>0) scored.push({sentence,score,page});
    }
  }

  scored.sort((a,b)=>b.score-a.score);
  const unique=[];
  const seen=new Set();

  for(const item of scored){
    const key=normalizeAr(item.sentence).slice(0,120);
    if(seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
    if(unique.length>=3) break;
  }

  if(!unique.length) return "";

  const page=unique[0].page;
  const body=unique.map(x=>x.sentence).join("\n");
  return locale==="en"
    ? `${page.title}:\n${body}`
    : `حسب المعلومات الموجودة في الموقع عن ${page.title}:\n${body}`;
}
