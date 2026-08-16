import { normalizeAr, tokenize } from "./utils.js";

export function smallTalk(message,locale="ar"){
  if(locale==="en") return "";

  const t=normalizeAr(message);

  if(/^(هلا|هلا والله|مرحبا|السلام عليكم|سلام|هاي|hello|hi)\b/.test(t)){
    return "هلا والله 👋 حياك في MIG FARM. شو حاب تعرف؟";
  }

  if(/شلونك|كيفك|كيف الحال|علومك|شو اخبارك/.test(t)){
    return "بخير دامك بخير 🌱 شو أقدر أساعدك فيه اليوم؟";
  }

  if(/شكرا|مشكور|تسلم|يعطيك العافيه|يعطيك العافية/.test(t)){
    return "العفو، حاضرين 🌱 إذا تبا أي شي ثاني أنا وياك.";
  }

  if(/منو انت|مين انت|انت مين|شو تسوي|شو وظيفتك/.test(t)){
    return "أنا مساعد MIG FARM للموقع. أقدر أساعدك بالمنتجات والأسعار والتوفر والخدمات والشحن وسياسات الموقع وأوصلك للصفحة أو الواتساب إذا احتجت.";
  }

  if(/وينكم|وين موقعكم|الفروع|فرعكم/.test(t)){
    return "عندنا فرعين في الإمارات: العين والشارقة. إذا تبا رقم فرع معيّن قل لي العين أو الشارقة.";
  }

  if(/رقم العين|واتساب العين|فرع العين/.test(t)){
    return "رقم وواتساب فرع العين: +971 58 176 8215.";
  }

  if(/رقم الشارقه|رقم الشارقة|فرع الشارقه|فرع الشارقة/.test(t)){
    return "رقم فرع الشارقة: +971 54 702 5904.";
  }

  if(/الايميل|الإيميل|البريد/.test(t)){
    return "إيميل MIG FARM هو sales@migfarm.com.";
  }

  return "";
}

export function formatProducts(products,locale="ar"){
  if(locale==="en"){
    return "I found these products on the MIG FARM website:\n"+products.map(p=>{
      const price=p.price?`${p.price} ${p.currency||"AED"}`:"price not shown";
      const availability=p.availability?` - ${p.availability}`:"";
      return `• ${p.name} — ${price}${availability}`;
    }).join("\n");
  }

  return "حصلت لك هالمنتجات على موقع MIG FARM:\n"+products.map(p=>{
    const price=p.price?`${p.price} ${p.currency||"AED"}`:"السعر مب ظاهر";
    const availability=p.availability?` - ${p.availability}`:"";
    return `• ${p.name} — ${price}${availability}`;
  }).join("\n");
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
    if(unique.length>=4) break;
  }

  if(!unique.length){
    const first=pages[0];
    const fallback=(first.description || first.text || "").slice(0,700);
    if(!fallback) return "";
    return locale==="en"
      ? `${first.title}:\n${fallback}`
      : `حسب اللي موجود في الموقع عن ${first.title}:\n${fallback}`;
  }

  const page=unique[0].page;
  const body=unique.map(x=>x.sentence).join("\n");

  return locale==="en"
    ? `${page.title}:\n${body}`
    : `هيه، حسب التفاصيل الموجودة في الموقع عن ${page.title}:\n${body}`;
}
