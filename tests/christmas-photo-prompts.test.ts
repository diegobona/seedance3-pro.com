import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router'
import { localizeHead, localizedContent, localizedPath, translate } from '../src/lib/site-i18n'

const promptData = await import('../src/data/christmas-photo-prompts').catch(() => null)
const promptPage = await import('../src/components/christmas-photo-prompts').catch(() => null)

test('Christmas photo Try links preserve the exact prompt and supported image ratio', () => {
  assert.ok(promptData, 'Christmas photo prompt data is available')
  const prompt = '圣诞 portrait & warm light + "gold" tones?\nKeep #details = 100%.'
  for (const aspectRatio of ['1:1', '3:2', '2:3'] as const) {
    const link: string = promptData.christmasPhotoPromptTryUrl({ prompt, aspectRatio })
    for (const locale of ['en', 'zh'] as const) {
      const url: URL = new URL(localizedPath(link, locale), 'https://seedance3-pro.com')
      assert.equal(url.pathname, locale === 'zh' ? '/zh/app/image/gpt-image-2' : '/app/image/gpt-image-2')
      assert.equal(url.searchParams.get('prompt'), prompt)
      assert.equal(url.searchParams.get('aspect_ratio'), aspectRatio)
      assert.equal(url.searchParams.size, 2)
      assert.equal(url.hash, '')
    }
  }
})

test('Christmas collection offers twelve usable prompts across all five photo categories', () => {
  assert.ok(promptData, 'Christmas photo prompt data is available')
  const prompts = promptData.christmasPhotoPrompts
  assert.equal(prompts.length, 12)
  assert.equal(new Set(prompts.map(item => item.slug)).size, 12)
  for (const category of ['portraits', 'couples', 'families', 'pets', 'cards']) {
    assert.ok(prompts.filter(item => item.category === category).length >= 2, category)
  }
  for (const item of prompts) {
    assert.match(item.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    assert.ok(item.title.trim() && item.summary.trim() && item.editGuidance.trim())
    assert.ok(['1:1', '3:2', '2:3'].includes(item.aspectRatio))
    assert.ok(item.prompt.length >= 200 && item.prompt.length <= 2500, item.slug)
  }
})

test('Christmas category filtering retains collection order and returns all prompts by default', () => {
  assert.ok(promptData, 'Christmas photo prompt data is available')
  assert.deepEqual(promptData.filterChristmasPhotoPrompts('all'), promptData.christmasPhotoPrompts)
  for (const category of ['portraits', 'couples', 'families', 'pets', 'cards'] as const) {
    assert.deepEqual(promptData.filterChristmasPhotoPrompts(category), promptData.christmasPhotoPrompts.filter(item => item.category === category))
  }
})

test('Chinese Christmas editorial copy translates while generation prompts remain exact', () => {
  assert.ok(promptData, 'Christmas photo prompt data is available')
  for (const item of promptData.christmasPhotoPrompts) {
    const chinese = localizedContent(item, 'zh')
    assert.notEqual(chinese.title, item.title)
    assert.notEqual(chinese.summary, item.summary)
    assert.notEqual(chinese.editGuidance, item.editGuidance)
    assert.equal(chinese.slug, item.slug)
    assert.equal(chinese.prompt, item.prompt)
    assert.equal(chinese.aspectRatio, item.aspectRatio)
  }
  assert.equal(translate('zh', 'Christmas Photo Prompts'), '圣诞照片提示词')
  assert.equal(translate('zh', 'Seasonal collection'), '季节专题')
})

test('Christmas collection metadata localizes title and description with a self canonical', () => {
  assert.ok(promptData, 'Christmas photo prompt data is available')
  const head = localizeHead({
    meta: [{ title: promptData.christmasPhotoTitle }, { name: 'description', content: promptData.christmasPhotoDescription }, { property: 'og:url', content: promptData.christmasPhotoUrl }],
    links: [{ rel: 'canonical', href: promptData.christmasPhotoUrl }],
  }, '/ai-christmas-photo-prompt', 'zh')
  assert.notEqual(head.meta[0].title, promptData.christmasPhotoTitle)
  assert.notEqual(head.meta[1].content, promptData.christmasPhotoDescription)
  assert.equal(head.meta[2].content, 'https://seedance3-pro.com/zh/ai-christmas-photo-prompt')
  assert.equal(head.links[0].href, 'https://seedance3-pro.com/zh/ai-christmas-photo-prompt')
})

test('Christmas collection SSR includes every original prompt and localized generator links', async () => {
  assert.ok(promptData, 'Christmas photo prompt data is available')
  assert.ok(promptPage, 'Christmas photo component is available')
  for (const locale of ['en', 'zh'] as const) {
    const root = createRootRoute()
    const pathname = localizedPath('/ai-christmas-photo-prompt', locale)
    const page = createRoute({ getParentRoute: () => root, path: pathname, component: promptPage.ChristmasPhotoPrompts })
    const router = createRouter({ routeTree: root.addChildren([page]), history: createMemoryHistory({ initialEntries: [pathname] }) })
    await router.load()
    const html = renderToString(createElement(RouterProvider, { router }))
    for (const item of promptData.christmasPhotoPrompts) {
      assert.match(html, new RegExp(`id="${item.slug}"`))
      assert.ok(html.includes(item.prompt.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll("'", '&#x27;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')), item.slug)
    }
    assert.equal((html.match(/class="christmas-prompt-card"/g) ?? []).length, 12)
    assert.match(html, locale === 'zh' ? /href="\/zh\/app\/image\/gpt-image-2\?prompt=/ : /href="\/app\/image\/gpt-image-2\?prompt=/)
  }
})
