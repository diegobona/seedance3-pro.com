import { createFileRoute, redirect } from '@tanstack/react-router'
import { BillingPage } from '../components/billing-page'
import { legacyCreditCheckoutUrl } from '../../assets/credit-checkout.mjs'
export const Route = createFileRoute('/zh/billing')({
  beforeLoad: ({ location }) => {
    const destination = legacyCreditCheckoutUrl(location.searchStr, 'zh')
    if (destination) throw redirect({ href: destination, replace: true })
  },
  head: () => ({ meta: [{ title: '订单记录与账单 | SEEDANCE 3.0' }, { name: 'robots', content: 'noindex,follow' }] }),
  component: BillingPage,
})
