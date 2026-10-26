import { createFileRoute } from '@tanstack/react-router'
import { BillingPage } from '../components/billing-page'
export const Route = createFileRoute('/billing')({
  head: () => ({ meta: [{ title: 'Credits & billing | SEEDANCE 3.0' }, { name: 'robots', content: 'noindex,follow' }] }),
  component: BillingPage,
})
