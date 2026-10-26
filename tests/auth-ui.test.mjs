import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('studio owns the login dialog while the public homepage reads its existing session', () => {
  const route = read('src/routes/app.tsx')
  const dialog = read('src/components/auth-dialog.tsx')
  const menu = read('src/components/user-menu.tsx')

  assert.match(route, /<UserMenu/)
  assert.match(route, /import\(['"]\.\.\/\.\.\/app\/studio\.js['"]\)/)
  assert.match(dialog, /signIn\.email/)
  assert.match(dialog, /signUp\.email/)
  assert.match(dialog, /EMAIL_PASSWORD_AUTH_ENABLED && \(/)
  assert.match(dialog, /if \(!EMAIL_PASSWORD_AUTH_ENABLED\) return/)
  assert.match(dialog, /signIn\.social/)
  assert.match(dialog, /provider:\s*['"]google['"]/)
  assert.match(menu, /useSession/)
  assert.match(menu, /signOut/)
  assert.match(menu, /Log in|Sign in/)
  assert.match(menu, /\/api\/credits\/balance/)
  assert.match(menu, /seedance:credits-updated/)
  assert.match(menu, /credits/i)

  const homepage = read('index.html')
  assert.match(homepage, /data-site-account/)
  assert.match(homepage, /\/assets\/site-account\.mjs/)
  assert.doesNotMatch(homepage, /auth-dialog|auth-user-menu|signIn\.email/)
})
