import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { canonicalModelPath, modelIdFromPath } from '../app/seo-routes.mjs'

const root = resolve(import.meta.dirname, '..')
const read = (file) => readFileSync(resolve(root, file), 'utf8')

test('Seedance 2.5 direct URL remains functional while primary navigation hides it', () => {
  const path = '/app/video/seedance-2-5'
  assert.equal(canonicalModelPath('seedance-2-5'), path)
  assert.equal(modelIdFromPath(path), 'seedance-2-5')
  const route = read('src/routes/app_.video.seedance-2-5.tsx')
  assert.match(route, /<StudioPage initialModel="seedance-2-5" modelLanding \/>/)
  assert.match(route, /rel: 'canonical', href: url/)
  assert.doesNotMatch(route, /MiniMax H3/i)
  for (const file of ['index.html', 'showcase.html']) {
    const html = read(file)
    const nav = html.match(/<nav class="desktop-nav compact-nav"[^>]*>([\s\S]*?)<\/nav>/)?.[1]
    assert.ok(nav, `${file} primary navigation`)
    assert.doesNotMatch(nav, /Seedance 2\.5|seedance-2-5/i)
  }
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
