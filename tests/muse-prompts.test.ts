import assert from 'node:assert/strict'
import test from 'node:test'
import { localizedContent, localizedPath, translate } from '../src/lib/site-i18n'

const promptData = await import('../src/data/muse-prompts').catch(() => null)

test('Muse prompt links open the correct workspace and preserve the original prompt', () => {
  assert.ok(promptData, 'Muse prompt data is available')
  const prompt = '雨后的咖啡馆 & soft light + "warm" tones?\nKeep #details = 100%.'
  for (const [model, pathname] of [['muse-video', '/app/video/muse-video'], ['muse-image', '/app/image/muse-image']] as const) {
    const url: URL = new URL(promptData.musePromptTryUrl(model, prompt), 'https://seedance3-pro.com')
    assert.equal(url.pathname, pathname)
    assert.equal(url.searchParams.get('prompt'), prompt)
    assert.equal(url.searchParams.has('model'), false)
    assert.equal(url.hash, '')
  }
})

test('Muse video and image libraries contain separate usable prompt drafts', () => {
  assert.ok(promptData, 'Muse prompt data is available')
  const videoSlugs = new Set(promptData.museVideoPrompts.map(item => item.slug))
  for (const prompts of [promptData.museVideoPrompts, promptData.museImagePrompts]) {
    assert.ok(prompts.length >= 5)
    assert.equal(new Set(prompts.map(item => item.slug)).size, prompts.length)
    for (const item of prompts) {
      assert.ok(item.title.trim())
      assert.ok(item.category.trim())
      assert.ok(item.summary.trim())
      assert.ok(item.prompt.length > 80 && item.prompt.length <= 2500)
    }
  }
  assert.ok(promptData.museImagePrompts.every(item => !videoSlugs.has(item.slug)))
})

test('Chinese Muse templates translate their editorial text and retain exact prompt drafts', () => {
  assert.ok(promptData, 'Muse prompt data is available')
  for (const [model, prompts] of [['muse-video', promptData.museVideoPrompts], ['muse-image', promptData.museImagePrompts]] as const) {
    for (const item of prompts) {
      const chinese = localizedContent(item, 'zh')
      assert.notEqual(chinese.title, item.title)
      assert.notEqual(chinese.category, item.category)
      assert.notEqual(chinese.summary, item.summary)
      assert.equal(chinese.prompt, item.prompt)
      const url: URL = new URL(localizedPath(promptData.musePromptTryUrl(model, item.prompt), 'zh'), 'https://seedance3-pro.com')
      assert.match(url.pathname, /^\/zh\/app\//)
      assert.equal(url.searchParams.get('prompt'), item.prompt)
    }
  }
  assert.equal(translate('zh', 'Muse Video Prompt Library'), 'Muse Video 提示词库')
  assert.equal(translate('zh', 'Muse Image Prompt Library'), 'Muse Image 提示词库')
})
