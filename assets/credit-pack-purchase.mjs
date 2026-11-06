import { bindCreditPurchaseLink } from './credit-checkout.mjs';
const locale = document.documentElement.lang.startsWith('zh') ? 'zh' : 'en';
for (const link of document.querySelectorAll('[data-credit-pack-buy]')) {
  bindCreditPurchaseLink(link, { locale });
}

for (const card of document.querySelectorAll('[data-credit-pack-card]')) {
  card.addEventListener('click', event => {
    if (!event.target.closest('a,button,input,select,textarea')) card.querySelector('[data-credit-pack-buy]')?.click();
  });
}
