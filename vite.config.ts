import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import renderer from 'vite-plugin-electron-renderer'
import path from 'path';

export default defineConfig({
  optimizeDeps: {
    exclude: ['js-big-decimal', 'vue-cryptojs']
  },
  plugins: [
    vue(),
    renderer()
  ],
  server: {
    headers: {
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Opener-Policy": "same-origin",
    },
  },
})
