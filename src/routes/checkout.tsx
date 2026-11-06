import { createFileRoute } from '@tanstack/react-router'
import { CheckoutPage } from '../components/checkout-page'
export const Route = createFileRoute('/checkout')({
  head: () => ({ meta: [{ title: 'Checkout | SEEDANCE 3.0' }, { name: 'robots', content: 'noindex,nofollow' }] }),
  component: CheckoutPage,
})
