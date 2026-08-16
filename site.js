export function cleanText(value,maxLength=3000){
  if(typeof value!=="string") return "";
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,"")
    .trim()
    .slice(0,maxLength);
}

export function normalizeAr(value=""){
  return String(value)
    .toLowerCase()
    .replace(/[أإآ]/g,"ا")
    .replace(/ى/g,"ي")
    .replace(/ة/g,"ه")
    .replace(/[ًٌٍَُِّْـ]/g,"")
    .replace(/[^\p{L}\p{N}\s.-]/gu," ")
    .replace(/\s+/g," ")
    .trim();
}

export function tokenize(value=""){
  return normalizeAr(value)
    .split(/\s+/)
    .filter(Boolean)
    .filter(x=>x.length>1);
}

export function safeLocale(value){
  return value==="en" ? "en" : "ar";
}

export function safePageUrl(value){
  if(!value || typeof value!=="string") return "";
  try{
    const url=new URL(value);
    if(!["http:","https:"].includes(url.protocol)) return "";
    return url.toString().slice(0,1000);
  }catch{
    return "";
  }
}

export function jsonResponse(data,status=200,headers={}){
  return new Response(JSON.stringify(data),{
    status,
    headers:{
      "Content-Type":"application/json; charset=utf-8",
      ...headers
    }
  });
}

export function levenshtein(a="",b=""){
  a=normalizeAr(a); b=normalizeAr(b);
  const m=a.length,n=b.length;
  if(!m) return n;
  if(!n) return m;
  const dp=Array.from({length:n+1},(_,j)=>j);
  for(let i=1;i<=m;i++){
    let prev=dp[0];
    dp[0]=i;
    for(let j=1;j<=n;j++){
      const temp=dp[j];
      dp[j]=Math.min(
        dp[j]+1,
        dp[j-1]+1,
        prev+(a[i-1]===b[j-1]?0:1)
      );
      prev=temp;
    }
  }
  return dp[n];
}

export function fuzzyWordMatch(a,b){
  a=normalizeAr(a); b=normalizeAr(b);
  if(!a || !b) return false;
  if(a===b || a.includes(b) || b.includes(a)) return true;
  const maxLen=Math.max(a.length,b.length);
  if(maxLen<=4) return levenshtein(a,b)<=1;
  return levenshtein(a,b)<=Math.max(1,Math.floor(maxLen*0.25));
}
