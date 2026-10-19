import { cloudflare } from '@cloudflare/vite-plugin'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import { readFile } from 'node:fs/promises'

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
    {
      name: 'local-public-page-preview',
      apply: 'serve',
      configureServer(server) {
        server.middlewares.use(async (request, response, next) => {
          const pathname = new globalThis.URL(request.url || '/', 'http://localhost').pathname
          const publicPath = pathname.replace(/\/$/, '')
          const sitemap = pathname === '/sitemap.xml'
          const file = sitemap ? 'sitemap.xml' : pathname === '/' || pathname === '/index.html' ? 'index.html'
            : ['/zh', '/zh/', '/zh/index.html'].includes(pathname) ? 'zh/index.html'
            : /^\/(?:zh\/)?[a-z0-9-]+(?:\.html)?$/.test(publicPath) ? publicPath.slice(1).replace(/\.html$/, '') + '.html' : null
          if (!file || !['GET', 'HEAD'].includes(request.method || 'GET')) return next()
          try {
            const html = await readFile(fileURLToPath(new URL(file, import.meta.url)), 'utf8')
            response.setHeader('Content-Type', sitemap ? 'application/xml; charset=utf-8' : 'text/html; charset=utf-8')
            response.setHeader('Cache-Control', 'no-store')
            response.end(request.method === 'HEAD' ? undefined : html)
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') next()
            else next(error as Error)
          }
        })
      },
    },
    cloudflare({
      viteEnvironment: { name: 'ssr' },
      // Vite module/style requests must reach its asset transformer in development.
      config: command === 'serve' ? (config) => {
        // Mutate the resolved assets config: returned arrays merge with Wrangler's /*.
        config.assets = { ...config.assets, run_worker_first: [
          '/api/*', '/_serverFn/*', '/app', '/app/', '/app/video/*', '/app/image/*', '/zh/app', '/zh/app/', '/zh/app/video/*', '/zh/app/image/*',
          '/flux-3', '/flux-3.html', '/flux-3-video-generator', '/flux-3-video-generator.html',
          '/zh/flux-3', '/zh/flux-3.html', '/zh/flux-3-video-generator', '/zh/flux-3-video-generator.html',
          '/prompt-guide', '/zh/prompt-guide', '/minimax-h3-prompts*', '/gpt-image-2-prompts*', '/seedance-3-0-prompts*',
          '/zh/minimax-h3-prompts*', '/zh/gpt-image-2-prompts*', '/zh/seedance-3-0-prompts*',
          '/muse-video-prompts*', '/muse-image-prompts*', '/zh/muse-video-prompts*', '/zh/muse-image-prompts*',
          '/ai-christmas-photo-prompt', '/zh/ai-christmas-photo-prompt',
        ] }
      } : undefined,
    }),
    tanstackStart(),
    viteReact(),
  ],
}))
