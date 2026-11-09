import { createFileRoute } from '@tanstack/react-router'
import { CheckoutPage } from '../components/checkout-page'
import { pricingDescription } from '../../assets/credit-packs.mjs'
export const Route = createFileRoute('/zh/checkout')({
 head: () => ({meta:[{title:'付款 | SEEDANCE 3.0'},{name:'description',content:pricingDescription('zh')},{name:'robots',content:'noindex,nofollow'}]}),
 component: CheckoutPage,
})
