export function lifecycle(create, title) {
  let app = null, starting = null, wanted = false, serial = 0;
  async function enable() {
    wanted = true;
    if (app) return app;
    if (starting) { await starting; return wanted && !app ? enable() : app; }
    const ticket = ++serial;
    starting = (async () => {
      const candidate = await create();
      if (!wanted || serial !== ticket) { await candidate.destroy(); return null; }
      app = candidate; return app;
    })().catch(error => {
      console.error('[' + title + '] 启动失败', error);
      globalThis.toastr?.error?.('请刷新酒馆后重试。' + error.message, title, { escapeHtml: true });
    }).finally(() => { starting = null; });
    return starting;
  }
  async function disable() {
    wanted = false; ++serial;
    const previous = app; app = null;
    await previous?.destroy(); if (starting) await starting;
  }
  return { enable, disable, async intercept(...args) {
    if (wanted && starting) await starting;
    if (wanted && app) return app.interceptHistory?.(...args);
  } };
}
