/* Compact release controls for the native interface extension. */
const openDialogs = new WeakMap();

export function openVersionDialog({ manager, element, button, dialog, currentVersion, notify, refresh }) {
  const previous = openDialogs.get(dialog);
  if (previous?.modal?.isConnected) {
    previous.sync?.();
    if (!previous.modal.open) previous.modal.showModal?.();
    return previous;
  }

  const { modal, body, notice } = dialog('界面整理版本');
  body.append(element('p', 'yt-if-version-intro', `当前版本 V${currentVersion}`));
  let checked = null;
  const actions = element('div', 'yt-if-version-actions');
  const details = element('p', 'yt-if-version-notes');
  const check = button('检查更新', 'yt-button yt-if-version-secondary', async () => {
    await run(async () => {
      checked = await manager.check();
      details.textContent = checked.latest ? `V${checked.latest.version}\n${checked.latest.notes}` : checked.unavailableLatest ? '新版暂未完成发布或与当前酒馆不兼容。' : '当前没有可用的新版本。';
      notice.textContent = checked.previous ? `可退回 V${checked.previous.version}。切换前会保存界面整理设置备份。` : '暂无更早的兼容版本可回退。';
    });
  });
  const update = button('更新到最新版', 'yt-button yt-button-primary yt-if-version-primary', () => confirm(checked?.latest));
  const rollback = button('退回上一版本', 'yt-button yt-if-version-secondary', () => confirm(checked?.previous));
  const reload = button('刷新酒馆', 'yt-button yt-button-primary yt-if-version-primary', async () => {
    try { await refresh(); } catch (error) { notice.textContent = error.message || String(error); }
  });
  actions.append(check, update, rollback, reload); body.append(actions, details);
  body.append(element('small', 'yt-if-version-help', '只在你点击时检查或切换版本。切换前会备份界面整理设置；酒馆原生界面和其他插件设置保持原样。'));
  function sync() {
    actions.setAttribute('aria-busy', String(manager.busy));
    check.disabled = manager.busy || manager.reloadNeeded;
    update.disabled = manager.busy || manager.reloadNeeded || !checked?.latest;
    rollback.disabled = manager.busy || manager.reloadNeeded || !checked?.previous;
    update.textContent = checked?.latest ? `更新到 V${checked.latest.version}` : '更新到最新版';
    rollback.textContent = checked?.previous ? `退回 V${checked.previous.version}` : '退回上一版本';
    reload.hidden = !manager.reloadNeeded;
  }
  async function run(action) {
    notice.textContent = '正在处理，请稍候…';
    const promise = action(); sync();
    try { await promise; }
    catch (error) { notice.textContent = error.message || String(error); if (!modal.isConnected) notify?.(notice.textContent); }
    finally { sync(); }
  }
  function confirm(target) {
    if (!target || manager.busy || manager.reloadNeeded) return;
    const prompt = dialog(`切换到 V${target.version}？`);
    prompt.body.append(element('p', 'yt-if-version-intro', target.notes || '将切换界面整理程序版本，保留当前设置。'));
    prompt.body.append(element('p', 'yt-if-version-intro', '会先保存设置备份。切换完成后请刷新酒馆，其他扩展和酒馆原生设置不会被改写。'));
    const row = element('div', 'yt-if-version-actions');
    const cancel = button('取消', 'yt-button yt-if-version-secondary', () => prompt.modal.close());
    row.append(cancel, button('确认切换', 'yt-button yt-button-primary yt-if-version-primary', () => {
      prompt.modal.close();
      void run(async () => {
        const version = await manager.apply(checked, target);
        notice.textContent = `已切换到 V${version}，请刷新酒馆。`;
        if (!modal.isConnected) notify?.(notice.textContent);
      });
    }));
    prompt.body.append(row); cancel.focus();
  }
  const handle = { modal, body, notice, sync, close: () => modal.close() };
  openDialogs.set(dialog, handle);
  modal.addEventListener('close', () => {
    // The shared panel removes the dialog on close. If a host keeps it mounted,
    // retaining the handle lets the next click reopen the same modal safely.
    queueMicrotask(() => {
      if (!modal.isConnected && openDialogs.get(dialog) === handle) openDialogs.delete(dialog);
    });
  });
  sync();
  if (!modal.open) modal.showModal?.();
  return handle;
}
