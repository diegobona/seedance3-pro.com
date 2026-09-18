import { useEffect, useRef, useState } from 'react'
import { authClient } from '../lib/auth-client'

interface UserMenuProps {
  onLogin: () => void
}

export function UserMenu({ onLogin }: UserMenuProps) {
  const { data: session, isPending, error } = authClient.useSession()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const closeOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', closeOutside)
    return () => document.removeEventListener('mousedown', closeOutside)
  }, [])

  if (isPending && !error) return <span className="auth-loading" aria-label="Loading account" />

  if (!session?.user) {
    return <button className="login-entry" type="button" onClick={onLogin}>Log in</button>
  }

  const displayName = session.user.name || session.user.email
  const initial = displayName.slice(0, 1).toUpperCase()

  return (
    <div className="auth-user-menu" ref={containerRef}>
      <button className="user-avatar-button" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label="Open account menu">
        {session.user.image ? <img src={session.user.image} alt="" referrerPolicy="no-referrer" /> : <span>{initial}</span>}
      </button>
      {open && (
        <div className="user-menu-panel">
          <strong>{displayName}</strong>
          <small>{session.user.email}</small>
          <button type="button" onClick={async () => {
            await authClient.signOut()
            setOpen(false)
          }}>Log out</button>
        </div>
      )}
    </div>
  )
}
