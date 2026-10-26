import { useCallback, useEffect, useState } from 'react'
import { authClient } from '../lib/auth-client'
import { useSiteI18n } from '../lib/site-i18n'
import { AuthDialog } from './auth-dialog'
import { UserMenu } from './user-menu'
import { SiteLanguageSwitch } from './site-language-switch'
import { CreditPackPurchase } from './credit-pack-purchase'
import { SiteTrustFooter } from './site-trust'
import { SUPPORT_EMAIL } from '../../app/site-trust.mjs'
import { verifiedCheckoutStatus } from '../../app/daily-credits.mjs'
import '../styles/auth.css'
import '../styles/billing.css'

interface Order {
  id: string
  sessionId: string | null
  createdAt: string
  status: 'pending' | 'paid' | 'reversed'
  amount: number
  currency: string
  credits: number
  revokedCredits: number
}
interface BillingHistory { checkoutEnabled: boolean; billingHold: boolean; orders: Order[] }
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
  const [history, setHistory] = useState<BillingHistory | null>(null)
  const [usage, setUsage] = useState<CreditEntry[] | null>(null)
  const [usageError, setUsageError] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState({ checkout: '', sessionId: '' })
  const load = useCallback(async (signal?: AbortSignal) => {
    const usageRequest = fetch('/api/credits/history', { credentials: 'same-origin', signal })
      .then(async response => {
        if (!response.ok) throw new Error('usage')
        const result = await response.json() as { entries: CreditEntry[] }
        if (!signal?.aborted) { setUsage(result.entries); setUsageError(false) }
      }).catch(() => { if (!signal?.aborted) setUsageError(true) })
    try {
      const response = await fetch('/api/billing/history', { credentials: 'same-origin', signal })
      if (!response.ok) throw new Error('history')
      const result = await response.json() as BillingHistory
      if (!signal?.aborted) { setHistory(result); setError('') }
    } catch {
      if (!signal?.aborted) setError('history')
    }
    await usageRequest
  }, [])

  useEffect(() => {
    const search = new URLSearchParams(window.location.search)
    setQuery({ checkout: search.get('checkout') || '', sessionId: search.get('session_id') || '' })
  }, [])
  useEffect(() => {
    setHistory(null)
    setUsage(null)
    setUsageError(false)
    setError('')
    if (!session?.user.id) return
    const controller = new AbortController()
    void load(controller.signal)
    const refresh = () => { void load(controller.signal) }
    window.addEventListener('focus', refresh)
    return () => { controller.abort(); window.removeEventListener('focus', refresh) }
  }, [session?.user.id, load])

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

  const orderStatus = (value: string) => value === 'paid' ? text('Paid · credits added', '支付完成 · 积分已到账')
    : value === 'reversed' ? text('Reversed · credits adjusted', '退款或撤销 · 积分已调整') : text('Pending confirmation', '等待支付确认')

  return <div className="billing-page">
    <header className="billing-header"><a href={path('/app')}>SEEDANCE 3.0</a><div><SiteLanguageSwitch /><UserMenu onLogin={() => setAuthOpen(true)} /></div></header>
    <main>
      <a href={path('/app')}>{text('← Back to studio', '← 返回工作室')}</a>
      <h1>{text('Credits & billing', '积分与账单')}</h1>
      <p>{text('5 daily credits for every signed-in account, including purchasers. Daily credits reset at 00:00 Asia/Shanghai and do not accumulate. Purchased credits never expire.', '所有登录账户（包括付费用户）每天获得 5 积分。每日积分在北京时间 00:00 重置，不累积；购买积分永久有效。')}</p>
      <p>{text('1 credit per image. 1 credit per video second at 1080P. Daily credits are used first; the studio shows the exact split before generation.', '每张图片 1 积分，1080P 视频每秒 1 积分。优先扣除每日积分，生成前可查看具体扣费组成。')}</p>
      <p>{text('The daily 5 credits cover up to 5 images or one 5-second video, shared across both tools.', '每日 5 积分最多可生成 5 张图片或 1 条 5 秒视频，图片和视频共用额度。')}</p>
      <p>{text('Each network shares a daily limit of 10 free credits across guest and registered image/video generation. This limit resets at 00:00 Asia/Shanghai. Purchased credits are excluded.', '同一网络每天共享 10 积分免费额度，游客和注册用户生成图片、视频均计入；北京时间 00:00 重置，购买积分不受此上限影响。')}</p>
      {status && <div className="billing-status" role="status">{status === 'paid'
        ? text('Payment verified. 500 purchased credits have been added.', '支付已核实，500 购买积分已到账。')
        : status === 'cancelled' ? text('Checkout cancelled. No credits were added by this checkout.', '已取消结账，本次结账未增加积分。')
        : status === 'reversed' ? text('This payment was reversed. See the updated order below.', '此笔支付已退款或撤销，请查看下方订单。')
        : text('Waiting for server payment confirmation. Credits will appear after verification. You can refresh the history below.', '等待服务器确认支付，核实后积分将到账。你可以刷新下方记录。')}</div>}
      <section className="billing-pack">
        <p>{text('ONE-TIME CREDIT PACK', '一次性积分包')}</p><h2>500 {text('credits', '积分')}</h2>
        <strong className="billing-price">US$4.99</strong>
        <div className="billing-pack-output">
          <div><strong>500</strong><span>{text('images', '张图片')}</span></div>
          <span className="billing-pack-or">{text('OR', '或')}</span>
          <div><strong>500<span className="billing-pack-unit">{text('sec', '秒')}</span></strong><span>{text('of video in total', '视频总时长')}</span></div>
        </div>
        <p className="billing-pack-flexibility"><strong>{text('Purchased credits never expire', '购买积分永久有效')}</strong></p>
        <p>{text('No subscription, auto-renewal or bonus credits.', '无订阅、无自动续费、无赠送积分。')}</p>
        <CreditPackPurchase disabled={Boolean(session?.user && (!history?.checkoutEnabled || history.billingHold))} />
        {session?.user && history && !history.checkoutEnabled && !history.billingHold && <p role="status">{text('Purchases are not available yet. Payment setup is being completed.', '购买暂未开放，支付配置尚未完成。')}</p>}
        {(history?.billingHold || error === 'hold') && <p role="alert">{text('Purchases and generation are paused while a refunded or disputed payment is reviewed. ', '退款或争议订单审核期间暂停购买与生成。')}<a href={`mailto:${SUPPORT_EMAIL}`}>{text('Contact support for help.', '联系客服处理。')}</a></p>}
      </section>
      {session?.user && <section className="billing-history"><h2>{text('Generation credit history', '生成积分记录')}</h2>
        <p>{text('Reserved credits are held for pending work. Settled entries show the final charge. Refunds return to their original source; expired daily credits do not carry over.', '预扣积分用于进行中的任务；已结算记录显示实际扣费。退款返回原积分来源，过期的每日积分不结转。')}</p>
        {usageError ? <p role="alert">{text('Could not load generation history. Refresh history to retry.', '无法加载生成记录，请刷新重试。')}</p>
          : !usage ? <p>{text('Loading credit history…', '正在加载积分记录…')}</p>
          : !usage.length ? <p>{text('No generation records yet.', '暂无生成记录。')}</p>
          : <div className="billing-table-scroll"><table><thead><tr><th>{text('Date', '日期')}</th><th>{text('Type', '类型')}</th><th>{text('Credits', '积分')}</th><th>{text('Daily / purchased', '每日 / 购买')}</th><th>{text('Status', '状态')}</th></tr></thead><tbody>
            {usage.map(entry => <tr key={entry.id}><td>{new Date(entry.createdAt).toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US')}</td><td>{entry.kind === 'image' ? text('Image', '图片') : text('Video', '视频')}</td><td>{entry.credits}</td><td>{entry.dailyCredits} / {entry.paidCredits}</td><td>{entry.status === 'reserved' ? text('Reserved · pending', '预扣 · 进行中') : entry.status === 'refunded' ? text('Refunded', '已退还') : text('Settled', '已结算')}</td></tr>)}
          </tbody></table></div>}
      </section>}
      {error && error !== 'hold' && <p role="alert">{error === 'history'
        ? text('Could not load billing history. Try refreshing below.', '无法加载账单记录，请点击下方刷新。')
        : error === 'unavailable' ? text('Payment setup is incomplete. Purchases are temporarily unavailable.', '支付配置尚未完成，暂时无法购买。')
        : text('Could not open checkout. Please try again.', '无法打开支付页面，请重试。')}</p>}
      <section className="billing-history"><h2>{text('Order & credit history', '订单与积分记录')}</h2>
        {session?.user ? <><button type="button" onClick={() => void load()}>{text('Refresh history', '刷新记录')}</button>
          {!history ? <p>{text('Loading orders…', '正在加载订单…')}</p> : !history.orders.length ? <p>{text('No purchases yet.', '暂无购买记录。')}</p>
            : <div className="billing-table-scroll"><table><thead><tr><th>{text('Date', '日期')}</th><th>{text('Order', '订单')}</th><th>{text('Amount', '金额')}</th><th>{text('Credits', '积分')}</th><th>{text('Status', '状态')}</th></tr></thead><tbody>
              {history.orders.map(order => <tr key={order.id}><td>{new Date(order.createdAt).toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US')}</td><td>{order.id}</td><td>{new Intl.NumberFormat(locale, { style: 'currency', currency: order.currency }).format(order.amount / 100)}</td><td>{order.status === 'paid' ? '+' : ''}{order.credits}{order.revokedCredits > 0 ? ` / −${order.revokedCredits}` : ''}</td><td>{orderStatus(order.status)}</td></tr>)}
            </tbody></table></div>}</> : <p>{text('Log in to see your purchases and credit grants.', '登录后查看购买与积分到账记录。')}</p>}
      </section>
      <p>{text('Guests can try 2 images and 10 video seconds in total. On sign-up, today’s guest usage counts toward the daily 5 credits.', '游客总共可体验 2 张图片和 10 秒视频。注册时，当日游客用量计入当天 5 积分额度。')}</p>
    </main>
    <SiteTrustFooter />
    <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} />
  </div>
}
