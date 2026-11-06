import type { RefundAdminView, RefundRequestStore } from '../db/refund-requests'
import { SUPPORT_EMAIL } from '../../app/site-trust.mjs'
import { createRefundRequestStore } from '../db/refund-requests'

const escape=(value:string)=>value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;')
export type RefundEmailMessage={from:string;to:string;subject:string;text:string;html:string}
export type RefundMailEnvironment={RESEND_API_KEY?:string;REFUND_EMAIL_FROM?:string}
export function refundNotification(request:RefundAdminView):RefundEmailMessage {
  const url='https://seedance3-pro.com/zh/refund-review?request='+encodeURIComponent(request.id)
  const amount=new Intl.NumberFormat('en-US',{style:'currency',currency:request.currency}).format(request.amount/100)
  const text=`收到新的退款申请 / New refund request\n\n用户邮箱: ${request.email}\n订单号: ${request.orderId}\n申请编号: ${request.id}\n订单金额: ${amount}\n购买时间: ${request.orderCreatedAt}\n申请时间: ${request.createdAt}\n\n申请原因:\n${request.reason}\n\n查看并审核: ${url}\n\n此邮件仅通知申请。批准申请不会自动退款，请在 Stripe 后台手动操作。`
  return {from:'refunds@notify.seedance3-pro.com',to:SUPPORT_EMAIL,subject:`[Seedance] New refund request · ${request.orderId}`,text,
    html:`<h2>新的退款申请 / New refund request</h2><p>用户：${escape(request.email)}</p><p>订单：${escape(request.orderId)}<br>金额：${escape(amount)}<br>购买时间：${escape(request.orderCreatedAt)}<br>申请时间：${escape(request.createdAt)}</p><h3>申请原因</h3><p style="white-space:pre-wrap">${escape(request.reason)}</p><p><a href="${url}">查看并审核申请</a></p><p>此邮件仅通知申请。批准申请不会自动退款，请在 Stripe 后台手动操作。</p>`}
}
export async function deliverRefundNotifications(store:RefundRequestStore,send:(message:RefundEmailMessage,requestId:string)=>Promise<unknown>,now=Date.now()) {
  for(let i=0;i<5;i++){
    const job=await store.claimNotification(now);if(!job)break
    try {await send(refundNotification(job.request),job.request.id);await store.finishNotification(job.request.id,job.claim,now,true,job.request.notificationAttempts)}
    catch {await store.finishNotification(job.request.id,job.claim,now,false,job.request.notificationAttempts);console.warn(JSON.stringify({event:'refund_notification_retry',requestId:job.request.id}))}
  }
}
export async function sendRefundEmail(env:RefundMailEnvironment,message:RefundEmailMessage,requestId:string,fetcher:typeof fetch=fetch){
  const key=env.RESEND_API_KEY?.trim(),from=env.REFUND_EMAIL_FROM?.trim()
  if(!key||!/^re_[A-Za-z0-9_-]+$/.test(key)||!from||!/^[A-Za-z0-9._+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(from))throw new Error('Refund email is not configured')
  const response=await fetcher('https://api.resend.com/emails',{
    method:'POST',headers:{authorization:`Bearer ${key}`,'content-type':'application/json','idempotency-key':`refund-request-${requestId}`},
    body:JSON.stringify({from,to:[SUPPORT_EMAIL],subject:message.subject,text:message.text,html:message.html}),
    signal:AbortSignal.timeout(15000),
  })
  if(!response.ok)throw new Error(`Refund email provider returned ${response.status}`)
  const result=await response.json() as {id?:string}
  if(!result.id||typeof result.id!=='string')throw new Error('Refund email provider did not accept the message')
  return result.id
}
export async function processRefundNotifications(env:{DB?:D1Database}&RefundMailEnvironment){
  if(!env.RESEND_API_KEY||!env.REFUND_EMAIL_FROM||!env.DB)return
  await deliverRefundNotifications(createRefundRequestStore(env.DB),(message,id)=>sendRefundEmail(env,message,id))
}
