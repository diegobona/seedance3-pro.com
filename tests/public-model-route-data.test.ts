import test from 'node:test'
import assert from 'node:assert/strict'
import { h3VideoCases, h3VideoCaseUrl, h3VideoCaseTryUrl } from '../src/data/h3-video-cases'
import { gptImageCases, gptImageCaseUrl, gptImageCaseTryUrl } from '../src/data/gpt-image-cases'
import { localizedPath, localizeHead } from '../src/lib/site-i18n'
import { legacyModelRedirect } from '../app/seo-routes.mjs'

test('every published prompt case retains its slug and exact generation prompt at the renamed URL', () => {
  for (const locale of ['en', 'zh'] as const) {
    const prefix = locale === 'zh' ? '/zh' : ''
    for (const video of h3VideoCases) {
      assert.equal(localizedPath(h3VideoCaseUrl(video.slug), locale), prefix + '/seedance-2-5-prompts/' + video.slug)
      const tryUrl = new URL(localizedPath(h3VideoCaseTryUrl(video), locale), 'https://seedance3-pro.com')
      assert.equal(tryUrl.pathname, prefix + '/app/video/seedance-2-5')
      assert.equal(tryUrl.searchParams.get('prompt'), video.prompt)
      assert.equal(legacyModelRedirect(new URL(prefix + '/minimax-h3-prompts/' + video.slug, tryUrl)), prefix + '/seedance-2-5-prompts/' + video.slug)
    }
    for (const image of gptImageCases) {
      assert.equal(localizedPath(gptImageCaseUrl(image.slug), locale), prefix + '/gpt-image-2-5-prompts/' + image.slug)
      const tryUrl = new URL(localizedPath(gptImageCaseTryUrl(image), locale), 'https://seedance3-pro.com')
      assert.equal(tryUrl.pathname, prefix + '/app/image/gpt-image-2-5-1k')
      assert.equal(tryUrl.searchParams.get('prompt'), image.prompt)
    }
  }
})

test('localized canonical metadata migrates old tool and library paths without changing media URLs', () => {
  const head = localizeHead({ links: [{ rel: 'canonical', href: 'https://seedance3-pro.com/minimax-h3-prompts/corgi-sprint' }], meta: [{ property: 'og:url', content: 'https://seedance3-pro.com/minimax-h3-prompts/corgi-sprint' }, { property: 'og:video', content: 'https://seedance3-pro.com/media/showcase-h3/corgi.mp4' }] }, '/minimax-h3-prompts/corgi-sprint', 'zh')
  assert.equal(head.links[0].href, 'https://seedance3-pro.com/zh/seedance-2-5-prompts/corgi-sprint')
  assert.equal(head.meta[0].content, head.links[0].href)
  assert.equal(head.meta[1].content, 'https://seedance3-pro.com/media/showcase-h3/corgi.mp4')
})
