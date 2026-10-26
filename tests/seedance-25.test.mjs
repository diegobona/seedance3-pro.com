import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { canonicalModelPath, modelIdFromPath } from '../app/seo-routes.mjs'

const root = resolve(import.meta.dirname, '..')
const read = (file) => readFileSync(resolve(root, file), 'utf8')

test('Seedance 2.5 is the public video tool URL and uses the working generation model', () => {
  const path = '/app/video/seedance-2-5'
  assert.equal(canonicalModelPath('seedance-2-5'), path)
  assert.equal(modelIdFromPath(path), 'minimax-h3')
  const route = read('src/routes/app_.video.seedance-2-5.tsx')
  assert.match(route, /<StudioPage initialModel="minimax-h3" modelLanding \/>/)
  assert.match(route, /rel: 'canonical', href: url/)
  assert.doesNotMatch(route, /MiniMax H3/i)
  for (const file of ['index.html', 'showcase.html']) {
    const html = read(file)
    const nav = html.match(/<nav class="desktop-nav compact-nav"[^>]*>([\s\S]*?)<\/nav>/)?.[1]
    assert.ok(nav, `${file} primary navigation`)
    assert.match(nav, /href="\/app\/video\/seedance-2-5/)
  }
  assert.match(route, /name: 'robots', content: 'index,follow/)
  assert.match(read('sitemap.xml'), /https:\/\/seedance3-pro\.com\/app\/video\/seedance-2-5<\/loc>/)
})

test('Seedance 2.5 is absent from the sidebar but its direct route still uses video generation', () => {
  const route = read('src/routes/app.tsx')
  const script = read('app/studio.js')
  assert.doesNotMatch(route, /data-model="seedance-2-5"/)
  assert.doesNotMatch(route, /data-model="nano-banana-2-lite"/)
  assert.match(route, /data-model="minimax-h3"/)
  assert.match(script, /"seedance-2-5"/)
  assert.match(script, /modelIdFromPath\(window\.location\.pathname\)/)
  assert.match(script, /requestVideoGeneration\(/)
  assert.match(script, /function isVideoGenerationSelected\(\)/)
  assert.match(script, /isVideoGenerationSelected\(\)/)
})
