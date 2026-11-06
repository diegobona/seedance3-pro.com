import { REGISTERED_FREE_CREDITS_ENABLED } from '../../app/credit-policy.mjs'
import { useCallback, useEffect, useRef, useState } from 'react'
import { authClient } from '../lib/auth-client'
import { useSiteI18n } from '../lib/site-i18n'
import { AuthDialog } from './auth-dialog'
import { UserMenu } from './user-menu'
import { SiteLanguageSwitch } from './site-language-switch'
import { CreditPackPurchase } from './credit-pack-purchase'
import { CreditPackOffer } from './credit-pack-offer'
import { OrderHistory, type PurchaseOrder } from './order-history'
import { RefundRequestDialog } from './refund-request-ui'
import { SiteTrustFooter } from './site-trust'
import { SUPPORT_EMAIL } from '../../app/site-trust.mjs'
import { verifiedCheckoutStatus } from '../../app/daily-credits.mjs'
import '../styles/auth.css'
import '../styles/billing.css'
import '../styles/refund-requests.css'

interface BillingHistory { checkoutEnabled: boolean; billingHold: boolean; orders: PurchaseOrder[]; nextCursor: string | null; canReviewRefunds?:boolean }
interface CreditEntry {
  id: string; createdAt: string; kind: 'image' | 'video'
  status: 'reserved' | 'settled' | 'refunded'
  credits: number; dailyCredits: number; paidCredits: number
}

export function BillingPage() {
  const { locale, path } = useSiteI18n()
  const text = (en: string, zh: string) => locale === 'zh' ? zh : en
  const { data: session } = authClient.useSession()
  const [authOpen, setAuthOpen] = useState(false)
  const [historyState, setHistory] = useState<{ userId: string; data: BillingHistory } | null>(null)
  const [usageState, setUsage] = useState<{ userId: string; entries: CreditEntry[] } | null>(null)
  const history = historyState?.userId === session?.user.id ? historyState?.data ?? null : null
  const usage = usageState?.userId === session?.user.id ? usageState?.entries ?? null : null
  const requestVersion = useRef(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const [usageError, setUsageError] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState({ checkout: '', sessionId: '' })
  const [refundOrder,setRefundOrder]=useState<{owner:string;order:PurchaseOrder}|null>(null)
  const [refundSubmitted,setRefundSubmitted]=useState<string|null>(null)
  const load = useCallback(async (signal?: AbortSignal) => {
    const userId = session?.user.id
    if (!userId) return
    const version = ++requestVersion.current
    const active = () => !signal?.aborted && version === requestVersion.current
    setLoadingMore(false)
    const usageRequest = fetch('/api/credits/history', { credentials: 'same-origin', cache: 'no-store', signal })
      .then(async response => {
        if (!response.ok) throw new Error('usage')
        const result = await response.json() as { entries: CreditEntry[] }
        if (active()) { setUsage({ userId, entries: result.entries }); setUsageError(false) }
      }).catch(() => { if (active()) setUsageError(true) })
    try {
      const response = await fetch('/api/billing/history', { credentials: 'same-origin', cache: 'no-store', signal })
      if (!response.ok) throw new Error('history')
      const result = await response.json() as BillingHistory
      if (active()) { setHistory({ userId, data: result }); setError('') }
    } catch {
      if (active()) setError('history')
    }
    await usageRequest
  }, [session?.user.id])

  const loadMore = async () => {
    const userId = session?.user.id, cursor = history?.nextCursor
    if (!userId || !cursor || loadingMore) return
    const version = requestVersion.current
    setLoadingMore(true); setError('')
    try {
      const response = await fetch('/api/billing/history?cursor=' + encodeURIComponent(cursor), { credentials: 'same-origin', cache: 'no-store' })
      if (!response.ok) throw new Error('history')
      const page = await response.json() as BillingHistory
      if (version !== requestVersion.current) return
      setHistory(previous => {
        if (previous?.userId !== userId || previous.data.nextCursor !== cursor) return previous
        const ids = new Set(previous.data.orders.map(order => order.id))
        return { userId, data: { ...page, orders: [...previous.data.orders, ...page.orders.filter(order => !ids.has(order.id))] } }
      })
    } catch { if (version === requestVersion.current) setError('more') }
    finally { if (version === requestVersion.current) setLoadingMore(false) }
  }

  useEffect(() => {
    const search = new URLSearchParams(window.location.search)
    setQuery({ checkout: search.get('checkout') || '', sessionId: search.get('session_id') || '' })
  }, [])
  useEffect(() => {
    setHistory(null)
    setUsage(null)
    setUsageError(false)
    setError('')
    setLoadingMore(false)
    setRefundOrder(null)
    setRefundSubmitted(null)
    if (!session?.user.id) return
    const controller = new AbortController()
    void load(controller.signal)
    const refresh = () => { void load(controller.signal) }
    window.addEventListener('focus', refresh)
    return () => { requestVersion.current++; controller.abort(); window.removeEventListener('focus', refresh) }
  }, [session?.user.id, load])

  const submitRefund=async(reason:string)=>{
    if(!refundOrder||refundOrder.owner!==session?.user.id)throw new Error(text('Please log in again.','请重新登录。'))
    const userId=session.user.id,orderId=refundOrder.order.id
    const response=await fetch('/api/billing/refund-requests',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({orderId,reason,locale})})
    const result=await response.json() as {request:PurchaseOrder['refundRequest'];code?:string}
    if(!response.ok)throw new Error(result.code==='AUTH_REQUIRED'?text('Please log in again.','请重新登录。'):result.code==='ORDER_NOT_PAID'||result.code==='ORDER_CHANGED'?text('The order has changed. Refresh your orders and try again.','订单状态已变化，请刷新订单后重试。'):text('Could not submit your request. Please try again.','提交失败，请重试。'))
    setHistory(previous=>previous?.userId===userId?{...previous,data:{...previous.data,orders:previous.data.orders.map(order=>order.id===orderId?{...order,refundRequest:result.request}:order)}}:previous)
    setRefundSubmitted(userId)
  }

  const status = verifiedCheckoutStatus(query.checkout, query.sessionId, history?.orders)
  useEffect(() => {
    if (!session?.user.id || status !== 'pending') return
    const controller = new AbortController()
    let attempts = 0
    const timer = window.setInterval(() => {
      if (++attempts >= 12) window.clearInterval(timer)
      void load(controller.signal)
    }, 5000)
    return () => { window.clearInterval(timer); controller.abort() }
  }, [session?.user.id, status, load])
  useEffect(() => {
    if (status === 'paid') window.dispatchEvent(new Event('focus'))
  }, [status])

  return <div className="billing-page">
    <header className="billing-header"><a href={path('/app')}>SEEDANCE 3.0</a><div><SiteLanguageSwitch /><UserMenu onLogin={() => setAuthOpen(true)} /></div></header>
    <main>
      <a href={path('/app')}>{text('← Back to studio', '← 返回工作室')}</a>
      <h1>{text('Orders & billing', '订单与账单')}</h1>
      <nav className="billing-section-nav" aria-label={text('Billing sections', '账单栏目')}><a href="#orders">{text('Order history', '订单记录')}</a><a href="#credit-history">{text('Credit activity', '积分明细')}</a></nav>
      {history?.canReviewRefunds&&<p><a href={path('/refund-review')}>{text('Review refund requests →','管理退款申请 →')}</a></p>}
      {refundSubmitted===session?.user.id&&<p className="refund-submitted" role="status">{text('Request received. You can track the review under this order.','申请已提交，请在对应订单查看审核进度。')}</p>}
      <OrderHistory locale={locale} signedIn={Boolean(session?.user)} orders={history?.orders ?? null}
        error={error === 'history' ? text('Could not load orders. Please refresh to retry.', '无法加载订单，请点击刷新重试。') : error === 'more' ? text('Could not load more orders. Please try again.', '无法加载更多订单，请重试。') : ''}
        hasMore={Boolean(history?.nextCursor)} loadingMore={loadingMore} onRefresh={() => void load()} onLoadMore={() => void loadMore()} onLogin={() => setAuthOpen(true)} onRequestRefund={order=>{if(session?.user.id)setRefundOrder({owner:session.user.id,order})}} />
      {REGISTERED_FREE_CREDITS_ENABLED && <>
      <p>{text('5 daily credits for every signed-in account, including purchasers. Daily credits reset at 00:00 Asia/Shanghai and do not accumulate. Purchased credits never expire.', '所有登录账户（包括付费用户）每天获得 5 积分。每日积分在北京时间 00:00 重置，不累积；购买积分永久有效。')}</p>
      <p>{text('1 credit per image. 1 credit per video second at 1080P. Daily credits are used first; the studio shows the exact split before generation.', '每张图片 1 积分，1080P 视频每秒 1 积分。优先扣除每日积分，生成前可查看具体扣费组成。')}</p>
      <p>{text('The daily 5 credits cover up to 5 images or one 5-second video, shared across both tools.', '每日 5 积分最多可生成 5 张图片或 1 条 5 秒视频，图片和视频共用额度。')}</p>
      <p>{text('Each network shares a daily limit of 10 free credits across guest and registered image/video generation. This limit resets at 00:00 Asia/Shanghai. Purchased credits are excluded.', '同一网络每天共享 10 积分免费额度，游客和注册用户生成图片、视频均计入；北京时间 00:00 重置，购买积分不受此上限影响。')}</p>
      </>}
      {!REGISTERED_FREE_CREDITS_ENABLED && <>
        <p>{text('Buy credits to generate images and videos. Purchased credits never expire.', '购买积分即可生成图片和视频，购买积分永久有效。')}</p>
        <p>{text('1 credit per image. 1 credit per video second at 1080P. The studio shows the cost before generation.', '每张图片 1 积分，1080P 视频每秒 1 积分。工作室会在生成前显示费用。')}</p>
      </>}
      {status && <div className="billing-status" role="status">{status === 'paid'
        ? text('Payment verified. Your purchased credits have been added.', '支付已核实，购买积分已到账。')
        : status === 'cancelled' ? text('Checkout cancelled. No credits were added by this checkout.', '已取消结账，本次结账未增加积分。')
        : status === 'reversed' ? text('This payment was reversed. See the updated order in your order history.', '此笔支付已退款或撤销，请查看订单记录。')
        : text('Waiting for server payment confirmation. Credits will appear after verification. You can refresh your order history.', '等待服务器确认支付，核实后积分将到账。你可以刷新订单记录。')}</div>}
      <section className="billing-pack">
        <CreditPackOffer />
        <p>{text('ONE-TIME CREDIT PACK', '一次性积分包')}</p><h2>1,100 {text('credits', '积分')}</h2>
        <strong className="billing-price">US$11.90</strong>
        <div className="billing-pack-output">
          <div><strong>1,100</strong><span>{text('images', '张图片')}</span></div>
          <span className="billing-pack-or">{text('OR', '或')}</span>
          <div><strong>1,100<span className="billing-pack-unit">{text('sec', '秒')}</span></strong><span>{text('of video in total', '视频总时长')}</span></div>
        </div>
        <p className="billing-pack-flexibility"><strong>{text('Purchased credits never expire', '购买积分永久有效')}</strong></p>
        <p>{text('No subscription or auto-renewal.', '无订阅、无自动续费。')}</p>
        <CreditPackPurchase disabled={Boolean(session?.user && (!history?.checkoutEnabled || history.billingHold))} />
        {session?.user && history && !history.checkoutEnabled && !history.billingHold && <p role="status">{text('Purchases are not available yet. Payment setup is being completed.', '购买暂未开放，支付配置尚未完成。')}</p>}
        {history?.billingHold && <p role="alert">{text('This account is restricted while a payment issue is reviewed. ', '此账户因支付问题待审核，购买权限暂时受限。')}<a href={`mailto:${SUPPORT_EMAIL}`}>{text('Contact support for help.', '联系客服处理。')}</a></p>}
      </section>
      {session?.user && <section className="billing-history" id="credit-history"><h2>{text('Generation credit history', '生成积分记录')}</h2>
        <p>{REGISTERED_FREE_CREDITS_ENABLED ? text('Reserved credits are held for pending work. Settled entries show the final charge. Refunds return to their original source; expired daily credits do not carry over.', '预扣积分用于进行中的任务；已结算记录显示实际扣费。退款返回原积分来源，过期的每日积分不结转。') : text('Reserved credits are held for pending work. Settled entries show the final charge. Confirmed failures return credits to their original source.', '预扣积分用于进行中的任务；已结算记录显示实际扣费。经确认的生成失败会将积分退回原来源。')}</p>
        {usageError ? <p role="alert">{text('Could not load generation history. Refresh history to retry.', '无法加载生成记录，请刷新重试。')}</p>
          : !usage ? <p>{text('Loading credit history…', '正在加载积分记录…')}</p>
          : !usage.length ? <p>{text('No generation records yet.', '暂无生成记录。')}</p>
          : <div className="billing-table-scroll"><table><thead><tr><th>{text('Date', '日期')}</th><th>{text('Type', '类型')}</th><th>{text('Credits', '积分')}</th>{REGISTERED_FREE_CREDITS_ENABLED && <th>{text('Daily / purchased', '每日 / 购买')}</th>}<th>{text('Status', '状态')}</th></tr></thead><tbody>
            {usage.map(entry => <tr key={entry.id}><td>{new Date(entry.createdAt).toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US')}</td><td>{entry.kind === 'image' ? text('Image', '图片') : text('Video', '视频')}</td><td>{entry.credits}</td>{REGISTERED_FREE_CREDITS_ENABLED && <td>{entry.dailyCredits} / {entry.paidCredits}</td>}<td>{entry.status === 'reserved' ? text('Reserved · pending', '预扣 · 进行中') : entry.status === 'refunded' ? text('Refunded', '已退还') : text('Settled', '已结算')}</td></tr>)}
          </tbody></table></div>}
      </section>}
      <p>{REGISTERED_FREE_CREDITS_ENABLED ? text('Guests can try 2 images and 10 video seconds in total. On sign-up, today’s guest usage counts toward the daily 5 credits.', '游客总共可体验 2 张图片和 10 秒视频。注册时，当日游客用量计入当天 5 积分额度。') : text('Guests can try 2 images and 10 video seconds in total, once. After the trial, log in and buy a credit pack to continue.', '游客仅可一次性体验共 2 张图片和 10 秒视频。体验额度用完后，请登录并购买积分包继续。')}</p>
    </main>
    <SiteTrustFooter />
    <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} />
    {refundOrder&&refundOrder.owner===session?.user.id&&<RefundRequestDialog key={refundOrder.order.id} orderId={refundOrder.order.id} amount={refundOrder.order.amount} currency={refundOrder.order.currency} locale={locale} onClose={()=>setRefundOrder(null)} onSubmit={submitRefund}/>}
  </div>
}
