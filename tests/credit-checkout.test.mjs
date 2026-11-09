import assert from 'node:assert/strict';
import test from 'node:test';

const checkout = await import('../assets/credit-checkout.mjs').catch(() => ({}));

test('checkout failures explain account restrictions separately from payment service and popup errors', () => {
  assert.equal(typeof checkout.creditCheckoutErrorMessage, 'function');
  assert.match(checkout.creditCheckoutErrorMessage({ code: 'BILLING_HOLD' }, 'zh'), /购买权限.*受限/);
  assert.match(checkout.creditCheckoutErrorMessage({ code: 'BILLING_HOLD' }, 'en'), /account.*restricted/i);
  assert.match(checkout.creditCheckoutErrorMessage({ code: 'BILLING_UNAVAILABLE' }, 'en'), /temporarily unavailable/);
  assert.match(checkout.creditCheckoutErrorMessage({ code: 'POPUP_BLOCKED' }, 'zh'), /新窗口/);
  assert.doesNotMatch(checkout.creditCheckoutErrorMessage(new Error('private provider error'), 'en'), /private provider/);
});

test('purchase opens a localized loading tab and starts checkout immediately without waiting for its page load', async () => {
  assert.equal(typeof checkout.openSelectedCreditPurchase, 'function');
  for (const locale of ['en', 'zh']) {
    const calls = [], destinations = [];
    let finish;
    const tab = { opener: {}, location: { replace: url => destinations.push(url) }, close() { assert.fail('successful checkout stays open'); } };
    const browser = { open: (...args) => { calls.push(args); return tab; }, location: { assign: () => assert.fail('editor must stay open') } };
    const purchase = checkout.openSelectedCreditPurchase({ locale, eventTarget: browser, requestCheckout: async options => {
      assert.deepEqual(options, { locale, packId: 'creator' });
      await new Promise(resolve => { finish = resolve; });
      return 'https://checkout.stripe.com/c/pay/example';
    } });
    assert.deepEqual(calls, [[`/assets/checkout-loading?lang=${locale}`, '_blank']]);
    assert.equal(tab.opener, null);
    finish(); await purchase;
    assert.deepEqual(destinations, ['https://checkout.stripe.com/c/pay/example']);
  }
});

test('blocked tabs do not create an order; failed checkout closes the loading tab and permits retry', async () => {
  await assert.rejects(checkout.openSelectedCreditPurchase({ eventTarget: { open: () => null }, requestCheckout: () => assert.fail('no order without a tab') }), { code: 'POPUP_BLOCKED' });
  let closed = 0;
  const tab = { location: { replace: () => assert.fail('failed checkout must not navigate') }, close: () => closed++ };
  await assert.rejects(checkout.openSelectedCreditPurchase({ eventTarget: { open: () => tab }, requestCheckout: async () => { throw { code: 'BILLING_UNAVAILABLE' }; } }), { code: 'BILLING_UNAVAILABLE' });
  assert.equal(closed, 1);
});

test('authentication continues in the reserved tab and automatically resumes checkout', async () => {
  const destinations = [];
  await checkout.openSelectedCreditPurchase({ locale: 'zh', eventTarget: { open: () => ({ location: { replace: url => destinations.push(url) } }) }, requestCheckout: async () => { throw { code: 'AUTH_REQUIRED' }; } });
  assert.deepEqual(destinations, ['/zh/checkout?pack=creator&purchase=1']);
});

test('new-tab and fallback purchase destinations go to checkout with the source page preserved', () => {
  assert.equal(checkout.creditPurchaseUrl('en', '/seedance-3-0-release-date'), '/checkout?return_to=%2Fseedance-3-0-release-date');
  assert.equal(checkout.creditPurchaseUrl('zh', '/zh/app/video/seedance-2-5'), '/zh/checkout?return_to=%2Fzh%2Fapp%2Fvideo%2Fseedance-2-5');
  assert.equal(checkout.creditPurchaseUrl('en', 'https://evil.test'), '/checkout');
});

test('old billing purchase links resume checkout, while payment results and account history stay in billing', () => {
  assert.equal(typeof checkout.legacyCreditCheckoutUrl, 'function');
  assert.equal(checkout.legacyCreditCheckoutUrl('?checkout=start&return_to=%2Fzh%2Fpricing', 'zh'), '/zh/checkout?return_to=%2Fzh%2Fpricing');
  assert.equal(checkout.legacyCreditCheckoutUrl('?checkout=start&return_to=https%3A%2F%2Fevil.test'), '/checkout');
  for (const search of ['', '?checkout=success&session_id=cs_test', '?checkout=cancelled']) {
    assert.equal(checkout.legacyCreditCheckoutUrl(search), null);
  }
});

test('purchase links perform one direct Stripe request per click while keeping the source page open', async () => {
  let handler, requests = 0, finish;
  const destinations = [], attributes = new Map();
  const link = {
    setAttribute: (key, value) => attributes.set(key, value), removeAttribute: key => attributes.delete(key),
    addEventListener: (_type, value) => { handler = value; }, removeEventListener() {},
    parentElement: { querySelector: () => null },
  };
  const cleanup = checkout.bindCreditPurchaseLink(link, {
    eventTarget: { open: () => ({ location: { replace: url => destinations.push(url) } }) },
    openPurchase: checkout.openSelectedCreditPurchase,
    requestCheckout: async () => { requests++; await new Promise(resolve => { finish = resolve; }); return 'https://checkout.stripe.com/c/pay/test'; },
  });
  let prevented = 0;
  const click = { button: 0, preventDefault: () => prevented++ };
  const first = handler(click);
  await handler(click);
  assert.equal(requests, 1);
  finish(); await first;
  assert.equal(prevented, 2);
  assert.deepEqual(destinations, ['https://checkout.stripe.com/c/pay/test']);
  assert.equal(attributes.has('aria-busy'), false);
  cleanup();
});
function storage() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key,value) => values.set(key,value), removeItem: key => values.delete(key) };
}

test('direct checkout posts only pack ID with same-origin credentials and keeps locale in routing', async () => {
  assert.equal(typeof checkout.requestCreditCheckout, 'function');
  const url = await checkout.requestCreditCheckout({ locale: 'zh', fetchImpl: async (url, init) => {
    assert.equal(new URL(url,'http://localhost').pathname, '/api/billing/checkout');assert.equal(new URL(url,'http://localhost').searchParams.get('locale'),'zh');
    assert.equal(init.method, 'POST');
    assert.equal(init.credentials, 'same-origin');
    assert.deepEqual(JSON.parse(init.body), { packId: 'creator' });
    return Response.json({ url: 'https://checkout.stripe.com/c/pay/example' });
  } });
  assert.equal(url, 'https://checkout.stripe.com/c/pay/example');
});

test('checkout rejects unsafe redirect URLs', async () => {
  assert.equal(typeof checkout.requestCreditCheckout, 'function');
  for (const url of ['https://checkout.stripe.com.evil.test/', 'javascript:alert(1)', 'http://checkout.stripe.com/', 'https://user@checkout.stripe.com/']) {
    await assert.rejects(checkout.requestCreditCheckout({ fetchImpl: async () => Response.json({ url }) }), { code: 'CHECKOUT_FAILED' });
  }
});

test('checkout preserves safe local source pages and rejects external return targets', async () => {
 for(const returnTo of ['/', '/zh/', 'https://evil.test', '//evil.test', '/app']) {
  await checkout.requestCreditCheckout({returnTo,fetchImpl:async(_url,init)=>{
   assert.equal(new URL(_url,'http://localhost').searchParams.get('returnTo'),['/','/zh/','/app'].includes(returnTo)?returnTo:null);
   assert.deepEqual(JSON.parse(init.body),{packId:'creator'});
   return Response.json({url:'https://checkout.stripe.com/test'});
  }});
 }
});

test('auth, hold and unavailable errors remain actionable without exposing provider text', async () => {
  assert.equal(typeof checkout.requestCreditCheckout, 'function');
  for (const [status,code] of [[401,'AUTH_REQUIRED'],[403,'BILLING_HOLD'],[503,'BILLING_UNAVAILABLE']]) {
    await assert.rejects(checkout.requestCreditCheckout({ fetchImpl: async () => Response.json({ code, error: 'private provider details' }, { status }) }), error => error.code === code && !error.message.includes('private'));
  }
});

test('login purchase intent is path-bound, expires and can be consumed once', () => {
  assert.equal(typeof checkout.rememberCheckoutIntent, 'function');
  const store = storage(), path = '/zh/app/video/minimax-h3';
  checkout.rememberCheckoutIntent({ storage: store, path, now: 1000 });
  assert.equal(checkout.hasCheckoutIntent({ storage: store, path, now: 2000 }), true);
  assert.equal(checkout.hasCheckoutIntent({ storage: store, path: '/billing', now: 2000 }), false);
  checkout.clearCheckoutIntent(store);
  assert.equal(checkout.hasCheckoutIntent({ storage: store, path, now: 2000 }), false);
  checkout.rememberCheckoutIntent({ storage: store, path, now: 1000 });
  assert.equal(checkout.hasCheckoutIntent({ storage: store, path, now: 601001 }), false);
});

test('blocked browser storage never prevents signing in or causes an unintended checkout', () => {
  assert.equal(typeof checkout.hasCheckoutIntent, 'function');
  const blocked = { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); }, removeItem() { throw Error('blocked'); } };
  assert.doesNotThrow(() => checkout.rememberCheckoutIntent({ storage: blocked, path: '/app' }));
  assert.equal(checkout.hasCheckoutIntent({ storage: blocked, path: '/app' }), false);
  assert.doesNotThrow(() => checkout.clearCheckoutIntent(blocked));
});

 test('selected creator pack survives authentication and sends only its catalog id', async () => {
  const targets=[];
  await checkout.openSelectedCreditPurchase({packId:'studio',eventTarget:{open:()=>({location:{replace:url=>targets.push(url)}})},requestCheckout:async options=>{assert.equal(options.packId,'studio');throw {code:'AUTH_REQUIRED'};}});
  assert.deepEqual(targets,['/checkout?pack=studio&purchase=1']);
  await checkout.requestCreditCheckout({packId:'studio',fetchImpl:async(_url,init)=>{assert.deepEqual(JSON.parse(init.body),{packId:'studio'});return Response.json({url:'https://checkout.stripe.com/c/pay/creator'});}});
});

test('each pack-specific purchase link goes straight to Stripe with that pack, without a picker', async () => {
 for (const packId of ['starter','creator','studio']) {
  let click, captured;
  const targets=[];
  const link={dataset:{packId},setAttribute(){},removeAttribute(){},addEventListener:(type,fn)=>{if(type==='click')click=fn},removeEventListener(){},parentElement:{querySelector:()=>null}};
  const eventTarget={location:{pathname:'/pricing',search:''},open:()=>({location:{replace:url=>targets.push(url)}})};
  checkout.bindCreditPurchaseLink(link,{eventTarget,purchaseMode:'direct',openPurchase:()=>assert.fail('no picker for a pack purchase'),requestCheckout:async options=>{captured=options;return 'https://checkout.stripe.com/c/pay/test'}});
  await click({button:0,preventDefault(){}});
  assert.equal(captured.packId,packId);
  assert.deepEqual(targets,['https://checkout.stripe.com/c/pay/test']);
 }
});

test('generic promotional links open the picker even when they describe a starter pack', async () => {
 for (const locale of ['en','zh']) {
  const handlers = new Map(), attributes = new Map();
  let pickerOpens = 0, prevented = 0;
  const link = { dataset: { packId: 'starter' },
   setAttribute: (key, value) => attributes.set(key, value), removeAttribute: key => attributes.delete(key),
   addEventListener: (type, handler) => handlers.set(type, handler), removeEventListener() {},
   parentElement: { querySelector: () => null },
  };
  const pathname = locale === 'zh' ? '/zh/seedance-3-0-release-date' : '/seedance-3-0-release-date';
  const eventTarget = { location: { pathname, search: '' }, open: () => assert.fail('generic entry must not open a checkout tab') };
  checkout.bindCreditPurchaseLink(link, { locale, eventTarget,
   requestCheckout: () => assert.fail('no checkout session until a pack is chosen'),
   openPurchase: async options => { pickerOpens++; assert.equal(options.locale, locale); },
  });
  const fallback = new URL(link.href, 'https://seedance3-pro.com');
  assert.equal(fallback.pathname, locale === 'zh' ? '/zh/checkout' : '/checkout');
  assert.equal(fallback.searchParams.get('return_to'), pathname);
  assert.equal(fallback.searchParams.has('pack'), false);
  assert.equal(fallback.searchParams.has('purchase'), false);
  await handlers.get('click')({ button: 0, preventDefault: () => prevented++ });
  assert.equal(pickerOpens, 1);
  assert.equal(prevented, 1);
  assert.equal(attributes.has('aria-busy'), false);
  await handlers.get('click')({ button: 0, ctrlKey: true, preventDefault: () => assert.fail('preserve modified link behavior') });
  handlers.get('contextmenu')();
  assert.equal(pickerOpens, 1);
  assert.equal(new URL(link.href, 'https://seedance3-pro.com').searchParams.has('purchase'), false);
 }
});
