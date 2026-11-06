import { useCallback, useEffect, useRef, useState } from 'react'
import { authClient } from '../lib/auth-client'
import { useSiteI18n } from '../lib/site-i18n'
import { AuthDialog } from './auth-dialog'
import { UserMenu } from './user-menu'
import { SiteLanguageSwitch } from './site-language-switch'
import { SiteTrustFooter } from './site-trust'
import { RefundStatus } from './refund-request-ui'
import type { RefundAdminView } from '../db/refund-requests'
import '../styles/auth.css'
import '../styles/billing.css'
import '../styles/refund-requests.css'

export function RefundReviewCard({item,locale,onReview,onSync}:{item:RefundAdminView;locale:string;onReview:(status:'approved'|'rejected',note:string)=>Promise<void>;onSync:()=>Promise<void>}) {
  const zh=locale==='zh',t=(en:string,zhText:string)=>zh?zhText:en
  const [note,setNote]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('')
  const action=async(run:()=>Promise<void>)=>{if(busy)return;setBusy(true);setError('');try{await run()}catch(error){setError(error instanceof Error?error.message:t('Please retry.','请重试。'))}finally{setBusy(false)}}
  const stripe=item.paymentIntentId&&/^pi_[A-Za-z0-9_]+$/.test(item.paymentIntentId)?`https://dashboard.stripe.com/${item.liveMode?'':'test/'}payments/${item.paymentIntentId}`:null
  return <article className="refund-review-card" id={'request-'+item.id}>
    <div className="refund-review-heading"><h2>{item.email}</h2><strong>{new Intl.NumberFormat(zh?'zh-CN':'en-US',{style:'currency',currency:item.currency}).format(item.amount/100)}</strong></div>
    <div className="refund-review-meta"><span>{t('Purchased: ','购买时间：')}{new Date(item.orderCreatedAt).toLocaleString(zh?'zh-CN':'en-US')}</span><span>{t('Requested: ','申请时间：')}{new Date(item.createdAt).toLocaleString(zh?'zh-CN':'en-US')}</span></div>
    <code>{t('Order: ','订单号：')}{item.orderId}</code>
    <p className="refund-user-text">{item.reason}</p>
    <RefundStatus request={item} locale={locale} currency={item.currency}/>
    <p className="refund-notification-state">{item.notificationSentAt?t('Notification sent to your Gmail.','通知已发送至你的 Gmail。'):t('Email notification queued for delivery or retry.','邮件通知等待发送或重试。')}</p>
    {item.status==='pending'&&item.paymentStatus==='none'&&<>
      <label htmlFor={'review-note-'+item.id}>{t('Message visible to the customer (required when declining)','用户可见的处理说明（拒绝时必填）')}</label>
      <textarea id={'review-note-'+item.id} maxLength={2000} value={note} onChange={event=>setNote(event.target.value)} disabled={busy}/>
      <div className="refund-review-actions"><button type="button" disabled={busy} onClick={()=>void action(()=>onReview('approved',note.trim()))}>{t('Approve request','批准申请')}</button><button type="button" className="refund-reject" disabled={busy||note.trim().length<5} onClick={()=>void action(()=>onReview('rejected',note.trim()))}>{t('Decline request','拒绝申请')}</button></div>
    </>}
    <div className="refund-review-actions">{stripe&&<a href={stripe} target="_blank" rel="noopener noreferrer">{t('Open payment in Stripe ↗','在 Stripe 查看付款 ↗')}</a>}<button type="button" disabled={busy||!item.paymentIntentId} onClick={()=>void action(onSync)}>{t('Sync refund status','同步退款状态')}</button></div>
    <p className="refund-review-notice">{t('Approving a request only updates the review status. Issue the refund manually in Stripe; the payment result will sync here.','批准申请仅更新审核状态。请在 Stripe 中手动退款，实际退款结果会同步显示。')}</p>
    {error&&<p className="refund-error" role="alert">{error}</p>}
  </article>
}

type ReviewPage={requests:RefundAdminView[];nextCursor:string|null}
export function RefundReviewPage(){
  const {locale,path}=useSiteI18n(),zh=locale==='zh',t=(en:string,zhText:string)=>zh?zhText:en
  const {data:session}=authClient.useSession(),owner=session?.user.id
  const ownerRef=useRef(owner);ownerRef.current=owner
  const version=useRef(0)
  const [state,setState]=useState<{owner:string;page:ReviewPage}|null>(null)
  const [error,setError]=useState(''),[loading,setLoading]=useState(false),[authOpen,setAuthOpen]=useState(false),[filtered,setFiltered]=useState(false)
  const page=state&&state.owner===owner?state.page:null
  const load=useCallback(async(cursor?:string)=>{
    if(!owner)return
    const token=++version.current;setLoading(true);setError('')
    const id=new URL(window.location.href).searchParams.get('request')
    setFiltered(Boolean(id))
    try{
      const query=id?'?id='+encodeURIComponent(id):cursor?'?cursor='+encodeURIComponent(cursor):''
      const response=await fetch('/api/admin/refund-requests'+query,{credentials:'same-origin',cache:'no-store'})
      if(!response.ok)throw Error(response.status===403?'forbidden':response.status===401?'auth':'load')
      const data=await response.json() as ReviewPage
      if(ownerRef.current!==owner||token!==version.current)return
      setState(previous=>({owner,page:cursor&&previous?.owner===owner?{...data,requests:[...previous.page.requests,...data.requests.filter(item=>!previous.page.requests.some(old=>old.id===item.id))]}:data}))
    }catch(error){if(ownerRef.current===owner&&token===version.current)setError(error instanceof Error?error.message:'load')}
    finally{if(ownerRef.current===owner&&token===version.current)setLoading(false)}
  },[owner])
  useEffect(()=>{setState(null);setError('');if(owner)void load();return()=>{version.current++}},[owner,load])
  const update=async(item:RefundAdminView,kind:'review'|'sync',status?:'approved'|'rejected',note?:string)=>{
    const currentOwner=owner
    const response=await fetch('/api/admin/refund-requests'+(kind==='sync'?'/sync':''),{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({id:item.id,status,note,version:item.version})})
    const result=await response.json() as {request:RefundAdminView}
    if(ownerRef.current!==currentOwner)return
    if(!response.ok)throw Error(response.status===409?t('Already updated. Refresh the list.','申请已被更新，请刷新列表。'):t('Could not update. Check your access and try again.','更新失败，请确认权限后重试。'))
    setState(previous=>previous&&previous.owner===currentOwner?{...previous,page:{...previous.page,requests:previous.page.requests.map(old=>old.id===item.id?result.request:old)}}:previous)
  }
  return <div className="billing-page"><header className="billing-header"><a href={path('/billing#orders')}>SEEDANCE 3.0</a><div><SiteLanguageSwitch/><UserMenu onLogin={()=>setAuthOpen(true)}/></div></header>
    <main><a href={path('/billing#orders')}>{t('← Order history','← 订单记录')}</a><h1>{t('Refund requests','退款申请管理')}</h1>
      <p>{t('Review requests here, then handle approved refunds in Stripe.','在这里审核用户申请，获批的退款由你在 Stripe 中手动处理。')}</p>
      {!owner?<button onClick={()=>setAuthOpen(true)}>{t('Log in','登录')}</button>:<>
        <div className="refund-review-actions"><button onClick={()=>void load()} disabled={loading}>{loading?t('Loading…','加载中…'):t('Refresh','刷新')}</button>{filtered&&<button onClick={()=>{window.history.replaceState(null,'',window.location.pathname);void load()}}>{t('All requests','查看全部申请')}</button>}</div>
        {error&&<p className="refund-error" role="alert">{error==='forbidden'?t('This account does not have refund review access.','此账户没有退款审核权限。'):error==='auth'?t('Please log in again.','请重新登录。'):t('Could not load requests. Please retry.','加载失败，请重试。')}</p>}
        {!error&&page&&<div className="refund-review-list">{!page.requests.length?<p>{t('No refund requests yet.','暂无退款申请。')}</p>:page.requests.map(item=><RefundReviewCard key={item.id+'-'+item.version} item={item} locale={locale} onReview={(status,note)=>update(item,'review',status,note)} onSync={()=>update(item,'sync')}/>)}</div>}
        {!error&&page?.nextCursor&&<button disabled={loading} onClick={()=>void load(page.nextCursor!)}>{t('Load more','加载更多')}</button>}
      </>}
    </main><SiteTrustFooter/><AuthDialog open={authOpen} onClose={()=>setAuthOpen(false)}/></div>
}
