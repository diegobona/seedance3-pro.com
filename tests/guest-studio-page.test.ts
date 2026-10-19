import assert from 'node:assert/strict'
import test from 'node:test'
import { registerHooks } from 'node:module'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router'

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

test('guest H3 landing is registration-free, defaults to five seconds and caps selection at ten in both languages', async () => {
  for (const prefix of ['', '/zh']) {
    const html = await render(`${prefix}/app/video/minimax-h3`)
    const notice = html.match(/<aside\b[^>]*class="studio-trial-notice"[^>]*>([\s\S]*?)<\/aside>/)?.[1] ?? ''
    assert.match(notice, prefix ? /无需注册和登录/ : /No registration or login required/)
    assert.match(notice, prefix ? /可选 5 秒或 10 秒/ : /Choose 5 or 10 seconds/)
    assert.doesNotMatch(notice, /studio-trial-register|<button|480p|15 credits|15 积分/)
    const duration = html.match(/<select\b[^>]*id="video-duration"[^>]*>([\s\S]*?)<\/select>/)?.[1] ?? ''
    assert.match(duration, /<option\b[^>]*value="5"[^>]*selected/)
    assert.match(duration, /<option\b[^>]*value="15"[^>]*disabled/)
    assert.match(html, /data-authenticated="false"/)
    assert.match(html, prefix ? /生成后预计剩余/ : /AFTER GENERATION/)
    assert.match(html, prefix ? /剩余 — 秒/ : /— seconds remaining/)
  }
})

test('H3 allows selecting only one video reference image in both languages', async () => {
  for (const prefix of ['', '/zh']) {
    const html = await render(`${prefix}/app/video/minimax-h3`)
    const fileInput = html.match(/<input\b[^>]*id="video-reference-input"[^>]*>/)?.[0] ?? ''
    assert.ok(fileInput)
    assert.doesNotMatch(fileInput, /\bmultiple\b/)
    assert.match(html, /id="video-reference-count">0 \/ 1</)
    assert.match(html, prefix ? /1 张图 · PNG、JPEG 或 WebP · 最大 10 MB/ : /1 image · PNG, JPEG or WebP · max 10 MB/)
    assert.doesNotMatch(html, /1–9 images|1–9 张图/)
    assert.doesNotMatch(html, /Describe how the subjects in Image 1, Image 2|描述图 1、图 2 等图像中的主体应如何互动/)
    assert.match(html, prefix ? /描述主体动作和镜头运动。/ : /Describe the motion and camera movement\./)
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
      assert.match(notice, prefix ? /无需注册和登录/ : /No registration or login required/)
      assert.match(notice, prefix ? /共用 2 张免费图片额度/ : /share 2 free images/)
      assert.doesNotMatch(notice, /<button|15 credits|15 积分/)
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
