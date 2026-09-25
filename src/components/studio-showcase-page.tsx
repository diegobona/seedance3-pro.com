import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { AuthDialog } from './auth-dialog'
import { UserMenu } from './user-menu'
import { h3VideoCases, h3VideoCaseTryUrl, h3VideoCaseUrl } from '../data/h3-video-cases'
import { gptImageCases, gptImageCaseTryUrl, gptImageCaseUrl } from '../data/gpt-image-cases'
import '../../app/studio.css'
import '../styles/auth.css'
import '../styles/studio-showcase.css'

export type StudioShowcaseModel = 'minimax-h3' | 'gpt-image-2' | 'seedance-3-0'

const showcaseContent = {
  'minimax-h3': {
    label: 'AI VIDEO / VIDEO PROMPTS',
    title: 'MiniMax H3 showcase',
    description: 'Watch five original short videos, then open any scene for the exact prompt and a brief creative note.',
  },
  'gpt-image-2': {
    label: 'AI IMAGE / IMAGE PROMPTS',
    title: 'GPT Image 2 showcase',
    description: 'Explore five original images in distinct styles. Open any image for its exact prompt and a short creative note.',
  },
  'seedance-3-0': {
    label: 'AI VIDEO / VIDEO PROMPTS',
    title: 'Seedance 3.0 showcase',
    description: 'This model-specific video prompt library is coming soon.',
  },
} as const

function H3ShowcaseGrid() {
  useEffect(() => {
    const videos = Array.from(document.querySelectorAll<HTMLVideoElement>('.studio-showcase-video'))
    if (!('IntersectionObserver' in window)) {
      videos.forEach((video) => {
        if (video.dataset.src) video.src = video.dataset.src
        void video.play().catch(() => {})
      })
      return () => videos.forEach((video) => video.pause())
    }
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const video = entry.target as HTMLVideoElement
        if (entry.isIntersecting) {
          if (!video.src && video.dataset.src) video.src = video.dataset.src
          void video.play().catch(() => {})
        } else {
          video.pause()
        }
      }
    }, { threshold: 0.25 })
    videos.forEach((video) => observer.observe(video))
    return () => {
      observer.disconnect()
      videos.forEach((video) => video.pause())
    }
  }, [])

  return (
    <section className="studio-showcase-grid" aria-label="Original MiniMax H3 video prompts">
      {h3VideoCases.map((videoCase) => (
        <ShowcaseCard
          key={videoCase.slug}
          title={videoCase.title}
          caseUrl={h3VideoCaseUrl(videoCase.slug)}
          tryUrl={h3VideoCaseTryUrl(videoCase)}
          modelLabel="MiniMax H3"
          portrait={videoCase.aspectRatio === '9:16'}
          media={<video className="studio-showcase-video" muted loop playsInline preload="none" poster={videoCase.posterUrl} data-src={videoCase.videoUrl} aria-hidden="true" />}
        />
      ))}
    </section>
  )
}

function ShowcaseCard({ title, caseUrl, tryUrl, modelLabel, portrait, media }: {
  title: string
  caseUrl: string
  tryUrl: string
  modelLabel: string
  portrait: boolean
  media: ReactNode
}) {
  return (
    <article className="studio-showcase-card">
      <div className={`studio-showcase-media${portrait ? ' is-portrait' : ''}`}>
        {media}
        <a className="studio-showcase-cover-link" href={caseUrl} aria-label={`Open ${title} and prompt`}><span className="studio-showcase-card-title">{title}</span></a>
        <div className="studio-showcase-hover-actions">
          <button type="button" disabled aria-label="Like (coming soon)" title="Coming soon">♡</button>
          <a href={tryUrl} aria-label={`Try ${title} prompt in ${modelLabel}`}>Try Now</a>
          <button type="button" disabled aria-label="Share (coming soon)" title="Coming soon">↗</button>
        </div>
      </div>
    </article>
  )
}

function GptImageShowcaseGrid() {
  return (
    <section className="studio-showcase-grid" aria-label="Original GPT Image 2 image prompts">
      {gptImageCases.map((imageCase) => (
        <ShowcaseCard
          key={imageCase.slug}
          title={imageCase.title}
          caseUrl={gptImageCaseUrl(imageCase.slug)}
          tryUrl={gptImageCaseTryUrl(imageCase)}
          modelLabel="GPT Image 2"
          portrait={imageCase.aspectRatio === '2:3'}
          media={<img src={imageCase.imageUrl} alt={imageCase.summary} loading="lazy" width={imageCase.aspectRatio === '2:3' ? 1024 : imageCase.aspectRatio === '3:2' ? 1536 : 1024} height={imageCase.aspectRatio === '2:3' ? 1536 : imageCase.aspectRatio === '3:2' ? 1024 : 1024} />}
        />
      ))}
    </section>
  )
}

function FutureShowcase() {
  return (
    <section className="studio-showcase-future" aria-label="Upcoming model showcase">
      <span className="studio-showcase-future-badge">Coming soon</span>
      <h2>Seedance 3.0 video prompts are on their way.</h2>
      <p>This space is reserved for Seedance 3.0 examples and the prompts behind them.</p>
      <div className="studio-showcase-actions">
        <a className="studio-showcase-primary" href="/showcase.html">Explore current showcase ↗</a>
        <a href="/minimax-h3-prompts">See current video prompts ↗</a>
      </div>
    </section>
  )
}

export function StudioShowcasePage({ model }: { model: StudioShowcaseModel }) {
  const [authOpen, setAuthOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const closeAuth = useCallback(() => setAuthOpen(false), [])
  const refreshCreditsAfterAuth = useCallback(() => {
    window.dispatchEvent(new CustomEvent('seedance:auth-changed'))
  }, [])
  const content = showcaseContent[model]

  return (
    <>
      <div className="studio-shell studio-showcase-shell">
        <aside className={`sidebar${sidebarOpen ? ' is-open' : ''}`} id="studio-sidebar">
          <a className="studio-brand" href="/"><img src="/assets/seedance-mark.svg" width="40" height="40" alt="" /><strong>SEEDANCE<br /><small>CREATIVE STUDIO</small></strong></a>
          <button className="sidebar-close" type="button" aria-label="Close model navigation" onClick={() => setSidebarOpen(false)}>×</button>
          <nav aria-label="Model navigation">
            <div className="nav-section">
              <div className="section-heading"><span>AI VIDEO</span><span>02</span></div>
              <a className="model-button price-model" href="/app/video/minimax-h3"><span className="model-symbol cyan">H3</span><span><strong>MiniMax H3</strong><small>Text-to-video</small></span><em className="price-badge">FROM <b>$0.01</b></em></a>
              <button className="model-button release-model" type="button" disabled><img src="/assets/seedance-mark.svg" width="40" height="40" alt="" style={{ flexShrink: 0 }} /><span className="release-model-copy"><span className="release-title-row"><strong>SEEDANCE 3.0</strong><em className="release-status">Release Updates</em></span><small>Next-gen video</small></span></button>
            </div>
            <div className="nav-section">
              <div className="section-heading"><span>AI IMAGE</span></div>
              <a className="model-button pose-workflow-button" href="/app/?model=pose-to-image">
                <span className="pose-symbol" aria-hidden="true"><svg viewBox="0 0 32 32" role="presentation"><circle cx="16" cy="5.5" r="3" /><path d="M16 9v9m0-6-7 4m7-4 7 3m-7 3-5 9m5-9 6 9" /><circle cx="9" cy="16" r="1.25" /><circle cx="23" cy="15" r="1.25" /><circle cx="11" cy="27" r="1.25" /><circle cx="22" cy="27" r="1.25" /></svg></span>
                <span className="pose-workflow-copy"><strong>Pose to Image</strong><small>Build poses in 3D</small></span>
                <em className="signature">SIGNATURE</em>
                <span className="workflow-cta">Open Pose Studio <b>↗</b></span>
              </a>
              <div className="section-heading image-models-heading"><span>IMAGE MODELS</span><span>01</span></div>
              <a className="model-button price-model" href="/app/image/gpt-image-2"><span className="model-symbol orange">G2</span><span><strong>GPT Image 2</strong><small>Generation &amp; editing</small></span><em className="price-badge">FROM <b>$0.01</b></em></a>
            </div>
            <div className="nav-section showcase-nav-section">
              <div className="section-heading"><span>SHOWCASE</span><span>03</span></div>
              <a className="showcase-nav-link" href="/minimax-h3-prompts" aria-current={model === 'minimax-h3' ? 'page' : undefined}><span className="model-symbol cyan">H3</span><span>MiniMax H3 showcase</span></a>
              <a className="showcase-nav-link" href="/gpt-image-2-prompts" aria-current={model === 'gpt-image-2' ? 'page' : undefined}><span className="model-symbol orange">G2</span><span>GPT Image 2 showcase</span></a>
              <a className="showcase-nav-link" href="/seedance-3-0-prompts" aria-current={model === 'seedance-3-0' ? 'page' : undefined}><img src="/assets/seedance-mark.svg" width="34" height="34" alt="" /><span>Seedance 3.0 showcase<small>Coming soon</small></span></a>
            </div>
          </nav>
          <div className="sidebar-foot"><a href="/">← Back to SEEDANCE 3.0</a></div>
        </aside>

        <main className="workspace">
          <header className="workspace-header">
            <div><button className="sidebar-open" type="button" aria-label="Open model navigation" onClick={() => setSidebarOpen(true)}>☰</button><a href="/">Home</a></div>
            <div className="workspace-header-account"><UserMenu onLogin={() => setAuthOpen(true)} /></div>
          </header>
          <div className="workspace-body studio-showcase-body">
            <div className="studio-showcase-intro">
              <p className="studio-showcase-eyebrow">{content.label}</p>
              <h1>{content.title}</h1>
              <p>{content.description}</p>
            </div>
            {model === 'minimax-h3' ? <H3ShowcaseGrid /> : model === 'gpt-image-2' ? <GptImageShowcaseGrid /> : <FutureShowcase />}
          </div>
        </main>
      </div>
      <AuthDialog open={authOpen} onClose={closeAuth} onAuthenticated={refreshCreditsAfterAuth} />
    </>
  )
}
