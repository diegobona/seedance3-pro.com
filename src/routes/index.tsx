import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: LocalEntry })

function LocalEntry() {
  return (
    <main style={{ padding: 32, fontFamily: 'system-ui', background: '#090a0c', color: '#f6f6f2', minHeight: '100vh' }}>
      <h1>SEEDANCE Creative Studio</h1>
      <p><a href="/app/?model=gpt-image-2" style={{ color: '#c9ff55' }}>Open the studio</a></p>
    </main>
  )
}
