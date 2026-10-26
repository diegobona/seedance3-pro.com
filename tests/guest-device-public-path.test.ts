import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { isStudioDocument } from '../src/lib/site-static-proxy'

test('public account device import is served as a public asset, not a workspace document', async () => {
  const script = await readFile(new URL('../assets/site-account.mjs', import.meta.url), 'utf8')
  const dependency = script.match(/import\s*\{\s*guestDeviceHeaders\s*\}\s*from\s*['"]([^'"]+)['"]/)?.[1]
  assert.ok(dependency)
  const url = new URL(dependency, 'https://seedance3-pro.com/assets/site-account.mjs')
  assert.equal(isStudioDocument(url.pathname), false, 'the Worker must proxy this JS file to Pages')
  const module = await readFile(new URL(`..${url.pathname}`, import.meta.url), 'utf8')
  assert.match(module, /export async function guestDeviceHeaders/)
})
