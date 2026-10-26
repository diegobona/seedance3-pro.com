import { useCallback, useEffect, useRef, useState } from 'react'
import { authClient } from '../lib/auth-client'
import { useSiteI18n } from '../lib/site-i18n'
import { PurchaseAssurance } from './site-trust'
import { AuthDialog } from './auth-dialog'
import { requestCreditCheckout, openCreditPurchase, rememberCheckoutIntent, hasCheckoutIntent, clearCheckoutIntent } from '../../assets/credit-checkout.mjs'

export function CreditPackPurchase({ className, disabled = false, showAssurance = true }: { className?: string; disabled?: boolean; showAssurance?: boolean }) {
  const { locale } = useSiteI18n()
  const { data: session, isPending } = authClient.useSession()
  const [authOpen, setAuthOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const inFlight = useRef(false)
  const loginRequested = useRef(false)
  const text = (en: string, zh: string) => locale === 'zh' ? zh : en
  const start = useCallback(async () => {
    if (inFlight.current) return
    inFlight.current = true
    clearCheckoutIntent()
    setBusy(true)
    setError('')
    try {
      window.location.assign(await requestCreditCheckout({ locale }))
      // Keep the action locked until navigation completes.
    } catch (caught) {
      const code = (caught as { code?: string })?.code
      if (code === 'AUTH_REQUIRED') {
        rememberCheckoutIntent({ path: window.location.pathname })
        loginRequested.current = true
        setAuthOpen(true)
      } else {
        setError(code === 'BILLING_HOLD' ? 'hold' : code === 'BILLING_UNAVAILABLE' ? 'unavailable' : 'checkout')
      }
      inFlight.current = false
      setBusy(false)
    }
  }, [locale])

  useEffect(() => {
    if (isPending) return
    const url = new URL(window.location.href)
    const requested = url.searchParams.get('checkout') === 'start'
    if (requested) {
      url.searchParams.delete('checkout')
      window.history.replaceState(window.history.state, '', url.href)
      rememberCheckoutIntent({ path: window.location.pathname })
    }
    if (!hasCheckoutIntent({ path: window.location.pathname })) return
    if (session?.user.id) void start()
    else if (requested) { loginRequested.current = true; setAuthOpen(true) }
    else if (!authOpen) clearCheckoutIntent()
  }, [isPending, session?.user.id, start, authOpen])

  useEffect(() => {
    const restore = (event: PageTransitionEvent) => {
      if (!event.persisted) return
      inFlight.current = false
      loginRequested.current = false
      clearCheckoutIntent()
      setBusy(false)
      setAuthOpen(false)
    }
    window.addEventListener('pageshow', restore)
    return () => window.removeEventListener('pageshow', restore)
  }, [])

  const closeAuth = useCallback(() => { loginRequested.current = false; setAuthOpen(false); clearCheckoutIntent() }, [])
  async function buy() {
    if (disabled || isPending || inFlight.current) return
    inFlight.current = true
    setBusy(true)
    setError('')
    try { await openCreditPurchase({ locale }) }
    catch { setError('checkout') }
    finally { inFlight.current = false; setBusy(false) }
  }

  return <div className="credit-pack-purchase">
    <button type="button" className={className} onClick={buy} disabled={disabled || isPending || busy} aria-busy={busy}>
      {busy ? text('Opening checkout…', '正在打开付款…') : text('Buy credit pack', '购买积分包')}
      {!busy && <span aria-hidden="true"> ↗</span>}
    </button>
    {showAssurance && <PurchaseAssurance />}
    {error && <p className="credit-pack-error" role="alert">{error === 'hold'
      ? text('Your payment needs review. Please contact support.', '账户支付需要审核，请联系支持。')
      : error === 'unavailable' ? text('Purchases are temporarily unavailable. Please try again later.', '暂时无法购买，请稍后重试。')
      : text('Could not open checkout. Please try again.', '无法打开付款页面，请重试。')}</p>}
    <AuthDialog open={authOpen} onClose={closeAuth} onAuthenticated={() => {
      if (!loginRequested.current) return
      loginRequested.current = false
      setAuthOpen(false)
      void start()
    }} />
  </div>
}
