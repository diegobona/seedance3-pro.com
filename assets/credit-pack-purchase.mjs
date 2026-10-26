import { bindCreditPurchaseLink } from './credit-checkout.mjs';
const locale = document.documentElement.lang.startsWith('zh') ? 'zh' : 'en';
for (const link of document.querySelectorAll('[data-credit-pack-buy]')) {
  bindCreditPurchaseLink(link, { locale });
}
