import { createFileRoute } from '@tanstack/react-router'
import { RefundReviewPage } from '../components/refund-review-page'
export const Route=createFileRoute('/zh/refund-review')({head:()=>({meta:[{title:'退款申请管理 | SEEDANCE 3.0'},{name:'robots',content:'noindex,nofollow'}]}),component:RefundReviewPage})
