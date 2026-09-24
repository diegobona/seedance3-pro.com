import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const read = (path) => readFileSync(resolve(root, path), 'utf8')

test('showcase uses existing video, image and Pose examples rather than generic placeholders', () => {
  const homepage = read('index.html')
  const showcase = read('showcase.html')
  const homeVideos = new Set([...homepage.matchAll(/data-video-src="([^"]+)"/g)].map(match => match[1]))
  const showcaseVideos = [...showcase.matchAll(/data-video-src="([^"]+)"/g)].map(match => match[1])

  assert.ok(showcaseVideos.length >= 4)
  assert.ok(showcaseVideos.every(source => homeVideos.has(source)), 'showcase videos should reuse the already featured samples')
  for (const image of ['gpt-image-2-editorial-fashion.webp', 'gpt-image-2-lunar-garden.webp', 'gpt-image-2-floating-city.webp']) {
    assert.match(showcase, new RegExp(image))
  }
  assert.match(showcase, /pose-reference-demo\.mp4/)
  assert.match(showcase, /id="showcase-player"/)
  assert.doesNotMatch(showcase, /<img[^>]+src="\.\/og-cover\.svg"/i)
  assert.doesNotMatch(showcase, /search visibility|long-tail detail pages/i)
  for (const href of ['./app/video/minimax-h3', './app/image/gpt-image-2', './pose-to-image']) {
    assert.ok(showcase.includes(`href="${href}"`), `${href} should have a next step`)
  }
})

test('Coming Soon resources are real noindex routes with explicit Worker coverage', () => {
  const routes = [
    ['src/routes/prompt-guide.tsx', '/prompt-guide'],
    ['src/routes/prompts/minimax-h3/videos.tsx', '/prompts/minimax-h3/videos'],
    ['src/routes/prompts/gpt-image-2/images.tsx', '/prompts/gpt-image-2/images'],
  ]
  const sitemap = read('sitemap.xml')
  const config = JSON.parse(read('wrangler.jsonc'))
  const routePatterns = config.routes.map(route => route.pattern)

  for (const [sourceFile, path] of routes) {
    const source = read(sourceFile)
    assert.match(source, /noindex,follow/)
    assert.match(source, /ComingSoonPage/)
    assert.ok(!sitemap.includes(`https://seedance3-pro.com${path}<`), `${path} should stay out of the sitemap`)
  }
  assert.ok(routePatterns.includes('seedance3-pro.com/prompt-guide'))
  assert.ok(routePatterns.includes('seedance3-pro.com/prompts/*'))
  assert.ok(config.assets.run_worker_first.includes('/prompt-guide'))
  assert.ok(config.assets.run_worker_first.includes('/prompts/*'))

  const component = read('src/components/coming-soon-page.tsx')
  assert.match(component, /Coming soon/i)
  assert.match(component, /href="\/app\/video\/minimax-h3"/)
  assert.match(component, /href="\/app\/image\/gpt-image-2"/)
})
