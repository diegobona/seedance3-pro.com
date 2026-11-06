import { CREDIT_PACKS, creditPackValue } from './credit-packs.mjs';

const icons = [
  '<path d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3Z"/><path d="M21 2v4m-2-2h4"/>',
  '<path d="m13 2-9 12h7l-1 8 10-13h-7l1-7Z"/>',
  '<path d="M14 5c3-3 7-3 7-3s0 4-3 7l-7 7-5-5 8-6Z"/><path d="m6 11-3 1 1-5 7-1m0 10-1 5 5-1 1-7M7 17c0 3-4 4-4 4s1-4 4-4Z"/>',
];
export function renderCreditPackCard(pack, locale = 'en', { radio = false } = {}) {
  const zh = locale === 'zh', text = (en, cn) => zh ? cn : en;
  const v = creditPackValue(pack), n = value => value.toLocaleString('en-US');
  const tier = CREDIT_PACKS.findIndex(item => item.id === pack.id);
  const time = zh ? `${v.minutes} 分${v.seconds ? ` ${v.seconds} 秒` : '钟'}` : `${v.minutes} min${v.seconds ? ` ${v.seconds} sec` : ''}`;
  const title = text(`${pack.name} Pack`, ['入门积分包', '创作积分包', '专业积分包'][tier]);
  const popular = pack.popular ? `<span class="credit-tier-popular">☆ ${text('MOST POPULAR', '最受欢迎')}</span>` : '';
  const content = `${popular}<span class="credit-tier-heading"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[tier]}</svg><span>${title}</span>${radio ? '<span class="credit-picker-check" aria-hidden="true">✓</span>' : ''}</span>
    <span class="credit-tier-pricing"><strong>$${v.price}</strong><span>$${v.unitPrice}/${text('credit', '积分')}</span></span>
    <span class="credit-tier-expiry">${text('Credits never expire', '积分永久有效')}</span>
    <span class="credit-tier-total"><strong>${n(pack.credits)}</strong> ${text('credits', '积分')}</span>
    <span class="credit-tier-breakdown">${text(`${n(v.base)} base + <b>${n(pack.bonus)} bonus credits</b>`, `${n(v.base)} 基础 + <b>${n(pack.bonus)} 赠送积分</b>`)}</span>
    <span class="credit-tier-bonus">+${v.bonusPercent}% ${text('bonus credits', '积分赠送')}</span>
    <span class="credit-tier-output"><span>${text('TOTAL VIDEO GENERATION', '累计视频生成时长')}</span><strong>${n(v.videoSeconds)} <small>${text('seconds', '秒')}</small></strong><span>${time} · ${text(`${n(v.clips)} × 5-second videos`, `${n(v.clips)} 条 5 秒视频`)}</span></span>
    <span class="credit-tier-savings">${tier ? text(`Save <b>${v.savingsPercent}%</b> per credit vs. Starter`, `每积分单价比入门包<b>节省 ${v.savingsPercent}%</b>`) : text('A smaller pack to get started', '轻量起步，按需创作')}</span>
    <span class="credit-tier-terms">${text('One-time payment · No subscription', '一次购买 · 无订阅')}</span>`;
  return radio ? `<label class="credit-picker-option"><input type="radio" name="credit-pack" value="${pack.id}"><span class="credit-tier credit-tier-${tier}" data-pack-id="${pack.id}">${content}</span></label>`
    : `<article class="credit-tier credit-tier-${tier}" data-credit-pack-card data-pack-id="${pack.id}" aria-label="${title}">${content}<a class="credit-tier-buy" href="${zh ? '/zh' : ''}/checkout?pack=${pack.id}" data-credit-pack-buy data-pack-id="${pack.id}" target="_blank" rel="noopener noreferrer">${text('Get', '购买')} ${n(pack.credits)} ${text('credits', '积分')} <span aria-hidden="true">↗</span></a></article>`;
}

export function creditPackFootnote(locale = 'en') {
  return locale === 'zh' ? '视频额度按 1 积分 / 秒、全部积分用于视频计算，为多次生成的累计时长。积分也可用于图片；用于图片后，视频额度相应减少。赠送比例以各档基础积分计算；节省比例以入门包每积分单价计算。所有价格均为美元。'
    : 'Video totals assume all credits are used for video at 1 credit per second, across multiple generations. Credits can also be used for images, reducing the available video allowance. Bonuses are relative to each pack’s base credits; savings compare the price per credit with Starter. All prices are in USD.';
}
