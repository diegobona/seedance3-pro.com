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
    ['src/routes/seedance-3-0-prompts.tsx', '/seedance-3-0-prompts'],
  ]
  const sitemap = read('sitemap.xml')
  const config = JSON.parse(read('wrangler.jsonc'))
  const routePatterns = config.routes.map(route => route.pattern)

  for (const [sourceFile, path] of routes) {
    const source = read(sourceFile)
    assert.match(source, /noindex,follow/)
    assert.match(source, /ComingSoonPage|StudioShowcasePage/)
    assert.ok(!sitemap.includes(`https://seedance3-pro.com${path}<`), `${path} should stay out of the sitemap`)
  }
  assert.ok(routePatterns.includes('seedance3-pro.com/prompt-guide'))
  assert.ok(routePatterns.includes('seedance3-pro.com/prompts/*'))
  assert.ok(config.assets.run_worker_first.includes('/prompt-guide'))
  assert.ok(config.assets.run_worker_first.includes('/prompts/*'))
  for (const path of ['/minimax-h3-prompts', '/gpt-image-2-prompts', '/seedance-3-0-prompts']) {
    assert.ok(routePatterns.includes(`seedance3-pro.com${path}`))
    assert.ok(routePatterns.includes(`www.seedance3-pro.com${path}`))
    assert.ok(config.assets.run_worker_first.includes(path))
  }

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
  const detailRoute = read('src/routes/minimax-h3-prompts_.$slug.tsx')
  const indexRoute = read('src/routes/minimax-h3-prompts.tsx')
  const previewCode = read('main.js')
  const originalCards = [...showcase.matchAll(/<a class="community-video-card community-video-card--original[^"]*" href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)]
  assert.match(indexRoute, /index,follow/)
  assert.match(detailRoute, /index,follow/)
  assert.match(detailRoute, /rel: 'canonical'/)
  assert.match(read('src/components/h3-video-case-page.tsx'), /application\/ld\+json/)
  assert.match(indexRoute, /StudioShowcasePage/)
  const showcasePage = read('src/components/studio-showcase-page.tsx')
  assert.match(showcasePage, /studio-shell studio-showcase-shell/)
  assert.match(showcasePage, /workspace-header/)
  assert.match(showcasePage, /H3ShowcaseGrid/)
  assert.match(showcasePage, /FutureShowcase/)
  assert.equal(Object.keys(manifest.scenes).length, 5)
  assert.equal(originalCards.length, 5)
  assert.match(previewCode, /new IntersectionObserver\(\(entries\)/)
  assert.match(previewCode, /video\.play\(\)/)
  assert.match(previewCode, /video\.pause\(\)/)
  for (const [slug, scene] of Object.entries(manifest.scenes)) {
    const path = '/minimax-h3-prompts/' + slug
    const card = originalCards.find(([_, href]) => href === '.' + path)?.[2]
    assert.ok(sitemap.includes('<loc>https://seedance3-pro.com' + path + '</loc>'), slug + ' needs a sitemap entry')
    assert.ok(!sitemap.includes('<loc>https://seedance3-pro.com/prompts/minimax-h3/videos/' + slug + '</loc>'), slug + ' old URL should leave the sitemap')
    assert.ok(card, slug + ' needs a clickable Showcase card')
    assert.match(card, /<video class="community-video-preview" muted loop playsinline preload="none"/)
    assert.ok(card.includes('data-preview-src="./' + scene.file + '"'), slug + ' needs its original video preview')
    assert.ok(cases.includes(scene.prompt), slug + ' must keep the exact submitted prompt')
    assert.ok(cases.includes(scene.title), slug + ' must keep the original title')
    assert.ok(existsSync(resolve(root, scene.file)), slug + ' video must exist')
    assert.ok(existsSync(resolve(root, scene.file.replace(/\.mp4$/, '.jpg'))), slug + ' poster must exist')
  }
})

test('five original GPT Image 2 images have published prompts and working case routes', () => {
  const cases = JSON.parse(read('src/data/gpt-image-cases.json'))
  const sitemap = read('sitemap.xml')
  const indexRoute = read('src/routes/gpt-image-2-prompts.tsx')
  const detailRoute = read('src/routes/gpt-image-2-prompts_.$slug.tsx')
  const showcase = read('src/components/studio-showcase-page.tsx')
  const studio = read('app/studio.js')
  const config = JSON.parse(read('wrangler.jsonc'))

  assert.equal(cases.length, 5)
  assert.equal(new Set(cases.map((entry) => entry.slug)).size, 5)
  assert.equal(new Set(cases.map((entry) => entry.style)).size, 5)
  assert.match(indexRoute, /index,follow/)
  assert.match(detailRoute, /index,follow/)
  assert.match(detailRoute, /rel: 'canonical'/)
  assert.match(showcase, /GptImageShowcaseGrid/)
  assert.match(showcase, /gptImageCaseTryUrl/)
  assert.match(studio, /imageAspectRatio\.value = aspectRatio/)
  assert.match(read('src/components/gpt-image-case-page.tsx'), /application\/ld\+json/)
  assert.ok(config.routes.some((route) => route.pattern === 'seedance3-pro.com/gpt-image-2-prompts/*'))
  assert.ok(config.assets.run_worker_first.includes('/gpt-image-2-prompts/*'))
  assert.ok(sitemap.includes('<loc>https://seedance3-pro.com/gpt-image-2-prompts</loc>'))
  for (const imageCase of cases) {
    const imagePath = imageCase.imageUrl.slice(1)
    const originalPath = imagePath.replace(/\.webp$/, '.png')
    assert.ok(imageCase.prompt.length > 100, imageCase.slug + ' needs its actual prompt')
    assert.ok(existsSync(resolve(root, imagePath)), imageCase.slug + ' needs a served image')
    assert.ok(existsSync(resolve(root, originalPath)), imageCase.slug + ' needs the original API result')
    assert.ok(sitemap.includes('<loc>https://seedance3-pro.com/gpt-image-2-prompts/' + imageCase.slug + '</loc>'))
  }
  assert.match(cases[0].creativeNote, /fictional|satire/i)
})

test('model sidebar links all three prompt libraries while homepage Showcase keeps its current destination', () => {
  const sidebar = read('src/routes/app.tsx')
  const homepage = read('index.html')
  for (const [label, path] of [
    ['MiniMax H3 Prompt Library', '/minimax-h3-prompts'],
    ['GPT Image 2 Prompt Library', '/gpt-image-2-prompts'],
    ['Seedance 3.0 Prompt Library', '/seedance-3-0-prompts'],
  ]) {
    assert.ok(sidebar.includes(`href="${path}"`))
    assert.ok(sidebar.includes(label))
  }
  assert.match(homepage, /<a href="\.\/showcase\.html">Showcase<\/a>/)
  const server = read('src/server.ts')
  assert.match(server, /'\/prompts\/minimax-h3\/videos': '\/minimax-h3-prompts'/)
  assert.match(server, /'\/prompts\/gpt-image-2\/images': '\/gpt-image-2-prompts'/)
  assert.match(server, /legacyH3VideoCasePrefix/)
  assert.match(server, /\/minimax-h3-prompts\/\$\{slug\}/)
  const config = JSON.parse(read('wrangler.jsonc'))
  assert.ok(config.routes.some(route => route.pattern === 'seedance3-pro.com/minimax-h3-prompts/*'))
  assert.ok(config.assets.run_worker_first.includes('/minimax-h3-prompts/*'))
})
