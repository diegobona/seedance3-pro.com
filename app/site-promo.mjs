import { localizedPath } from './site-locale.mjs';

export const SITE_PROMO_VERSION = '20261106-video-rate';

export function renderSitePromo(locale = 'en') {
  const zh = locale === 'zh';
  const slides = zh ? [
    ['无需登录即可免费使用', '立即创建您的第一段视频', '免费开始'],
    ['AI 视频', 'US$0.01/秒', '立即尝试'],
  ] : [
    ['No login needed', 'Create your first video for free', 'Start for free'],
    ['AI video', 'US$0.01/second', 'Try now'],
  ];
  return `<aside class="site-promo" aria-label="${zh ? '视频创作优惠' : 'Video creation offers'}" aria-roledescription="${zh ? '轮播' : 'carousel'}" data-site-promo>
  <div class="site-promo-inner">
    <svg class="site-promo-sparkle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 3 2.2 6.8L21 12l-6.8 2.2L12 21l-2.2-6.8L3 12l6.8-2.2L12 3Z"/><path d="M20 2v4m-2-2h4"/></svg>
    <div class="site-promo-track" aria-live="off">${slides.map(([lead, detail, action], index) => `
      <div class="site-promo-slide" data-promo-slide="${index}" role="group" aria-label="${index + 1} / 2"${index ? ' hidden' : ''}>
        <p class="site-promo-copy"><strong>${lead}</strong><span> — ${detail}</span></p>
        <a class="site-promo-action" href="${localizedPath('/app/video/seedance-2-5', locale)}">${action}<span aria-hidden="true">↗</span></a>
      </div>`).join('')}
    </div>
    <div class="site-promo-dots" role="group" aria-label="${zh ? '选择横幅' : 'Choose an offer'}">${slides.map((_, index) => `<button type="button" data-promo-dot="${index}" aria-label="${zh ? `显示第 ${index + 1} 条` : `Show offer ${index + 1}`}" aria-pressed="${index === 0}"><span></span></button>`).join('')}</div>
  </div>
  <button class="site-promo-close" type="button" data-promo-close aria-label="${zh ? '关闭横幅' : 'Dismiss banner'}">×</button>
</aside>`;
}

export function withSitePromo(html, pathname = '/') {
  const locale = pathname === '/zh' || pathname.startsWith('/zh/') ? 'zh' : 'en';
  let output = html.replace(/\s*<!-- SITE_PROMO_START -->[\s\S]*?<!-- SITE_PROMO_END -->\n?/g, '');
  output = output.replace(/(<body\b[^>]*>)/i, (_, body) => `${body}\n<!-- SITE_PROMO_START -->\n${renderSitePromo(locale)}\n<!-- SITE_PROMO_END -->\n`);
  output = output.replace(/[ \t]*<link\b[^>]*href="\/assets\/site-promo\.css[^\"]*"[^>]*>\r?\n?/g, '');
  output = output.replace(/[ \t]*<script\b[^>]*src="\/assets\/site-promo-init\.mjs[^\"]*"[^>]*><\/script>\r?\n?/g, '');
  output = output.replace('</head>', `  <link rel="stylesheet" href="/assets/site-promo.css?v=${SITE_PROMO_VERSION}">\n  <script type="module" src="/assets/site-promo-init.mjs?v=${SITE_PROMO_VERSION}"></script>\n</head>`);
  return output;
}
