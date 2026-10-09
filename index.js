import { createInterfaceApp } from './src/app.js';
import { lifecycle } from './shared/lifecycle.js';
const runtime = lifecycle(createInterfaceApp, '砚台 · 界面整理');
let retryTimer = null;
let retryCount = 0;
let bootCancelled = false;
const MAX_BOOT_RETRIES = 120;

function contextReady() {
  const context = globalThis.SillyTavern?.getContext?.();
  return Boolean(context?.extensionSettings && typeof context.saveSettingsDebounced === 'function');
}

function scheduleEnable() {
  if (bootCancelled || retryTimer !== null) return;
  const attempt = () => {
    retryTimer = null;
    if (bootCancelled) return;
    if (!contextReady()) {
      if (++retryCount <= MAX_BOOT_RETRIES) retryTimer = setTimeout(attempt, 250);
      else console.warn('[砚台 · 界面整理] 酒馆设置未在启动窗口内就绪，已停止重试。');
      return;
    }
    Promise.resolve(runtime.enable()).then(app => {
      // A lifecycle error is contained there; retry a few times in case the
      // host finished mounting between two startup phases.
      if (!app && !bootCancelled && ++retryCount <= MAX_BOOT_RETRIES) retryTimer = setTimeout(attempt, 250);
    });
  };
  attempt();
}

export const onEnable = () => {
  bootCancelled = false;
  retryCount = 0;
  scheduleEnable();
};

export const onDisable = async () => {
  bootCancelled = true;
  if (retryTimer !== null) clearTimeout(retryTimer);
  retryTimer = null;
  return runtime.disable();
};

if (globalThis.SillyTavern?.getContext) onEnable();
else window.addEventListener('load', onEnable, { once:true });
