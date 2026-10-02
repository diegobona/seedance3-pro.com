import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { generateChineseSite } from './generate-zh-site.mjs'
import { updateBilingualSitemap } from './bilingual-sitemap.mjs'

// Both editions are authored locally; drafts never go to a translation service.
export async function saveChineseArticle({ rootDirectory, article, deleteFileName }) {
  const overridesPath = resolve(rootDirectory, 'scripts/i18n/article-overrides.json')
  let overrides = {}
  try { overrides = JSON.parse(await readFile(overridesPath, 'utf8')) } catch (error) { if (error.code !== 'ENOENT') throw error }
  if (deleteFileName) delete overrides[deleteFileName]
  if (article) {
    overrides[article.fileName] = article.chineseHtml
    const catalogPath = resolve(rootDirectory, 'scripts/i18n/zh-Hans.json')
    const catalog = JSON.parse(await readFile(catalogPath, 'utf8'))
    for (const [source, translation] of [[article.englishTitle, article.chineseTitle], [article.englishExcerpt, article.chineseExcerpt]]) {
      if (!source) continue
      const normalized = source.replace(/\s+/g, ' ').trim()
      const entry = catalog.entries.find(item => item.source === normalized)
      if (entry) entry.translation = translation
      else catalog.entries.push({ source: normalized, translation })
    }
    await writeFile(catalogPath, JSON.stringify(catalog, null, 2) + '\n', 'utf8')
  }
  await writeFile(overridesPath, JSON.stringify(overrides, null, 2) + '\n', 'utf8')
}

export async function prepareBilingualPublication(options) {
  await saveChineseArticle(options)
  const result = await generateChineseSite({ rootDirectory: options.rootDirectory })
  await updateBilingualSitemap(options.rootDirectory)
  return result
}
