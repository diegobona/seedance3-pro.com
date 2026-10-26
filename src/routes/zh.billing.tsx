import { createFileRoute } from '@tanstack/react-router'
import { BillingPage } from '../components/billing-page'
export const Route = createFileRoute('/zh/billing')({
  head: () => ({ meta: [{ title: '积分与账单 | SEEDANCE 3.0' }, { name: 'robots', content: 'noindex,follow' }] }),
  component: BillingPage,
})
