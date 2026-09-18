import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createGoogleDevProxyServer } from './google-dev-proxy.mjs'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const bootstrapFlag = 'SEEDANCE_PROXY_BOOTSTRAPPED'
const proxyURL = process.env.SEEDANCE_DEV_HTTP_PROXY || 'http://127.0.0.1:1080'

if (!process.env[bootstrapFlag]) {
  const child = spawn(process.execPath, ['--use-env-proxy', fileURLToPath(import.meta.url), ...process.argv.slice(2)], {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      [bootstrapFlag]: '1',
      HTTP_PROXY: proxyURL,
      HTTPS_PROXY: proxyURL,
      NO_PROXY: ['localhost', '127.0.0.1', '::1', process.env.NO_PROXY].filter(Boolean).join(','),
    },
  })
  child.once('exit', (code, signal) => {
    if (signal) process.kill(process.pid, signal)
    else process.exit(code ?? 1)
  })
} else {
  try {
    process.loadEnvFile(resolve(root, '.env.local'))
  } catch {
    // Auth startup will provide the normal missing-variable error if needed.
  }

  const proxyServer = createGoogleDevProxyServer({
    proxyToken: process.env.BETTER_AUTH_SECRET,
  })
  await new Promise((resolveListen, reject) => {
    proxyServer.once('error', reject)
    proxyServer.listen(4312, '127.0.0.1', resolveListen)
  })
  console.log(`[dev] Google OAuth proxy listening on http://127.0.0.1:4312 via ${proxyURL}`)

  const suppliedArgs = process.argv.slice(2)
  const hasPort = suppliedArgs.some((value) => value === '--port' || value === '-p' || value.startsWith('--port='))
  const viteArgs = [resolve(root, 'node_modules/vite/bin/vite.js'), 'dev']
  if (!hasPort) viteArgs.push('--port', '4310')
  viteArgs.push(...suppliedArgs)

  const vite = spawn(process.execPath, viteArgs, {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  })

  const stop = () => {
    if (!vite.killed) vite.kill()
    proxyServer.close()
  }
  process.once('SIGINT', stop)
  process.once('SIGTERM', stop)
  vite.once('exit', (code, signal) => {
    proxyServer.close(() => {
      if (signal) process.kill(process.pid, signal)
      else process.exit(code ?? 1)
    })
  })
}
