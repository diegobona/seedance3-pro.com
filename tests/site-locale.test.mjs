import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { languageSwitchPath, localizedPath, localeRedirect, preferredLocale } from '../app/site-locale.mjs'

test('regional defaults use CN/TW/HK and ignore browser language outside these regions', () => {
  for (const country of ['CN', 'TW', 'HK']) {
    const response = localeRedirect(new Request('https://seedance3-pro.com/app/image/gpt-image-2?ref=anyposes', { headers: { 'accept-language': 'en-US' } }), country)
    assert.equal(response.status, 302)
    assert.equal(response.headers.get('location'), 'https://seedance3-pro.com/zh/app/image/gpt-image-2?ref=anyposes')
    assert.match(response.headers.get('cache-control'), /no-store/)
  }
  for (const country of ['US', 'SG', 'JP', 'MO', undefined]) {
    assert.equal(localeRedirect(new Request('https://seedance3-pro.com/', { headers: { 'accept-language': 'zh-CN' } }), country), null)
  }
})

test('manual choices persist, preserve prompts and explicit Chinese URLs do not loop', () => {
  assert.equal(preferredLocale('seedance_locale=en', 'CN'), 'en')
  assert.equal(preferredLocale('seedance_locale=zh', 'US'), 'zh')
  assert.equal(preferredLocale('seedance_locale=invalid', 'HK'), 'zh')
  assert.equal(localeRedirect(new Request('https://seedance3-pro.com/zh/features'), 'US'), null)
  const response = localeRedirect(new Request('https://seedance3-pro.com/zh/app/video/minimax-h3?ref=anyposes&prompt=hello&lang=en'), 'CN')
  assert.equal(response.headers.get('location'), 'https://seedance3-pro.com/app/video/minimax-h3?ref=anyposes&prompt=hello')
  assert.match(response.headers.get('set-cookie'), /seedance_locale=en; Path=\//)
  assert.equal(localeRedirect(new Request(response.headers.get('location'), { headers: { cookie: 'seedance_locale=en' } }), 'CN'), null)
})

test('APIs, methods and resources are never language redirected', () => {
  for (const path of ['/api/auth/session', '/api/referrals/anyposes', '/_serverFn/get-session', '/@tanstack-start/server-functions', '/app-assets/client.js', '/assets/main.css', '/media/demo.mp4', '/sitemap.xml', '/robots.txt', '/admin/referrals']) {
    assert.equal(localeRedirect(new Request('https://seedance3-pro.com' + path), 'CN'), null)
    assert.equal(localizedPath(path, 'zh'), path)
  }
  assert.equal(localeRedirect(new Request('https://seedance3-pro.com/app', { method: 'POST' }), 'CN'), null)
  assert.equal(localizedPath('/zh/showcase?ref=anyposes#videos', 'en'), '/showcase?ref=anyposes#videos')
  assert.equal(localizedPath('/zh/showcase?ref=anyposes#videos', 'zh'), '/zh/showcase?ref=anyposes#videos')
})

test('browser language switches preserve SSR hrefs, queries and hashes for both choices', () => {
  const script = readFileSync(new URL('../assets/site-language.js', import.meta.url), 'utf8')
  for (const currentPath of ['/', '/zh/', '/zh/app/video/minimax-h3?ref=anyposes&prompt=hello%20world#editor', '/app/image/gpt-image-2?lang=en&prompt=hello%20world#preview']) {
    const handlers = new Map()
    let changedHrefs = 0
    const links = ['zh', 'en'].map(locale => {
      const attributes = new Map([['href', languageSwitchPath(currentPath, locale)]])
      return {
        dataset: { language: locale },
        getAttribute: name => attributes.get(name),
        setAttribute(name, value) {
          if (name === 'href') changedHrefs++
          attributes.set(name, value)
        },
        removeAttribute: name => attributes.delete(name),
      }
    })
    const document = {
      readyState: 'loading',
      cookie: '',
      addEventListener: (name, handler) => handlers.set(name, handler),
      querySelectorAll: () => [{ querySelectorAll: () => links }],
    }
    const window = {}
    runInNewContext(script, { URL, location: new URL(currentPath, 'https://seedance3-pro.com'), document, window })
    window.SeedanceLanguage.updateSwitches()
    assert.equal(changedHrefs, 0, `${currentPath} must keep its server-rendered language links`)
    for (const locale of ['zh', 'en']) {
      assert.equal(window.SeedanceLanguage.pathForLocale(locale), languageSwitchPath(currentPath, locale))
    }
    handlers.get('click')({ target: { closest: () => links[0] } })
    assert.match(document.cookie, /seedance_locale=zh;/)
    assert.match(document.cookie, /Domain=seedance3-pro\.com/)
    assert.equal(links[0].href, languageSwitchPath(currentPath, 'zh'))
  }
})

test('an explicit Chinese switch persists the choice and removes only the language query', () => {
  const switchedPath = languageSwitchPath('/app/video/minimax-h3?ref=anyposes&prompt=hello%20world', 'zh')
  const response = localeRedirect(new Request('https://seedance3-pro.com' + switchedPath), 'US')
  assert.equal(response.headers.get('location'), 'https://seedance3-pro.com/zh/app/video/minimax-h3?ref=anyposes&prompt=hello+world')
  assert.match(response.headers.get('set-cookie'), /seedance_locale=zh;/)
  assert.equal(localeRedirect(new Request(response.headers.get('location'), { headers: { cookie: 'seedance_locale=zh' } }), 'US'), null)
})
