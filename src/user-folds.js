import { node, button } from '../shared/ui.js';
import { USER_SECTIONS } from './settings.js';

export function createUserFolds(get, update, host) {
  let dead=false, search=null;
  const folds=new Map(),offs=[];
  const searching=()=>!!document.getElementById('settingsSearch')?.value.trim();
  function updateFold(fold) {
    for(const e of fold.targets)e.classList.remove('yt-if-fold-hidden');fold.targets.clear();
    const active=get().enabled && get().foldUserSettings && get().foldedUserSections.includes(fold.spec.key) && !searching();
    const expanded=!active || get().userOpen[fold.spec.key];
    fold.header.hidden=!active;
    fold.header.setAttribute('aria-expanded',String(expanded));fold.arrow.textContent=expanded?'▴':'▾';
    for(const child of fold.root.children)if(child!==fold.header){fold.targets.add(child);child.classList.toggle('yt-if-fold-hidden',!expanded);}
  }
  function remove(fold){fold.observer.disconnect();for(const e of fold.targets)e.classList.remove('yt-if-fold-hidden');fold.header.remove();}
  function refresh() {
    if(dead)return;
    const nextSearch=document.getElementById('settingsSearch');
    if(search!==nextSearch){search?.removeEventListener('input',refresh);search=nextSearch;search?.addEventListener('input',refresh);}
    for(const spec of USER_SECTIONS){
      const root=document.querySelector(spec.selector);let fold=folds.get(spec.key);
      if(fold && fold.root!==root){remove(fold);folds.delete(spec.key);fold=null;}
      if(!root)continue;
      if(!fold){
        const header=button('',e=>{e.preventDefault();e.stopImmediatePropagation();update({userOpen:{...get().userOpen,[spec.key]:!get().userOpen[spec.key]}},false);refresh();},'yt-if-fold-button');
        header.id='yt-interface-user-'+spec.key;const copy=node('span'),arrow=node('span','▾');arrow.setAttribute('aria-hidden','true');
        copy.append(node('strong',spec.label),node('small',spec.description));header.append(copy,arrow);root.prepend(header);
        fold={spec,root,header,arrow,targets:new Set(),observer:null};
        fold.observer=new MutationObserver(()=>{if(!dead)updateFold(fold);});fold.observer.observe(root,{childList:true});folds.set(spec.key,fold);
      }
      updateFold(fold);
    }
  }
  function onClick(e){if(e.target.closest?.('#user-settings-button > .drawer-toggle'))refresh();}
  document.addEventListener('click',onClick,true);offs.push(host.on('APP_READY',refresh));refresh();
  return {refresh,available:()=>USER_SECTIONS.filter(s=>document.querySelector(s.selector)),
    revealLabMode(){
      const input=document.getElementById('enableLabMode');if(!input)return false;
      update({userOpen:{...get().userOpen,theme:true}},false);refresh();
      const panel=document.getElementById('user-settings-block');
      if(panel&&(panel.classList.contains('closedDrawer')||getComputedStyle(panel).display==='none'))document.querySelector('#user-settings-button > .drawer-toggle')?.click();
      setTimeout(()=>{if(!dead&&input.isConnected){input.scrollIntoView?.({block:'center',behavior:'smooth'});input.focus({preventScroll:true});}},250);
      return true;
    },destroy(){dead=true;search?.removeEventListener('input',refresh);document.removeEventListener('click',onClick,true);offs.forEach(off=>off());for(const f of folds.values())remove(f);folds.clear();}
  };
}
