import { useSiteI18n } from '../lib/site-i18n'
import { useEffect, useRef, useState } from 'react'
import { authClient } from '../lib/auth-client'
import { millisecondsUntilCreditReset } from '../../app/daily-credits.mjs'

interface UserMenuProps {
  onLogin: () => void
}

interface CreditSummary {
  remaining: number
  generationCost: number
  dailyGrant: number
}

interface CreditState extends CreditSummary {
  userId: string
}

export function UserMenu({ onLogin }: UserMenuProps) {
  const { t } = useSiteI18n()
  const { data: session, isPending, error } = authClient.useSession()
  const [open, setOpen] = useState(false)
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
          headers: { accept: 'application/json' },
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
          })
          window.clearTimeout(dailyResetTimer)
          dailyResetTimer = window.setTimeout(() => { void loadCredits() }, millisecondsUntilCreditReset())
        }
      } catch (fetchError) {
        if (fetchError instanceof DOMException && fetchError.name === 'AbortError') return
      }
    }
    const updateCredits = (event: Event) => {
      const detail = (event as CustomEvent<{ remaining?: unknown }>).detail
      if (typeof detail?.remaining !== 'number' || !Number.isSafeInteger(detail.remaining) || detail.remaining < 0) return
      announcedRemainingRef.current = detail.remaining
      creditVersion += 1
      setCredits((current) => ({
        userId,
        remaining: detail.remaining as number,
        generationCost: current?.generationCost ?? 5,
        dailyGrant: current?.dailyGrant ?? 15,
      }))
    }

    void loadCredits()
    const refreshCredits = () => { void loadCredits() }
    window.addEventListener('focus', refreshCredits)
    window.addEventListener('seedance:credits-updated', updateCredits)
    return () => {
      active = false
      controller.abort()
      window.clearTimeout(dailyResetTimer)
      window.removeEventListener('focus', refreshCredits)
      window.removeEventListener('seedance:credits-updated', updateCredits)
    }
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
          <div className="user-menu-credit-row"><span>{t("Credits")}</span><strong>{currentCredits?.remaining ?? '—'}</strong></div>
          <button type="button" onClick={async () => {
            await authClient.signOut()
            setOpen(false)
          }}>{t("Log out")}</button>
        </div>
      )}
    </div>
  )
}
