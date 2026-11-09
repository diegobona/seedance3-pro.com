import assert from 'node:assert/strict'
import test from 'node:test'
import { registerHooks } from 'node:module'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router'
import { REGISTERED_FREE_CREDITS_ENABLED } from '../app/credit-policy.mjs'

const hooks = registerHooks({
  load(url, context, nextLoad) {
    if (/\.(?:css|png|webp|mp4|jpe?g|svg)(?:\?|$)/.test(url)) {
      return { format: 'module', shortCircuit: true, source: `export default ${JSON.stringify(url)}` }
    }
    return nextLoad(url, context)
  },
})
const { StudioPage } = await import('../src/routes/app')
hooks.deregister()

async function render(pathname: string, initialModel = 'minimax-h3') {
  const root = createRootRoute()
  const route = createRoute({ getParentRoute: () => root, path: pathname,
    component: () => createElement(StudioPage, { initialModel, modelLanding: true }) })
  const router = createRouter({ routeTree: root.addChildren([route]), history: createMemoryHistory({ initialEntries: [pathname] }) })
  await router.load()
  return renderToString(createElement(RouterProvider, { router }))
}

test('generation purchase prompt is hidden until needed and opens checkout in a new tab in both languages', async () => {
  for (const prefix of ['', '/zh']) {
    const html = await render(`${prefix}/app/video/seedance-2-5`)
    const notice = html.match(/<p\b[^>]*id="credit-purchase-notice"[^>]*>[\s\S]*?<\/p>/)?.[0] ?? ''
    assert.match(notice, /\bhidden=""/)
    assert.ok(notice.includes(`href="${prefix}/checkout"`))
    assert.match(notice, /target="_blank" rel="noopener noreferrer"/)
    assert.match(notice, prefix ? /额度不足。/ : /Not enough credits\./)
    assert.match(html, /id="credit-balance-split" hidden=""><\/p>/)
    assert.match(html, /id="credit-debit-preview" hidden=""><\/p>/)
  }
})

test('SSR uses a neutral allowance heading while the account session is unresolved in both languages', async () => {
  for (const prefix of ['', '/zh']) {
    const html = await render(`${prefix}/app/video/minimax-h3`)
    const expected = REGISTERED_FREE_CREDITS_ENABLED
      ? prefix ? '每日免费积分' : 'Daily free credits'
      : prefix ? '积分' : 'Credits'
    assert.match(html, new RegExp(`<aside\\b[^>]*class="studio-trial-notice"[^>]*aria-label="${expected}"`))
    assert.match(html, new RegExp(`<strong id="trial-notice-title">${expected}</strong>`))
  }
})

test('initial guest HTML contains no prefilled network failure before a trial request', async () => {
  for (const prefix of ['', '/zh']) {
    const html = await render(`${prefix}/app/video/seedance-2-5`)
    assert.match(html, /id="free-budget-notice" hidden="" role="status"><\/p>/)
    assert.doesNotMatch(html, /The free trial is temporarily unavailable on this network|当前网络暂时无法使用免费体验/)
  }
})

test('guest video landing shows only five seconds and explains both free attempts in both languages', async () => {
  for (const prefix of ['', '/zh']) {
    const html = await render(`${prefix}/app/video/minimax-h3`)
    const notice = html.match(/<aside\b[^>]*class="studio-trial-notice"[^>]*>([\s\S]*?)<\/aside>/)?.[1] ?? ''
    assert.match(notice, prefix ? /无需注册和登录/ : /No sign-up or login required/)
    assert.match(notice, /id="trial-allowance-message"/)
    assert.doesNotMatch(notice, /studio-trial-register|480p/)
    const duration = html.match(/<select\b[^>]*id="video-duration"[^>]*>([\s\S]*?)<\/select>/)?.[1] ?? ''
    assert.match(duration, /<option\b[^>]*value="5"[^>]*selected/)
    assert.equal((duration.match(/<option\b/g) || []).length, 1)
    assert.doesNotMatch(duration, /value="(?:10|15)"/)
    assert.match(html, prefix ? /免费生成 2 条视频，每条 5 秒/ : /Two free videos, 5 seconds each/)
    assert.match(html, /data-authenticated="false"/)
    assert.match(html, prefix ? /生成后预计剩余/ : /AFTER GENERATION/)
    assert.match(html, prefix ? /剩余 — 秒/ : /— seconds remaining/)
  }
})

test('video form retains its provider resolution value and displays 1080P in both languages', async () => {
  for (const prefix of ['', '/zh']) {
    const html = await render(`${prefix}/app/video/minimax-h3`)
    const fileInput = html.match(/<input\b[^>]*id="video-reference-input"[^>]*>/)?.[0] ?? ''
    assert.ok(fileInput)
    assert.match(fileInput, /\bmultiple\b/)
    assert.match(html, /id="video-reference-count">0 \/ 9</)
    assert.match(html, prefix ? /1–9 张图 · PNG、JPEG 或 WebP · 每张最大 10 MB/ : /1–9 images · PNG, JPEG or WebP · max 10 MB each/)
    assert.match(html, /value="768p"/)
    assert.match(html, /value="768p"[^>]*>1080P<\/option>/)
    assert.doesNotMatch(html, /Describe how the subjects in Image 1, Image 2|描述图 1、图 2 等图像中的主体应如何互动/)
    assert.match(html, prefix ? /说明每张参考图的用途/ : /Describe the role of each reference image/)
  }
})

test('GPT Image 2.5 retains the requested intro removal while adding guest H3 support', async () => {
  const html = await render('/zh/app/image/gpt-image-2-5-1k', 'gpt-image-2-5-1k')
  assert.doesNotMatch(html, /class="model-landing-intro"/)
  assert.match(html, /<h1\b[^>]*id="model-name"/)
  assert.match(html, /data-preview-model="gpt-image-2-5-1k"><section[^>]*id="gpt-image-examples"/)
  assert.match(html, /class="gpt-example-frame"><img[^>]*src="\/media\/showcase-gpt-image-2\//)
  assert.match(html, /class="h3-example-prompt">Luxury commercial product photograph/)
  assert.match(html, /试一试 ↗/)
  assert.doesNotMatch(html, /GPT Image 2\.5 quick start|Describe your image or edit|model-video-guide/)
})

test('both image landing pages offer the same two-image guest allowance without registration', async () => {
  for (const model of ['gpt-image-2', 'gpt-image-2-5-1k']) {
    for (const prefix of ['', '/zh']) {
      const html = await render(`${prefix}/app/image/${model}`, model)
      const notice = html.match(/<aside\b[^>]*class="studio-trial-notice"[^>]*>([\s\S]*?)<\/aside>/)?.[1] ?? ''
      assert.match(notice, prefix ? /无需注册和登录/ : /No sign-up or login required/)
      assert.match(notice, /id="trial-allowance-message"/)
      assert.match(notice, /class="studio-credit-pack-link"/)
      assert.doesNotMatch(notice, /studio-trial-register/)
      const quantity = html.match(/<select\b[^>]*id="image-quantity"[^>]*>([\s\S]*?)<\/select>/)?.[1] ?? ''
      assert.match(quantity, /<option\b[^>]*value="3"[^>]*disabled/)
      assert.match(html, prefix ? /免费生成 1 张图片/ : /Generate 1 image · free/)
      assert.match(html, prefix ? /剩余 — 张图片/ : /— images remaining/)
      assert.match(html, prefix ? /生成后预计剩余/ : /AFTER GENERATION/)
    }
  }
})

test('each generator has one right-hand stage for idle, loading, result and error with separate page history', async () => {
  for (const model of ['gpt-image-2', 'gpt-image-2-5-1k', 'minimax-h3']) {
    for (const prefix of ['', '/zh']) {
      const kind = model === 'minimax-h3' ? 'video' : 'image'
      const html = await render(`${prefix}/app/${kind}/${model}`, model)
      const output = html.slice(html.indexOf('id="generation-output"'), html.indexOf('</aside>', html.indexOf('id="generation-output"')))
      for (const id of ['generation-preview', 'preview-idle', 'preview-pending', 'preview-status', 'preview-elapsed', 'preview-placeholders', 'preview-resume', 'result-card', 'result-gallery', 'preview-error', 'preview-error-message', 'preview-retry', 'generation-history', 'generation-history-list', 'view-generation-result']) {
        assert.equal((output.match(new RegExp(`id="${id}"`, 'g')) || []).length, 1, `${model}: ${id}`)
      }
      assert.match(output, /id="generation-preview"[^>]*tabindex="-1"[^>]*role="region"/)
      assert.match(output, /id="preview-elapsed"[^>]*aria-live="off"/)
      assert.match(output, /id="preview-pending"[^>]*hidden/)
      assert.match(output, /id="preview-error"[^>]*hidden/)
      assert.match(output, prefix ? /正在生成/ : /Generating/)
      assert.match(output, prefix ? /本页之前的结果/ : /Previous results on this page/)
      assert.ok(output.indexOf('id="result-card"') < output.indexOf('id="generation-history"'))
    }
  }
})
