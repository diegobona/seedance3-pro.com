import { subscribeCreditOfferCountdown } from './credit-pack-offer.mjs';

const offers = [...document.querySelectorAll('[data-credit-pack-offer]')].filter(offer => offer.querySelector('[role="timer"]'));
if (offers.length) {
  subscribeCreditOfferCountdown(time => {
    for (const offer of offers) {
      for (const unit of ['days', 'hours', 'minutes', 'seconds']) {
        offer.querySelector(`[data-offer-${unit}]`).textContent = time[unit];
      }
      const zh = document.documentElement.lang.startsWith('zh');
      offer.querySelector('[role="timer"]').setAttribute('aria-label', zh
        ? `倒计时：${time.days} 天 ${time.hours} 小时 ${time.minutes} 分 ${time.seconds} 秒`
        : `Countdown: ${time.days} days, ${time.hours} hours, ${time.minutes} minutes, ${time.seconds} seconds`);
    }
  });
}
