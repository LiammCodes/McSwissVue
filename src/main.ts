import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import Toast, { POSITION } from "vue-toastification";
import './style.css';
// @ts-ignore - vue-the-mask has no type definitions
import VueTheMask from 'vue-the-mask';

const { ipcRenderer } = require('electron');

function toLogString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value instanceof Error) return `${value.name}: ${value.message}\n${value.stack || ''}`;
  try {
    return JSON.stringify(value);
  } catch (_) {
    return String(value);
  }
}

function installRendererConsoleCapture(): void {
  if ((window as any).__MCSWISS_CONSOLE_PATCHED__) return;
  (window as any).__MCSWISS_CONSOLE_PATCHED__ = true;

  const original = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    debug: console.debug.bind(console),
  };

  (Object.keys(original) as Array<keyof typeof original>).forEach((level) => {
    console[level] = (...args: unknown[]) => {
      try {
        ipcRenderer.send('log-to-session-file', {
          level,
          entries: args.map(toLogString),
        });
      } catch (_) {}
      original[level](...args);
    };
  });
}

installRendererConsoleCapture();

createApp(App)
  .use(createPinia())
  .use(router)
  .use(Toast, {position: POSITION.TOP_LEFT})
  .use(VueTheMask)
  .mount('#app');