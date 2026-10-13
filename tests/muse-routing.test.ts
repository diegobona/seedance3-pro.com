import test from 'node:test'
import assert from 'node:assert/strict'
import { canonicalModelPath, legacyModelRedirect, modelIdFromPath } from '../app/seo-routes.mjs'
import { isStudioDocument } from '../src/lib/site-static-proxy'
import { localizedUrl } from '../scripts/generate-zh-site.mjs'

const models = [
  ['muse-video', '/app/video/muse-video', '/muse-video-prompts'],
  ['muse-image', '/app/image/muse-image', '/muse-image-prompts'],
] as const

test('Muse model URLs resolve to their own workspace in both languages', () => {
  for (const [model, workspace] of models) {
    assert.equal(canonicalModelPath(model), workspace)
    assert.equal(canonicalModelPath(model, 'zh'), '/zh' + workspace)
    assert.equal(modelIdFromPath(workspace), model)
    assert.equal(modelIdFromPath('/zh' + workspace), model)
  }
})

test('Muse query aliases preserve prompt drafts when redirecting to a preview', () => {
  const prompt = '雨中咖啡馆 & warm light + a slow camera move?'
  for (const [model, workspace] of models) {
    for (const locale of ['', '/zh']) {
      const old = new URL(locale + '/app/', 'https://seedance3-pro.com')
      old.searchParams.set('model', model)
      old.searchParams.set('prompt', prompt)
      old.searchParams.set('ref', 'library')
      const destination = legacyModelRedirect(old)
      assert.ok(destination)
      const redirected = new URL(destination, old.origin)
      assert.equal(redirected.pathname, locale + workspace)
      assert.equal(redirected.searchParams.get('prompt'), prompt)
      assert.equal(redirected.searchParams.get('ref'), 'library')
      assert.equal(redirected.searchParams.has('model'), false)
    }
  }
})

test('Muse libraries reach React and keep localized links during static publishing', () => {
  for (const [, workspace, library] of models) {
    for (const locale of ['', '/zh']) {
      assert.equal(isStudioDocument(locale + workspace), true)
      assert.equal(isStudioDocument(locale + library), true)
    }
    assert.equal(localizedUrl(library + '?ref=studio', '/', new Set()), '/zh' + library + '?ref=studio')
  }
  assert.equal(isStudioDocument('/muse-image-prompts-extra'), false)
})
