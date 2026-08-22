const VERSION='37.0.0';
const RELEASE='PERSISTENT_MEMORY_ENGINE_V37';
const stats=globalThis.__migV37Stats||{updates:0,corrections:0,episodes:0,facts:0};
globalThis.__migV37Stats=stats;
function clean(v='',max=1600){return String(v??'').replace(/[\u0000-\u001f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max);}
function arr(v){return Array.isArray(v)?v:[];}
function uniqObjects(items,keyFn,max){const seen=new Set(),out=[];for(const x of items){const k=keyFn(x);if(!k||seen.has(k))continue;seen.add(k);out.push(x);if(out.length>=max)break;}return out;}
function fact(key,value,confidence=.9,source='conversation'){if(value===null||value===undefined||value==='')return null;const v=clean(typeof value==='object'?JSON.stringify(value):value,500);return v&&v!=='null'&&v!=='undefined'?{key,value:v,confidence:Number(confidence)||0,source,at:new Date().toISOString()}:null;}
function summarizeTurn(message='',core={}){const bits=[core.corrected_goal_intent||core.primary_intent,core.active_entity?.name,core.slots?.crop,core.slots?.environment].filter(Boolean);return clean(`${message}${bits.length?` → ${bits.join(' / ')}`:''}`,600);}

export function updatePersistentMemoryV37({previous={},message='',semanticCore={},conversationState={},history=[]}={}){
  stats.updates+=1;const prev=previous&&typeof previous==='object'?previous:{};const turn=Number(conversationState?.turn)||Number(prev.turn)||0;
  const currentFacts=[fact('active_product',semanticCore?.active_entity?.name,semanticCore?.reference?.confidence||.8),fact('crop',semanticCore?.slots?.crop),fact('environment',semanticCore?.slots?.environment),fact('location',semanticCore?.slots?.location),fact('quantity',semanticCore?.slots?.quantity),fact('goal',semanticCore?.corrected_goal_intent||semanticCore?.primary_intent)].filter(Boolean);
  const existing=arr(prev.semantic_facts);const semanticFacts=uniqObjects([...currentFacts,...existing],x=>`${x.key}:${x.value}`,24);stats.facts+=currentFacts.length;
  const episodes=[{turn,summary:summarizeTurn(message,semanticCore),relationship:semanticCore?.relationship||'unclear',at:new Date().toISOString()},...arr(prev.episodes)].filter(x=>x.summary).slice(0,16);stats.episodes+=1;
  const corrections=semanticCore?.correction?[{turn,from:clean(conversationState?.last_correction?.from||'',120),to:clean(semanticCore?.corrected_goal_intent||semanticCore?.active_entity?.name||'',200),at:new Date().toISOString()},...arr(prev.corrections)].slice(0,10):arr(prev.corrections).slice(0,10);if(semanticCore?.correction)stats.corrections+=1;
  const unresolved=semanticCore?.clarification?.required?{turn,missing:arr(semanticCore.clarification.missing).slice(0,4),question:clean(semanticCore.clarification.question,400)}:null;
  return {version:VERSION,release:RELEASE,turn,working:{active_entity:semanticCore?.active_entity||null,slots:semanticCore?.slots||{},goal:semanticCore?.corrected_goal_intent||semanticCore?.primary_intent||null,constraints:arr(semanticCore?.constraints).slice(0,16)},semantic_facts:semanticFacts,episodes,corrections,unresolved,recent_dialogue:arr(history).slice(-12).map(x=>({role:x?.role==='assistant'?'assistant':'user',content:clean(x?.content,700)})),updated_at:new Date().toISOString()};
}
export function memoryContextV37(memory={}){return {version:VERSION,working:memory?.working||{},semantic_facts:arr(memory?.semantic_facts).slice(0,12),episodes:arr(memory?.episodes).slice(0,6),corrections:arr(memory?.corrections).slice(0,5),unresolved:memory?.unresolved||null};}
export function persistentMemoryHealthV37(){return {version:VERSION,release:RELEASE,ready:true,layers:['working','episodic','semantic','correction','unresolved'],raw_transcript_long_term:false,stats:{...stats}};}
