import { createFileRoute } from '@tanstack/react-router'
import { RefundReviewPage } from '../components/refund-review-page'
export const Route=createFileRoute('/refund-review')({head:()=>({meta:[{title:'Refund requests | SEEDANCE 3.0'},{name:'robots',content:'noindex,nofollow'}]}),component:RefundReviewPage})
