import { node, button } from '../shared/ui.js';
import { MENU_CHOICES } from './settings.js';
import { createInventory } from './inventory.js';
import { createUserFolds } from './user-folds.js';
import { createToolbar, toolbarStyles } from './toolbar.js';
import { extensionStyles } from './extension-layout.js';

export function createController(get, update, host) {
  let dead = false, menu = null, extra = null, extraButton = null, extraPanel = null;
  const moved = new Map(), folds = new Map(), cleanup = [];
  const style = node('style'); style.id = 'yt-interface-active-style'; document.head.append(style);
  // Rules exist only while enabled; retained ST inline styles keep their meaning.
  style.textContent = '.yt-if-toggle-hidden,.yt-if-fold-hidden,.yt-if-menu-hidden,.yt-if-wand-empty{display:none!important}.yt-if-drawer-empty{flex:0 0 0!important;width:0!important;min-width:0!important;margin-inline:0!important;padding-inline:0!important}' + toolbarStyles + extensionStyles;
  const inventory = createInventory(get,update,host), userFolds = createUserFolds(get,update,host);
  const toolbar = createToolbar(get);
  function restoreMenu() {
    for (const [element,placeholder] of moved) {
      if (placeholder.isConnected) placeholder.replaceWith(element);
      else if (extra?.isConnected) extra.before(element);
    }
    moved.clear(); extra?.remove(); extra = extraButton = extraPanel = null;
    menu?.classList.remove('yt-if-menu'); menu = null;
  }
  function applyMenu() {
    restoreMenu(); const s = get(); if (!s.enabled || !s.foldMenu) return;
    const container = document.querySelector('#options .options-content'); if (!container) return;
    const items = MENU_CHOICES.filter(([id])=>s.foldedTools.includes(id)).map(([id])=>document.getElementById(id)).filter(e=>e && container.contains(e));
    if (!items.length) return;
    extra = node('div',undefined,'yt-native-tools'); extra.id = 'yt-interface-more';
    extraButton = node('a',undefined,'yt-native-entry interactable'); extraButton.role='button';extraButton.tabIndex=0;
    extraButton.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();extraButton.click();}});
    extraButton.addEventListener('click',e=>{
      e.preventDefault(); e.stopImmediatePropagation();
      update({toolsExpanded:!get().toolsExpanded}, false);
      refreshMenuState(); window.dispatchEvent(new Event('resize'));
    });
    extraButton.setAttribute('aria-controls','yt-interface-more-panel');
    extraPanel = node('div',undefined,'yt-native-tools-panel'); extraPanel.id = 'yt-interface-more-panel';
    extra.append(extraButton,extraPanel); container.append(extra);
    for (const item of items) {
      const placeholder = document.createComment('yantai-original-position'); item.before(placeholder);
      moved.set(item,placeholder); extraPanel.append(item);
    }
    menu = document.getElementById('options'); menu?.classList.add('yt-if-menu'); refreshMenuState();
  }
  function refreshMenuState() {
    if (!extraPanel) return;
    const expanded = get().toolsExpanded;
    extraPanel.hidden = !expanded; extraButton.setAttribute('aria-expanded',String(expanded));
    const icon=node('i',undefined,'fa-lg fa-solid fa-ellipsis');icon.setAttribute('aria-hidden','true');
    extraButton.replaceChildren(icon,node('span',expanded ? '收起更多工具 ▴' : '更多工具 ▾'));
  }
  function textSummary(key) {
    if (key !== 'generationOpen') return '格式、推理与其他选项';
    const value = id => document.getElementById(id)?.value;
    return [['上下文',value('openai_max_context')],['回复',value('openai_max_tokens')]].filter(x=>x[1]).map(x=>x.join(' ')).join(' · ') || '上下文、长度、温度等';
  }
  function unmountFold(fold) {
    fold.observer.disconnect(); fold.header.remove();
    for (const e of fold.targets) e.classList.remove('yt-if-fold-hidden');
    fold.targets.clear();
  }
  function refreshFold(fold) {
    if (!fold.root.isConnected) return;
    for (const old of fold.targets) old.classList.remove('yt-if-fold-hidden'); fold.targets.clear();
    const recognized = fold.key !== 'advancedOpen' || !!fold.root.querySelector('#completion_prompt_manager');
    const enabled = get().enabled && get().foldPresets && recognized;
    fold.header.hidden = !enabled;
    const expanded = !enabled || get()[fold.key];
    // Prompt manager and its ancestors are always kept outside the folded set.
    for (const child of Array.from(fold.root.children)) {
      if (child === fold.header || child.id === 'completion_prompt_manager' || child.querySelector('#completion_prompt_manager')) continue;
      fold.targets.add(child); child.classList.toggle('yt-if-fold-hidden',!expanded);
    }
    fold.header.setAttribute('aria-expanded',String(expanded));
    fold.arrow.textContent = expanded ? '▴' : '▾'; fold.summary.textContent = textSummary(fold.key);
  }
  function ensureFolds() {
    for (const [key,id,label] of [['generationOpen','range_block_openai','生成参数'],['advancedOpen','openai_settings','高级设置']]) {
      const root = document.getElementById(id);
      let fold = folds.get(key);
      if (fold && fold.root !== root) { unmountFold(fold); folds.delete(key); fold = null; }
      if (!root) continue;
      // Without the expected native prompt manager, don't hide an unknown structure.
      if (key === 'advancedOpen' && !root.querySelector('#completion_prompt_manager')) continue;
      if (!fold) {
        const header = button('',e=>{
          e.preventDefault(); e.stopImmediatePropagation(); update({[key]:!get()[key]},false); ensureFolds();
        },'yt-if-fold-button'); header.id = 'yt-interface-' + key;
        const copy = node('span'); const summary = node('small'); copy.append(node('strong',label),summary);
        const arrow = node('span','▾'); arrow.setAttribute('aria-hidden','true'); header.append(copy,arrow);
        root.prepend(header);
        fold = { root, key, header, summary, arrow, targets:new Set(), observer:null };
        fold.observer = new MutationObserver(()=>{ if (!dead) refreshFold(fold); });
        fold.observer.observe(root,{childList:true}); folds.set(key,fold);
      }
      refreshFold(fold);
    }
    const tip=document.getElementById('clickSlidersTips');
    tip?.classList.toggle('yt-if-fold-hidden',get().enabled && get().foldPresets && !get().generationOpen && !!folds.get('generationOpen'));
  }
  function apply() { if (!dead) { toolbar.apply(); applyMenu(); ensureFolds(); inventory.refresh();userFolds.refresh(); } }
  function summarize() { for (const fold of folds.values()) fold.summary.textContent = textSummary(fold.key); }
  const preset = document.getElementById('ai_response_configuration');
  preset?.addEventListener('input',summarize); preset?.addEventListener('change',summarize);
  cleanup.push(()=>{preset?.removeEventListener('input',summarize);preset?.removeEventListener('change',summarize);});
  for (const name of ['APP_READY','MAIN_API_CHANGED']) cleanup.push(host.on(name,apply));
  for (const name of ['PRESET_CHANGED','SETTINGS_UPDATED']) cleanup.push(host.on(name,summarize));
  apply();
  return { apply, topChoices:toolbar.choices, inventory, userFolds, status:()=>({menu:!!document.querySelector('#options .options-content'),presets:folds.size}),
    destroy() { dead = true; cleanup.forEach(fn=>fn());inventory.destroy();userFolds.destroy(); toolbar.destroy(); restoreMenu(); for (const f of folds.values()) unmountFold(f); folds.clear();document.getElementById('clickSlidersTips')?.classList.remove('yt-if-fold-hidden'); style.remove(); }
  };
}
