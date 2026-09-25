import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { validateSharedScene } from '../app/pose-share.mjs'

const root = resolve(import.meta.dirname, '..')
const read = (path) => readFileSync(resolve(root, path), 'utf8')

test('showcase features editable Pose scenes before the Video Prompt Library', () => {
  const showcase = read('showcase.html')
  assert.match(showcase, /<title>Editable Pose Scenes & Video Prompt Library/)
  assert.ok(showcase.indexOf('id="pose"') < showcase.indexOf('id="community-videos"'))
  assert.match(showcase, /id="community-videos"/)
  assert.match(showcase, /id="showcase-info"/)
  assert.doesNotMatch(showcase, /id="videos"|id="images"|MiniMax H3 video samples|GPT Image 2 image examples/)
  assert.doesNotMatch(showcase, /class="showcase-preview-button"|id="showcase-player"/)
  assert.doesNotMatch(showcase, /pose-reference-demo\.mp4/)
  assert.doesNotMatch(showcase, /Get Inspired|Video gallery|30 videos/)
  const poseStudio = read('app/pose-studio.mjs')
  for (const scene of ['two-friends', 'cafe-conversation', 'dog-training']) {
    assert.match(showcase, new RegExp(`href="\\./app/\\?model=pose-to-image#scene=${scene}"`))
    assert.match(showcase, new RegExp(`references/${scene}\\.png`))
    assert.match(poseStudio, new RegExp(`'${scene}': [a-zA-Z]+SceneUrl`))
    validateSharedScene(JSON.parse(read(`media/pose-cases/2026-09-23/scenes/${scene}.json`)))
  }
  assert.equal((showcase.match(/Edit this scene/g) ?? []).length, 3)
  for (const href of ['./app/video/minimax-h3', './pose-to-image']) {
    assert.ok(showcase.includes(`href="${href}"`), `${href} should have a next step`)
  }
})

test('video masonry keeps 10 short clips, 20 films, playable tiles and model-neutral scene notes', () => {
  const showcase = read('showcase.html')
  const section = showcase.match(/<section class="showcase-section showcase-section-alt" id="community-videos"[\s\S]*?<\/section>/)?.[0] ?? ''
  assert.match(showcase, /<meta name="referrer" content="no-referrer">/)
  const shortSection = section.split('<div class="community-video-grid community-video-grid--long">')[0]
  const shortCards = [...shortSection.matchAll(/<article class="community-video-card community-video-card--x(?: community-video-card--portrait)?" data-duration-seconds="([\d.]+)">([\s\S]*?)<\/article>/g)]
  assert.equal(shortCards.length, 10)
  const xIds = shortCards.map(([, duration, card]) => {
    assert.ok(Number(duration) > 0 && Number(duration) <= 15, 'X clips must be no longer than 15 seconds')
    const id = card.match(/data-x-post-url="https:\/\/x\.com\/[\w]+\/status\/(\d+)"/)?.[1]
    assert.ok(id, 'each X card needs an original post URL')
    assert.match(card, new RegExp(`href="https://x\\.com/[\\w]+/status/${id}"`))
    assert.match(card, /pbs\.twimg\.com\//)
    assert.match(card, /community-video-credit/)
    assert.match(card, /Inspired prompt · our interpretation/)
    assert.match(card, /data-copy-community-prompt/)
    return id
  })
  assert.equal(new Set(xIds).size, 10)
  assert.ok(section.indexOf('community-video-grid--short') < section.indexOf('community-video-grid--long'))
  assert.equal((section.match(/community-video-card--portrait/g) ?? []).length, 2)
  assert.match(section, /<h2 id="community-video-heading">Video Prompt Library<\/h2>/)
  assert.doesNotMatch(section.slice(0, section.indexOf('community-video-grid')), /YouTube|Seedance 2\.0|MiniMax H3|showcase-count/)
  assert.doesNotMatch(section, /More creator films/)
  const playerCode = read('main.js')
  for (const id of xIds) {
    assert.match(playerCode, new RegExp(`"${id}": "https://video\\.twimg\\.com/[^" ]+\\.mp4\\?tag=\\d+"`))
  }
  assert.match(playerCode, /video\.controls = true/)
  assert.match(playerCode, /video\.play\(\)/)
  assert.match(playerCode, /community-video-info-button/)
  assert.match(playerCode, /sceneDialog\.showModal\(\)/)
  assert.doesNotMatch(playerCode, /widgets\.createTweet|platform\.twitter\.com\/widgets\.js/)

  const cards = [...section.matchAll(/<article class="community-video-card">([\s\S]*?)<\/article>/g)].map(match => match[1])
  assert.equal(cards.length, 20)

  const ids = cards.map(card => {
    const videoId = card.match(/data-community-video-id="([\w-]{11})"/)?.[1]
    assert.ok(videoId, 'each card needs a creator video player')
    assert.match(card, new RegExp(`i\\.ytimg\\.com/vi/${videoId}/hqdefault\\.jpg`), 'each card shows the original video poster')
    assert.match(card, new RegExp(`youtube\\.com/watch\\?v=${videoId}`), 'each card links to the original upload')
    assert.match(card, /loading="lazy"/)
    assert.match(card, /community-video-credit/)
    assert.match(card, /Inspired prompt · our interpretation/)
    assert.match(card, /<p class="community-video-prompt">[^<]{80,}<\/p>/)
    assert.match(card, /data-copy-community-prompt/)
    return videoId
  })

  assert.equal(new Set(ids).size, 20)
  assert.match(showcase, /Inspired prompt · our interpretation/)
  assert.match(playerCode, /navigator\.clipboard\.writeText\(promptText\.textContent\)/)
  assert.match(read('main.js'), /youtube-nocookie\.com\/embed\/\$\{videoId\}/)
  assert.match(read('showcase.css'), /\.community-video-grid\{column-count:4/)
  assert.match(read('showcase.css'), /\.community-video-body\{position:absolute/)
})

test('remaining Coming Soon resources are real noindex routes with explicit Worker coverage', () => {
  const routes = [
    ['src/routes/prompt-guide.tsx', '/prompt-guide'],
    ['src/routes/prompts/gpt-image-2/images.tsx', '/prompts/gpt-image-2/images'],
  ]
  const sitemap = read('sitemap.xml')
  const config = JSON.parse(read('wrangler.jsonc'))
  const routePatterns = config.routes.map(route => route.pattern)

  for (const [sourceFile, path] of routes) {
    const source = read(sourceFile)
    assert.match(source, /noindex,follow/)
    assert.match(source, /ComingSoonPage/)
    assert.ok(!sitemap.includes(`https://seedance3-pro.com${path}<`), `${path} should stay out of the sitemap`)
  }
  assert.ok(routePatterns.includes('seedance3-pro.com/prompt-guide'))
  assert.ok(routePatterns.includes('seedance3-pro.com/prompts/*'))
  assert.ok(config.assets.run_worker_first.includes('/prompt-guide'))
  assert.ok(config.assets.run_worker_first.includes('/prompts/*'))

  const component = read('src/components/coming-soon-page.tsx')
  assert.match(component, /Coming soon/i)
  assert.match(component, /href="\/app\/video\/minimax-h3"/)
  assert.match(component, /href="\/app\/image\/gpt-image-2"/)
})

test('five original H3 videos have linked, indexable cases with their submitted prompts', () => {
  const manifest = JSON.parse(read('media/showcase-h3/2026-09-25/generation.json'))
  const cases = read('src/data/h3-video-cases.ts')
  const showcase = read('showcase.html')
  const sitemap = read('sitemap.xml')
  const detailRoute = read('src/routes/prompts/minimax-h3/videos_.$slug.tsx')
  const indexRoute = read('src/routes/prompts/minimax-h3/videos.tsx')
  assert.match(indexRoute, /index,follow/)
  assert.match(detailRoute, /index,follow/)
  assert.match(detailRoute, /rel: 'canonical'/)
  assert.match(read('src/components/h3-video-case-page.tsx'), /application\/ld\+json/)
  assert.equal(Object.keys(manifest.scenes).length, 5)
  for (const [slug, scene] of Object.entries(manifest.scenes)) {
    const path = '/prompts/minimax-h3/videos/' + slug
    assert.ok(sitemap.includes('<loc>https://seedance3-pro.com' + path + '</loc>'), slug + ' needs a sitemap entry')
    assert.ok(showcase.includes('href=".' + path + '"'), slug + ' needs a Showcase link')
    assert.ok(cases.includes(scene.prompt), slug + ' must keep the exact submitted prompt')
    assert.ok(cases.includes(scene.title), slug + ' must keep the original title')
    assert.ok(existsSync(resolve(root, scene.file)), slug + ' video must exist')
    assert.ok(existsSync(resolve(root, scene.file.replace(/\.mp4$/, '.jpg'))), slug + ' poster must exist')
  }
})
