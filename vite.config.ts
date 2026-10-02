import { cloudflare } from '@cloudflare/vite-plugin'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

export default defineConfig(({ command }) => ({
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
    cloudflare({
      viteEnvironment: { name: 'ssr' },
      // Vite module/style requests must reach its asset transformer in development.
      config: command === 'serve' ? (config) => {
        // Mutate the resolved assets config: returned arrays merge with Wrangler's /*.
        config.assets = { ...config.assets, run_worker_first: [
          '/api/*', '/_serverFn/*', '/app', '/app/', '/app/video/*', '/app/image/*', '/zh/app', '/zh/app/', '/zh/app/video/*', '/zh/app/image/*',
          '/prompt-guide', '/zh/prompt-guide', '/minimax-h3-prompts*', '/gpt-image-2-prompts*', '/seedance-3-0-prompts*',
          '/zh/minimax-h3-prompts*', '/zh/gpt-image-2-prompts*', '/zh/seedance-3-0-prompts*',
        ] }
      } : undefined,
    }),
    tanstackStart(),
    viteReact(),
  ],
}))
