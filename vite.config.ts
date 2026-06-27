import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { crx } from '@crxjs/vite-plugin'
import manifest from './vue_src/manifest.json'
import { resolve } from 'path'

export default defineConfig({
  root: 'vue_src',
  base: './',
  build: {
    outDir: '../vue_dst',
    emptyOutDir: true,
    minify: false,
    sourcemap: true,
    rollupOptions: {
      input: {
        panel: resolve(__dirname, 'vue_src/panel.html'),
      },
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'vue_src/src')
    }
  },
  plugins: [vue(), crx({ manifest })]
})
