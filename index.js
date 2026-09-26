import { createInterfaceApp } from './src/app.js';
import { lifecycle } from './shared/lifecycle.js';
const runtime = lifecycle(createInterfaceApp, '砚台 · 界面整理');
export const onEnable = runtime.enable;
export const onDisable = runtime.disable;
if (globalThis.SillyTavern?.getContext) onEnable();
else window.addEventListener('load', onEnable, { once:true });
