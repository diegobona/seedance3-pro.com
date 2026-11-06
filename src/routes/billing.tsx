import { createFileRoute, redirect } from '@tanstack/react-router'
import { BillingPage } from '../components/billing-page'
import { legacyCreditCheckoutUrl } from '../../assets/credit-checkout.mjs'
export const Route = createFileRoute('/billing')({
  beforeLoad: ({ location }) => {
    const destination = legacyCreditCheckoutUrl(location.searchStr)
    if (destination) throw redirect({ href: destination, replace: true })
  },
  head: () => ({ meta: [{ title: 'Order history & billing | SEEDANCE 3.0' }, { name: 'robots', content: 'noindex,follow' }] }),
  component: BillingPage,
})
