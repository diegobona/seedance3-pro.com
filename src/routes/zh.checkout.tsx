import { createFileRoute } from '@tanstack/react-router'
import { CheckoutPage } from '../components/checkout-page'
export const Route = createFileRoute('/zh/checkout')({
  head: () => ({ meta: [{ title: '付款 | SEEDANCE 3.0' }, { name: 'robots', content: 'noindex,nofollow' }] }),
  component: CheckoutPage,
})
