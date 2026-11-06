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

export function renderTrustFooter(locale = 'en', { compact = false, popupId = 'footer-contact' } = {}) {
  const zh = locale === 'zh';
  const links = [
    { href: '/privacy', label: zh ? '隐私政策' : 'Privacy' },
    { href: '/terms', label: zh ? '服务条款' : 'Terms' },
    { href: '/refund-policy', label: zh ? '退款政策' : 'Refund Policy' },
  ];
  return `<div class="trust-footer trust-footer-compact" data-site-trust>
  <span class="trust-copyright">© 2026 ${SITE_OPERATOR}</span>
  <nav aria-label="${zh ? '服务与政策' : 'Service and policies'}">${links.map(link => `<a href="${localizedPath(link.href, locale)}">${link.label}</a>`).join('<span aria-hidden="true">·</span>')}<span aria-hidden="true">·</span><button type="button" class="footer-contact-trigger" popovertarget="${popupId}">${zh ? '联系我们' : 'Contact'}</button></nav>
  <div id="${popupId}" class="footer-contact-popover" popover="auto" role="dialog" aria-label="${zh ? '联系我们' : 'Contact us'}">
    <button type="button" class="footer-contact-close" popovertarget="${popupId}" popovertargetaction="hide" aria-label="${zh ? '关闭' : 'Close'}">×</button>
    <h2>${zh ? '联系我们' : 'Contact us'}</h2>
    <p>${zh ? '有使用或订单问题，请通过邮箱联系我们。' : 'For help with the service or an order, email us.'}</p>
    <div class="footer-contact-email"><span>${SUPPORT_EMAIL}</span><button type="button" data-copy-contact="${SUPPORT_EMAIL}" data-copied="${zh ? '已复制' : 'Copied'}" data-copy-failed="${zh ? '复制失败，请选中邮箱手动复制。' : 'Could not copy. Select the email address to copy it manually.'}">${zh ? '复制邮箱' : 'Copy email'}</button></div>
    <div class="footer-contact-status" role="status" aria-live="polite"></div>
    <a class="footer-contact-mail" href="mailto:${SUPPORT_EMAIL}">${zh ? '打开邮件应用' : 'Open email app'} ↗</a>
  </div>
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
  const compact = /^\/(?:zh\/)?pricing(?:\.html)?\/?$/.test(pathname);
  const footer = `<!-- SITE_TRUST_START -->\n${renderTrustFooter(locale, { compact })}\n<!-- SITE_TRUST_END -->\n`;
  let output = html.includes('<!-- SITE_TRUST_START -->')
    ? html.replace(/<!-- SITE_TRUST_START -->[\s\S]*?<!-- SITE_TRUST_END -->\n?/, footer)
    : html.replace(/<\/footer>/i, footer + '</footer>');
  output = output.replace(/<(p|span)\b[^>]*>© 2026 SEEDANCE 3\.0[^<]*<\/\1>/g, '').replace(/<div class="copyright">\s*<\/div>/g, '');
  output = output.replace(/href="\/assets\/site-trust\.css(?:\?[^\"]*)?"/g, 'href="/assets/site-trust.css?v=20261101-contact"');
  if (!output.includes('href="/assets/site-trust.css')) {
    output = output.replace('</head>', '  <link rel="stylesheet" href="/assets/site-trust.css?v=20261101-contact">\n</head>');
  }
  if (!output.includes('src="/assets/site-contact.js')) {
    output = output.replace('</body>', '<script src="/assets/site-contact.js?v=20261101-contact" defer></script>\n</body>');
  }
  // Keep purchase summaries compact; policies remain in the page footer.
  if (/^\/(?:zh\/)?(?:pricing|seedance-3-0-release-date)(?:\.html)?\/?$/.test(pathname)) {
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
