import { useCallback, useEffect, useRef, useState } from 'react'
import { useSiteI18n } from '../lib/site-i18n'
import { AuthDialog } from './auth-dialog'
import { requestCreditCheckout, creditCheckoutErrorMessage } from '../../assets/credit-checkout.mjs'
import { normalizeCreditReturn } from '../../assets/credit-return.mjs'
import { showCreditPackPicker } from '../../assets/credit-pack-picker.mjs'
import { creditPack } from '../../assets/credit-packs.mjs'
import '../styles/auth.css'
import '../styles/checkout.css'

export function CheckoutPage() {
  const { locale } = useSiteI18n()
  const [status, setStatus] = useState('opening')
  const [authOpen, setAuthOpen] = useState(false)
  const [returnTo, setReturnTo] = useState(locale === 'zh' ? '/zh/app' : '/app')
  const started = useRef(false)
  const inFlight = useRef(false)
  const text = (en: string, zh: string) => locale === 'zh' ? zh : en

  const start = useCallback(async () => {
    if (inFlight.current) return
    inFlight.current = true
    setStatus('opening')
    const requested = normalizeCreditReturn(new URLSearchParams(window.location.search).get('return_to'))
    const target = requested && !/^\/(?:zh\/)?checkout(?:\/|\?|#|$)/.test(requested)
      ? requested : locale === 'zh' ? '/zh/app' : '/app'
    setReturnTo(target)
    try {
      const packId = new URLSearchParams(window.location.search).get('pack')
      if (packId && creditPack(packId)) {
        window.location.replace(await requestCreditCheckout({ locale, returnTo: target, packId }))
      } else {
        setStatus('choosing')
        await showCreditPackPicker({ locale, errorMessage: creditCheckoutErrorMessage, onPurchase: async (selected: string) => {
          const url = new URL(window.location.href); url.searchParams.set('pack', selected)
          window.history.replaceState(window.history.state, '', url.href)
          inFlight.current = false
          await start()
        } })
        inFlight.current = false
        setStatus(current => current === 'choosing' ? 'choose' : current)
      }
    } catch (error) {
      inFlight.current = false
      const code = (error as { code?: string })?.code
      if (code === 'AUTH_REQUIRED') {
        setStatus('auth')
        setAuthOpen(true)
      } else {
        setStatus(code === 'BILLING_HOLD' ? 'hold' : code === 'BILLING_UNAVAILABLE' ? 'unavailable' : 'error')
      }
    }
  }, [locale])

  useEffect(() => {
    if (started.current) return
    started.current = true
    void start()
  }, [start])

  const closeAuth = useCallback(() => {
    // Email login calls onAuthenticated immediately before onClose.
    if (inFlight.current) return
    setAuthOpen(false)
    setStatus('cancelled')
  }, [])

  return <main className="checkout-handoff">
    <div className="checkout-handoff-content">
      <a className="checkout-brand" href={locale === 'zh' ? '/zh/' : '/'}>SEEDANCE 3.0</a>
      <p role={['error', 'hold', 'unavailable'].includes(status) ? 'alert' : 'status'}>
        {status === 'choosing' || status === 'choose' ? text('Choose your credit pack to continue.', '请选择积分包后继续。')
          : status === 'opening' ? text('Opening Stripe Checkout…', '正在打开 Stripe 付款页面…')
          : status === 'auth' || status === 'cancelled' ? text('Sign in to continue to Stripe.', '登录后继续前往 Stripe 付款。')
          : status === 'hold' ? text('Your payment needs review. Please contact support.', '账户支付需要审核，请联系支持。')
          : status === 'unavailable' ? text('Purchases are temporarily unavailable. Please try again later.', '暂时无法购买，请稍后重试。')
          : text('Could not open checkout. Please try again.', '无法打开付款页面，请重试。')}
      </p>
      {status === 'choose' && <button type="button" onClick={() => void start()}>{text('Buy Credits', '购买积分')}</button>}
      {status === 'cancelled' && <button type="button" onClick={() => { setStatus('auth'); setAuthOpen(true) }}>{text('Sign in', '登录')}</button>}
      {['error', 'unavailable'].includes(status) && <button type="button" onClick={() => void start()}>{text('Try again', '重试')}</button>}
      <a className="checkout-back" href={returnTo}>{text('← Back', '← 返回')}</a>
    </div>
    <AuthDialog open={authOpen} onClose={closeAuth} onAuthenticated={() => {
      setAuthOpen(false)
      void start()
    }} />
  </main>
}
