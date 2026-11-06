import { useEffect, useRef, useState } from 'react'
import type { RefundRequestView } from '../db/refund-requests'

export function refundStatusLabel(request:RefundRequestView,zh:boolean) {
  const labels:Record<string,[string,string]>={
    pending:['Refund processing','退款处理中'],requires_action:['Refund needs attention','退款需进一步处理'],
    succeeded:['Refund issued','已退款'],partial:['Partially refunded','已部分退款'],failed:['Refund failed · under review','退款失败 · 待处理'],canceled:['Refund canceled','退款已取消'],
  }
  if(request.paymentStatus!=='none')return labels[request.paymentStatus][zh?1:0]
  return ({pending:['Under review','审核中'],approved:['Approved · awaiting refund','已批准 · 待退款'],rejected:['Not approved','未批准']} as const)[request.status][zh?1:0]
}
export function RefundStatus({request,locale,currency='usd'}:{request:RefundRequestView;locale:string;currency?:string}) {
  const zh=locale==='zh'
  return <div className="refund-status">
    <span className={`refund-status-label is-${request.paymentStatus==='none'?request.status:request.paymentStatus}`}>{refundStatusLabel(request,zh)}</span>
    <details><summary>{zh?'申请详情':'View request'}</summary>
      <p>{zh?'提交于 ':'Submitted '}{new Date(request.createdAt).toLocaleString(zh?'zh-CN':'en-US')}</p>
      <p className="refund-user-text">{request.reason}</p>
      {request.note&&<p className="refund-review-note"><strong>{zh?'处理说明：':'Review note: '}</strong>{request.note}</p>}
      {request.refundedAmount>0&&<p>{zh?'已退金额：':'Amount refunded: '}{new Intl.NumberFormat(zh?'zh-CN':'en-US',{style:'currency',currency}).format(request.refundedAmount/100)}</p>}
      {request.paymentStatus==='succeeded'&&<p>{zh?'款项退回原支付方式，银行到账可能需要数个工作日。':'Sent to your original payment method. Your bank may take several business days to post it.'}</p>}
      {request.status==='approved'&&request.paymentStatus==='none'&&<p>{zh?'申请已获批准，正在等待人工办理退款。':'Your request is approved and awaiting manual payment processing.'}</p>}
    </details>
  </div>
}
export function RefundRequestDialog({orderId,amount,currency,locale,onClose,onSubmit}:{orderId:string;amount:number;currency:string;locale:string;onClose:()=>void;onSubmit:(reason:string)=>Promise<void>}) {
  const zh=locale==='zh',dialog=useRef<HTMLDialogElement>(null)
  const [reason,setReason]=useState(''),[pending,setPending]=useState(false),[error,setError]=useState('')
  useEffect(()=>{dialog.current?.showModal();return()=>dialog.current?.close()},[])
  return <dialog ref={dialog} className="refund-dialog" aria-labelledby="refund-title" onCancel={event=>{if(pending)event.preventDefault();else onClose()}}>
    <form onSubmit={async event=>{
      event.preventDefault()
      if(pending)return
      setPending(true)
      setError('')
      try {
        await onSubmit(reason.trim())
        onClose()
      } catch(error) {
        setError(error instanceof Error?error.message:(zh?'提交失败，请重试。':'Could not submit. Please retry.'))
      } finally {
        setPending(false)
      }
    }}>
      <div className="refund-dialog-title"><h2 id="refund-title">{zh?'申请退款':'Request a refund'}</h2><button type="button" aria-label={zh?'关闭':'Close'} disabled={pending} onClick={onClose}>×</button></div>
      <p className="refund-dialog-order"><strong>{new Intl.NumberFormat(zh?'zh-CN':'en-US',{style:'currency',currency}).format(amount/100)}</strong><span>{orderId}</span></p>
      <p>{zh?'提交后我们会人工审核，你可以在订单记录查看处理进度。':'We will review your request. You can track its progress in your order history.'}</p>
      <label htmlFor="refund-reason">{zh?'退款原因':'Reason for your request'}</label>
      <textarea id="refund-reason" required minLength={5} maxLength={2000} value={reason} disabled={pending} onChange={event=>setReason(event.target.value)} placeholder={zh?'请简要说明原因，如误购、重复付款或未收到积分。':'Briefly explain the issue, such as an accidental purchase, duplicate charge or missing credits.'} />
      <p className="refund-dialog-hint">{zh?'请勿填写银行卡号、密码或登录令牌。':'Do not include card details, passwords or login tokens.'}</p>
      {error&&<p className="refund-error" role="alert">{error}</p>}
      <div className="refund-dialog-actions"><button type="button" className="refund-secondary" disabled={pending} onClick={onClose}>{zh?'取消':'Cancel'}</button><button type="submit" disabled={pending||reason.trim().length<5}>{pending?(zh?'提交中…':'Submitting…'):(zh?'提交申请':'Submit request')}</button></div>
    </form>
  </dialog>
}
