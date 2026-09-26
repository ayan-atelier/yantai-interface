import { TOP_LABELS } from './settings.js';
import { createClassOwner, wantClass } from './owned-classes.js';

export const toolbarStyles = `
#top-settings-holder.yt-if-toolbar-empty,#top-bar.yt-if-toolbar-empty{
  height:0!important;min-height:0!important;max-height:0!important;
  padding-block:0!important;margin-block:0!important;border-width:0!important;
  background:none!important;box-shadow:none!important;
  backdrop-filter:none!important;-webkit-backdrop-filter:none!important;overflow:visible!important;
}
#top-settings-holder.yt-if-toolbar-empty::before,#top-settings-holder.yt-if-toolbar-empty::after,
#top-bar.yt-if-toolbar-empty::before,#top-bar.yt-if-toolbar-empty::after{display:none!important}
#top-bar.yt-if-toolbar-backplate-hidden{display:none!important}
#sheld.yt-if-toolbar-room{--topBarBlockSize:env(safe-area-inset-top,0px)!important}
`;

export function createToolbar(get) {
  let dead=false,queued=false,collapsed=false;
  const classes=createClassOwner();
  const observer=new MutationObserver(schedule);
  function choices() {
    const root=document.getElementById('top-settings-holder'); if(!root)return [];
    return [...root.children].flatMap((element,index)=>{
      const toggle=element.querySelector(':scope > .drawer-toggle') || (element.matches('.drawer-toggle,button')?element:null);
      if(!toggle)return [];
      const title=TOP_LABELS[element.id] || toggle.title || toggle.querySelector('[title]')?.title || element.getAttribute('aria-label') || '其他入口 '+(index+1);
      return [{key:element.id || 'extra:'+(toggle.id || title),label:title,element,toggle}];
    });
  }
  function unmanaged(element) {
    if(element.matches('script,style,link,template,.drawer-content') || element.hidden)return false;
    const style=getComputedStyle(element);
    return style.display!=='none' && style.visibility!=='hidden';
  }
  function hasOtherContent(root,items) {
    if([...root.childNodes].some(n=>n.nodeType===3 && n.textContent.trim()))return true;
    if([...root.children].some(e=>!items.some(c=>c.element===e) && unmanaged(e)))return true;
    return items.some(c=>c.element!==c.toggle && [...c.element.children].some(e=>e!==c.toggle && unmanaged(e)));
  }
  function apply() {
    if(dead)return;
    // Watch only the toolbar, immediate wrappers and their toggles. Native settings
    // panels, chat messages and their frequent internal changes are not observed.
    observer.disconnect();
    const root=document.getElementById('top-settings-holder'),bar=document.getElementById('top-bar');
    const items=choices(),s=get(),wanted=new Map();
    for(const c of items)if(s.enabled && s.hiddenTop.includes(c.key)){
      wantClass(wanted,c.toggle,'yt-if-toggle-hidden');
      if(c.element!==c.toggle)wantClass(wanted,c.element,'yt-if-drawer-empty');
    }
    const empty=!!(root && s.enabled && items.length && items.every(c=>s.hiddenTop.includes(c.key)) && !hasOtherContent(root,items));
    if(empty){
      // Keep the holder in the DOM: display:none would also hide its settings drawers.
      wantClass(wanted,root,'yt-if-toolbar-empty');
      let canReclaim=!bar;
      if(bar && (!bar.textContent.trim() && !bar.children.length)){
        wantClass(wanted,bar,'yt-if-toolbar-backplate-hidden');canReclaim=true;
      }else if(bar?.contains(root) && [...bar.children].every(e=>e===root || !unmanaged(e))){
        wantClass(wanted,bar,'yt-if-toolbar-empty');canReclaim=true;
      }
      // Only release the native shell's own toolbar space. Bookshelf 1.4.3 keeps
      // ownership of its measured insets; explicit theme offsets remain intact.
      if(canReclaim)wantClass(wanted,document.getElementById('sheld'),'yt-if-toolbar-room');
    }
    classes.sync(wanted);
    const nodes=new Set([root,bar,...items.flatMap(c=>[c.element,c.toggle])].filter(Boolean));
    if(root)for(const child of root.children)nodes.add(child);
    for(const element of nodes)observer.observe(element,{childList:true,attributes:true,attributeFilter:['class','style','hidden']});
    if(empty!==collapsed){collapsed=empty;window.dispatchEvent(new Event('resize'));}
  }
  function schedule(){
    if(dead || queued)return;queued=true;
    queueMicrotask(()=>{queued=false;if(!dead)apply();});
  }
  window.addEventListener('resize',schedule);
  return {apply,choices,destroy(){
    if(dead)return;dead=true;observer.disconnect();window.removeEventListener('resize',schedule);
    classes.clear();if(collapsed)window.dispatchEvent(new Event('resize'));
  }};
}
