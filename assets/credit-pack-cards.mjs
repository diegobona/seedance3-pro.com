import {CREDIT_PACKS,creditPackValue} from './credit-packs.mjs';
import {renderPromotion,promoSnapshot,PROMO_ENDS_AT} from './credit-pack-offer.mjs';
export function renderCreditPackCard(pack,locale='en',{purchaseButton=false,detailsOnly=false,now=Date.now()}={}) {
 const text=(en,zh)=>locale==='zh'?zh:en,v=creditPackValue(pack),tier=CREDIT_PACKS.indexOf(pack),active=promoSnapshot(now,PROMO_ENDS_AT).active;
 const badge=pack.popular?text('Most popular','最受欢迎'):pack.bestValue?text('Best value','最划算'):'';
 // Compare exact catalog prices, then round up only for the explicitly approximate label.
 const starter=CREDIT_PACKS[0],savingPercent=Math.max(0,Math.ceil(100*(1-pack.amount*starter.credits/(pack.credits*starter.amount))));
 const content=`${renderPromotion(now)}<div class="credit-tier-heading"><h2>${pack.name}</h2>${badge?`<span class="credit-tier-tag">${badge}</span>`:''}</div>
 <div class="credit-tier-pricing"><del data-promo-only${active?'':' hidden'}>US$${v.originalPrice}</del><strong>US$${v.price}</strong></div>
 <div class="credit-tier-output"><strong>${text(`${pack.videoCount} × 5s videos`,`${pack.videoCount} × 5 秒视频`)}</strong><span class="credit-tier-alternative">5s · 10s · 15s</span></div>
 <p class="credit-tier-credits"><span class="credit-tier-credit-total">${pack.credits} ${text('credits','积分')}${savingPercent?`<span class="credit-tier-savings">${text(`Save ≈${savingPercent}% per credit vs. Starter`,`每积分比 Starter 约省 ${savingPercent}%`)}</span>`:''}</span><span class="credit-tier-unit-price"><strong>US$${v.unitPrice}</strong><span>${text('per second','/ 秒')}</span></span></p>`;
 if(detailsOnly)return content;
 const label=`${text('Buy','购买')} ${pack.credits} ${text('credits','积分')} · US$${v.price}`;
 const action=purchaseButton?`<button type="button" class="credit-tier-buy" data-credit-pack-buy data-pack-id="${pack.id}">${label}</button>`:`<a class="credit-tier-buy" href="${locale==='zh'?'/zh':''}/checkout?pack=${pack.id}&amp;purchase=1" data-credit-pack-buy data-pack-id="${pack.id}" target="_blank" rel="noopener noreferrer">${label}</a>`;
 return `<article class="credit-tier credit-tier-${tier}" data-credit-pack-card data-pack-id="${pack.id}">${content}${action}</article>`;
}
export function renderPricingPack(pack,locale='en',options={}) {
 return renderCreditPackCard(pack,locale,options).replace(/(<strong>)US\$(\d+\.\d{2})(<\/strong>)/, '$1<span class="credit-tier-currency">US$</span>$2$3');
}
export function creditPackFootnote(locale='en'){return locale==='zh'?'1 积分 = 1 秒 1080p 视频。':'1 credit = 1 second of 1080p video.';}

export function creditPackTerms(locale='en'){return locale==='zh'?'永久有效。无需订阅。一次性购买。':'Never expires. No subscription. One-time purchase.';}
