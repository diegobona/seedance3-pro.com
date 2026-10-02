import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { localizedPath } from '../app/site-locale.mjs'

const ORIGIN = 'https://seedance3-pro.com'
export function bilingualSitemap(xml) {
  const englishBlocks = (xml.match(/<url>[\s\S]*?<\/url>/g) || []).filter(block => {
    const loc = block.match(/<loc>([^<]+)<\/loc>/)?.[1]
    return loc && !new URL(loc).pathname.startsWith('/zh/')
  })
  const blocks = []
  const seen = new Set()
  for (const block of englishBlocks) {
    const loc = block.match(/<loc>([^<]+)<\/loc>/)[1]
    if (seen.has(loc)) continue
    seen.add(loc)
    const path = new URL(loc).pathname
    const zhUrl = ORIGIN + localizedPath(path, 'zh')
    const clean = block.replace(/\s*<xhtml:link\b[^>]*\/>/g, '').replace(/\s*<\/url>$/, '</url>')
    const alternates = `\n    <xhtml:link rel="alternate" hreflang="en" href="${loc}"/>\n    <xhtml:link rel="alternate" hreflang="zh-Hans" href="${zhUrl}"/>\n    <xhtml:link rel="alternate" hreflang="x-default" href="${loc}"/>\n  `
    blocks.push(clean.replace('</url>', alternates + '</url>'))
    blocks.push(clean.replace(`<loc>${loc}</loc>`, `<loc>${zhUrl}</loc>`).replace('</url>', alternates + '</url>'))
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n  ${blocks.join('\n  ')}\n</urlset>\n`
}

export async function updateBilingualSitemap(rootDirectory) {
  const filename = resolve(rootDirectory, 'sitemap.xml')
  await writeFile(filename, bilingualSitemap(await readFile(filename, 'utf8')), 'utf8')
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await updateBilingualSitemap(resolve(import.meta.dirname, '..'))
}
