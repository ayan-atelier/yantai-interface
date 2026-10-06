// Native container IDs from the supported ST pages. DOM position is not an
// installation timestamp; unknown third-party entries get a persisted first-seen order.
const systemIds=[
  'regex_container','vectors_container','assets_container','expressions_container','sd_container','tts_container',
  'qr_container','translation_container','caption_container','summarize_container','typing_indicator_container',
  'rvc_container','stt_container','audio_container','silence_container','objective_container','blip_container',
  'live2d_container','vrm_container','timelines_container','webllm_container','rss_container','websearch_container',
  'emulatorjs_container','idle_container','hypebot_container','randomizer_container','chromadb_container',
  'message_limit_container','injects_container','accuweather_container','dice_container'
];
// These are UI rows, not loading-order identifiers. Keep the local/cloud
// handoff row before memory and the interface shell; bookshelf stays last.
const yantaiIds=['yt-sync-settings','yt-memory-settings','yt-interface-settings','jd-bookshelf-settings'];

export function entryKind(choice){
  const id=choice.element.id;
  if(systemIds.includes(id))return 'system';
  if(/^酒馆助手|^Tavern\s*Helper\b/i.test(choice.label) || /^(?:TH-settings|tavern[-_]helper[-_]settings|js[-_]slash[-_]runner[-_]settings)$/i.test(id))return 'helper';
  if(yantaiIds.includes(id))return 'yantai';
  return 'other';
}

export function rememberExtensionOrder(choices,get,update){
  const saved=get().extensionOrder || [],next=[...saved],known=new Set(saved);
  for(const choice of choices){
    if(next.length>=500)break;
    if(entryKind(choice)!=='other' || known.has(choice.key))continue;
    known.add(choice.key);next.push(choice.key);
  }
  if(next.length!==saved.length)update({extensionOrder:next},false);
}

export function extensionRank(choice,order=[]){
  switch(entryKind(choice)){
    case 'system':return 2000+systemIds.indexOf(choice.element.id);
    case 'helper':return 3000;
    case 'yantai':return 3100+yantaiIds.indexOf(choice.element.id);
    default:{const index=order.indexOf(choice.key);return 4000+(index<0?500:index);}
  }
}

export function sortExtensions(choices,order){
  return [...choices].sort((a,b)=>extensionRank(a,order)-extensionRank(b,order) || a.key.localeCompare(b.key));
}
