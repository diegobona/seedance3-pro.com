import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { isStudioDocument } from '../src/lib/site-static-proxy'
import { localizedUrl } from '../scripts/generate-zh-site.mjs'

const collection = '/ai-christmas-photo-prompt'

test('Christmas collection reaches the React Worker in each language', () => {
  assert.equal(isStudioDocument(collection), true)
  assert.equal(isStudioDocument('/zh' + collection), true)
  assert.equal(isStudioDocument(collection + '-extra'), false)
})

test('Christmas homepage links retain the selected locale and tracking fragment', () => {
  assert.equal(localizedUrl('.' + collection + '?ref=holiday#family', '/', new Set()), '/zh' + collection + '?ref=holiday#family')
})

test('Christmas collection has both canonical editions in the published sitemap', () => {
  const xml = readFileSync(new URL('../sitemap.xml', import.meta.url), 'utf8')
  for (const locale of ['', '/zh']) {
    const loc = 'https://seedance3-pro.com' + locale + collection
    assert.ok(xml.includes('<loc>' + loc + '</loc>'), loc)
    assert.ok(xml.includes('href="' + loc + '"'), loc + ' needs a language alternate')
  }
})
