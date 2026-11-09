import { useEffect, useState } from 'react'
import { createCreditOfferClock, subscribeCreditOfferCountdown } from '../../assets/credit-pack-offer.mjs'
import { useSiteI18n } from '../lib/site-i18n'
import '../../assets/credit-pack-offer.css'

export function CreditPackOffer() {
  const { locale } = useSiteI18n()
  const zh = locale === 'zh'
  const [offer, setOffer] = useState(() => createCreditOfferClock()())
  useEffect(() => subscribeCreditOfferCountdown(setOffer), [])
  if (!offer.active) return null

  return <div className="credit-pack-offer">
    <span className="credit-offer-badge"><span aria-hidden="true">✦</span><span>50% OFF</span></span>
    <span className="credit-offer-timer" role="timer" aria-label={zh ? '优惠剩余时间' : 'Offer time remaining'}>{offer.days}{zh ? ' 天 ' : ' days '}{offer.hours}:{offer.minutes}:{offer.seconds}</span>
  </div>
}
