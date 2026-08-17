const METRIC_VERSION=1;

const store=globalThis.__migAiMetrics || {
  version:METRIC_VERSION,
  started_at:new Date().toISOString(),
  turns:0,
  unresolved:0,
  high_confidence:0,
  medium_confidence:0,
  low_confidence:0,
  lead_hot:0,
  lead_warm:0,
  lead_cold:0,
  sources:new Map(),
  intents:new Map(),
  categories:new Map(),
  crops:new Map(),
  stages:new Map(),
  errors:new Map(),
  last_updated_at:null
};
globalThis.__migAiMetrics=store;

function inc(map,key,amount=1){
  const safe=String(key||"unknown").slice(0,100)||"unknown";
  map.set(safe,(map.get(safe)||0)+amount);
}
function top(map,limit=30){
  return [...map.entries()]
    .sort((a,b)=>b[1]-a[1])
    .slice(0,limit)
    .map(([key,count])=>({key,count}));
}

export function recordAssistantMetric(event={}){
  try{
    store.turns+=1;
    if(event.unresolved) store.unresolved+=1;
    const confidence=String(event.confidence||"medium");
    if(confidence==="high") store.high_confidence+=1;
    else if(confidence==="low") store.low_confidence+=1;
    else store.medium_confidence+=1;

    const temp=String(event.lead_temperature||"cold");
    if(temp==="hot") store.lead_hot+=1;
    else if(temp==="warm") store.lead_warm+=1;
    else store.lead_cold+=1;

    inc(store.sources,event.source);
    inc(store.intents,event.intent);
    inc(store.categories,event.category||"none");
    inc(store.crops,event.crop||"none");
    inc(store.stages,event.stage||"discover");
    store.last_updated_at=new Date().toISOString();
  }catch{}
}

export function recordAssistantError(kind="unknown"){
  try{
    inc(store.errors,kind);
    store.last_updated_at=new Date().toISOString();
  }catch{}
}

export function metricsSnapshot(){
  const turns=Math.max(0,store.turns);
  return {
    version:METRIC_VERSION,
    started_at:store.started_at,
    last_updated_at:store.last_updated_at,
    totals:{
      turns,
      unresolved:store.unresolved,
      resolved:Math.max(0,turns-store.unresolved),
      unresolved_rate:turns?Number((store.unresolved/turns).toFixed(4)):0
    },
    confidence:{
      high:store.high_confidence,
      medium:store.medium_confidence,
      low:store.low_confidence
    },
    leads:{
      hot:store.lead_hot,
      warm:store.lead_warm,
      cold:store.lead_cold
    },
    top:{
      sources:top(store.sources),
      intents:top(store.intents),
      categories:top(store.categories),
      crops:top(store.crops),
      stages:top(store.stages),
      errors:top(store.errors)
    },
    privacy:{
      stores_raw_messages:false,
      stores_phone_numbers:false,
      stores_emails:false,
      stores_addresses:false,
      note:"Runtime aggregate metrics only. Serverless instances may reset."
    }
  };
}

export function resetMetrics(){
  store.started_at=new Date().toISOString();
  store.turns=0;
  store.unresolved=0;
  store.high_confidence=0;
  store.medium_confidence=0;
  store.low_confidence=0;
  store.lead_hot=0;
  store.lead_warm=0;
  store.lead_cold=0;
  store.sources.clear();
  store.intents.clear();
  store.categories.clear();
  store.crops.clear();
  store.stages.clear();
  store.errors.clear();
  store.last_updated_at=new Date().toISOString();
  return metricsSnapshot();
}
