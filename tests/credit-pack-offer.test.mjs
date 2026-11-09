import test from 'node:test';
import assert from 'node:assert/strict';
import {PROMO_ENDS_AT,createCreditOfferClock,subscribeCreditOfferCountdown} from '../assets/credit-pack-offer.mjs';
import {CREDIT_PACKS} from '../assets/credit-packs.mjs';
import {renderCreditPackCard} from '../assets/credit-pack-cards.mjs';
test('fixed absolute UTC deadline never resets across visits or after expiry',()=>{
 assert.equal(PROMO_ENDS_AT,Date.UTC(2026,10,20,23,59,0));
 const now=PROMO_ENDS_AT-90061000;
 assert.deepEqual(createCreditOfferClock({now:()=>now})(),{active:true,days:'01',hours:'01',minutes:'01',seconds:'01'});
 assert.deepEqual(createCreditOfferClock({now:()=>now})(),createCreditOfferClock({now:()=>now})());
 for(const time of [PROMO_ENDS_AT,PROMO_ENDS_AT+86400000])assert.deepEqual(createCreditOfferClock({now:()=>time})(),{active:false,days:'00',hours:'00',minutes:'00',seconds:'00'});
});
test('initial callback is synchronous and sleeping tabs catch up; cleanup stops updates',()=>{
 let now=PROMO_ENDS_AT-1000,tick,cleared;const seen=[],events=new EventTarget();
 const stop=subscribeCreditOfferCountdown(t=>seen.push(t),{now:()=>now,eventTarget:events,setIntervalImpl:fn=>{tick=fn;return 1},clearIntervalImpl:id=>{cleared=id}});
 assert.equal(seen[0].seconds,'01');now=PROMO_ENDS_AT;tick();assert.equal(seen.at(-1).active,false);stop();assert.equal(cleared,1);
 const count=seen.length;events.dispatchEvent(new Event('focus'));assert.equal(seen.length,count);
});
test('expiry only hides promotional elements and preserves sale prices and actionable links',()=>{
 for(const pack of CREDIT_PACKS){const before=renderCreditPackCard(pack,'en',{now:PROMO_ENDS_AT-1}),after=renderCreditPackCard(pack,'en',{now:PROMO_ENDS_AT});
 assert.ok(before.includes('data-promo-only>'));assert.ok(after.includes('data-promo-only hidden'));
 assert.ok(after.includes(`US$${(pack.amount/100).toFixed(2)}`));assert.ok(after.includes(`/checkout?pack=${pack.id}`));assert.doesNotMatch(after,/disabled|Prices return|will increase|--</);
 }
});
