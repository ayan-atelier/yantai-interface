import { createExtensionLayout } from './extension-layout.js';
import { rememberExtensionOrder, sortExtensions } from './extension-order.js';

const text = value => String(value || '').replace(/\s+/g,' ').trim().slice(0,180);
function identity(element, label, scope) {
  if (element.id) return 'id:' + element.id;
  const translated = element.getAttribute('data-i18n') || element.querySelector('[data-i18n]')?.getAttribute('data-i18n');
  return scope + ':' + (translated || label);
}
function unique(choices) {
  const seen = new Map();
  return choices.map(choice => {
    const n = (seen.get(choice.key) || 0) + 1; seen.set(choice.key,n);
    return {...choice,key:choice.key + (n > 1 ? ':' + n : '')};
  });
}

// Only the existing menus/settings are inspected. Chat content is never observed.
export function createInventory(get, update, host) {
  let dead = false, queued = false, wand = [], extensions = [];
  const watched = new Map(), hidden = new Map(), emptyWrappers = new Set();
  const extensionLayout=createExtensionLayout(get,update);
  const offs = [];
  function watch(root) {
    if (!root || watched.has(root)) return;
    const observer = new MutationObserver(records => {
      // Text counters, input changes and drawer animation attributes need no rescan.
      if (records.some(r => [...r.addedNodes,...r.removedNodes].some(n => n.nodeType === 1))) schedule();
    });
    observer.observe(root,{childList:true,subtree:true}); watched.set(root,observer);
  }
  function readWand() {
    const root = document.getElementById('extensionsMenu'); if (!root) return [];
    watch(root); const choices = [];
    for (const outer of root.children) {
      if (outer.matches('script,style,hr,input,textarea,select')) continue;
      const rows = outer.classList.contains('extension_container') ? [...outer.children] : [outer];
      for (const element of rows) {
        if (element.matches('script,style,hr,input,textarea,select') || !element.textContent.trim()) continue;
        if (element.querySelector('input,textarea,select') && !element.matches('a,button,[role="menuitem"],.list-group-item')) continue;
        const label = text(element.querySelector('span')?.textContent || element.textContent || element.title);
        if (label) choices.push({key:identity(element,label,outer.id || 'wand'),label,element,wrapper:outer});
      }
    }
    return unique(choices);
  }
  function readExtensions() {
    const choices = [];
    for (const id of ['extensions_settings','extensions_settings2']) {
      const root = document.getElementById(id); if (!root) continue; watch(root);
      const candidates = [...root.children].filter(e => !e.classList.contains('yt-if-extension-group'));
      for (const element of new Set(candidates)) {
        if (element.id === 'yt-interface-settings') continue; // Recovery must stay reachable.
        const headers = [...element.querySelectorAll('.inline-drawer-header')];
        if (element.matches('.inline-drawer-header')) headers.unshift(element);
        if (!headers.length) continue; // Unknown custom layouts are left intact.
        const labels = headers.map(h=>text(h.querySelector('b,strong')?.textContent || h.textContent)).filter(Boolean);
        const label = [...new Set(labels)].join(' / ');
        if (label) choices.push({key:identity(element,label,id),label,element,root});
      }
    }
    return unique(choices);
  }
  function restoreWand() {
    for (const [e,hadClass] of hidden) {e.classList.remove('yt-if-menu-hidden');if(!hadClass&&!e.classList.length)e.removeAttribute('class');} hidden.clear();
    for (const e of emptyWrappers) e.classList.remove('yt-if-wand-empty'); emptyWrappers.clear();
  }
  function applyWand() {
    restoreWand(); if (!get().enabled) return;
    for (const choice of wand) if (get().hiddenWand.includes(choice.key)) {
      hidden.set(choice.element,choice.element.hasAttribute('class'));choice.element.classList.add('yt-if-menu-hidden');
    }
    for (const wrapper of new Set(wand.map(x=>x.wrapper))) {
      const children = wand.filter(x=>x.wrapper===wrapper);
      const hasUnknownContent=[...wrapper.children].some(e=>!e.matches('script,style,hr')&&!children.some(x=>x.element===e));
      if (wrapper.classList.contains('extension_container') && children.length && !hasUnknownContent && children.every(x=>hidden.has(x.element))) {
        wrapper.classList.add('yt-if-wand-empty'); emptyWrappers.add(wrapper);
      }
    }
  }
  function refresh() {
    if (dead) return;
    for (const [root,observer] of watched) if (!root.isConnected) { observer.disconnect(); watched.delete(root); }
    wand = readWand(); extensions = readExtensions();
    if(get().enabled && get().foldExtensions)rememberExtensionOrder(extensions,get,update);
    extensions=sortExtensions(extensions,get().extensionOrder);
    applyWand(); extensionLayout.apply(extensions);
    // Discard only mutation records generated synchronously by our own regrouping.
    for (const observer of watched.values()) observer.takeRecords();
  }
  function schedule() {
    if (queued || dead) return; queued = true;
    queueMicrotask(()=>{queued=false;if(!dead)refresh();});
  }
  function click(e) { if (e.target.closest?.('#extensionsMenuButton,#extensions-settings-button > .drawer-toggle')) schedule(); }
  document.addEventListener('click',click,true);
  offs.push(host.on('APP_READY',refresh));
  refresh();
  return {refresh,wandChoices:()=>wand,extensionChoices:()=>extensions,destroy(){
    dead=true; document.removeEventListener('click',click,true); offs.forEach(off=>off());
    for(const observer of watched.values())observer.disconnect(); watched.clear();
    restoreWand(); extensionLayout.destroy();
  }};
}
