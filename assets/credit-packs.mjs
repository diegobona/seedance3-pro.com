// Shared catalog: amounts are USD cents.
export const CREDIT_PACKS = Object.freeze([
  Object.freeze({id:'starter',name:'Starter',amount:999,originalAmount:1998,credits:700,bonusCredits:0,videoCount:140,popular:false,bestValue:false}),
  Object.freeze({id:'creator',name:'Creator',amount:1999,originalAmount:3998,credits:1600,bonusCredits:150,videoCount:320,popular:true,bestValue:false}),
  Object.freeze({id:'studio',name:'Studio',amount:4999,originalAmount:9998,credits:4500,bonusCredits:850,videoCount:900,popular:false,bestValue:true}),
]);
/** @type {string} */
export const DEFAULT_CREDIT_PACK_ID = 'creator';
// Historical settlement only, never offered for new purchases.
export const LEGACY_CREDIT_PACKS = Object.freeze([{amount:499,credits:500},{amount:999,credits:1100},{amount:1190,credits:1100},{amount:2490,credits:3000},{amount:4990,credits:6500},{amount:1999,credits:1450},{amount:4999,credits:3650}].map(pack => Object.freeze(pack)));
export function creditPack(id = DEFAULT_CREDIT_PACK_ID) {return CREDIT_PACKS.find(pack=>pack.id===id) ?? CREDIT_PACKS[1];}
export function creditPackValue(pack) {return {price:(pack.amount/100).toFixed(2),originalPrice:(pack.originalAmount/100).toFixed(2),unitPrice:(pack.amount/100/pack.credits).toFixed(3),videoPrice:(pack.amount/100/pack.videoCount).toFixed(4),videoSeconds:pack.credits,minutes:(pack.credits/60).toFixed(1),clips:pack.videoCount,tenSecondClips:pack.credits/10};}
export function creditPackVideoExamples(pack,locale='en') {const tenSecondVideos=creditPackValue(pack).tenSecondClips;return locale==='zh'?`${pack.videoCount} 条 5 秒视频，或 ${tenSecondVideos} 条 10 秒视频`:`${pack.videoCount} videos at 5s or ${tenSecondVideos} videos at 10s`;}
export function pricingDescription(locale='en') {const pack=CREDIT_PACKS[0],price=creditPackValue(pack).price;return locale==='zh'?`US$${price} 起，${pack.credits} 积分可生成 ${creditPackVideoExamples(pack,locale)}。1080p。积分永久有效，无需订阅。`:`Credit packs from US$${price} (${pack.credits} credits): ${creditPackVideoExamples(pack,locale)} at 1080p. Credits never expire, no subscription.`;}
