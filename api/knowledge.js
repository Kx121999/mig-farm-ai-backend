export async function GET(){
  return Response.json({
    ok:false,
    edition:"github",
    error:"admin_api_disabled",
    message:"Knowledge is managed from data/knowledge.json in GitHub."
  },{status:410,headers:{"Cache-Control":"no-store"}});
}

export async function POST(){
  return Response.json({
    ok:false,
    edition:"github",
    error:"admin_api_disabled",
    message:"Edit data/knowledge.json in GitHub and commit the change."
  },{status:410,headers:{"Cache-Control":"no-store"}});
}
