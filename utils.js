export function GET(){
  return Response.json({
    ok:true,
    service:"MIG FARM Free Live Website Assistant",
    mode:"free_live_site",
    time:new Date().toISOString()
  });
}
