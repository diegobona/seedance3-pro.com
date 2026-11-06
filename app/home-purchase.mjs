import {requestCreditCheckout, openCreditPurchase, rememberCheckoutIntent, hasCheckoutIntent, clearCheckoutIntent, creditCheckoutErrorMessage} from '../assets/credit-checkout.mjs';
import {verifiedCheckoutStatus} from './daily-credits.mjs';

export function homeGenerationAction({guest, remaining, duration, freeBudgetBlocked=false, paidRemaining=0}) {
  if (guest) return remaining !== null && remaining < 5 ? 'auth' : 'generate';
  if (freeBudgetBlocked) return paidRemaining >= Number(duration) ? 'paid-generate' : 'buy';
  return remaining !== null && remaining < Number(duration) ? 'buy' : 'generate';
}

export function createHomePurchaseController({locale='en',path='/',storage=null,saveDraft=async()=>{},
  requestCheckout=requestCreditCheckout,openAuth=async()=>false,navigate=()=>{},openPurchase=null,
  onBusy=()=>{},onMessage=()=>{},onAuthenticated=()=>{},callbackURL=''}={}) {
  let busy=false, authenticating=false, epoch=0;
  const changeBusy=value=>{busy=value;onBusy(value);};
  async function auth({mode='login',purchase=false}={}) {
    if (busy || authenticating) return;
    authenticating=true;const current=epoch;
    clearCheckoutIntent(storage);
    if(purchase)rememberCheckoutIntent({storage,path});
    try {
      const success=await openAuth({mode,callbackURL,beforeRedirect:saveDraft});
      if(current!==epoch)return;
      clearCheckoutIntent(storage);
      if(success){onAuthenticated();authenticating=false;if(purchase)await buy();}
    } catch {clearCheckoutIntent(storage);onMessage('auth-error');}
    finally {authenticating=false;}
  }
  async function buy() {
    if(busy || authenticating)return;
    if(openPurchase){
      clearCheckoutIntent(storage);changeBusy(true);onMessage('');
      try{await openPurchase();}catch(error){onMessage(error?.code==='BILLING_HOLD'?'hold':error?.code==='BILLING_UNAVAILABLE'?'unavailable':error?.code==='POPUP_BLOCKED'?'popup':'checkout-error');}finally{changeBusy(false);}
      return;
    }
    const current=epoch;changeBusy(true);onMessage('');clearCheckoutIntent(storage);
    let stage='draft';
    try {
      await saveDraft();if(current!==epoch)return;stage='checkout';
      const url=await requestCheckout({locale,returnTo:path});
      if(current===epoch)navigate(url);
    } catch(error) {
      if(current!==epoch)return;
      changeBusy(false);
      if(error.code==='AUTH_REQUIRED'){await auth({purchase:true});return;}
      onMessage(stage==='draft'?'draft-error':error.code==='BILLING_HOLD'?'hold':'checkout-error');
    }
  }
  function reset(){epoch++;authenticating=false;changeBusy(false);clearCheckoutIntent(storage);}
  return {buy,auth,reset};
}

export function initializeHomePurchase({eventTarget=window,doc=document,fetchImpl=fetch}={}) {
  const locale=doc.documentElement.lang.startsWith('zh')?'zh':'en';
  const path=locale==='zh'?'/zh/':'/';
  const text=(en,zh)=>locale==='zh'?zh:en;
  const notify=code=>{
    const messages={
      'draft-error':text('Could not save your draft. Please try again before leaving this page.','无法保存草稿，请重试后再离开页面。'),
      'checkout-error':text('Could not open checkout. Please try again.','无法打开付款页面，请重试。'),
      'auth-error':text('Could not open sign in. Please try again.','无法打开登录窗口，请重试。'),
      hold:creditCheckoutErrorMessage({code:'BILLING_HOLD'},locale),
      unavailable:creditCheckoutErrorMessage({code:'BILLING_UNAVAILABLE'},locale),
      popup:creditCheckoutErrorMessage({code:'POPUP_BLOCKED'},locale),
      pending:text('Waiting for payment confirmation. Your draft is saved.','正在等待支付确认，你的草稿已保留。'),
      cancelled:text('Checkout cancelled. Your draft is still here.','已取消付款，草稿已保留。'),
      reversed:text('This payment was reversed. Please check your billing history.','此笔付款已撤销，请查看账单记录。'),
      'pending-long':text('Payment confirmation is taking longer. Refresh or check your billing history.','支付仍待确认，请稍后刷新或查看账单记录。'),
    };
    const status=doc.querySelector('[data-home-payment-status]');
    if(status){status.textContent=messages[code]||'';status.hidden=!status.textContent;}
  };
  async function saveDraft(){
    const detail={promises:[]};eventTarget.dispatchEvent(new CustomEvent('seedance:home-before-leave',{detail}));
    await Promise.all(detail.promises);
  }
  const callback=new URL(path,eventTarget.location.origin);callback.searchParams.set('auth_return','1');callback.searchParams.set('lang',locale);callback.hash='create';
  const errorCallback=new URL(path,eventTarget.location.origin);errorCallback.searchParams.set('auth_cancelled','1');errorCallback.searchParams.set('lang',locale);errorCallback.hash='create';
  const authChanged=()=>eventTarget.dispatchEvent(new Event('seedance:auth-changed'));
  const oauthKey='seedance:home:oauth-return';
  const clearOAuth=()=>{try{eventTarget.sessionStorage.removeItem(oauthKey);}catch{}};
  const controller=createHomePurchaseController({locale,path,saveDraft,callbackURL:callback.href,
    openPurchase:()=>openCreditPurchase({locale,eventTarget,requestCheckout:options=>requestCreditCheckout({...options,fetchImpl})}),
    requestCheckout:options=>requestCreditCheckout({...options,fetchImpl}),
    openAuth:async options=>{
      const token=crypto.randomUUID(),url=new URL(options.callbackURL);url.searchParams.set('auth_nonce',token);
      try{return await (await import(/* @vite-ignore */ '/assets/home-auth.js?v=20261024-google-only')).openHomeAuth({...options,callbackURL:url.href,errorCallbackURL:errorCallback.href,beforeRedirect:async()=>{
        await options.beforeRedirect();
        eventTarget.sessionStorage.setItem(oauthKey,JSON.stringify({token,path,at:Date.now()}));
      }});}finally{clearOAuth();}
    },
    navigate:url=>eventTarget.location.assign(url),onMessage:notify,
    onBusy:busy=>{
      doc.querySelectorAll('[data-home-buy]').forEach(node=>{node.setAttribute('aria-busy',String(busy));if(node.tagName==='BUTTON')node.disabled=busy;});
      eventTarget.dispatchEvent(new CustomEvent('seedance:home-purchase-state',{detail:{busy}}));
    },
  });
  const click=event=>{
    if(event.target.closest('.auth-dialog-backdrop'))return;
    if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    const buy=event.target.closest('[data-home-buy], .home-member-purchase');
    const auth=event.target.closest('[data-home-auth], [data-account-login]');
    if(buy){event.preventDefault();void controller.buy();}
    else if(auth){event.preventDefault();void controller.auth({mode:auth.dataset.homeAuth||'login'});}
  };
  doc.addEventListener('click',click);
  const buy=()=>{void controller.buy();};
  const auth=event=>{void controller.auth({mode:event.detail?.mode||'register'});};
  eventTarget.addEventListener('seedance:home-buy',buy);eventTarget.addEventListener('seedance:home-auth',auth);
  let verifyEpoch=0, timer, request;
  const returnQuery=new URLSearchParams(eventTarget.location.search);
  const checkout=returnQuery.get('checkout'), sessionId=returnQuery.get('session_id');
  async function verifyPayment(){
    if(checkout!=='success'||!/^cs_[A-Za-z0-9_]{1,240}$/.test(sessionId||''))return;
    const current=++verifyEpoch;clearTimeout(timer);request?.abort();request=new AbortController();let attempts=0;
    notify('pending');
    const poll=async()=>{
      if(current!==verifyEpoch)return;
      try {
        const response=await fetchImpl('/api/billing/history',{credentials:'same-origin',cache:'no-store',signal:request.signal});
        if(!response.ok)throw Error('history');
        const payload=await response.json();if(current!==verifyEpoch)return;
        const status=verifiedCheckoutStatus('success',sessionId,Array.isArray(payload.orders)?payload.orders:[]);
        if(status==='paid'||status==='reversed'){
          notify(status);if(status==='paid')eventTarget.dispatchEvent(new Event('seedance:payment-verified'));return;
        }
      } catch {if(current!==verifyEpoch)return;}
      if(++attempts<12)timer=setTimeout(poll,5000);else notify('pending-long');
    };
    void poll();
  }
  const changed=()=>{if(checkout==='success')void verifyPayment();};
  eventTarget.addEventListener('seedance:auth-changed',changed);
  eventTarget.addEventListener('seedance:account-changed',changed);
  if(checkout==='cancelled')notify('cancelled');else if(checkout==='success')void verifyPayment();
  const restored=event=>{
    if(!event.persisted)return;
    controller.reset();doc.querySelector('.auth-dialog-close')?.click();authChanged();
    if(checkout==='success')void verifyPayment();
  };
  eventTarget.addEventListener('pageshow',restored);
  // A purchase may resume only on the explicit OAuth callback, never an ordinary reload/login.
  if(returnQuery.get('auth_cancelled')==='1'){
    clearCheckoutIntent();clearOAuth();
    const clean=new URL(eventTarget.location.href);for(const key of ['auth_cancelled','auth_return','auth_nonce','error','error_description'])clean.searchParams.delete(key);
    eventTarget.history.replaceState(eventTarget.history.state,'',clean.href);authChanged();
  }else if(returnQuery.get('auth_return')==='1'){
    let oauth;try{oauth=JSON.parse(eventTarget.sessionStorage.getItem(oauthKey)||'null');}catch{}
    const validOAuth=oauth?.token===returnQuery.get('auth_nonce')&&oauth?.path===path&&Number.isSafeInteger(oauth?.at)&&Date.now()>=oauth.at&&Date.now()-oauth.at<=10*60*1000;
    const resume=validOAuth&&hasCheckoutIntent({path});clearCheckoutIntent();clearOAuth();
    const clean=new URL(eventTarget.location.href);clean.searchParams.delete('auth_return');clean.searchParams.delete('auth_nonce');
    eventTarget.history.replaceState(eventTarget.history.state,'',clean.href);
    void fetchImpl('/api/auth/get-session',{credentials:'same-origin',cache:'no-store'})
      .then(response=>response.ok?response.json():null)
      .then(session=>{authChanged();if(resume&&session?.user?.id)void controller.buy();})
      .catch(()=>clearCheckoutIntent());
  }else{clearCheckoutIntent();clearOAuth();}
  return()=>{controller.reset();verifyEpoch++;clearTimeout(timer);request?.abort();doc.removeEventListener('click',click);eventTarget.removeEventListener('seedance:home-buy',buy);eventTarget.removeEventListener('seedance:home-auth',auth);eventTarget.removeEventListener('pageshow',restored);eventTarget.removeEventListener('seedance:auth-changed',changed);eventTarget.removeEventListener('seedance:account-changed',changed);};
}
