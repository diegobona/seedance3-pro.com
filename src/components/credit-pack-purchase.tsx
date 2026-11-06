import { useCallback, useEffect, useRef, useState } from 'react'
import { authClient } from '../lib/auth-client'
import { useSiteI18n } from '../lib/site-i18n'
import { PurchaseAssurance } from './site-trust'
import { AuthDialog } from './auth-dialog'
import { normalizeCreditReturn, currentCreditReturn } from '../../assets/credit-return.mjs'
import { openCreditPurchase, rememberCheckoutIntent, hasCheckoutIntent, clearCheckoutIntent, creditCheckoutErrorMessage } from '../../assets/credit-checkout.mjs'

export function CreditPackPurchase({ className, disabled = false, showAssurance = true }: { className?: string; disabled?: boolean; showAssurance?: boolean }) {
  const { locale } = useSiteI18n()
  const { data: session, isPending } = authClient.useSession()
  const [authOpen, setAuthOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const inFlight = useRef(false)
  const loginRequested = useRef(false)
  const purchaseRoot = useRef<HTMLDivElement>(null)
  const returnTarget = useRef<string | null>(null)
  const text = (en: string, zh: string) => locale === 'zh' ? zh : en
  const start = useCallback(async () => {
    if (inFlight.current) return
    inFlight.current = true
    clearCheckoutIntent()
    setBusy(true)
    setError('')
    try {
      await openCreditPurchase({ locale, returnTo: returnTarget.current || currentCreditReturn() })
      inFlight.current = false
      setBusy(false)
      // Keep the action locked until navigation completes.
    } catch (caught) {
      const code = (caught as { code?: string })?.code
      if (code === 'AUTH_REQUIRED') {
        rememberCheckoutIntent({ path: window.location.pathname })
        loginRequested.current = true
        setAuthOpen(true)
      } else {
        setError(code || 'CHECKOUT_FAILED')
      }
      inFlight.current = false
      setBusy(false)
    }
  }, [locale])

  useEffect(() => {
    if (isPending) return
    const url = new URL(window.location.href)
    const requested = url.searchParams.get('checkout') === 'start'
    returnTarget.current = normalizeCreditReturn(url.searchParams.get('return_to')) || currentCreditReturn()
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
    catch (caught) { setError((caught as { code?: string })?.code || 'CHECKOUT_FAILED') }
    finally { inFlight.current = false; setBusy(false) }
  }

  useEffect(() => {
    const card = purchaseRoot.current?.closest('.studio-trial-actions, .billing-pack')
    if (!card) return
    const click = (event: Event) => {
      if (!(event.target as Element).closest('a,button,input,select,textarea')) purchaseRoot.current?.querySelector('button')?.click()
    }
    card.addEventListener('click', click)
    return () => card.removeEventListener('click', click)
  }, [])

  return <div className="credit-pack-purchase" ref={purchaseRoot}>
    <button type="button" className={className} onClick={buy} disabled={disabled || isPending || busy} aria-busy={busy}>
      {busy ? text('Choose a pack…', '选择积分包…') : text('Buy Credits', '购买积分')}
      {!busy && <span aria-hidden="true"> ↗</span>}
    </button>
    {showAssurance && <PurchaseAssurance />}
    {error && <p className="credit-pack-error" role="alert">{creditCheckoutErrorMessage({ code: error }, locale)}</p>}
    <AuthDialog open={authOpen} onClose={closeAuth} onAuthenticated={() => {
      if (!loginRequested.current) return
      loginRequested.current = false
      setAuthOpen(false)
      void start()
    }} />
  </div>
}
