import { cloudflare } from '@cloudflare/vite-plugin'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

export default defineConfig({
  appType: 'custom',
  base: '/',
  build: { assetsDir: 'app-assets' },
  resolve: {
    tsconfigPaths: true,
    alias: {
      '/studio.js': fileURLToPath(new URL('./app/studio.js', import.meta.url)),
      '/model-routing.mjs': fileURLToPath(new URL('./app/model-routing.mjs', import.meta.url)),
      '/image-generation.mjs': fileURLToPath(new URL('./app/image-generation.mjs', import.meta.url)),
      '/video-generation.mjs': fileURLToPath(new URL('./app/video-generation.mjs', import.meta.url)),
    },
  },
  plugins: [
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    tanstackStart(),
    viteReact(),
  ],
})
