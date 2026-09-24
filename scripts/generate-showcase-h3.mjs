import { createWriteStream } from 'node:fs'
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'
import { queryAutodlVideoTask, submitAutodlVideoTask } from './autodl-video.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
config({ path: resolve(root, '.env.local'), quiet: true })

const outputDir = resolve(root, 'media/showcase-h3/2026-09-25')
const statePath = resolve(outputDir, 'generation.json')
const token = process.env.AUTODL_TOKEN
if (!token) throw new Error('AUTODL_TOKEN is missing')

const scenes = [
  {
    id: 'foldable-origami-crane',
    title: 'The phone that folded too far',
    aspectRatio: '16:9',
    prompt: 'A five-second single shot in a bright café. A person unfolds a sleek, unbranded foldable phone. It folds itself one more time into a tiny metallic origami crane and flies away. The person stares at their empty hands, deadpan. Playful physical comedy, realistic motion, clean commercial lighting, 16:9, no text or logos.'
  },
  {
    id: 'smart-glasses-coffee',
    title: 'Directions to the coffee in your hand',
    aspectRatio: '9:16',
    prompt: 'A five-second single shot in a kitchen. A person puts on unbranded smart glasses. A large glowing navigation arrow appears and points insistently toward the coffee mug already in their hand. They slowly look at the mug, then at the camera in embarrassment. Subtle AR effects, dry comedy, 9:16, no text or logos.'
  },
  {
    id: 'corgi-sprint',
    title: 'The corgi wins the sprint',
    aspectRatio: '16:9',
    prompt: 'Five-second single shot at a fictional neighborhood running track. A serious adult sprinter explodes off the starting line, but a tiny corgi dashes past and crosses the finish tape first. The runner stops and stares; the corgi looks delighted. Dramatic sports-camera energy, playful comedy, 16:9, no official marks or text.'
  },
  {
    id: 'cat-fashion-runway',
    title: 'The cat steals the runway',
    aspectRatio: '9:16',
    prompt: 'Five-second single shot on a glamorous fashion runway. A model walks toward the camera with a serious expression. A confident black cat trots past her and takes center stage as camera flashes turn toward the cat. The model breaks character and smiles. Chic editorial lighting, realistic movement, 9:16, no logos or text.'
  },
  {
    id: 'grandma-dance-floor',
    title: 'Grandma owns the dance floor',
    aspectRatio: '9:16',
    prompt: 'Five-second single shot at a lively family party. Young adults hesitate on the dance floor; a stylish grandmother steps forward and does one effortless old-school dance move. Everyone immediately copies her as she gives the camera a knowing smile. Joyful, expressive faces, retro party lighting, 9:16, no recognizable music, text or logos.'
  }
]

await mkdir(outputDir, { recursive: true })
let state
try {
  state = JSON.parse(await readFile(statePath, 'utf8'))
} catch (error) {
  if (error.code !== 'ENOENT') throw error
  state = { workflow: 'minimax_h3_lightx2v_no_pic', duration: 5, resolution: '768p', scenes: {} }
}

async function save() {
  const temp = `${statePath}.tmp`
  await writeFile(temp, JSON.stringify(state, null, 2) + '\n')
  await rename(temp, statePath)
}

for (const scene of scenes) {
  const existing = state.scenes[scene.id]
  if (existing?.prompt && existing.prompt !== scene.prompt) {
    throw new Error(`Prompt changed after submission: ${scene.id}`)
  }
  if (existing?.providerTaskId) {
    console.log(`Resume ${scene.id}: ${existing.status}`)
    continue
  }
  console.log(`Submitting ${scene.id} (${scene.aspectRatio})`)
  try {
    const { providerTaskId } = await submitAutodlVideoTask(
      { prompt: scene.prompt, duration: 5, resolution: '768p', aspectRatio: scene.aspectRatio },
      { token }
    )
    state.scenes[scene.id] = { ...scene, providerTaskId, status: 'queued' }
    await save()
    console.log(`Submitted ${scene.id}: ${providerTaskId}`)
  } catch (error) {
    console.error(`Submission stopped at ${scene.id}: ${error.message}`)
    if (error.ambiguous) console.error('Submission outcome is unknown; do not resubmit without checking the provider.')
    process.exitCode = 1
    process.exit()
  }
}

const deadline = Date.now() + 45 * 60_000
while (Date.now() < deadline) {
  let pending = 0
  for (const scene of scenes) {
    const item = state.scenes[scene.id]
    if (!item || item.status === 'downloaded' || item.status === 'failed') continue
    pending++
    try {
      const result = await queryAutodlVideoTask(item.providerTaskId, { token })
      if (result.status !== item.status) {
        item.status = result.status
        await save()
        console.log(`${scene.id}: ${result.status}`)
      }
      if (result.status === 'failed') continue
      if (result.status !== 'succeeded') continue

      const path = resolve(outputDir, `${scene.id}.mp4`)
      const temp = `${path}.tmp`
      const response = await fetch(result.videoUrl, { signal: AbortSignal.timeout(120_000) })
      if (!response.ok || !response.body) throw new Error(`Download HTTP ${response.status}`)
      await pipeline(Readable.fromWeb(response.body), createWriteStream(temp))
      const file = await stat(temp)
      if (file.size < 100_000) throw new Error(`Video file unexpectedly small: ${file.size} bytes`)
      const header = await readFile(temp)
      if (header.toString('ascii', 4, 8) !== 'ftyp') throw new Error('Downloaded file is not MP4')
      await rename(temp, path)
      item.status = 'downloaded'
      item.file = `media/showcase-h3/2026-09-25/${scene.id}.mp4`
      item.bytes = file.size
      await save()
      console.log(`${scene.id}: saved ${Math.round(file.size / 1024)} KiB`)
    } catch (error) {
      await rm(resolve(outputDir, `${scene.id}.mp4.tmp`), { force: true })
      console.error(`${scene.id}: ${error.message}`)
    }
  }
  if (!pending) break
  await new Promise(resolve => setTimeout(resolve, 15_000))
}

const incomplete = scenes.filter(scene => state.scenes[scene.id]?.status !== 'downloaded')
console.log(`Downloaded ${scenes.length - incomplete.length}/${scenes.length} videos`)
if (incomplete.length) process.exitCode = 1
