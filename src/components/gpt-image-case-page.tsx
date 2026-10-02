import { useSiteI18n } from '../lib/site-i18n'
import { SiteLanguageSwitch } from './site-language-switch'
import { useEffect, useState } from 'react'
import {
  gptImageCases,
  gptImageCaseTryUrl,
  gptImageCaseUrl,
  type GptImageCase,
} from '../data/gpt-image-cases'
import '../styles/h3-video-cases.css'

const siteUrl = 'https://seedance3-pro.com'

function RelatedCaseCard({ imageCase }: { imageCase: GptImageCase }) {
  const { t, path } = useSiteI18n()
  return (
    <a className="video-case-card" href={path(gptImageCaseUrl(imageCase.slug))}>
      <span className={'video-case-card-image' + (imageCase.aspectRatio === '2:3' ? ' is-portrait' : '')}>
        <img src={imageCase.imageUrl} alt="" loading="lazy" />
        <span>{t("View case ↗")}</span>
      </span>
      <span className="video-case-card-copy">
        <strong>{t(imageCase.title)}</strong>
        <small>{t(imageCase.summary)}</small>
      </span>
    </a>
  )
}

export function GptImageCaseDetail({ imageCase }: { imageCase: GptImageCase }) {
  const { t, path } = useSiteI18n()
  const [copyLabel, setCopyLabel] = useState('Copy prompt')
  const related = gptImageCases.filter((entry) => entry.slug !== imageCase.slug).slice(0, 3)
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'ImageObject',
    name: t(imageCase.title),
    description: t(imageCase.summary),
    contentUrl: siteUrl + imageCase.imageUrl,
    thumbnailUrl: siteUrl + imageCase.imageUrl,
    uploadDate: '2026-09-26',
    creator: { '@type': 'Organization', name: 'SEEDANCE 3.0' },
    url: siteUrl + path(gptImageCaseUrl(imageCase.slug)),
  }

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') window.location.assign(path('/gpt-image-2-prompts'))
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [])

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(imageCase.prompt)
      setCopyLabel('Copied')
    } catch {
      setCopyLabel('Copy failed')
    }
  }

  return (
    <main className="video-case-modal-stage">
      <div className="video-case-modal-backdrop" aria-hidden="true">
        <div className="video-case-backdrop-brand">{t("SEEDANCE 3.0 ")}<span>{t("GPT Image 2 Prompt Library")}</span></div>
        <div className="video-case-backdrop-grid">{gptImageCases.map((entry) => <img key={entry.slug} src={entry.imageUrl} alt="" />)}</div>
      </div>
      <article className="video-case-modal" role="dialog" aria-modal="true" aria-labelledby="image-case-title">
        <SiteLanguageSwitch />
        <a className="video-case-close" href={path("/gpt-image-2-prompts")} aria-label={t("Close case and return to image library")}>×</a>
        <nav className="video-case-breadcrumbs" aria-label={t("Breadcrumb")}><a href={path("/")}>{t("Home")}</a><span aria-hidden="true">/</span><a href={path("/showcase")}>{t("Showcase")}</a><span aria-hidden="true">/</span><a href={path("/gpt-image-2-prompts")}>{t("GPT Image 2 Prompt Library")}</a></nav>
        <h1 id="image-case-title">{t(imageCase.title)}</h1>
        <div className="video-case-modal-top">
          <div className={'video-case-player image-case-player' + (imageCase.aspectRatio === '2:3' ? ' is-portrait' : '')}>
            <img src={imageCase.imageUrl} alt={t(imageCase.summary)} width={imageCase.size.split('x')[0]} height={imageCase.size.split('x')[1]} />
          </div>
          <aside className="video-case-facts" aria-label={t("Image details")}>
            <p className="video-case-facts-heading">{t("Original image")}</p>
            <dl>
              <div><dt>{t("Created")}</dt><dd>{t("September 26, 2026")}</dd></div>
              <div><dt>{t("Model")}</dt><dd>{t("GPT Image 2")}</dd></div>
              <div><dt>{t("Style")}</dt><dd>{t(imageCase.style)}</dd></div>
              <div><dt>{t("Format")}</dt><dd>{imageCase.aspectRatio}</dd></div>
            </dl>
            <p>{t("Explore the finished image, then use the exact text prompt as a starting point for your own variation.")}</p>
            <a href={path(gptImageCaseTryUrl(imageCase))}>{t("Open GPT Image 2 ↗")}</a>
          </aside>
        </div>
        <p className="video-case-summary">{t(imageCase.summary)}</p>
        <section className="video-case-prompt-panel" aria-labelledby="image-case-prompt-title">
          <div className="video-case-prompt-heading">
            <div><span className="video-case-details-label">{t("Prompt used for this image")}</span><h2 id="image-case-prompt-title">{t("Prompt")}</h2></div>
            <div className="video-case-actions"><a href={path(gptImageCaseTryUrl(imageCase))}>{t("Generate Image ↗")}</a><button type="button" onClick={copyPrompt}>{t(copyLabel)}</button></div>
          </div>
          <p>{imageCase.prompt}</p>
        </section>
        <section className="video-case-note">
          <span className="video-case-details-label">{t("Creative direction")}</span>
          <h2>{t("How this image was framed")}</h2>
          <p>{t(imageCase.creativeNote)}</p>
          <p><a href={path(imageCase.sourceUrl)} target="_blank" rel="noopener noreferrer">{t("Topic reference ↗")}</a></p>
        </section>
        <section className="video-case-related" aria-labelledby="related-image-cases">
          <div className="video-case-related-heading"><h2 id="related-image-cases">{t("More original image prompts")}</h2><a href={path("/gpt-image-2-prompts")}>{t("GPT Image 2 Prompt Library ↗")}</a></div>
          <div className="video-case-related-grid">{related.map((entry) => <RelatedCaseCard key={entry.slug} imageCase={entry} />)}</div>
        </section>
      </article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />
    </main>
  )
}
