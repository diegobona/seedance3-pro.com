import { createHash } from 'node:crypto'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { parse } from 'dotenv'
import { generateTuziImage } from './tuzi-image.mjs'

const cases = JSON.parse(await readFile(new URL('../src/data/gpt-image-cases.json', import.meta.url), 'utf8'))
const env = parse(await readFile(new URL('../.env.local', import.meta.url)))
const apiKey = String(env.TUZI_API_KEY || '').trim()
if (!apiKey) throw new Error('TUZI_API_KEY is missing from .env.local')

const selectedSlug = process.argv.find((value) => value.startsWith('--only='))?.slice('--only='.length)
const selected = selectedSlug ? cases.filter((entry) => entry.slug === selectedSlug) : cases
if (!selected.length) throw new Error('No matching showcase case')

const outputDir = resolve('media/showcase-gpt-image-2/2026-09-26')
await mkdir(outputDir, { recursive: true })

for (const entry of selected) {
  const originalPath = resolve(outputDir, `${entry.slug}.png`)
  try {
    if ((await stat(originalPath)).size > 0) {
      console.log(`skip ${entry.slug}: original image exists`)
      continue
    }
  } catch { /* generate missing image */ }

  console.log(`generating ${entry.slug} (${entry.size})`)
  const [result] = await generateTuziImage(
    { prompt: entry.prompt, size: entry.size, quantity: 1 },
    { apiKey, apiBase: env.TUZI_API_BASE, timeoutMs: 240_000 }
  )
  let bytes
  if (result.dataUrl) {
    const [prefix, encoded] = result.dataUrl.split(',')
    if (prefix !== 'data:image/png;base64' || !encoded) throw new Error(`Unexpected image format for ${entry.slug}`)
    bytes = Buffer.from(encoded, 'base64')
  } else if (result.url) {
    const response = await fetch(result.url, { signal: AbortSignal.timeout(60_000) })
    if (!response.ok || !String(response.headers.get('content-type')).startsWith('image/png')) throw new Error(`Unexpected image URL response for ${entry.slug}`)
    bytes = Buffer.from(await response.arrayBuffer())
  } else {
    throw new Error(`No usable image for ${entry.slug}`)
  }
  if (bytes.length < 100_000 || bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error(`Invalid PNG for ${entry.slug}`)
  await writeFile(originalPath, bytes, { flag: 'wx' })
  console.log(`saved ${entry.slug}: ${bytes.length} bytes, sha256 ${createHash('sha256').update(bytes).digest('hex')}`)
}
