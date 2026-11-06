import { localizedPath, languageSwitchPath, stripLocalePath } from './site-locale.mjs';
import { withSiteTrust } from './site-trust.mjs';
import { withModelDisplayNames } from './model-display-names.mjs';
import { withPublicModelPaths } from './public-model-paths.mjs';
import { withSiteTypography } from './site-typography.mjs';
import { withSitePromo } from './site-promo.mjs';

export const PUBLIC_NAVIGATION = [
  { href: '/app/video/seedance-2-5', en: 'AI Video', zh: 'AI Video' },
  { href: '/app/image/gpt-image-2-5-1k', en: 'AI Image', zh: 'AI Image' },
  { href: '/pricing', en: 'Pricing', zh: '价格' },
  { href: '/seedance-3-0-release-date', en: 'Release Date', zh: '发布时间' },
  { href: '/showcase', en: 'Showcase', zh: '作品展示' },
  { href: '/blog', en: 'Blog', zh: '博客' },
];

export function renderSiteHeader({ pathname = '/', locale = 'en' } = {}) {
  const zh = locale === 'zh';
  const home = stripLocalePath(pathname) === '/';
  const links = PUBLIC_NAVIGATION.map((item, index) => {
    const handoff = home && index === 0;
    const href = localizedPath(item.href, locale) + (handoff ? '?from=home' : '');
    return `<a${index > 1 ? ' class="home-extra-nav"' : ''} href="${href}"${handoff ? ' data-video-workbench' : ''}${stripLocalePath(pathname) === item.href ? ' aria-current="page"' : ''}>${zh ? item.zh : item.en}</a>`;
  }).join('');
  return `<header class="site-header" data-site-header>
    <div class="container inner">
      <a class="brand" href="${localizedPath('/', locale)}" aria-label="${zh ? 'SEEDANCE 3.0 首页' : 'SEEDANCE 3.0 home'}"><img class="brand-mark" src="/assets/seedance-mark.svg" width="40" height="40" alt=""><span>SEEDANCE 3.0</span></a>
      <nav class="desktop-nav compact-nav" aria-label="${zh ? '主导航' : 'Primary navigation'}">${links}</nav>
      <div class="header-actions">
        <nav class="site-language-switch" data-site-language-switch aria-label="${zh ? '网站语言' : 'Site language'}"><a href="${languageSwitchPath(pathname, 'zh')}" data-language="zh" lang="zh-Hans"${zh ? ' aria-current="true"' : ''}>中文</a><span aria-hidden="true">|</span><a href="${languageSwitchPath(pathname, 'en')}" data-language="en" lang="en"${zh ? '' : ' aria-current="true"'}>EN</a></nav>
        <a class="button small"${home?' data-home-primary':''} href="${home ? '#create' : localizedPath('/', locale) + '#create'}">${zh ? '免费试用' : 'Try for free'}</a>
        <div class="site-account" data-site-account><a class="site-account-login" data-account-login href="${localizedPath('/app', locale)}?auth=login">${zh ? '登录' : 'Log in'}</a></div>
        <button class="menu-button" type="button" aria-label="${zh ? '打开导航' : 'Open navigation'}" aria-controls="mobile-navigation" aria-expanded="false">☰</button>
      </div>
    </div>
    <nav class="mobile-nav" id="mobile-navigation" aria-label="${zh ? '移动端导航' : 'Mobile navigation'}">${links}</nav>
  </header>`;
}

export function withSiteNavigation(html, pathname = '/') {
  html = withPublicModelPaths(withModelDisplayNames(html)).replace(/<nav\b[^>]*class="[^\"]*\bfooter-(?:model|credit)-links\b[^\"]*"[^>]*>[\s\S]*?<\/nav>\s*/gi, '');
  if (!/<header\b[^>]*class="site-header"/.test(html)) return withSitePromo(withSiteTypography(withSiteTrust(html, pathname)), pathname);
  const locale = pathname.startsWith('/zh/') || pathname === '/zh' ? 'zh' : 'en';
  let output = html.replace(/<header\b[^>]*class="site-header"[^>]*>[\s\S]*?<\/header>/, renderSiteHeader({ pathname, locale }));
  output = output.replace(/href="\/assets\/site-navigation\.css(?:\?[^\"]*)?"/g, 'href="/assets/site-navigation.css?v=20261030-underline"');
  if (!output.includes('href="/assets/site-navigation.css?')) {
    output = output.replace('</head>', '  <link rel="stylesheet" href="/assets/site-navigation.css?v=20261030-underline">\n</head>');
  }
  if (!output.includes('src="/assets/site-navigation.js"')) {
    output = output.replace('</head>', '  <script src="/assets/site-navigation.js" defer></script>\n</head>');
  }
  output=output.replace(/src="\/assets\/site-account\.mjs(?:\?[^\"]*)?"/g,'src="/assets/site-account.mjs?v=20261031-orders"');
  if (!output.includes('src="/assets/site-account.mjs?')) {
    output = output.replace('</head>', '  <script type="module" src="/assets/site-account.mjs?v=20261031-orders"></script>\n</head>');
  }
  return withSitePromo(withSiteTypography(withSiteTrust(output, pathname)), pathname);
}
