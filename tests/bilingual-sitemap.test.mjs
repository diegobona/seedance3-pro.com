import test from 'node:test'
import assert from 'node:assert/strict'
import { bilingualSitemap } from '../scripts/bilingual-sitemap.mjs'

test('sitemap includes both canonical editions with reciprocal alternatives and is idempotent', () => {
  const input = '<urlset><url><loc>https://seedance3-pro.com/</loc></url><url><loc>https://seedance3-pro.com/app/video/minimax-h3</loc><lastmod>2026-10-02</lastmod></url></urlset>'
  const xml = bilingualSitemap(input)
  assert.equal((xml.match(/<url>/g) || []).length, 4)
  assert.match(xml, /<loc>https:\/\/seedance3-pro.com\/zh\/app\/video\/minimax-h3<\/loc>/)
  assert.equal((xml.match(/hreflang="zh-Hans"/g) || []).length, 4)
  assert.equal(bilingualSitemap(xml), xml)
})
