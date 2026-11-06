import { useSiteI18n } from '../lib/site-i18n'
import '../../assets/credit-pack-offer.css'

export function CreditPackOffer() {
  const { locale } = useSiteI18n()
  const zh = locale === 'zh'

  return <div className="credit-pack-offer">
    <span className="credit-offer-badge"><span aria-hidden="true">✦</span><span>{zh ? '最高赠送 30% 积分' : 'Up to 30% bonus credits'}</span></span>
  </div>
}
