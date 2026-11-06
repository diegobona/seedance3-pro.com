import test from 'node:test';
import assert from 'node:assert/strict';
const { createHomePurchaseController, homeGenerationAction } = await import('../app/home-purchase.mjs').catch(() => ({}));
const storage = () => { const map = new Map(); return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)}; };

test('new-tab purchase retains the specific billing restriction and service errors', async () => {
 for (const [code, message] of [['BILLING_HOLD','hold'],['BILLING_UNAVAILABLE','unavailable'],['POPUP_BLOCKED','popup']]) {
  const messages=[];
  const controller=createHomePurchaseController({openPurchase:async()=>{throw {code};},onMessage:value=>messages.push(value)});
  await controller.buy();assert.equal(messages.at(-1),message);
 }
});

test('homepage purchase opens immediately in a separate tab without saving or navigating away', () => {
 let opened = 0;
 const controller = createHomePurchaseController({
  openPurchase: () => opened++, saveDraft: () => assert.fail('current page stays open'),
  requestCheckout: () => assert.fail('checkout belongs in the new tab'), navigate: () => assert.fail('current page stays open'),
 });
 controller.buy();
 assert.equal(opened, 1, 'the new tab must open before the user gesture ends');
});

test('homepage action keeps exhausted users on a usable registration or purchase button', () => {
 assert.equal(typeof homeGenerationAction,'function');
 assert.equal(homeGenerationAction({guest:true,remaining:0,duration:5}),'auth');
 assert.equal(homeGenerationAction({guest:false,remaining:0,duration:5}),'buy');
 assert.equal(homeGenerationAction({guest:false,remaining:5,duration:10}),'buy');
 assert.equal(homeGenerationAction({guest:false,remaining:5,duration:5}),'generate');
 assert.equal(homeGenerationAction({guest:false,remaining:15,duration:5,freeBudgetBlocked:true,paidRemaining:0}),'buy');
 assert.equal(homeGenerationAction({guest:false,remaining:515,duration:5,freeBudgetBlocked:true,paidRemaining:500}),'paid-generate');
});
test('homepage saves draft before one Stripe request and returns to its own language path', async () => {
 assert.equal(typeof createHomePurchaseController,'function');
 const calls=[],destinations=[];let release;
 const controller=createHomePurchaseController({path:'/zh/',locale:'zh',storage:storage(),saveDraft:async()=>calls.push('save'),navigate:url=>destinations.push(url),requestCheckout:async options=>{calls.push(options);await new Promise(resolve=>release=resolve);return 'https://checkout.stripe.com/test';}});
 const first=controller.buy();await new Promise(resolve=>setImmediate(resolve));await controller.buy();release();await first;
 assert.equal(calls[0],'save');assert.equal(calls.length,2);assert.equal(calls[1].returnTo,'/zh/');assert.equal(destinations.length,1);
});
test('cancelled login never buys and an ordinary later login does not consume an old purchase intent', async () => {
 const store=storage();let requests=0,auths=0;
 const controller=createHomePurchaseController({path:'/',storage:store,saveDraft:async()=>{},requestCheckout:async()=>{requests++;throw {code:'AUTH_REQUIRED'};},openAuth:async()=>{auths++;return false;}});
 await controller.buy();assert.equal(requests,1);assert.equal(auths,1);
 await controller.auth();assert.equal(requests,1);assert.equal(auths,2);
});
test('successful email login resumes an explicit purchase once, while failed draft persistence blocks checkout', async () => {
 let signed=false,requests=0,navigations=0;
 const controller=createHomePurchaseController({path:'/',storage:storage(),saveDraft:async()=>{},openAuth:async()=>{signed=true;return true;},requestCheckout:async()=>{requests++;if(!signed)throw {code:'AUTH_REQUIRED'};return 'https://checkout.stripe.com/test';},navigate:()=>navigations++});
 await controller.buy();assert.equal(requests,2);assert.equal(navigations,1);
 let blockedRequests=0;
 const blocked=createHomePurchaseController({path:'/',saveDraft:async()=>{throw Error('storage blocked')},requestCheckout:async()=>{blockedRequests++;},onMessage:()=>{}});
 await blocked.buy();assert.equal(blockedRequests,0);
});
