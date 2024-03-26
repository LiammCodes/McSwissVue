import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import renderer from 'vite-plugin-electron-renderer'
import path from 'path' // Import path module to resolve file paths


export default defineConfig({
  optimizeDeps: {
    exclude: ['js-big-decimal']
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
