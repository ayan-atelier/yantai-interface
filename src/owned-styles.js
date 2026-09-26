// Geometry overrides need to win over themes that force block/grid on the native
// columns. Preserve each original inline declaration and any later external edit.
export function createStyleOwner() {
  const owned=new Map();
  function release(element,name,record){
    if(element.style.getPropertyValue(name)!==record.applied || element.style.getPropertyPriority(name)!==record.priority)return;
    if(record.original)element.style.setProperty(name,record.original,record.originalPriority);
    else element.style.removeProperty(name);
  }
  function sync(wanted=new Map()){
    for(const [element,entry] of owned){
      for(const [name,record] of entry.properties)if(!wanted.get(element)?.has(name)){
        release(element,name,record);entry.properties.delete(name);
      }
      if(!entry.properties.size){
        if(!entry.hadStyle && !element.style.length)element.removeAttribute('style');
        owned.delete(element);
      }
    }
    for(const [element,properties] of wanted){
      let entry=owned.get(element);
      if(!entry){entry={hadStyle:element.hasAttribute('style'),properties:new Map()};owned.set(element,entry);}
      for(const [name,value] of properties){
        const current=element.style.getPropertyValue(name),priority=element.style.getPropertyPriority(name);
        let record=entry.properties.get(name);
        if(!record || current!==record.applied || priority!==record.priority){
          record={original:current,originalPriority:priority};entry.properties.set(name,record);
        }
        if(current!==value || priority!=='important')element.style.setProperty(name,value,'important');
        record.applied=element.style.getPropertyValue(name);record.priority=element.style.getPropertyPriority(name);
      }
    }
  }
  return {sync,clear:()=>sync()};
}

export function wantStyle(wanted,element,properties){
  if(!element)return;
  if(!wanted.has(element))wanted.set(element,new Map());
  for(const [name,value] of Object.entries(properties))wanted.get(element).set(name,String(value));
}
