import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { saveChineseArticle, prepareBilingualPublication } from '../scripts/bilingual-publishing.mjs'
import { attachLanguageMetadata, collectTranslationSources, generateChineseSite } from '../scripts/generate-zh-site.mjs'
import { extractEditableArticleData, renderArticleDocument } from '../scripts/article-html.mjs'

test('local CMS saves authored Chinese content and maintains translated blog cards without an external service', async () => {
  const rootDirectory = await mkdtemp(resolve(tmpdir(), 'seedance-bilingual-'))
  try {
    await mkdir(resolve(rootDirectory, 'scripts/i18n'), { recursive: true })
    await writeFile(resolve(rootDirectory, 'scripts/i18n/zh-Hans.json'), JSON.stringify({ entries: [{ source: 'Existing', translation: '已有' }] }))
    await saveChineseArticle({ rootDirectory, article: {
      fileName: 'example.html', englishTitle: 'New article', chineseTitle: '新文章',
      englishExcerpt: 'How to create a video', chineseExcerpt: '如何创作视频', chineseHtml: '<h1>新文章</h1><p>完整中文正文。</p>',
    } })
    const overrides = JSON.parse(await readFile(resolve(rootDirectory, 'scripts/i18n/article-overrides.json')))
    const catalog = JSON.parse(await readFile(resolve(rootDirectory, 'scripts/i18n/zh-Hans.json')))
    assert.match(overrides['example.html'], /完整中文正文/)
    assert.equal(catalog.entries.find(entry => entry.source === 'New article').translation, '新文章')
    await saveChineseArticle({ rootDirectory, deleteFileName: 'example.html' })
    assert.deepEqual(JSON.parse(await readFile(resolve(rootDirectory, 'scripts/i18n/article-overrides.json'))), {})
  } finally { await rm(rootDirectory, { recursive: true, force: true }) }
})

test('authored Chinese edition survives publication, edit loading and a later local rebuild', async () => {
  const rootDirectory = await mkdtemp(resolve(tmpdir(), 'seedance-bilingual-publication-'))
  try {
    await mkdir(resolve(rootDirectory, 'scripts/i18n'), { recursive: true })
    await mkdir(resolve(rootDirectory, 'assets'), { recursive: true })
    const fileName = 'manual-edition.html'
    const englishArticle = { title: 'New article', excerpt: 'English description', category: 'Tutorial', canonical: 'https://seedance3-pro.com/manual-edition', content: '<p>English article body.</p>' }
    await writeFile(resolve(rootDirectory, fileName), attachLanguageMetadata(renderArticleDocument(englishArticle), '/manual-edition', 'en'))
    await writeFile(resolve(rootDirectory, 'blog.html'), attachLanguageMetadata('<!doctype html><html lang="en"><head><title>Blog</title></head><body><h2>New article</h2><p>English description</p></body></html>', '/blog', 'en'))
    await writeFile(resolve(rootDirectory, 'main.js'), '// Local fixture only.\n')
    await writeFile(resolve(rootDirectory, 'scripts/i18n/static-ui.zh-Hans.json'), '{}')
    await writeFile(resolve(rootDirectory, 'sitemap.xml'), '<urlset><url><loc>https://seedance3-pro.com/manual-edition</loc></url></urlset>')
    const sources = await collectTranslationSources({ rootDirectory })
    const entries = [...new Set(Object.values(sources).flat())].map(source => ({ source, translation: '本地翻译：' + source }))
    await writeFile(resolve(rootDirectory, 'scripts/i18n/zh-Hans.json'), JSON.stringify({ entries }))

    const article = {
      fileName, englishTitle: englishArticle.title, englishExcerpt: englishArticle.excerpt,
      chineseTitle: '手工中文标题', chineseExcerpt: '独立撰写的中文摘要',
      chineseHtml: renderArticleDocument({ ...englishArticle, title: '手工中文标题', excerpt: '独立撰写的中文摘要', content: '<p>这是手工撰写的完整中文正文。</p><pre><code>Keep this exact prompt.</code></pre>' }),
    }
    await prepareBilingualPublication({ rootDirectory, article })
    const loaded = extractEditableArticleData(await readFile(resolve(rootDirectory, 'zh', fileName), 'utf8'))
    assert.equal(loaded.title, article.chineseTitle)
    assert.equal(loaded.excerpt, article.chineseExcerpt)
    assert.match(loaded.content, /手工撰写的完整中文正文/)
    assert.match(loaded.content, /Keep this exact prompt\./)
    assert.match(await readFile(resolve(rootDirectory, 'zh/blog.html'), 'utf8'), /手工中文标题/)
    assert.match(await readFile(resolve(rootDirectory, 'sitemap.xml'), 'utf8'), /<loc>https:\/\/seedance3-pro\.com\/zh\/manual-edition<\/loc>/)

    article.chineseHtml = renderArticleDocument({ ...englishArticle, title: article.chineseTitle, excerpt: article.chineseExcerpt, content: '<p>编辑后保存的完整中文正文。</p>' })
    await prepareBilingualPublication({ rootDirectory, article })
    await generateChineseSite({ rootDirectory })
    const reloaded = extractEditableArticleData(await readFile(resolve(rootDirectory, 'zh', fileName), 'utf8'))
    assert.match(reloaded.content, /编辑后保存的完整中文正文/)
    assert.doesNotMatch(reloaded.content, /手工撰写的完整中文正文|English article body/)
    const overrides = JSON.parse(await readFile(resolve(rootDirectory, 'scripts/i18n/article-overrides.json'), 'utf8'))
    assert.equal(overrides[fileName], article.chineseHtml)
  } finally { await rm(rootDirectory, { recursive: true, force: true }) }
})
