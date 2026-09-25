import { useEffect, useState } from 'react'
import {
  h3VideoCases,
  h3VideoCaseUrl,
  type H3VideoCase,
} from '../data/h3-video-cases'
import '../styles/h3-video-cases.css'

const siteUrl = 'https://seedance3-pro.com'

function CaseHeader() {
  return (
    <header className="video-case-header">
      <a className="video-case-brand" href="/"><img src="/assets/seedance-mark.svg" width="38" height="38" alt="" /><span>SEEDANCE 3.0</span></a>
      <nav aria-label="Primary navigation">
        <a href="/app/video/minimax-h3">H3 Video</a>
        <a href="/showcase">Showcase</a>
        <a href="/prompts/minimax-h3/videos" aria-current="page">Video Prompt Library</a>
      </nav>
      <a className="video-case-header-cta" href="/app/video/minimax-h3">Start Creating ↗</a>
    </header>
  )
}

function CaseCard({ videoCase }: { videoCase: H3VideoCase }) {
  return (
    <a className="video-case-card" href={h3VideoCaseUrl(videoCase.slug)}>
      <span className={'video-case-card-image' + (videoCase.aspectRatio === '9:16' ? ' is-portrait' : '')}>
        <img src={videoCase.posterUrl} alt="" loading="lazy" />
        <span>Watch case ↗</span>
      </span>
      <span className="video-case-card-copy">
        <strong>{videoCase.title}</strong>
        <small>{videoCase.summary}</small>
      </span>
    </a>
  )
}

export function H3VideoCaseIndex() {
  return (
    <main className="video-case-site">
      <CaseHeader />
      <div className="video-case-container">
        <nav className="video-case-breadcrumbs" aria-label="Breadcrumb"><a href="/showcase">Showcase</a><span aria-hidden="true">/</span><span>Video Prompt Library</span></nav>
        <section className="video-case-index-intro">
          <p className="video-case-eyebrow">Original video examples</p>
          <h1>MiniMax H3 Video Prompt Library</h1>
          <p>Five short scenes generated for this site. Watch each finished video, read the prompt used to create it, and explore the creative direction behind the shot.</p>
        </section>
        <div className="video-case-index-grid">
          {h3VideoCases.map((videoCase) => <CaseCard key={videoCase.slug} videoCase={videoCase} />)}
        </div>
        <div className="video-case-index-next"><span>Have a scene of your own?</span><a href="/app/video/minimax-h3">Open the H3 video tool ↗</a></div>
      </div>
    </main>
  )
}

export function H3VideoCaseDetail({ videoCase }: { videoCase: H3VideoCase }) {
  const [copyLabel, setCopyLabel] = useState('Copy prompt')
  const related = h3VideoCases.filter((entry) => entry.slug !== videoCase.slug).slice(0, 3)
  const videoUrl = siteUrl + videoCase.videoUrl
  const posterUrl = siteUrl + videoCase.posterUrl
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: videoCase.title,
    description: videoCase.summary,
    thumbnailUrl: posterUrl,
    uploadDate: '2026-09-25',
    duration: 'PT5S',
    contentUrl: videoUrl,
    url: siteUrl + h3VideoCaseUrl(videoCase.slug),
  }

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') window.location.assign('/prompts/minimax-h3/videos')
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [])

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(videoCase.prompt)
      setCopyLabel('Copied')
    } catch {
      setCopyLabel('Copy failed')
    }
  }

  return (
    <main className="video-case-modal-stage">
      <div className="video-case-modal-backdrop" aria-hidden="true">
        <div className="video-case-backdrop-brand">SEEDANCE 3.0 <span>Video Prompt Library</span></div>
        <div className="video-case-backdrop-grid">{h3VideoCases.map((entry) => <img key={entry.slug} src={entry.posterUrl} alt="" />)}</div>
      </div>
      <article className="video-case-modal" role="dialog" aria-modal="true" aria-labelledby="video-case-title">
        <a className="video-case-close" href="/prompts/minimax-h3/videos" aria-label="Close case and return to video library">×</a>
        <nav className="video-case-breadcrumbs" aria-label="Breadcrumb"><a href="/showcase">Showcase</a><span aria-hidden="true">/</span><a href="/prompts/minimax-h3/videos">Video Prompt Library</a></nav>
        <h1 id="video-case-title">{videoCase.title}</h1>
        <div className="video-case-modal-top">
          <div className={'video-case-player' + (videoCase.aspectRatio === '9:16' ? ' is-portrait' : '')}>
            <video controls playsInline preload="metadata" poster={videoCase.posterUrl} width={videoCase.aspectRatio === '9:16' ? 768 : 1360} height={videoCase.aspectRatio === '9:16' ? 1360 : 768} aria-label={videoCase.title}>
              <source src={videoCase.videoUrl} type="video/mp4" />
              Your browser does not support video playback.
            </video>
          </div>
          <aside className="video-case-facts" aria-label="Video details">
            <p className="video-case-facts-heading">Original video</p>
            <dl>
              <div><dt>Created</dt><dd>September 25, 2026</dd></div>
              <div><dt>Model</dt><dd>MiniMax H3</dd></div>
              <div><dt>Duration</dt><dd>5 seconds</dd></div>
              <div><dt>Format</dt><dd>{videoCase.aspectRatio}</dd></div>
            </dl>
            <p>Watch the finished scene, then use the exact text prompt as a starting point for your own variation.</p>
            <a href="/app/video/minimax-h3">Open H3 Video ↗</a>
          </aside>
        </div>
        <p className="video-case-summary">{videoCase.summary}</p>
        <section className="video-case-prompt-panel" aria-labelledby="video-case-prompt-title">
          <div className="video-case-prompt-heading">
            <div><span className="video-case-details-label">Prompt used for this video</span><h2 id="video-case-prompt-title">Prompt</h2></div>
            <div className="video-case-actions"><a href="/app/video/minimax-h3">Generate Video ↗</a><button type="button" onClick={copyPrompt}>{copyLabel}</button></div>
          </div>
          <p>{videoCase.prompt}</p>
        </section>
        <section className="video-case-note">
          <span className="video-case-details-label">Creative direction</span>
          <h2>How this scene was framed</h2>
          <p>{videoCase.creativeNote}</p>
        </section>
        <section className="video-case-related" aria-labelledby="related-video-cases">
          <div className="video-case-related-heading"><h2 id="related-video-cases">More original video prompts</h2><a href="/prompts/minimax-h3/videos">View all five ↗</a></div>
          <div className="video-case-related-grid">{related.map((entry) => <CaseCard key={entry.slug} videoCase={entry} />)}</div>
        </section>
      </article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />
    </main>
  )
}
