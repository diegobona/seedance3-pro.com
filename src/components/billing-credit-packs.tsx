import {useEffect,useRef,useState} from 'react'
import {useSiteI18n} from '../lib/site-i18n'
import {CREDIT_PACKS,creditPackValue} from '../../assets/credit-packs.mjs'
import {renderPricingPack,creditPackTerms} from '../../assets/credit-pack-cards.mjs'
import {openSelectedCreditPurchase,creditCheckoutErrorMessage} from '../../assets/credit-checkout.mjs'
import {startPromotionClock,promoSnapshot,PROMO_ENDS_AT,promotionBootstrap} from '../../assets/credit-pack-offer.mjs'
import {PurchaseAssurance} from './site-trust'
import '../../assets/credit-pack-cards.css'
import '../../assets/credit-pricing.css'

export function BillingCreditPacks({disabled=false}:{disabled?:boolean}) {
 const {locale}=useSiteI18n(),text=(en:string,zh:string)=>locale==='zh'?zh:en
 const root=useRef<HTMLElement>(null),inFlight=useRef(false)
 const [ready,setReady]=useState(false),[busyPack,setBusyPack]=useState<string|null>(null),[error,setError]=useState('')
 useEffect(()=>{
  setReady(true)
  ;(window as Window & {__creditPromoStop?:()=>void}).__creditPromoStop?.()
  if(root.current)return startPromotionClock(root.current,PROMO_ENDS_AT,promoSnapshot)
 },[])
 async function buy(packId:string) {
  if(disabled||inFlight.current)return
  inFlight.current=true;setBusyPack(packId);setError('')
  try{await openSelectedCreditPurchase({locale,packId})}
  catch(caught){setError(creditCheckoutErrorMessage(caught,locale))}
  finally{inFlight.current=false;setBusyPack(null)}
 }
 return <section className="billing-credit-packs" ref={root} aria-labelledby="billing-packs-title">
  <header className="billing-packs-heading"><h2 id="billing-packs-title">{text('Credit packs','积分包')}</h2><p className="credit-pack-terms-summary">{creditPackTerms(locale)}</p></header>
  <div className="credit-pricing-packs">{CREDIT_PACKS.map((pack,index)=><article className={`credit-tier credit-tier-${index}`} data-credit-pack-card data-pack-id={pack.id} key={pack.id}>
   <div className="billing-pack-details" dangerouslySetInnerHTML={{__html:renderPricingPack(pack,locale,{detailsOnly:true})}} suppressHydrationWarning/>
   <button type="button" className="credit-tier-buy" onClick={()=>void buy(pack.id)} disabled={!ready||disabled||busyPack!==null} aria-busy={busyPack===pack.id}>{busyPack===pack.id?text('Opening checkout…','正在打开付款…'):text(`Buy ${pack.credits} credits · US$${creditPackValue(pack).price}`,`购买 ${pack.credits} 积分 · US$${creditPackValue(pack).price}`)}</button>
  </article>)}</div>
  <script dangerouslySetInnerHTML={{__html:promotionBootstrap()}}/>
  {error&&<p className="billing-purchase-error" role="alert">{error}</p>}
  <PurchaseAssurance/>
 </section>
}
