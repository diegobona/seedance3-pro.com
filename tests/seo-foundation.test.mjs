import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { canonicalModelPath, legacyModelRedirect } from '../app/seo-routes.mjs'

const root = resolve(import.meta.dirname, '..')
const read = (path) => readFileSync(resolve(root, path), 'utf8')

test('legacy model URLs resolve to one canonical tool URL', () => {
  assert.equal(canonicalModelPath('minimax-h3'), '/app/video/minimax-h3')
  assert.equal(canonicalModelPath('gpt-image-2'), '/app/image/gpt-image-2')
  assert.equal(canonicalModelPath('pose-to-image'), null)
  assert.equal(canonicalModelPath('__proto__'), null)
  for (const [oldPath, expected] of [
    ['/minimax-h3-ai-video-generator.html', '/app/video/minimax-h3'],
    ['/gpt-image-2.html', '/app/image/gpt-image-2'],
    ['/app/?model=minimax-h3', '/app/video/minimax-h3'],
    ['/app/?model=gpt-image-2', '/app/image/gpt-image-2'],
  ]) {
    assert.equal(legacyModelRedirect(new URL(oldPath, 'https://seedance3-pro.com')), expected)
  }
  assert.equal(legacyModelRedirect(new URL('/gpt-image-2.html?utm_source=newsletter', 'https://seedance3-pro.com')), '/app/image/gpt-image-2')
  assert.equal(legacyModelRedirect(new URL('/app/?model=pose-to-image', 'https://seedance3-pro.com')), null)
  assert.equal(legacyModelRedirect(new URL('/app/?model=gpt-image-2&prompt=example', 'https://seedance3-pro.com')), null)
})

test('sitemap publishes new model pages and excludes redirects, workspace and empty future routes', () => {
  const sitemap = read('sitemap.xml')
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1])
  assert.equal(new Set(urls).size, urls.length)
  for (const path of ['/app/video/minimax-h3', '/app/image/gpt-image-2', '/pose-to-image']) {
    assert.ok(urls.includes(`https://seedance3-pro.com${path}`), path)
  }
  assert.ok(!urls.includes('https://seedance3-pro.com/app/'))
  for (const path of ['/minimax-h3-ai-video-generator.html', '/gpt-image-2.html', '/prompt-guide', '/prompts/gpt-image-2/images', '/gpt-image-2-prompts', '/seedance-3-0-prompts']) {
    assert.ok(!urls.some(url => url.includes(path)), path)
  }
  assert.ok(urls.includes('https://seedance3-pro.com/minimax-h3-prompts'))
  assert.ok(!urls.includes('https://seedance3-pro.com/prompts/minimax-h3/videos'))
  assert.match(read('robots.txt'), /Sitemap: https:\/\/seedance3-pro\.com\/sitemap.xml/)
})

test('Pose content remains on its existing public URLs and generic workspace is noindex', () => {
  for (const path of ['/pose-to-image', '/pose-reference-camera-angle-examples']) {
    assert.match(read('sitemap.xml'), new RegExp(`${path}<`))
  }
  assert.match(read('src/routes/app.tsx'), /name: 'robots', content: 'noindex,follow'/)
  assert.match(read('admin/index.html'), /name="robots" content="noindex/)
  assert.match(read('app/legacy-preview.html'), /name="robots" content="noindex/)
})

test('the homepage directs model searches to distinct model tool pages', () => {
  const homepage = read('index.html')
  assert.match(homepage, /href="\.\/app\/video\/minimax-h3"/)
  assert.match(homepage, /href="\.\/app\/image\/gpt-image-2"/)
  assert.match(homepage, /href="\.\/pose-to-image"/)
  for (const path of ['./prompt-guide', './minimax-h3-prompts', './gpt-image-2-prompts', './seedance-3-0-prompts']) {
    assert.ok(homepage.includes(`href="${path}"`), `${path} should be linked from the footer`)
  }
  assert.match(homepage, /<a href="\.\/showcase\.html">Showcase<\/a>/)
})
