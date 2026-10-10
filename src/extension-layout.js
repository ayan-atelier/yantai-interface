import { node } from '../shared/ui.js';
import { createClassOwner, wantClass } from './owned-classes.js';
import { createStyleOwner, wantStyle } from './owned-styles.js';
import { extensionRank } from './extension-order.js';

export const extensionStyles = `
.extensions_block.yt-if-extension-layout,#rm_extensions_block.yt-if-extension-layout{
  display:flex!important;flex-direction:column!important;align-items:stretch!important;
}
.yt-if-extension-layout>.yt-if-extension-column{display:contents!important}
.yt-if-extension-layout>.yt-if-extension-column>.yt-if-extension-row{
  flex:0 0 auto!important;width:100%!important;max-width:100%!important;min-width:0!important;margin-inline:0!important;
}
.yt-if-extension-layout>.yt-if-extension-prefix,.yt-if-extension-layout>.yt-if-extension-suffix{width:100%!important}
.yt-if-extension-hidden,.yt-if-extension-vacant{display:none!important}
.yt-if-extras-row #extensions_connect{width:auto!important;white-space:nowrap!important;min-width:3.5em;}

/* Keep the native regex editor inside a narrow phone viewport. The title and
   action row must stay intact; wrapping that row makes each native card grow
   vertically and separates its controls on mobile. */
@media (max-width:600px), (pointer:coarse) and (max-width:1200px){
  .yt-if-extension-layout,
  .yt-if-extension-layout > .yt-if-extension-column,
  .yt-if-extension-layout > .yt-if-extension-prefix,
  .yt-if-extension-layout > .yt-if-extension-suffix,
  .yt-if-extension-layout > .yt-if-extension-column > .yt-if-extension-row{
    width:100%!important;max-width:100%!important;min-width:0!important;
  }
  .yt-if-extension-layout #regex_container,
  .yt-if-extension-layout #regex_container .inline-drawer-content,
  .yt-if-extension-layout #regex_container .flex-container{
    width:100%!important;max-width:100%!important;min-width:0!important;box-sizing:border-box!important;
  }
  /* The native regex row uses display:contents; give it a real containing
     block on phones so its drawer cannot size itself against the outer panel. */
  .yt-if-extension-layout #regex_container{
    display:block!important;overflow-x:hidden!important;
  }
  .yt-if-extension-layout #regex_container .flex-container:not(.regex-script-label):not(.regex_script_buttons):not(.flexnowrap){
    display:flex!important;flex-wrap:wrap!important;align-items:stretch!important;gap:6px!important;
  }
  .yt-if-extension-layout #regex_container .regex-script-label{
    display:flex!important;flex-wrap:nowrap!important;align-items:center!important;gap:0!important;
  }
  .yt-if-extension-layout #regex_container .regex-script-label > .regex_script_name{
    flex:1 1 0%!important;min-width:0!important;overflow:hidden!important;
    text-overflow:ellipsis!important;white-space:nowrap!important;
  }
  .yt-if-extension-layout #regex_container .regex-script-label > .flex-container:last-child,
  .yt-if-extension-layout #regex_container .regex-script-label .regex_script_buttons{
    width:auto!important;max-width:100%!important;min-width:0!important;flex:0 1 auto!important;
    flex-wrap:nowrap!important;align-items:center!important;gap:0!important;
  }
  /* Let the title truncate while controls keep their intrinsic width. */
  .yt-if-extension-layout #regex_container .regex-script-label > .flex-container:last-child{
    flex:0 0 auto!important;flex-wrap:nowrap!important;gap:5px!important;
  }
  .yt-if-extension-layout #regex_container .regex_script_buttons{
    flex:0 0 auto!important;gap:5px!important;
  }
  .yt-if-extension-layout #regex_container .regex-script-label > .flex-container:last-child > .menu_button,
  .yt-if-extension-layout #regex_container .regex_script_buttons > .menu_button{
    flex:0 0 auto!important;
  }
  .yt-if-extension-layout #regex_container .flex-container > *{
    min-width:0!important;max-width:100%!important;box-sizing:border-box!important;
  }
  .yt-if-extension-layout #regex_container input,
  .yt-if-extension-layout #regex_container select,
  .yt-if-extension-layout #regex_container textarea{
    max-width:100%!important;min-width:0!important;box-sizing:border-box!important;
  }
  .yt-if-extension-layout .inline-drawer-header{
    min-width:0!important;overflow-wrap:anywhere;min-height:40px!important;padding:8px 10px!important;
  }
  .yt-if-extension-layout .inline-drawer-content{
    min-width:0!important;max-width:100%!important;overflow-x:hidden;padding-inline:10px!important;
  }
  .yt-if-extension-layout > .yt-if-extension-column > .yt-if-extension-row{margin-block:3px!important;}
}
`;

// Both original columns remain in place, including their children and delegated
// listeners. CSS flattens them into one list; only our one shared header is added.
export function createExtensionLayout(get,update) {
  const classes=createClassOwner(),styles=createStyleOwner();
  let group=null,lastChoices=[];
  function removeGroup(){group?.box.remove();group=null;}
  function ensureGroup(root){
    if(group?.box.parentElement===root)return group;
    removeGroup();
    const box=node('div',undefined,'yt-if-extension-group inline-drawer');box.id='yt-if-more-extensions';
    const header=node('div',undefined,'inline-drawer-toggle inline-drawer-header yt-if-extension-header');
    header.role='button';header.tabIndex=0;
    const label=node('b'),icon=node('div');header.append(label,icon);box.append(header);root.prepend(box);
    header.addEventListener('click',event=>{
      event.preventDefault();event.stopImmediatePropagation();
      update({extensionsExpanded:!get().extensionsExpanded},false);apply(lastChoices);
    });
    header.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();header.click();}});
    group={box,header,label,icon};return group;
  }
  function extrasRows(parent,roots){
    function direct(node){
      while(node && node.parentElement!==parent)node=node.parentElement;
      return node && !roots.includes(node)?node:null;
    }
    const url=document.getElementById('extensions_url'),status=document.getElementById('extensions_status');
    const connection=direct(url),heading=direct(status);
    if(!connection || !heading)return [];
    const rows=new Set([connection,heading]);
    for(const id of ['extensions_api_key','extensions_connect','extensions_autoconnect']){
      const row=direct(document.getElementById(id));if(row)rows.add(row);
    }
    const divider=heading.previousElementSibling;
    if(divider?.tagName==='HR')rows.add(divider);
    return [...parent.children].filter(e=>rows.has(e));
  }
  function apply(choices){
    lastChoices=choices;
    const s=get(),wanted=new Map(),geometry=new Map();
    const roots=['extensions_settings','extensions_settings2'].map(id=>document.getElementById(id)).filter(Boolean);
    const parent=roots[0]?.parentElement;
    const recognized=parent?.matches('.extensions_block,#rm_extensions_block') && roots.every(root=>root.parentElement===parent);
    if(!s.enabled || !s.foldExtensions || !recognized){removeGroup();classes.clear();styles.clear();return;}
    wantClass(wanted,parent,'yt-if-extension-layout');
    // Inline geometry is deliberate: themes often use higher-specificity
    // !important rules on these two IDs, defeating stylesheet-only ordering.
    wantStyle(geometry,parent,{display:'flex','flex-direction':'column','align-items':'stretch'});
    const selected=choices.filter(c=>c.element.isConnected && roots.includes(c.root) && s.foldedExtensions.includes(c.key));
    const extras=s.foldExtras?extrasRows(parent,roots):[];
    const count=selected.length+(extras.length?1:0);
    if(count){
      const current=ensureGroup(roots[0]);
      const copy='更多扩展设置（'+count+'）';
      if(current.label.textContent!==copy)current.label.textContent=copy;
      current.header.setAttribute('aria-expanded',String(s.extensionsExpanded));
      const ids=selected.map(c=>c.element.id).filter(Boolean);
      if(extras.length)ids.push('extensions_status','extensions_url');
      if(ids.length)current.header.setAttribute('aria-controls',ids.join(' '));else current.header.removeAttribute('aria-controls');
      current.icon.className='fa-solid inline-drawer-icon fa-circle-chevron-'+(s.extensionsExpanded?'up up':'down down');
    }else removeGroup();
    let pastColumns=false;
    for(const child of parent.children){
      if(roots.includes(child)){pastColumns=true;continue;}
      wantClass(wanted,child,pastColumns?'yt-if-extension-suffix':'yt-if-extension-prefix');
      wantStyle(geometry,child,{order:pastColumns?'9000':'0',width:'100%'});
    }
    const entries=new Map(choices.map(c=>[c.element,c]));
    for(const root of roots){
      wantClass(wanted,root,'yt-if-extension-column');
      wantStyle(geometry,root,{display:'contents'});
      for(const element of root.children){
        if(element.matches('script,style,link,template'))continue;
        wantClass(wanted,element,'yt-if-extension-row');
        const fallback={element,key:'id:'+element.id,label:element.querySelector('.inline-drawer-header')?.textContent.trim() || ''};
        wantStyle(geometry,element,{order:String(extensionRank(entries.get(element)||fallback,s.extensionOrder)),flex:'0 0 auto',width:'100%','max-width':'100%','min-width':'0','margin-inline':'0'});
        if(element===group?.box)wantStyle(geometry,element,{order:'100'});
        if(element.classList.contains('extension_container') && !element.children.length && !element.textContent.trim()){
          wantClass(wanted,element,'yt-if-extension-vacant');wantStyle(geometry,element,{display:'none'});
        }
      }
    }
    for(const [index,choice] of selected.entries()){
      wantClass(wanted,choice.element,'yt-if-extension-folded');
      wantStyle(geometry,choice.element,{order:String(200+index)});
      if(!s.extensionsExpanded){wantClass(wanted,choice.element,'yt-if-extension-hidden');wantStyle(geometry,choice.element,{display:'none'});}
    }
    for(const [index,element] of extras.entries()){
      wantClass(wanted,element,'yt-if-extras-row');
      wantStyle(geometry,element,{order:String(1000+index)});
      if(!s.extensionsExpanded){wantClass(wanted,element,'yt-if-extension-hidden');wantStyle(geometry,element,{display:'none'});}
    }
    classes.sync(wanted);
    styles.sync(geometry);
  }
  return {apply,destroy(){removeGroup();classes.clear();styles.clear();lastChoices=[];}};
}
