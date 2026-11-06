import { createFileRoute } from '@tanstack/react-router'
import '@tanstack/react-start'
import { env } from 'cloudflare:workers'
import { refundRouteDependencies } from '../../../lib/refund-route-dependencies'
import { listRefundRequests, reviewRefundRequest } from '../../../lib/refund-requests'
const unavailable=()=>Response.json({code:'REFUND_UNAVAILABLE',error:'Please try again later.'},{status:503,headers:{'cache-control':'no-store'}})
export const Route=createFileRoute('/api/admin/refund-requests')({server:{handlers:{
  GET:async({request})=>{try{return await listRefundRequests(request,refundRouteDependencies(env))}catch{return unavailable()}},
  POST:async({request})=>{try{return await reviewRefundRequest(request,refundRouteDependencies(env))}catch{return unavailable()}},
}}})
