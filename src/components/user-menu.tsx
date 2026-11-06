import { REGISTERED_FREE_CREDITS_ENABLED } from '../../app/credit-policy.mjs'
import { useSiteI18n } from '../lib/site-i18n'
import { useEffect, useRef, useState } from 'react'
import { authClient } from '../lib/auth-client'
import { millisecondsUntilCreditReset } from '../../app/daily-credits.mjs'
import { DAILY_FREE_CREDIT_GRANT } from '../lib/generation-credits'
import { guestDeviceHeaders } from '../../assets/guest-device.mjs'
import { creditPurchaseUrl, openCreditPurchase } from '../../assets/credit-checkout.mjs'
import { initializeCheckoutReturnStatus } from '../../assets/checkout-return-status.mjs'

interface UserMenuProps {
  onLogin: () => void
}

interface CreditSummary {
  remaining: number
  generationCost: number
  dailyGrant: number
  dailyRemaining: number | null
  paidRemaining: number | null
}

interface CreditState extends CreditSummary {
  userId: string
}

export function UserMenu({ onLogin }: UserMenuProps) {
  const { t, locale } = useSiteI18n()
  const { data: session, isPending, error } = authClient.useSession()
  const [open, setOpen] = useState(false)
  const [purchasing, setPurchasing] = useState(false)
  const [purchaseError, setPurchaseError] = useState(false)
  const [credits, setCredits] = useState<CreditState | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const announcedRemainingRef = useRef<number | null>(null)

  useEffect(() => {
    const closeOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', closeOutside)
    return () => document.removeEventListener('mousedown', closeOutside)
  }, [])

  useEffect(() => {
    if (!session?.user) {
      announcedRemainingRef.current = null
      setCredits(null)
      return
    }

    const userId = session.user.id
    announcedRemainingRef.current = null
    setCredits(null)
    let active = true
    let creditVersion = 0
    let dailyResetTimer: number | undefined
    const controller = new AbortController()
    const loadCredits = async () => {
      const requestVersion = creditVersion
      try {
        const response = await fetch('/api/credits/balance', {
          headers: { accept: 'application/json', ...(await guestDeviceHeaders()) },
          credentials: 'same-origin',
          signal: controller.signal,
        })
        if (!response.ok) return
        const payload = await response.json() as { credits?: Partial<CreditSummary> }
        const summary = payload.credits
        if (
          active
          && typeof summary?.remaining === 'number'
          && Number.isSafeInteger(summary.remaining)
          && summary.remaining >= 0
          && typeof summary.generationCost === 'number'
          && typeof summary.dailyGrant === 'number'
        ) {
          setCredits({
            userId,
            remaining: creditVersion === requestVersion ? summary.remaining : announcedRemainingRef.current ?? summary.remaining,
            generationCost: summary.generationCost,
            dailyGrant: summary.dailyGrant,
            dailyRemaining: typeof summary.dailyRemaining === 'number' && creditVersion === requestVersion ? summary.dailyRemaining : null,
            paidRemaining: typeof summary.paidRemaining === 'number' && creditVersion === requestVersion ? summary.paidRemaining : null,
          })
          window.clearTimeout(dailyResetTimer)
          if (REGISTERED_FREE_CREDITS_ENABLED) dailyResetTimer = window.setTimeout(() => { void loadCredits() }, millisecondsUntilCreditReset())
        }
      } catch (fetchError) {
        if (fetchError instanceof DOMException && fetchError.name === 'AbortError') return
      }
    }
    const updateCredits = (event: Event) => {
      const detail = (event as CustomEvent<{ remaining?: unknown; context?: string }>).detail
      if (detail?.context === 'guest-video' || detail?.context === 'guest-image') return
      if (typeof detail?.remaining !== 'number' || !Number.isSafeInteger(detail.remaining) || detail.remaining < 0) return
      announcedRemainingRef.current = detail.remaining
      creditVersion += 1
      setCredits((current) => ({
        userId,
        remaining: detail.remaining as number,
        generationCost: current?.generationCost ?? 1,
        dailyGrant: current?.dailyGrant ?? DAILY_FREE_CREDIT_GRANT,
        dailyRemaining: null,
        paidRemaining: null,
      }))
      void loadCredits()
    }

    void loadCredits()
    const refreshCredits = () => { void loadCredits() }
    window.addEventListener('focus', refreshCredits)
    window.addEventListener('seedance:payment-verified', refreshCredits)
    window.addEventListener('seedance:credits-updated', updateCredits)
    return () => {
      active = false
      controller.abort()
      window.clearTimeout(dailyResetTimer)
      window.removeEventListener('focus', refreshCredits)
      window.removeEventListener('seedance:payment-verified', refreshCredits)
      window.removeEventListener('seedance:credits-updated', updateCredits)
    }
  }, [session?.user?.id])

  useEffect(() => {
    // BillingPage already verifies its returned checkout against account history.
    if (/^\/(?:zh\/)?billing\/?$/.test(window.location.pathname)) return
    return initializeCheckoutReturnStatus({ userId: session?.user?.id || '' })
  }, [session?.user?.id])

  if (isPending && !error) return <span className="auth-loading" aria-label={t("Loading account")} />

  if (!session?.user) {
    return <button className="login-entry" type="button" onClick={onLogin}>{t("Log in")}</button>
  }

  const displayName = session.user.name || session.user.email
  const initial = displayName.slice(0, 1).toUpperCase()
  const currentCredits = credits?.userId === session.user.id ? credits : null

  return (
    <div className="auth-user-menu" ref={containerRef}>
      <span className="credit-pill" aria-label={`${currentCredits?.remaining ?? t("Unknown")} ${t("credits remaining")}`}>
        <b>{currentCredits?.remaining ?? '—'}</b>{t("credits")}</span>
      <button className="user-avatar-button" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label={t("Open account menu")}>
        {session.user.image ? <img src={session.user.image} alt="" referrerPolicy="no-referrer" /> : <span>{initial}</span>}
      </button>
      {open && (
        <div className="user-menu-panel">
          <strong>{displayName}</strong>
          <small>{session.user.email}</small>
          <a className="user-menu-billing" href={locale==='zh'?'/zh/creations':'/creations'}>{locale==='zh'?'我的作品':'My creations'}</a>
          <a className="user-menu-billing" href={(locale==='zh'?'/zh':'')+'/billing#orders'}>{locale==='zh'?'订单记录':'Order history'}</a>
          <div className="user-menu-credit-row"><span>{t("Credits")}</span><strong>{currentCredits?.remaining ?? '—'}</strong></div>
          {REGISTERED_FREE_CREDITS_ENABLED && <div className="user-menu-credit-row"><span>{t("Daily credits")}</span><strong>{currentCredits?.dailyRemaining ?? '—'}</strong></div>}
          <div className="user-menu-credit-row"><span>{t("Purchased credits")}</span><strong>{currentCredits?.paidRemaining ?? '—'}</strong></div>
          <small>{t(REGISTERED_FREE_CREDITS_ENABLED ? "Daily: resets at 00:00 Asia/Shanghai. Purchased: never expires." : "Purchased credits never expire.")}</small>
          <a className="user-menu-billing" href={creditPurchaseUrl(locale)} target="_blank" rel="noopener noreferrer" aria-busy={purchasing}
            onPointerDown={event => { event.currentTarget.href = creditPurchaseUrl(locale) }}
            onContextMenu={event => { event.currentTarget.href = creditPurchaseUrl(locale) }}
            onKeyDown={event => { event.currentTarget.href = creditPurchaseUrl(locale) }} onClick={async event => {
            if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
            event.preventDefault()
            if (purchasing) return
            setPurchasing(true); setPurchaseError(false)
            try { await openCreditPurchase({ locale }) }
            catch { setPurchaseError(true) }
            finally { setPurchasing(false) }
          }}>{locale==='zh'?'购买积分':'Buy credits'}</a>
          {purchaseError && <p role="alert">{locale === 'zh' ? '无法打开付款页面，请重试。' : 'Could not open checkout. Please try again.'}</p>}
          <button type="button" onClick={async () => {
            await authClient.signOut()
            setOpen(false)
          }}>{t("Log out")}</button>
        </div>
      )}
    </div>
  )
}
