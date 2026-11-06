import { createFileRoute } from '@tanstack/react-router'
import '@tanstack/react-start'
import { env } from 'cloudflare:workers'
import { refundRouteDependencies } from '../../../lib/refund-route-dependencies'
import { stripeRouteDependencies } from '../../../lib/stripe-route-dependencies'
import { authorizeRefundSync } from '../../../lib/refund-requests'
import { syncStripeRefundStatus } from '../../../lib/stripe-payments'
export const Route=createFileRoute('/api/admin/refund-requests/sync')({server:{handlers:{POST:async({request})=>{
  try{
    const deps=refundRouteDependencies(env),authorization=await authorizeRefundSync(request,deps)
    if(authorization.response)return authorization.response
    const item=authorization.item
    if(!item.paymentIntentId||item.liveMode!==(env.STRIPE_MODE==='live'))return Response.json({error:'Payment is not available for this mode.'},{status:409,headers:{'cache-control':'no-store'}})
    await syncStripeRefundStatus(request,stripeRouteDependencies(env),item.paymentIntentId)
    return Response.json({request:await deps.store.adminRequest(item.id)},{headers:{'cache-control':'no-store'}})
  }catch{return Response.json({error:'Could not sync Stripe refund status. Please retry.'},{status:503,headers:{'cache-control':'no-store'}})}
}}}})
