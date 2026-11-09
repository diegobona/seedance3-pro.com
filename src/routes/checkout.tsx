import { createFileRoute } from '@tanstack/react-router'
import { CheckoutPage } from '../components/checkout-page'
import { pricingDescription } from '../../assets/credit-packs.mjs'
export const Route = createFileRoute('/checkout')({
 head: () => ({meta:[{title:'Checkout | SEEDANCE 3.0'},{name:'description',content:pricingDescription('en')},{name:'robots',content:'noindex,nofollow'}]}),
 component: CheckoutPage,
})
