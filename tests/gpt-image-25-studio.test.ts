import assert from 'node:assert/strict'
import test from 'node:test'
import { registerHooks } from 'node:module'
import { createElement, type FunctionComponent } from 'react'
import { renderToString } from 'react-dom/server'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router'

// SSR does not execute styles or decode static image imports. Keep the actual UI components.
const assetHooks = registerHooks({
  load(url, context, nextLoad) {
    if (/\.(?:css|png|webp|mp4|jpe?g|svg)(?:\?|$)/.test(url)) {
      return { format: 'module', shortCircuit: true, source: `export default ${JSON.stringify(url)}` }
    }
    return nextLoad(url, context)
  },
})
const { StudioPage } = await import('../src/routes/app')
const { StudioShowcasePage } = await import('../src/components/studio-showcase-page')
const { Seedance3PreviewPage } = await import('../src/components/seedance3-preview-page')
const { MuseWorkspacePage } = await import('../src/components/muse-workspace-page')
assetHooks.deregister()

async function renderPage(pathname: string, component: FunctionComponent) {
  const root = createRootRoute()
  const page = createRoute({ getParentRoute: () => root, path: pathname, component })
  const router = createRouter({ routeTree: root.addChildren([page]), history: createMemoryHistory({ initialEntries: [pathname] }) })
  await router.load()
  return renderToString(createElement(RouterProvider, { router }))
}

function elementContents(html: string, tag: string, id: string) {
  const match = html.match(new RegExp(`<${tag}\\b[^>]*\\bid="${id}"[^>]*>([\\s\\S]*?)<\\/${tag}>`))
  assert.ok(match, `${id} is rendered`)
  return match[1]
}

test('GPT Image 2.5 SSR selects and labels its own model in both languages', async () => {
  for (const prefix of ['', '/zh']) {
    const html = await renderPage(prefix + '/app/image/gpt-image-2-5-1k', () => createElement(StudioPage, { initialModel: 'gpt-image-2-5-1k', modelLanding: true }))
    assert.equal(elementContents(html, 'strong', 'selected-name'), 'GPT Image 2.5')
    assert.equal(elementContents(html, 'span', 'selected-symbol'), 'G2.5')
    assert.equal(elementContents(html, 'small', 'result-model-label'), 'GPT Image 2.5')
    assert.match(elementContents(html, 'h1', 'model-name'), prefix ? /GPT Image 2\.5 生成器/ : /GPT Image 2\.5 Generator/)
    const newButton = html.match(/<button\b[^>]*data-model="gpt-image-2-5-1k"[^>]*>/)?.[0]
    const oldButton = html.match(/<button\b[^>]*data-model="gpt-image-2"[^>]*>/)?.[0]
    assert.match(newButton ?? '', /is-active/)
    assert.doesNotMatch(oldButton ?? '', /is-active/)
    assert.match(elementContents(html, 'section', 'model-details'), /gpt-image-2\.5-1k/)
    assert.match(elementContents(html, 'section', 'model-details'), prefix ? /兔子.*路由/ : /Tuzi.*routing alias/)
    assert.doesNotMatch(elementContents(html, 'p', 'launch-notice'), /\$0\.01/)
  }
})

test('new image SSR offers the provider fixed aspect ratios and four local reference inputs', async () => {
  const html = await renderPage('/app/image/gpt-image-2-5-1k', () => createElement(StudioPage, { initialModel: 'gpt-image-2-5-1k', modelLanding: true }))
  const ratios = Array.from(elementContents(html, 'select', 'image-aspect-ratio').matchAll(/<option\b[^>]*value="([^"]+)"/g), match => match[1])
  assert.deepEqual(ratios, ['1:1', '3:2', '2:3', '3:4', '4:3', '4:5', '5:4', '16:9', '9:16', '21:9', '9:21'])
  assert.match(elementContents(html, 'span', 'reference-meta'), /4 images/)
  assert.match(elementContents(html, 'small', 'upload-hint'), /10 MB.*24 MB/)
  assert.match(elementContents(html, 'strong', 'generation-credit-cost'), /5 credits/)
  const carousel = html.match(/<section\b[^>]*id="example-carousel"[^>]*>/)?.[0]
  assert.match(carousel ?? '', /hidden=""/)
  assert.doesNotMatch(html, /class="context-card gpt-image-examples/)
  assert.match(html, /href="\/gpt-image-2-prompts"/)
  assert.match(html, /href="\/ai-christmas-photo-prompt"/)
})

test('existing GPT Image 2 SSR retains its own selection, ratios and original examples', async () => {
  const html = await renderPage('/app/image/gpt-image-2', () => createElement(StudioPage, { initialModel: 'gpt-image-2', modelLanding: true }))
  assert.equal(elementContents(html, 'strong', 'selected-name'), 'GPT Image 2')
  const ratios = Array.from(elementContents(html, 'select', 'image-aspect-ratio').matchAll(/<option\b[^>]*value="([^"]+)"/g), match => match[1])
  assert.deepEqual(ratios, ['1:1', '3:2', '2:3'])
  assert.match(html, /gpt-image-examples/)
})

test('every existing studio shell discovers the new image workspace without dropping Christmas links', async () => {
  const shells: FunctionComponent[] = [
    () => createElement(StudioShowcasePage, { model: 'gpt-image-2' }),
    Seedance3PreviewPage,
    () => createElement(MuseWorkspacePage, { model: 'muse-image' }),
  ]
  for (const component of shells) {
    const html = await renderPage('/zh/app/image/muse-image', component)
    assert.match(html, /href="\/zh\/app\/image\/gpt-image-2-5-1k"/)
    assert.match(html, /GPT Image 2\.5/)
    const image25Link = html.match(/<a\b[^>]*href="\/zh\/app\/image\/gpt-image-2-5-1k"[^>]*>[\s\S]*?<\/a>/)?.[0] ?? ''
    assert.match(image25Link, /class="price-badge">.*?<b>\$0\.01<\/b>/)
    assert.match(html, /href="\/zh\/ai-christmas-photo-prompt"/)
  }
})
