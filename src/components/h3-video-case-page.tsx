import { useSiteI18n } from '../lib/site-i18n'
import { SiteLanguageSwitch } from './site-language-switch'
import { useEffect, useState } from 'react'
import {
  h3VideoCases,
  h3VideoCaseUrl,
  h3VideoCaseTryUrl,
  type H3VideoCase,
} from '../data/h3-video-cases'
import '../styles/h3-video-cases.css'

const siteUrl = 'https://seedance3-pro.com'

function CaseHeader() {
  const { t, path } = useSiteI18n()
  return (
    <header className="video-case-header">
      <a className="video-case-brand" href={path("/")}><img src="/assets/seedance-mark.svg" width="38" height="38" alt="" /><span>{t("SEEDANCE 3.0")}</span></a>
      <nav aria-label={t("Primary navigation")}>
        <a href={path("/app/video/minimax-h3")}>{t("H3 Video")}</a>
        <a href={path("/showcase")}>{t("Showcase")}</a>
        <a href={path("/minimax-h3-prompts")} aria-current="page" target="_blank" rel="noopener noreferrer">{t("MiniMax H3 Prompt Library")}</a>
      </nav>
      <a className="video-case-header-cta" href={path("/app/video/minimax-h3")}>{t("Start Creating ↗")}</a>
      <SiteLanguageSwitch />
    </header>
  )
}

function CaseCard({ videoCase }: { videoCase: H3VideoCase }) {
  const { t, path } = useSiteI18n()
  return (
    <a className="video-case-card" href={path(h3VideoCaseUrl(videoCase.slug))}>
      <span className={'video-case-card-image' + (videoCase.aspectRatio === '9:16' ? ' is-portrait' : '')}>
        <img src={videoCase.posterUrl} alt="" loading="lazy" />
        <span>{t("Watch case ↗")}</span>
      </span>
      <span className="video-case-card-copy">
        <strong>{t(videoCase.title)}</strong>
        <small>{t(videoCase.summary)}</small>
      </span>
    </a>
  )
}

export function H3VideoCaseIndex() {
  const { t, path } = useSiteI18n()
  return (
    <main className="video-case-site">
      <CaseHeader />
      <div className="video-case-container">
        <nav className="video-case-breadcrumbs" aria-label={t("Breadcrumb")}><a href={path("/")}>{t("Home")}</a><span aria-hidden="true">/</span><a href={path("/showcase")}>{t("Showcase")}</a><span aria-hidden="true">/</span><span>{t("MiniMax H3 Prompt Library")}</span></nav>
        <section className="video-case-index-intro">
          <p className="video-case-eyebrow">{t("Original video examples")}</p>
          <h1>{t("MiniMax H3 Prompt Library")}</h1>
          <p>{t("Original scenes generated for this site. Watch each finished video, read the prompt used to create it, and explore the creative direction behind the shot.")}</p>
        </section>
        <div className="video-case-index-grid">
          {h3VideoCases.map((videoCase) => <CaseCard key={videoCase.slug} videoCase={videoCase} />)}
        </div>
        <div className="video-case-index-next"><span>{t("Have a scene of your own?")}</span><a href={path("/app/video/minimax-h3")}>{t("Open the H3 video tool ↗")}</a></div>
      </div>
    </main>
  )
}

export function H3VideoCaseDetail({ videoCase }: { videoCase: H3VideoCase }) {
  const { t, path } = useSiteI18n()
  const [copyLabel, setCopyLabel] = useState('Copy prompt')
  const related = h3VideoCases.filter((entry) => entry.slug !== videoCase.slug).slice(0, 3)
  const videoUrl = siteUrl + videoCase.videoUrl
  const posterUrl = siteUrl + videoCase.posterUrl
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: t(videoCase.title),
    description: t(videoCase.summary),
    thumbnailUrl: posterUrl,
    uploadDate: '2026-09-25',
    duration: 'PT5S',
    contentUrl: videoUrl,
    url: siteUrl + path(h3VideoCaseUrl(videoCase.slug)),
  }

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') window.location.assign(path('/minimax-h3-prompts'))
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
        <div className="video-case-backdrop-brand">{t("SEEDANCE 3.0 ")}<span>{t("MiniMax H3 Prompt Library")}</span></div>
        <div className="video-case-backdrop-grid">{h3VideoCases.map((entry) => <img key={entry.slug} src={entry.posterUrl} alt="" />)}</div>
      </div>
      <article className="video-case-modal" role="dialog" aria-modal="true" aria-labelledby="video-case-title">
        <SiteLanguageSwitch />
        <a className="video-case-close" href={path("/minimax-h3-prompts")} aria-label={t("Close case and return to video library")}>×</a>
        <nav className="video-case-breadcrumbs" aria-label={t("Breadcrumb")}><a href={path("/")}>{t("Home")}</a><span aria-hidden="true">/</span><a href={path("/showcase")}>{t("Showcase")}</a><span aria-hidden="true">/</span><a href={path("/minimax-h3-prompts")} target="_blank" rel="noopener noreferrer">{t("MiniMax H3 Prompt Library")}</a></nav>
        <h1 id="video-case-title">{t(videoCase.title)}</h1>
        <div className="video-case-modal-top">
          <div className={'video-case-player' + (videoCase.aspectRatio === '9:16' ? ' is-portrait' : '')}>
            <video controls playsInline preload="metadata" poster={videoCase.posterUrl} width={videoCase.aspectRatio === '9:16' ? 768 : 1360} height={videoCase.aspectRatio === '9:16' ? 1360 : 768} aria-label={t(videoCase.title)}>
              <source src={videoCase.videoUrl} type="video/mp4" />{t("Your browser does not support video playback.")}</video>
          </div>
          <aside className="video-case-facts" aria-label={t("Video details")}>
            <p className="video-case-facts-heading">{t("Original video")}</p>
            <dl>
              <div><dt>{t("Created")}</dt><dd>{t("September 25, 2026")}</dd></div>
              <div><dt>{t("Model")}</dt><dd>{t("MiniMax H3")}</dd></div>
              <div><dt>{t("Duration")}</dt><dd>{t("5 seconds")}</dd></div>
              <div><dt>{t("Format")}</dt><dd>{videoCase.aspectRatio}</dd></div>
            </dl>
            <p>{t("Watch the finished scene, then use the exact text prompt as a starting point for your own variation.")}</p>
            <a href={path(h3VideoCaseTryUrl(videoCase))}>{t("Open H3 Video ↗")}</a>
          </aside>
        </div>
        <p className="video-case-summary">{t(videoCase.summary)}</p>
        <section className="video-case-prompt-panel" aria-labelledby="video-case-prompt-title">
          <div className="video-case-prompt-heading">
            <div><span className="video-case-details-label">{t("Prompt used for this video")}</span><h2 id="video-case-prompt-title">{t("Prompt")}</h2></div>
            <div className="video-case-actions"><a href={path(h3VideoCaseTryUrl(videoCase))}>{t("Generate Video ↗")}</a><button type="button" onClick={copyPrompt}>{t(copyLabel)}</button></div>
          </div>
          <p>{videoCase.prompt}</p>
        </section>
        <section className="video-case-note">
          <span className="video-case-details-label">{t("Creative direction")}</span>
          <h2>{t("How this scene was framed")}</h2>
          <p>{t(videoCase.creativeNote)}</p>
        </section>
        <section className="video-case-related" aria-labelledby="related-video-cases">
          <div className="video-case-related-heading"><h2 id="related-video-cases">{t("More original video prompts")}</h2><a href={path("/minimax-h3-prompts")} target="_blank" rel="noopener noreferrer">{t("MiniMax H3 Prompt Library ↗")}</a></div>
          <div className="video-case-related-grid">{related.map((entry) => <CaseCard key={entry.slug} videoCase={entry} />)}</div>
        </section>
      </article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />
    </main>
  )
}
