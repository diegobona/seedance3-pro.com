import {useCallback,useEffect,useRef,useState} from 'react'
import {useSiteI18n} from '../lib/site-i18n'
import {authClient} from '../lib/auth-client'
import {AuthDialog} from './auth-dialog'
import {SiteHeader} from './site-header'
import {SiteTrustFooter} from './site-trust'
import {requestCreditCheckout,creditCheckoutErrorMessage,rememberCheckoutIntent,hasCheckoutIntent,clearCheckoutIntent} from '../../assets/credit-checkout.mjs'
import {normalizeCreditReturn} from '../../assets/credit-return.mjs'
import {CREDIT_PACKS,creditPack,creditPackValue} from '../../assets/credit-packs.mjs'
import {renderPricingPack,creditPackFootnote,creditPackTerms} from '../../assets/credit-pack-cards.mjs'
import {startPromotionClock,promoSnapshot,PROMO_ENDS_AT,promotionBootstrap} from '../../assets/credit-pack-offer.mjs'
import '../styles/auth.css'
import '../../assets/credit-pack-cards.css'
import '../styles/checkout.css'
import '../../assets/credit-pricing.css'

export function CheckoutPage(){
 const {locale}=useSiteI18n();
 const {data:session,isPending}=authClient.useSession();
 const [ready,setReady]=useState(false),[busyPack,setBusyPack]=useState<string|null>(null),[error,setError]=useState(''),[authOpen,setAuthOpen]=useState(false);
 const root=useRef<HTMLDivElement>(null),inFlight=useRef(false),initialIntentHandled=useRef(false),pendingPack=useRef<string|null>(null);
 const text=(en:string,zh:string)=>locale==='zh'?zh:en;
 useEffect(()=>{
  setReady(true);
  (window as Window & {__creditPromoStop?:()=>void}).__creditPromoStop?.();
  if(root.current)return startPromotionClock(root.current,PROMO_ENDS_AT,promoSnapshot)
 },[]);
 const clearPurchaseIntent=useCallback(()=>{
  pendingPack.current=null;clearCheckoutIntent();
  const url=new URL(window.location.href);url.searchParams.delete('purchase');window.history.replaceState(window.history.state,'',url.href);
 },[]);
 const buy=useCallback(async(id:string)=>{
  if(inFlight.current)return;
  const pack=creditPack(id);initialIntentHandled.current=true;clearPurchaseIntent();inFlight.current=true;setBusyPack(pack.id);setError('');
  const requested=normalizeCreditReturn(new URLSearchParams(window.location.search).get('return_to'));
  const returnTo=requested&&!/^\/(?:zh\/)?checkout(?:\/|\?|#|$)/.test(requested)?requested:locale==='zh'?'/zh/billing':'/billing';
  try{window.location.assign(await requestCreditCheckout({locale,packId:pack.id,returnTo}));}
  catch(caught){if((caught as {code?:string})?.code==='AUTH_REQUIRED'){
   pendingPack.current=pack.id;
   const url=new URL(window.location.href);url.searchParams.set('pack',pack.id);url.searchParams.set('purchase','1');window.history.replaceState(window.history.state,'',url.href);
   rememberCheckoutIntent({path:window.location.pathname+window.location.search});setAuthOpen(true);
  }else setError(creditCheckoutErrorMessage(caught,locale));}
  finally{inFlight.current=false;setBusyPack(null);}
 },[locale,clearPurchaseIntent]);
 const resumePurchase=useCallback(()=>{
  const id=pendingPack.current;if(!id||inFlight.current)return;
  pendingPack.current=null;setAuthOpen(false);void buy(id);
 },[buy]);
 useEffect(()=>{
  if(isPending)return;
  if(!initialIntentHandled.current){
   initialIntentHandled.current=true;
   const query=new URLSearchParams(window.location.search),path=window.location.pathname+window.location.search;
   if(query.get('purchase')==='1'||hasCheckoutIntent({path})){
    pendingPack.current=creditPack(query.get('pack')??undefined).id;
    if(!session?.user.id){rememberCheckoutIntent({path});setAuthOpen(true);return;}
   }
  }
  if(session?.user.id)resumePurchase();
 },[isPending,session?.user.id,resumePurchase]);
 return <><SiteHeader/><main className="credit-checkout-page" ref={root}>
 <header><h1>{text('Checkout','结账')}</h1><p className="credit-pack-terms-summary">{creditPackTerms(locale)}</p></header>
 <div className="checkout-cards">{CREDIT_PACKS.map((pack,index)=><article className={`credit-tier credit-tier-${index}`} data-credit-pack-card data-pack-id={pack.id} key={pack.id}><div className="checkout-pack-details" dangerouslySetInnerHTML={{__html:renderPricingPack(pack,locale,{detailsOnly:true})}} suppressHydrationWarning/><button className="credit-tier-buy" type="button" onClick={()=>void buy(pack.id)} disabled={!ready||busyPack!==null} aria-busy={busyPack===pack.id}>{busyPack===pack.id?text('Opening checkout…','正在打开付款…'):text(`Buy ${pack.credits} credits · US$${creditPackValue(pack).price}`,`购买 ${pack.credits} 积分 · US$${creditPackValue(pack).price}`)}</button></article>)}</div>
 <script dangerouslySetInnerHTML={{__html:promotionBootstrap()}}/>
 <p className="checkout-note">{creditPackFootnote(locale)}</p>
 {error&&<p role="alert" className="checkout-error">{error}</p>}
 </main><SiteTrustFooter/><AuthDialog open={authOpen} onClose={()=>{setAuthOpen(false);clearPurchaseIntent()}} onAuthenticated={resumePurchase}/></>
}
