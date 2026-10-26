import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router'
import { AuthDialog } from '../src/components/auth-dialog'
import { EMAIL_PASSWORD_AUTH_ENABLED } from '../app/auth-methods.mjs'

test('studio renders only Google in English and Chinese login/register dialogs while email is disabled', { skip: EMAIL_PASSWORD_AUTH_ENABLED }, async () => {
  for (const locale of ['en', 'zh']) {
    for (const initialMode of ['login', 'register'] as const) {
      const path = locale === 'zh' ? '/zh/auth-check' : '/auth-check'
      const root = createRootRoute()
      const page = createRoute({ getParentRoute: () => root, path, component: () => createElement(AuthDialog, {
        open: true, initialMode, onClose() {},
      }) })
      const router = createRouter({ routeTree: root.addChildren([page]), history: createMemoryHistory({ initialEntries: [path] }) })
      await router.load()
      const html = renderToString(createElement(RouterProvider, { router }))
      assert.match(html, /google-auth-button/)
      assert.doesNotMatch(html, /<form|<input|auth-mode-tabs|auth-divider|auth-submit/)
      assert.match(html, locale === 'zh' ? /使用 Google 登录或创建账户/ : /Continue with Google to sign in or create your account/)
    }
  }
})
