import { localizedPath } from './site-locale.mjs';

export const SITE_OPERATOR = 'ColdStone Technology Co., Ltd.';
export const SUPPORT_EMAIL = 'zw83716@gmail.com';
export const POLICY_UPDATED_AT = '2026-10-21';

export const TRUST_LINKS = [
  { href: '/about', en: 'About & contact', zh: '关于与联系' },
  { href: '/refund-policy', en: 'Refund policy', zh: '退款政策' },
  { href: '/privacy', en: 'Privacy', zh: '隐私政策' },
  { href: '/terms', en: 'Terms of service', zh: '服务条款' },
];

export function renderTrustFooter(locale = 'en') {
  const zh = locale === 'zh';
  return `<div class="trust-footer" data-site-trust>
  <div class="trust-operator"><span>${zh ? '运营者' : 'Operated by'}: ${SITE_OPERATOR}</span><a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></div>
  <nav aria-label="${zh ? '服务与政策' : 'Service and policies'}">${TRUST_LINKS.map(link => `<a href="${localizedPath(link.href, locale)}">${zh ? link.zh : link.en}</a>`).join('')}</nav>
</div>`;
}

export function renderSupportContact(locale = 'en', popupId = 'purchase-support-email') {
  const zh = locale === 'zh';
  return `<button type="button" class="support-email-trigger" popovertarget="${popupId}">${zh ? '联系客服' : 'Contact support'}</button><span id="${popupId}" class="support-email-popover" popover="auto" role="dialog" aria-label="${zh ? '客服邮箱' : 'Support email'}"><strong>${zh ? '客服邮箱' : 'Support email'}</strong><span class="support-email-address">${SUPPORT_EMAIL}</span><button type="button" class="support-email-close" popovertarget="${popupId}" popovertargetaction="hide" aria-label="${zh ? '关闭邮箱窗口' : 'Close email window'}" autofocus>×</button></span>`;
}

export function renderPurchaseAssurance(locale = 'en', popupId = 'purchase-support-email') {
  const zh = locale === 'zh';
  return `<p class="purchase-assurance" data-purchase-assurance>${zh ? '一次性付款，无自动续费。未使用的整包购买积分可在购买后 7 天内申请退款。' : 'One-time payment, no auto-renewal. Request a refund within 7 days for a completely unused purchased pack.'} <a href="${localizedPath('/refund-policy', locale)}">${zh ? '退款条件' : 'Refund conditions'}</a> · <a href="${localizedPath('/terms', locale)}">${zh ? '服务条款' : 'Terms'}</a> · <a href="${localizedPath('/privacy', locale)}">${zh ? '隐私政策' : 'Privacy'}</a> · ${renderSupportContact(locale, popupId)}</p>`;
}

export function withSiteTrust(html, pathname = '/') {
  if (!/<footer\b/i.test(html)) return html;
  const locale = pathname === '/zh' || pathname.startsWith('/zh/') ? 'zh' : 'en';
  const footer = `<!-- SITE_TRUST_START -->\n${renderTrustFooter(locale)}\n<!-- SITE_TRUST_END -->\n`;
  let output = html.includes('<!-- SITE_TRUST_START -->')
    ? html.replace(/<!-- SITE_TRUST_START -->[\s\S]*?<!-- SITE_TRUST_END -->\n?/, footer)
    : html.replace(/<\/footer>/i, footer + '</footer>');
  output = output.replace(/href="\/assets\/site-trust\.css(?:\?[^\"]*)?"/g, 'href="/assets/site-trust.css?v=20261023-email"');
  if (!output.includes('href="/assets/site-trust.css')) {
    output = output.replace('</head>', '  <link rel="stylesheet" href="/assets/site-trust.css?v=20261023-email">\n</head>');
  }
  // Keep the single-pack pricing page compact; policies remain in its footer.
  if (/^\/(?:zh\/)?pricing(?:\.html)?\/?$/.test(pathname)) {
    return output.replace(/\s*<p\b[^>]*\bdata-purchase-assurance\b[^>]*>[\s\S]*?<\/p>/g, '');
  }
  const purchaseTarget = /(<a\b[^>]*\bdata-credit-pack-buy\b[^>]*>[\s\S]*?<\/a>|<button\b[^>]*\bdata-home-generate\b[^>]*>[\s\S]*?<\/button>)/;
  const target = output.match(purchaseTarget)?.[0];
  if (target) {
    const zh = locale === 'zh';
    const notice = target.includes('data-credit-pack-buy') ? renderPurchaseAssurance(locale)
      : `<p class="purchase-assurance" data-purchase-assurance>${zh ? '购买积分前可查看' : 'Before buying credits, review'} <a href="${localizedPath('/pricing', locale)}">${zh ? '积分价格' : 'pricing'}</a> · <a href="${localizedPath('/refund-policy', locale)}">${zh ? '退款政策' : 'refund policy'}</a> · <a href="${localizedPath('/privacy', locale)}">${zh ? '隐私政策' : 'privacy'}</a> · ${renderSupportContact(locale)}</p>`;
    output = output.includes('data-purchase-assurance')
      ? output.replace(/<p\b[^>]*\bdata-purchase-assurance\b[^>]*>[\s\S]*?<\/p>/, notice)
      : output.replace(purchaseTarget, matched => matched + '\n' + notice);
  }
  return output;
}
