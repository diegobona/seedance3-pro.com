import { chinaDate, NEWS_SOURCES } from './seedance-news'
import type { NewsState } from './seedance-news'

type Locale = 'en' | 'zh'
const faqAnswers = {
  en: [
    'Official Seedance 3.0 announcements or model listings are available in the updates above. Check the original sources for release timing. A mention or model listing alone does not establish a launch date.',
    'Check the linked official updates for free access and trial terms. Free credits for other models or platforms do not establish a Seedance 3.0 offer.',
    'Check the linked official updates for Seedance 3.0 subscription and API prices. Prices for existing tools do not establish what 3.0 will cost.',
    'Seedance 2.5’s official documentation covers 30-second generation, multimodal references, and editing. Check the linked Seedance 3.0 sources for comparable specifications. A model listing alone does not support a quality, speed, or cost ranking.',
  ],
  zh: [
    '上方已列出官方页面中的 Seedance 3.0 公告或模型目录记录。具体发布时间请查看原文，提及模型或将其列入目录，并不等于确认上线日期。',
    '免费方案和试用条件请查看已列出的官方消息原文。其他模型或平台的免费额度，不能视为 Seedance 3.0 的优惠政策。',
    'Seedance 3.0 的订阅和 API 价格请查看已列出的官方消息原文。现有工具的价格不能当作 3.0 的定价。',
    'Seedance 2.5 的官方文档已公布 30 秒生成、多模态参考和编辑能力。Seedance 3.0 的对应规格请查看已列出的官方资料，仅凭模型目录记录不能判断它在画质、速度或成本上是否更有优势。',
  ],
}
const homeQuestions = {
  en: ['Will Seedance 3.0 be free?', 'How much will Seedance 3.0 cost?'],
  zh: ['Seedance 3.0 会免费吗？', 'Seedance 3.0 多少钱？'],
}
const homeLinks = {
  en: ['Check Seedance 3.0 release updates', 'View Seedance 3.0 pricing updates'],
  zh: ['查看 Seedance 3.0 发布动态', '查看 Seedance 3.0 价格动态'],
}
function escape(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;')
}
function checkTime(value: string) {
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value))
  return `${chinaDate(value)} ${time}`
}
export function newsDocument(pathname: string) {
  return ['/', '/index.html', '/zh/', '/zh/index.html', '/seedance-3-0-release-date', '/seedance-3-0-release-date.html', '/zh/seedance-3-0-release-date', '/zh/seedance-3-0-release-date.html', '/sitemap.xml'].includes(pathname)
}
export function newsPageRequest(request: Request) {
  if (request.method !== 'GET' || !newsDocument(new URL(request.url).pathname)) return request
  // Origin validators describe the static template, not the composed document with live news.
  const headers = new Headers(request.headers)
  for (const header of ['if-none-match', 'if-modified-since', 'range', 'if-range']) headers.delete(header)
  return new Request(request, { headers })
}
export function renderNewsSection(state: NewsState, locale: Locale) {
  const zh = locale === 'zh'
  const checked = `${zh ? '最近检查（北京时间）' : 'Last checked (Beijing time)'}: <time datetime="${escape(state.lastCheckedAt)}">${checkTime(state.lastCheckedAt)}</time>`
  const complete = state.sources.every(source => source.ok)
  const status = !complete
    ? (zh ? '本次检查未完成，部分官方来源暂时无法检查。以下保留已保存的消息。' : 'This inspection is incomplete: some official sources could not be checked. Saved updates remain below.')
    : state.items.length ? ''
    : (zh ? '本次检查的官方页面中未发现 Seedance 3.0 相关消息。这只代表下方来源的检查结果。' : 'No Seedance 3.0 updates were found in the official pages inspected. This result applies to the sources listed below.')
  const sourceLinks = NEWS_SOURCES.map(url => {
    const language = url.includes('/zh/') ? (zh ? '中文' : 'Chinese') : (zh ? '英文' : 'English')
    const label = url.includes('blog_list') ? (zh ? '官方视觉博客' : 'Official visual blog') : (zh ? '官方模型目录' : 'Official model catalog')
    return `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}${zh ? `（${language}）` : ` (${language})`}</a>`
  }).join(' · ')
  const sources = `<p>${zh ? '检查来源' : 'Sources checked'}: ${sourceLinks}</p>`
  const entries = state.items.map(item => {
    const lang = item.title[locale] && item.url[locale] ? locale : item.title.en ? 'en' : 'zh'
    const title = item.title[lang]!
    const url = item.url[lang]!
    const tag = item.kind === 'model-listing' ? (zh ? '官方目录记录' : 'Official model listing') : (zh ? '官方公告' : 'Official announcement')
    const date = item.publishedDate
      ? `${zh ? '原文发布日期' : 'Source publication date'}: <time datetime="${item.publishedDate}">${item.publishedDate}</time>`
      : `${zh ? '首次发现（非发布日期）' : 'First seen (not a publication date)'}: <time datetime="${item.firstSeenAt}">${chinaDate(item.firstSeenAt)}</time>`
    const originalLanguage = lang !== locale ? (zh ? '（英文原文）' : ' (Chinese original)') : ''
    return `<li><p><span class="tag lime">${tag}</span> ${date}<br><a href="${escape(url)}" lang="${lang}" target="_blank" rel="noopener noreferrer">${escape(title)}</a>${originalLanguage}</p></li>`
  }).join('')
  return `<p>${checked}</p>${status ? `<p>${status}</p>` : ''}${entries ? `<ul>${entries}</ul>` : ''}${sources}`
}

function rewriteSchema(raw: string, state: NewsState, locale: Locale, article: boolean) {
  try {
    const data = JSON.parse(raw)
    for (const entry of data['@graph'] ?? []) {
      if (state.lastChangedAt && ['Article', 'WebPage'].includes(entry['@type'])) {
        const date = chinaDate(state.lastChangedAt)
        entry.dateModified = typeof entry.dateModified === 'string' && entry.dateModified > date ? entry.dateModified : date
      }
      if (entry['@type'] === 'FAQPage' && state.items.length) {
        entry.mainEntity?.forEach((question: { name: string; acceptedAnswer: { text: string } }, index: number) => {
          if (article && index < faqAnswers[locale].length) question.acceptedAnswer.text = faqAnswers[locale][index]
          else if (!article) {
            const i = homeQuestions[locale].indexOf(question.name)
            if (i >= 0) question.acceptedAnswer.text = `${faqAnswers[locale][i + 1]} ${homeLinks[locale][i]}`
          }
        })
      }
    }
    return JSON.stringify(data).replaceAll('<', '\\u003c')
  } catch { return raw }
}

export function rewriteNewsResponse(request: Request, response: Response, state: NewsState | null): Response {
  const pathname = new URL(request.url).pathname
  if (!state || request.method !== 'GET' || !newsDocument(pathname) || response.status !== 200) return response
  const type = response.headers.get('content-type') ?? ''
  const zh = pathname.startsWith('/zh/')
  const locale = zh ? 'zh' : 'en'
  const article = pathname.includes('seedance-3-0-release-date')
  const headers = new Headers(response.headers)
  headers.delete('content-length')
  headers.delete('etag')
  headers.delete('last-modified')
  const fresh = new Response(response.body, { status: response.status, statusText: response.statusText, headers })
  if (pathname === '/sitemap.xml' && /xml/i.test(type) && state.lastChangedAt) {
    let location = ''
    let originalDate = ''
    const date = chinaDate(state.lastChangedAt)
    return new HTMLRewriter()
      .on('url', { element() { location = ''; originalDate = '' } })
      .on('url loc', { text(chunk) { location += chunk.text } })
      .on('url lastmod', { text(chunk) {
        let path: string
        try { path = new URL(location.trim()).pathname } catch { return }
        if (!newsDocument(path) || path === '/sitemap.xml') return
        originalDate += chunk.text
        chunk.replace(chunk.lastInTextNode ? (originalDate.trim() > date ? originalDate.trim() : date) : '')
      } }).transform(fresh)
  }
  if (!type.includes('text/html')) return response
  const rewriter = new HTMLRewriter().on('#seedance-news', {
    element(element) { element.setInnerContent(renderNewsSection(state, locale), { html: true }) },
  })
  // Repeated successful inspections update only the check time; article dates require changed news.
  let schemaText = ''
  let displayDate: string | null = null
  rewriter.on('script[type="application/ld+json"]', {
    element() { schemaText = '' },
    text(chunk) {
      schemaText += chunk.text
      if (!chunk.lastInTextNode) { chunk.replace(''); return }
      const rewritten = rewriteSchema(schemaText, state, locale, article)
      if (article && state.lastChangedAt) {
        try { displayDate = JSON.parse(rewritten)['@graph']?.find((entry: { '@type': string }) => entry['@type'] === 'Article')?.dateModified ?? null }
        catch { displayDate = null }
      }
      chunk.replace(rewritten)
    },
  })
  rewriter.on('time[data-release-updated]', { element(element) {
    if (displayDate) element.setAttribute('datetime', displayDate).setInnerContent(displayDate)
  } })
  if (state.items.length) {
    const latestLink = `${zh ? '/zh' : ''}/seedance-3-0-release-date#latest-news`
    rewriter.on('#release-status', { element(element) {
      element.setInnerContent(zh
        ? `官方页面已有 Seedance 3.0 相关消息。<a href="${latestLink}">查看最新官方来源</a>（消息更新：${chinaDate(state.lastChangedAt ?? state.lastCheckedAt)}）。`
        : `Official pages include Seedance 3.0 updates. <a href="${latestLink}">View the latest official sources</a> (news updated: ${chinaDate(state.lastChangedAt ?? state.lastCheckedAt)}).`, { html: true })
    } })
    rewriter.on('.article-lead', { element(element) {
      element.setInnerContent(zh
        ? '官方页面已有 Seedance 3.0 相关消息，原文标题、来源和时间见下方“每日官方动态”。提及模型或将其列入目录，并不等于确认上线日期、价格或开放使用。'
        : 'Official pages include Seedance 3.0 updates. The original titles, sources, and dates are listed in the daily updates below. A mention or model listing alone does not establish a launch date, pricing, or availability.')
    } })
    rewriter.on('#seedance-comparison-note', { element(element) {
      element.setInnerContent(zh
        ? '<a href="https://seed.bytedance.com/en/seedance2_5" target="_blank" rel="noopener noreferrer">Seedance 2.5 官方页面</a>已公布相关能力，可作为对比依据。3.0 的对应信息请查看上方官方消息原文，目录记录或公告标题不能替代完整规格。'
        : 'The <a href="https://seed.bytedance.com/en/seedance2_5" target="_blank" rel="noopener noreferrer">official Seedance 2.5 page</a> documents its capabilities for comparison. Check the Seedance 3.0 sources above for corresponding details; a listing or announcement headline does not establish complete specifications.', { html: true })
    } })
    rewriter.on('#seedance-comparison-plan', { element(element) {
      element.setInnerContent(zh
        ? '比较主体是否保持一致、动作表现、参考控制、编辑能力、生成耗时和成本，需要使用相同任务与可核对的结果。请先核对上方官方资料中的规格与使用条件。'
        : 'Comparing subject consistency, motion, reference control, editing, generation time, and cost requires matched tasks and verifiable results. Start with the specifications and access terms in the official sources above.')
    } })
    rewriter.on('#seedance-comparison-table caption', { element(element) {
      element.setInnerContent(zh ? 'Seedance 2.5 已公布的能力与 3.0 信息来源' : 'Seedance 2.5 documented capabilities and sources for 3.0 details')
    } })
    let comparisonHeader = 0, comparisonColumn = 0, comparisonRow = 0
    rewriter.on('#seedance-comparison-table thead th', { element(element) {
      if (comparisonHeader++ === 2) element.setInnerContent(zh ? 'Seedance 3.0：查看官方资料' : 'Seedance 3.0: consult official sources')
    } })
    rewriter.on('#seedance-comparison-table tbody tr', { element() { comparisonColumn = 0 } })
    rewriter.on('#seedance-comparison-table tbody td', { element(element) {
      if (comparisonColumn++ !== 1) return
      const fields = zh ? ['时长', '输入类型和参考限制', '编辑能力', '画质与速度', '价格与使用条件'] : ['duration', 'input types and reference limits', 'editing controls', 'quality and speed', 'pricing and access terms']
      const field = fields[comparisonRow++]
      if (field) element.setInnerContent(zh ? `${field}请查看上方官方消息原文，不根据目录记录或标题推测。` : `Check the official sources above for ${field}; these details are not inferred from a listing or headline.`)
    } })
    let faqIndex = 0
    rewriter.on(article ? '#release-faq-answers details p' : '#faq .faq-release-answer', { element(element) {
      const index = faqIndex++
      if (article && index < 4) element.setInnerContent(faqAnswers[locale][index])
      else if (!article && index >= 1 && index <= 2) element.setInnerContent(faqAnswers[locale][index])
    } })
  }
  return rewriter.transform(fresh)
}
