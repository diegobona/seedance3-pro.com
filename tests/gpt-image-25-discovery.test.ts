import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import fs from 'node:fs/promises'
import { registerHooks } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import test, { after } from 'node:test'
import { fileURLToPath } from 'node:url'
import { generateChineseSite } from '../scripts/generate-zh-site.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const origin = 'https://seedance3-pro.com'
const workspace = '/app/image/gpt-image-2-5-1k'
const modelName = 'GPT Image 2.5'
const assetHooks = registerHooks({
  load(url, context, nextLoad) {
    if (/\.(?:css|png|webp|mp4|jpe?g|svg)(?:\?|$)/.test(url)) {
      return { format: 'module', shortCircuit: true, source: `export default ${JSON.stringify(url)}` }
    }
    return nextLoad(url, context)
  },
})
after(() => assetHooks.deregister())

type Head = {
  meta: { title?: string; name?: string; property?: string; content?: string }[]
  links: { rel: string; href: string; hrefLang?: string }[]
}

function read(relative: string) {
  return readFileSync(path.join(root, relative), 'utf8')
}

function text(html: string) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function links(html: string, base = origin) {
  return Array.from(html.matchAll(/<a\b[^>]*\bhref="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g), match => ({
    url: new URL(match[1], base), label: text(match[2]),
  }))
}

function modelCard(html: string) {
  const cards = Array.from(html.matchAll(/<article\b[^>]*>([\s\S]*?)<\/article>/g), match => match[1])
  const found = cards.filter(card => /<h3\b[^>]*>GPT Image 2\.5<\/h3>/.test(card))
  assert.equal(found.length, 1, 'one distinct GPT Image 2.5 model card is visible')
  return found[0]
}

test('each homepage discovers the new model with its credit label', () => {
  for (const locale of ['', '/zh']) {
    const html = read(locale ? 'zh/index.html' : 'index.html')
    const base = origin + (locale ? '/zh/' : '/')
    const card = modelCard(html)
    const visible = text(card)
    assert.match(visible, /G2\.5/)
    assert.match(visible, locale ? /5 积分\/张/ : /5 credits\/image/)
    assert.match(visible, locale ? /(?:Tuzi|兔子).*路由别名/ : /Tuzi.*routing alias/)
    assert.doesNotMatch(visible, /\$|USD|official release|官方发布/i)
    assert.ok(links(card, base).some(link => link.url.pathname === locale + workspace))
    assert.doesNotMatch(card, /showcase-gpt-image-2|gpt-image-2-(?:lunar|floating|editorial)/)
    const navigation = Array.from(html.matchAll(/<nav\b[^>]*class="(?:desktop-nav[^"]*|mobile-nav)"[^>]*>([\s\S]*?)<\/nav>/g), match => match[1])
    assert.equal(navigation.length, 2, 'desktop and mobile navigation are present')
    for (const nav of navigation) {
      assert.ok(links(nav, base).some(link => link.url.pathname === locale + workspace && link.label === modelName), 'desktop and mobile navigation reach the model')
    }
    assert.ok(links(html, base).some(link => link.url.pathname === locale + '/ai-christmas-photo-prompt'), 'existing Christmas discovery is retained')
  }
})

test('new route heads are indexable, localized and have self canonicals and language alternates', async () => {
  const titles: string[] = []
  const descriptions: string[] = []
  for (const locale of ['', '/zh']) {
    const routeFile = new URL(`../src/routes/${locale ? 'zh.' : ''}app_.image.gpt-image-2-5-1k.tsx`, import.meta.url)
    assert.ok(existsSync(routeFile), 'the model has a dedicated route in each language')
    const { Route } = await import(routeFile.href)
    const head = Route.options.head() as Head
    const canonical = head.links.filter(link => link.rel === 'canonical')
    assert.deepEqual(canonical.map(link => link.href), [origin + locale + workspace])
    const alternates = Object.fromEntries(head.links.filter(link => link.rel === 'alternate').map(link => [link.hrefLang, link.href]))
    assert.deepEqual(alternates, { en: origin + workspace, 'zh-Hans': origin + '/zh' + workspace, 'x-default': origin + workspace })
    assert.match(head.meta.find(meta => meta.name === 'robots')?.content ?? '', /^index,follow/)
    assert.equal(head.meta.find(meta => meta.property === 'og:url')?.content, origin + locale + workspace)
    const title = head.meta.find(meta => meta.title)?.title ?? ''
    const description = head.meta.find(meta => meta.name === 'description')?.content ?? ''
    assert.match(title, /GPT Image 2\.5 Generator|GPT Image 2\.5 生成器/)
    assert.match(description, locale ? /(?:Tuzi|兔子).*路由别名/ : /Tuzi routing alias/)
    assert.doesNotMatch(title + description, /official release|官方发布|\$/i)
    for (const meta of head.meta.filter(meta => ['og:image', 'twitter:image'].includes(meta.property ?? meta.name ?? ''))) {
      assert.ok(meta.content)
      assert.doesNotMatch(meta.content, /showcase-gpt-image-2|gpt-image-2-(?:lunar|floating|editorial)/)
      assert.ok(existsSync(path.join(root, new URL(meta.content, origin).pathname)))
    }
    const component = Route.options.component()
    assert.equal(component.props.initialModel, 'gpt-image-2-5-1k')
    assert.equal(component.props.modelLanding, true)
    titles.push(title)
    descriptions.push(description)
  }
  assert.notEqual(titles[0], titles[1])
  assert.notEqual(descriptions[0], descriptions[1])
})

test('both model editions are published in the sitemap with reciprocal language links', () => {
  const entries = Array.from(read('sitemap.xml').matchAll(/<url>([\s\S]*?)<\/url>/g), match => match[1])
  for (const locale of ['', '/zh']) {
    const loc = origin + locale + workspace
    const found = entries.filter(entry => entry.includes(`<loc>${loc}</loc>`))
    assert.equal(found.length, 1, loc + ' appears once')
    for (const [language, href] of [['en', origin + workspace], ['zh-Hans', origin + '/zh' + workspace], ['x-default', origin + workspace]]) {
      assert.ok(found[0].includes(`hreflang="${language}" href="${href}"`), language + ' alternate is published')
    }
  }
})

test('the static Chinese generator keeps the model card translated and linked after regeneration', async t => {
  const fixture = await fs.mkdtemp(path.join(os.tmpdir(), 'seedance-gpt25-discovery-'))
  t.after(() => fs.rm(fixture, { recursive: true, force: true }))
  await fs.mkdir(path.join(fixture, 'scripts/i18n'), { recursive: true })
  await fs.mkdir(path.join(fixture, 'assets'))
  await fs.writeFile(path.join(fixture, 'index.html'), read('index.html'))
  await fs.writeFile(path.join(fixture, 'main.js'), '')
  await fs.writeFile(path.join(fixture, 'scripts/i18n/static-ui.zh-Hans.json'), '{}')
  await fs.writeFile(path.join(fixture, 'scripts/i18n/zh-Hans.json'), read('scripts/i18n/zh-Hans.json'))
  const result = await generateChineseSite({ rootDirectory: fixture, injectEnglish: false })
  assert.deepEqual(result.missing, [])
  const html = await fs.readFile(path.join(fixture, 'zh/index.html'), 'utf8')
  const card = modelCard(html)
  assert.match(text(card), /5 积分\/张/)
  assert.match(text(card), /(?:Tuzi|兔子).*路由别名/)
  assert.ok(links(card).some(link => link.url.pathname === '/zh' + workspace))
  assert.ok(links(html).some(link => link.url.pathname === '/zh/ai-christmas-photo-prompt'))
})
