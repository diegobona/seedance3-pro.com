import { readFile, writeFile } from 'node:fs/promises';
import { CREDIT_PACKS } from '../assets/credit-packs.mjs';
import { renderCreditPackCard, creditPackFootnote } from '../assets/credit-pack-cards.mjs';
for (const locale of ['en', 'zh']) {
  const path = locale === 'zh' ? 'zh/pricing.html' : 'pricing.html';
  const zh = locale === 'zh';
  let html = await readFile(path, 'utf8');
  const main = `<main class="credit-pricing-main" id="main-content">
    <header class="credit-pricing-heading"><p>${zh ? '一次购买 · 积分永久有效' : 'ONE-TIME PACKS · CREDITS NEVER EXPIRE'}</p><h1>${zh ? '为下一次创作，准备更多可能' : 'More credits. More possibilities.'}</h1><span>${zh ? '选择积分包，开始创作视频与图片。无需订阅。' : 'Choose your pack and start creating videos and images. No subscription.'}</span></header>
    <div class="credit-pricing-packs">${CREDIT_PACKS.map(pack => renderCreditPackCard(pack, locale)).join('\n')}</div>
    <p class="credit-pricing-footnote">${creditPackFootnote(locale)}</p>
  </main>`;
  if (!/<main class="credit-pricing-main"[^>]*>/.test(html)) throw new Error('Pricing main section missing');
  html = html.replace(/<main class="credit-pricing-main"[^>]*>[\s\S]*?<\/main>/, main);
  if (!html.includes('/assets/credit-pack-cards.css')) html = html.replace('</head>', '  <link rel="stylesheet" href="/assets/credit-pack-cards.css?v=20261105-tiers">\n</head>');
  html = html.replace(/credit-pricing\.css(?:\?[^"']*)?/, 'credit-pricing.css?v=20261105-tiers');
  const description = zh ? '一次性积分包：$11.90、$24.90、$49.90。最多赠送 30% 积分，视频与图片通用，积分永久有效，无需订阅。' : 'One-time credit packs at $11.90, $24.90 and $49.90. Up to 30% bonus credits for videos and images. Credits never expire. No subscription.';
  html = html.replace(/(<meta (?:name|property)="(?:description|og:description|twitter:description)" content=")[^"]*"/g, (_, prefix) => `${prefix}${description}"`);
  await writeFile(path, html);
}
