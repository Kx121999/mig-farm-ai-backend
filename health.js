export function GET(){
  return Response.json({
    ok:true,
    service:"MIG FARM Site-wide Emirati Assistant",
    mode:"free_sitewide_emirati_v3",
    time:new Date().toISOString()
  });
}
