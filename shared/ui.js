export function node(tag, text, className) {
  const e = document.createElement(tag);
  if (text !== undefined) e.textContent = text;
  if (className) e.className = className;
  return e;
}
export function button(text, action, className = 'yt-button') {
  const b = node('button', text, className); b.type = 'button';
  b.addEventListener('click', action); return b;
}
export function createPanel(id, title, { version = '0.1.1' } = {}) {
  const dialog = node('dialog', undefined, 'yt-plugin-dialog'); dialog.id = id;
  dialog.setAttribute('aria-labelledby', id + '-title');
  const header = node('header', undefined, 'yt-plugin-header');
  const copy = node('div'); copy.append(node('small', '砚台 · v' + version));
  const heading = node('h2', title); heading.id = id + '-title'; copy.append(heading);
  const closeButton = button('×', close, 'yt-button yt-plugin-close'); closeButton.setAttribute('aria-label', '关闭' + title);
  header.append(copy, closeButton);
  const content = node('div', undefined, 'yt-plugin-content');
  dialog.append(header, content); document.body.append(dialog);
  let previous, dead = false;
  const confirmations = new Set();
  function open() {
    if (dead || dialog.open) return;
    previous = document.activeElement; dialog.showModal();
  }
  function close() { if (dialog.open) dialog.close(); }
  dialog.addEventListener('close', () => { if (previous?.isConnected) previous.focus({ preventScroll: true }); });
  dialog.addEventListener('click', e => {
    if (e.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) close();
  });
  async function confirm(message, options = {}) {
    if (dead) return false;
    const modal = node('dialog', undefined, 'yt-plugin-dialog yt-plugin-confirm');
    modal.setAttribute('aria-label', options.title || '请确认');
    const inside = node('div', undefined, 'yt-plugin-content');
    inside.append(node('h3', options.title || '请确认'), node('p', message));
    const actions = node('div', undefined, 'yt-inline');
    return new Promise(resolve => {
      let accepted = false;
      const cancel = button('取消', () => modal.close());
      actions.append(cancel, button(options.confirmLabel || '确认', () => { accepted = true; modal.close(); }, 'yt-button yt-button-primary'));
      inside.append(actions); modal.append(inside); document.body.append(modal); confirmations.add(modal);
      modal.addEventListener('close', () => { confirmations.delete(modal); modal.remove(); resolve(accepted); }, { once: true });
      modal.showModal(); cancel.focus();
    });
  }
  return { dialog, content, open, close, confirm, destroy() {
    dead = true; for (const m of confirmations) m.close(); close(); dialog.remove();
  } };
}
