const resources = {
  home: ['/', 'Seedance home', 'Seedance 首页', 'Explore the tools, guides and official release tracker.', '浏览创作工具、使用指南和官方发布动态。'],
  release: ['/seedance-3-0-release-date', 'Seedance 3.0 release tracker', 'Seedance 3.0 发布跟踪', 'Review official sources and the latest completed source check.', '查看官方来源及最近一次完整核查的结果。'],
  pose: ['/pose-to-image', 'AI pose generator', 'AI 姿势生成器', 'Arrange a pose and camera view before preparing an image reference.', '先安排姿势和镜头视角，再准备图像参考。'],
  hub: ['/seedance-3-0', 'Seedance 3.0 resource hub', 'Seedance 3.0 资源中心', 'Find release updates, FAQs, prompt drafts and reference guides.', '集中查看发布动态、常见问题、提示词草稿和参考指南。'],
  faq: ['/faq', 'Seedance 3.0 FAQ', 'Seedance 3.0 常见问题', 'Read answers about release status, prompts and creative workflows.', '了解发布状态、提示词和创作流程方面的常见问题。'],
  blog: ['/blog', 'Seedance guides', 'Seedance 使用指南', 'Browse tutorials, workflow comparisons and prompt examples.', '浏览教程、工作流对比与提示词示例。'],
  examples: ['/pose-reference-camera-angle-examples', 'Pose reference and camera angle examples', '姿势参考与镜头角度示例', 'Compare reference views and image results for people, animals and props.', '对比人物、动物和道具的参考视角与图像结果。'],
  poseGuide: ['/how-to-control-character-poses-in-seedance-with-3d-pose-references', '3D pose reference guide', '3D 姿势参考指南', 'Follow the steps for posing, framing and capturing a reference.', '按步骤学习摆姿、构图和截取参考图。'],
  prompts: ['/precise-application-of-seedance-prompts', 'Seedance prompt examples', 'Seedance 提示词示例', 'Study scene descriptions, subject movement and camera instructions.', '学习场景描述、主体动作和镜头指令的写法。'],
  templates: ['/after-thorough-testing-the-conclusion-is-clear-seedance-2-0-s-universal-template-2', 'Seedance 2.0 prompt templates', 'Seedance 2.0 提示词模板', 'Adapt the prompt structure and camera examples to your scene.', '根据自己的场景调整提示词结构和镜头示例。'],
  tutorial: ['/seedance-2-0-complete-tutorial', 'Seedance 2.0 image-to-video tutorial', 'Seedance 2.0 图生视频教程', 'Review the earlier workflow for references, prompts and iteration.', '回顾旧版本中的参考素材、提示词和迭代流程。'],
  videoGuide: ['/seedance-2-5-image-to-video-guide', 'Seedance 2.5 image-to-video guide', 'Seedance 2.5 图生视频指南', 'Prepare a reference image and plan the action for a video shot.', '准备参考图，并规划视频镜头中的动作。'],
  comparison: ['/seedance-2-5-vs-minimax-h3-vs-kling-3-0-which-ai-video-model-is-best-in-2026-2', 'Seedance 2.5, MiniMax H3 and Kling 3.0 comparison', 'Seedance 2.5、MiniMax H3 与 Kling 3.0 对比', 'Compare the documented workflows and check each original source.', '对照已有工作流，并核对各模型的原始资料。'],
  kling: ['/seedance-vs-kling-3-comparison', 'Seedance and Kling 3.0 workflows', 'Seedance 与 Kling 3.0 工作流', 'Compare reference preparation, prompting and review steps.', '比较参考素材准备、提示词编写和结果检查步骤。'],
  pricing: ['/seedance-pricing-2026-all-plans-compared', 'Seedance pricing and credit guide', 'Seedance 价格与积分指南', 'Check the cost questions to resolve before choosing a service.', '了解选择服务前需要核对的费用问题。'],
  free: ['/how-to-use-seedance-for-free-in-2026-all-free-methods', 'Seedance free access and trial guide', 'Seedance 免费使用与试用指南', 'Review trial options and verify the current access terms.', '了解试用方式，并核对当前的使用条件。'],
  api: ['/how-to-use-the-seedance-api-complete-developer-guide-2026', 'Seedance API workflow guide', 'Seedance API 工作流指南', 'Plan authentication, media uploads, task polling and error handling.', '梳理认证、素材上传、任务轮询和错误处理。'],
  pro: ['/what-is-seedance-pro-features-pricing-how-to-get-started', 'Seedance Pro access guide', 'Seedance Pro 使用指南', 'Review access, pricing and workflow questions before getting started.', '开始使用前先了解访问方式、价格和工作流问题。'],
  lite: ['/seedance-lite-vs-pro-which-plan-should-you-choose', 'Seedance Lite and Pro workflow guide', 'Seedance Lite 与 Pro 工作流指南', 'Match a workflow to your production and review needs.', '根据创作与审核需求选择适合的工作流。'],
}

const selections = {
  '/': ['release', 'pose', 'hub'],
  '/seedance-3-0-release-date': ['home', 'pose', 'hub'],
  '/pose-to-image': ['home', 'release', 'examples'],
  '/seedance-3-0': ['release', 'pose', 'faq'],
  '/blog': ['hub', 'prompts', 'pose'],
  '/faq': ['release', 'pose', 'hub'],
  '/pose-reference-camera-angle-examples': ['pose', 'poseGuide', 'release'],
  '/how-to-control-character-poses-in-seedance-with-3d-pose-references': ['pose', 'examples', 'prompts'],
  '/precise-application-of-seedance-prompts': ['templates', 'videoGuide', 'examples'],
  '/after-thorough-testing-the-conclusion-is-clear-seedance-2-0-s-universal-template-2': ['prompts', 'poseGuide', 'videoGuide'],
  '/seedance-2-0-complete-tutorial': ['videoGuide', 'poseGuide', 'prompts'],
  '/seedance-2-5-image-to-video-guide': ['poseGuide', 'prompts', 'comparison'],
  '/seedance-2-5-vs-minimax-h3-vs-kling-3-0-which-ai-video-model-is-best-in-2026-2': ['release', 'pricing', 'kling'],
  '/minimax-h3-vs-seedance-3': ['release', 'comparison', 'pricing'],
  '/seedance-pricing-2026-all-plans-compared': ['free', 'lite', 'release'],
  '/how-to-use-seedance-for-free-in-2026-all-free-methods': ['pricing', 'api', 'release'],
  '/how-to-use-the-seedance-api-complete-developer-guide-2026': ['pricing', 'videoGuide', 'release'],
  '/seedance-lite-vs-pro-which-plan-should-you-choose': ['pricing', 'pro', 'free'],
  '/seedance-tiktok-ad-video-guide': ['prompts', 'videoGuide', 'examples'],
  '/seedance-vs-kling-3-comparison': ['comparison', 'videoGuide', 'prompts'],
  '/what-is-seedance-pro-features-pricing-how-to-get-started': ['pricing', 'lite', 'release'],
}

function pagePath(value) {
  const pathname = new URL(value || '/', 'https://seedance3-pro.com').pathname
  return pathname.replace(/^\/zh(?=\/|$)/, '').replace(/\/index\.html$/, '/').replace(/\.html$/, '') || '/'
}

function escape(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
}

export function relatedReadingTranslations() {
  return [['Related reading', '相关阅读'], ...Object.values(resources).flatMap(([, en, zh, description, translation]) => [[en, zh], [description, translation]])]
}

export function renderRelatedReading({ pathname = '/', locale = 'en' } = {}) {
  const current = pagePath(pathname)
  const keys = [...new Set([...(selections[current] || []), 'hub', 'prompts', 'blog'])]
    .filter(key => resources[key][0] !== current).slice(0, 3)
  const heading = locale === 'zh' ? '相关阅读' : 'Related reading'
  const cards = keys.map(key => {
    const [url, en, zh, description, translation] = resources[key]
    const href = locale === 'zh' ? `/zh${url}` : url
    const poseEntry = ['pose', 'poseGuide', 'examples'].includes(key) ? ' data-pose-entry' : ''
    return `        <a class="card related-reading-card" href="${href}"${poseEntry}><h3>${escape(locale === 'zh' ? zh : en)}</h3><p>${escape(locale === 'zh' ? translation : description)}</p><span aria-hidden="true">→</span></a>`
  }).join('\n')
  return `  <!-- RELATED_READING_START -->
  <section class="related-reading" id="related-reading" aria-labelledby="related-reading-title">
    <div class="container">
      <h2 id="related-reading-title">${heading}</h2>
      <div class="related-reading-grid">
${cards}
      </div>
    </div>
  </section>
  <!-- RELATED_READING_END -->`
}

export function withRelatedReading(html, { pathname = '/', locale = 'en' } = {}) {
  if (!/<main\b/i.test(html) || /<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html)
    || /http-equiv=["']refresh["']/i.test(html)) return html
  const current = pagePath(pathname)
  if (!['/', '/blog', '/faq', '/seedance-3-0', '/pose-to-image'].includes(current)
    && !/<meta\b[^>]*property=["']og:type["'][^>]*content=["']article["']/i.test(html)
    && !/"@type"\s*:\s*"Article"/.test(html)) return html
  const clean = html.replace(/[ \t]*<!-- RELATED_READING_START -->[\s\S]*?<!-- RELATED_READING_END -->\r?\n?/g, '')
  return clean.replace(/\s*<\/main>/i, `\n${renderRelatedReading({ pathname: current, locale })}\n  </main>`)
}
