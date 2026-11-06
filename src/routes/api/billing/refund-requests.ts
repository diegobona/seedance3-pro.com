import { createFileRoute } from '@tanstack/react-router'
import '@tanstack/react-start'
import { env } from 'cloudflare:workers'
import { refundRouteDependencies } from '../../../lib/refund-route-dependencies'
import { submitRefundRequest } from '../../../lib/refund-requests'
export const Route=createFileRoute('/api/billing/refund-requests')({server:{handlers:{POST:async({request})=>{
  try{return await submitRefundRequest(request,refundRouteDependencies(env))}
  catch{return Response.json({code:'REFUND_UNAVAILABLE',error:'Please try again later.'},{status:503,headers:{'cache-control':'no-store'}})}
}}}})
