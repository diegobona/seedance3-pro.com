import { useEffect, useState, type FormEvent } from 'react'
import { authClient } from '../lib/auth-client'

type AuthMode = 'login' | 'register'

interface AuthDialogProps {
  open: boolean
  onClose: () => void
  onAuthenticated?: () => void
}

export function AuthDialog({ open, onClose, onAuthenticated }: AuthDialogProps) {
  const [mode, setMode] = useState<AuthMode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!open) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose, open])

  if (!open) return null

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setPending(true)
    const callbackURL = window.location.href

    try {
      const result = mode === 'login'
        ? await authClient.signIn.email({ email, password, callbackURL })
        : await authClient.signUp.email({ name, email, password, callbackURL })

      if (result.error) {
        setError(result.error.message || 'Authentication failed. Please try again.')
        return
      }
      onAuthenticated?.()
      onClose()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Authentication failed. Please try again.')
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
      if (result?.error) setError(result.error.message || 'Google sign-in failed.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Google sign-in failed.')
      setPending(false)
    }
  }

  return (
    <div className="auth-dialog-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section className="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-dialog-title">
        <button className="auth-dialog-close" type="button" onClick={onClose} aria-label="Close login dialog">×</button>
        <span className="auth-eyebrow">SEEDANCE ACCOUNT</span>
        <h2 id="auth-dialog-title">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
        <p>Sign in to generate and edit images. Your account will also hold future credits and plan limits.</p>

        <div className="auth-mode-tabs" role="tablist" aria-label="Authentication mode">
          <button type="button" className={mode === 'login' ? 'is-active' : ''} onClick={() => { setMode('login'); setError('') }}>Log in</button>
          <button type="button" className={mode === 'register' ? 'is-active' : ''} onClick={() => { setMode('register'); setError('') }}>Register</button>
        </div>

        <button className="google-auth-button" type="button" onClick={signInWithGoogle} disabled={pending}>
          <span aria-hidden="true">G</span> Continue with Google
        </button>
        <div className="auth-divider"><span>or use email</span></div>

        <form onSubmit={submit}>
          {mode === 'register' && (
            <label>
              Name
              <input name="name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required />
            </label>
          )}
          <label>
            Email
            <input name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label>
            Password
            <input name="password" type="password" minLength={8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>
          {error && <div className="auth-error" role="alert">{error}</div>}
          <button className="auth-submit" type="submit" disabled={pending}>
            {pending ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
          </button>
        </form>
      </section>
    </div>
  )
}
