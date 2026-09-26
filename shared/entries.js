import { button, node } from './ui.js';

// Entries belong to their individual plugins. No global dispatcher or dependency.
export function installEntries({ id, label, glyph, order, open, host, extraActions = [] }) {
  let dead = false;
  const owned = new Set();
  function closeNativeMenu() {
    const menu = document.getElementById('options');
    if (menu && getComputedStyle(menu).display !== 'none') document.getElementById('options_button')?.click();
  }
  function entryClick(e) {
    e.preventDefault(); e.stopImmediatePropagation(); closeNativeMenu(); open();
  }
  function mount() {
    if (dead) return;
    const parent = document.querySelector('#options .options-content');
    if (parent && !document.getElementById(id + '-menu')) {
      const entry = node('a', undefined, 'yt-native-entry interactable'); entry.id = id + '-menu'; entry.dataset.order = String(order);
      entry.role = 'button'; entry.tabIndex = 0;
      entry.addEventListener('click', entryClick);
      entry.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); entry.click(); } });
      const icon = node('i', undefined, 'fa-lg fa-solid ' + glyph); icon.setAttribute('aria-hidden', 'true');
      entry.append(icon, node('span', label));
      const siblings = Array.from(parent.querySelectorAll(':scope > .yt-native-entry'));
      const after = siblings.find(e => Number(e.dataset.order) > order);
      if (after) parent.insertBefore(entry, after);
      else if (siblings.length) siblings.at(-1).after(entry);
      else parent.prepend(entry);
      owned.add(entry);
    }
    const settings = document.getElementById('extensions_settings2') || document.getElementById('extensions_settings');
    if (settings && !document.getElementById(id + '-settings')) {
      const block = node('div', undefined, 'extension_container yt-plugin-settings'); block.id = id + '-settings';
      const drawer = node('div', undefined, 'inline-drawer');
      const header = node('div', undefined, 'inline-drawer-toggle inline-drawer-header');
      header.append(node('b', '砚台 · ' + label), node('div', undefined, 'fa-solid fa-circle-chevron-down inline-drawer-icon down'));
      const content = node('div', undefined, 'inline-drawer-content');
      const actions = node('div', undefined, 'flex-container');
      const launch = button('', open, 'menu_button menu_button_icon');
      launch.append(node('i', undefined, 'fa-solid ' + glyph), node('span', '打开' + label)); actions.append(launch);
      for (const [text, action] of extraActions) actions.append(button(text, action, 'menu_button'));
      content.append(actions); drawer.append(header, content); block.append(drawer);
      settings.append(block); owned.add(block);
    }
  }
  mount(); const off = host.on('APP_READY', mount);
  return { mount, destroy() {
    dead = true; off(); for (const e of owned) e.remove();
  } };
}
