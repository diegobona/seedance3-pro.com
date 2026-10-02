import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router'
import { localizeHead, localizedContent, localizedPath, localeFromPath, translate, useSiteI18n } from '../src/lib/site-i18n'
import { h3VideoCases, h3VideoCaseTryUrl } from '../src/data/h3-video-cases'
import { gptImageCases, gptImageCaseTryUrl } from '../src/data/gpt-image-cases'

test('localized navigation retains queries and leaves API and media URLs neutral', () => {
  assert.equal(localeFromPath('/zh/app/video/minimax-h3'), 'zh')
  assert.equal(localeFromPath('/app'), 'en')
  assert.equal(localizedPath('/minimax-h3-prompts/corgi-sprint', 'zh'), '/zh/minimax-h3-prompts/corgi-sprint')
  assert.equal(localizedPath('/zh/app/?model=pose-to-image#scene', 'en'), '/app/?model=pose-to-image#scene')
  assert.equal(localizedPath('/api/credits/balance', 'zh'), '/api/credits/balance')
  assert.equal(localizedPath('/media/showcase-h3/corgi.mp4', 'zh'), '/media/showcase-h3/corgi.mp4')
})

test('Chinese editorial case data preserves the exact generation prompt and payload', () => {
  for (const original of [...h3VideoCases, ...gptImageCases]) {
    const chinese = localizedContent(original, 'zh')
    assert.notEqual(chinese.title, original.title)
    assert.notEqual(chinese.summary, original.summary)
    assert.notEqual(chinese.creativeNote, original.creativeNote)
    assert.equal(chinese.prompt, original.prompt)
    assert.equal(chinese.slug, original.slug)
    const tryUrl = 'videoUrl' in original ? h3VideoCaseTryUrl(original) : gptImageCaseTryUrl(original)
    const localized = new URL(localizedPath(tryUrl, 'zh'), 'https://seedance3-pro.com')
    assert.equal(localized.searchParams.get('prompt'), original.prompt)
    assert.match(localized.pathname, /^\/zh\/app\//)
  }
})

test('Chinese route metadata has translated text, OG locale and self canonical', () => {
  const head = localizeHead({
    meta: [{ title: 'MiniMax H3 Prompt Library | Original Examples' }, { name: 'description', content: h3VideoCases[0].summary + ' Watch the original video and read the exact prompt used to create it.' }],
    links: [{ rel: 'canonical', href: 'https://seedance3-pro.com/minimax-h3-prompts/foldable-origami-crane' }],
  }, '/minimax-h3-prompts/$slug', 'zh')
  assert.equal(head.meta[0].title, 'MiniMax H3 提示词库 | 原创示例')
  assert.match(String(head.meta[1].content), /咖啡馆/)
  assert.ok(!String(head.meta[1].content).includes('Watch the original'))
  assert.equal(head.links[0].href, 'https://seedance3-pro.com/zh/minimax-h3-prompts/foldable-origami-crane')
  assert.equal(head.meta.at(-1)?.content, 'zh_CN')
})

test('SSR derives Chinese from router pathname without a browser or language cookie', async () => {
  function LocaleProbe() {
    const { t, path } = useSiteI18n()
    return createElement('section', null, createElement('h1', null, t('MiniMax H3 Prompt Library')), createElement('a', { href: path('/app/video/minimax-h3') }, t('Try Now')))
  }
  const root = createRootRoute()
  const page = createRoute({ getParentRoute: () => root, path: '/zh/minimax-h3-prompts', component: LocaleProbe })
  const router = createRouter({ routeTree: root.addChildren([page]), history: createMemoryHistory({ initialEntries: ['/zh/minimax-h3-prompts'] }) })
  await router.load()
  const html = renderToString(createElement(RouterProvider, { router }))
  assert.match(html, /MiniMax H3 提示词库/)
  assert.match(html, /href="\/zh\/app\/video\/minimax-h3"/)
  assert.match(html, /立即试用/)
  assert.equal(translate('en', 'Try Now'), 'Try Now')
})
