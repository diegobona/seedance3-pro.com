export const PROMO_ENDS_AT = Date.UTC(2026, 10, 20, 23, 59, 0);
export const PROMO_COPY = 'Launch offer: 50% off all credit packs. Ends Nov 20, 2026, 11:59 PM UTC.';
export function promoSnapshot(now, endsAt) {
  const total=Math.max(0,Math.ceil((endsAt-now)/1000)),pad=value=>String(value).padStart(2,'0');
  return {active:now<endsAt,days:pad(Math.floor(total/86400)),hours:pad(Math.floor(total%86400/3600)),minutes:pad(Math.floor(total%3600/60)),seconds:pad(total%60)};
}
export function createCreditOfferClock({now=Date.now}={}) {return ()=>promoSnapshot(now(),PROMO_ENDS_AT);}
export function subscribeCreditOfferCountdown(onChange,{now=Date.now,eventTarget=globalThis.window,setIntervalImpl=globalThis.setInterval,clearIntervalImpl=globalThis.clearInterval}={}) {
  const update=()=>onChange(promoSnapshot(now(),PROMO_ENDS_AT));update();const timer=setIntervalImpl(update,1000);
  eventTarget?.addEventListener('pageshow',update);eventTarget?.addEventListener('focus',update);
  return ()=>{clearIntervalImpl(timer);eventTarget?.removeEventListener('pageshow',update);eventTarget?.removeEventListener('focus',update);};
}
// Serialized into static HTML immediately after the cards, before first paint.
export function startPromotionClock(root,endsAt,snapshot) {
  const update=()=>{const t=snapshot(Date.now(),endsAt);root.querySelectorAll('[data-promo-only]').forEach(node=>{node.hidden=!t.active;});root.querySelectorAll('[data-promo-countdown]').forEach(node=>{node.textContent=`${t.days} days ${t.hours}:${t.minutes}:${t.seconds}`;});};
  update();const timer=setInterval(update,1000);return ()=>clearInterval(timer);
}
export function promotionBootstrap(){return `window.__creditPromoStop?.();window.__creditPromoStop=(${startPromotionClock.toString()})(document,${PROMO_ENDS_AT},${promoSnapshot.toString()});`;}
export function renderPromotion(now=Date.now()){const t=promoSnapshot(now,PROMO_ENDS_AT);return `<div class="credit-tier-promo" data-promo-only${t.active?'':' hidden'}><b>50% OFF</b><span role="timer" data-promo-countdown>${t.days} days ${t.hours}:${t.minutes}:${t.seconds}</span></div>`;}
