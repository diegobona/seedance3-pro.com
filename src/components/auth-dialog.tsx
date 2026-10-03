import { useSiteI18n } from '../lib/site-i18n'
import { useEffect, useState, type FormEvent } from 'react'
import { authClient } from '../lib/auth-client'

type AuthMode = 'login' | 'register'

interface AuthDialogProps {
  open: boolean
  initialMode?: AuthMode
  onClose: () => void
  onAuthenticated?: () => void
}

export function AuthDialog({ open, initialMode = 'login', onClose, onAuthenticated }: AuthDialogProps) {
  const { t, locale } = useSiteI18n()
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!open) return
    setMode(initialMode)
    setConfirmPassword('')
    setError('')
  }, [initialMode, open])

  useEffect(() => {
    if (!open) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose, open])

  if (!open) return null

  function authFailure(message: string | undefined, fallback: string) {
    const localized = t(message || fallback)
    return locale === 'zh' && message && localized === message ? t(fallback) : localized
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (mode === 'register' && password !== confirmPassword) {
      setError(t('Passwords do not match.'))
      return
    }
    setPending(true)
    const callbackURL = window.location.href

    try {
      const result = mode === 'login'
        ? await authClient.signIn.email({ email, password, callbackURL })
        : await authClient.signUp.email({ name: email.split('@')[0], email, password, callbackURL })

      if (result.error) {
        setError(authFailure(result.error.message, 'Authentication failed. Please try again.'))
        return
      }
      onAuthenticated?.()
      onClose()
    } catch (caught) {
      setError(authFailure(caught instanceof Error ? caught.message : undefined, 'Authentication failed. Please try again.'))
    } finally {
      setPending(false)
    }
  }

  async function signInWithGoogle() {
    setError('')
    setPending(true)
    try {
      const result = await authClient.signIn.social({
        provider: 'google',
        callbackURL: window.location.href,
      })
      if (result?.error) {
        setError(authFailure(result.error.message, 'Google sign-in failed.'))
        setPending(false)
      }
    } catch (caught) {
      setError(authFailure(caught instanceof Error ? caught.message : undefined, 'Google sign-in failed.'))
      setPending(false)
    }
  }

  return (
    <div className="auth-dialog-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section className="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-dialog-title">
        <button className="auth-dialog-close" type="button" onClick={onClose} aria-label={t("Close login dialog")}>×</button>
        <span className="auth-eyebrow">{t("SEEDANCE ACCOUNT")}</span>
        <h2 id="auth-dialog-title">{mode === 'login' ? t("Welcome back") : t("Create your account")}</h2>
        <p>{t("Sign in to generate and edit images. Your account will also hold future credits and plan limits.")}</p>

        <div className="auth-mode-tabs" role="tablist" aria-label={t("Authentication mode")}>
          <button type="button" className={mode === 'login' ? 'is-active' : ''} onClick={() => { setMode('login'); setConfirmPassword(''); setError('') }}>{t("Log in")}</button>
          <button type="button" className={mode === 'register' ? 'is-active' : ''} onClick={() => { setMode('register'); setConfirmPassword(''); setError('') }}>{t("Register")}</button>
        </div>

        <button className="google-auth-button" type="button" onClick={signInWithGoogle} disabled={pending}>
          <span aria-hidden="true">{t("G")}</span>{t("Continue with Google")}</button>
        <div className="auth-divider"><span>{t("or use email")}</span></div>

        <form onSubmit={submit}>
          <label>{t("Email")}<input name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label>{t("Password")}<input name="password" type="password" minLength={8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>
          {mode === 'register' && (
            <label>{t("Confirm password")}<input name="confirmPassword" type="password" minLength={8} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
            </label>
          )}
          {error && <div className="auth-error" role="alert">{t(error)}</div>}
          <button className="auth-submit" type="submit" disabled={pending}>
            {pending ? t("Please wait…") : mode === 'login' ? t("Log in") : t("Create account")}
          </button>
        </form>
      </section>
    </div>
  )
}
