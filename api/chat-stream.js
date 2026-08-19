import { POST as chatPOST } from "./chat.js";

const DEFAULT_ORIGINS=["https://www.migfarm.com","https://migfarm.com","https://edu-mig-for-agriculture.odoo.com"];
function origins(){return [...new Set([...DEFAULT_ORIGINS,...String(process.env.ALLOWED_ORIGINS||"").split(",").map(x=>x.trim()).filter(Boolean)])];}
function allowed(origin=""){return !origin||origins().includes(origin);}
function headers(origin=""){return {"Content-Type":"text/event-stream; charset=utf-8","Cache-Control":"no-cache, no-store, no-transform","Connection":"keep-alive","X-Accel-Buffering":"no","X-Content-Type-Options":"nosniff","Vary":"Origin",...(origin&&allowed(origin)?{"Access-Control-Allow-Origin":origin}:{})};}
function event(name,data){return `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`;}

export async function OPTIONS(request){
  const origin=request.headers.get("origin")||"";
  if(!allowed(origin))return new Response(null,{status:403});
  return new Response(null,{status:204,headers:{...(origin?{"Access-Control-Allow-Origin":origin}:{}),"Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Allow-Headers":"Content-Type","Access-Control-Max-Age":"86400","Vary":"Origin"}});
}

export async function POST(request){
  const origin=request.headers.get("origin")||"";
  if(!allowed(origin))return Response.json({ok:false,error:"origin_not_allowed"},{status:403});
  const encoder=new TextEncoder();
  const stream=new ReadableStream({
    async start(controller){
      const send=(name,data)=>controller.enqueue(encoder.encode(event(name,data)));
      try{
        let locale="ar";try{const preview=await request.clone().json();locale=preview?.locale==="en"?"en":"ar";}catch{}
        send("status",{phase:"understanding",message:locale==="en"?"Understanding the complete request…":"بفهم طلبك كاملًا…"});
        send("status",{phase:"grounding",message:locale==="en"?"Checking context and verified facts…":"براجع السياق والمعلومات الموثقة…"});
        const response=await chatPOST(request);
        const data=await response.json().catch(()=>({error:"invalid_chat_response"}));
        if(!response.ok)send("error",{status:response.status,...data});
        else send("result",data);
      }catch(error){send("error",{status:500,error:"stream_failed",reply:"المساعد مش متاح مؤقتًا. جرّب مرة ثانية بعد لحظات.",detail:String(error?.message||"unknown").slice(0,120)});}
      finally{send("done",{ok:true});controller.close();}
    }
  });
  return new Response(stream,{status:200,headers:headers(origin)});
}
