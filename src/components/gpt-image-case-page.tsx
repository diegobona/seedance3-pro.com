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
  return (
    <a className="video-case-card" href={gptImageCaseUrl(imageCase.slug)}>
      <span className={'video-case-card-image' + (imageCase.aspectRatio === '2:3' ? ' is-portrait' : '')}>
        <img src={imageCase.imageUrl} alt="" loading="lazy" />
        <span>View case ↗</span>
      </span>
      <span className="video-case-card-copy">
        <strong>{imageCase.title}</strong>
        <small>{imageCase.summary}</small>
      </span>
    </a>
  )
}

export function GptImageCaseDetail({ imageCase }: { imageCase: GptImageCase }) {
  const [copyLabel, setCopyLabel] = useState('Copy prompt')
  const related = gptImageCases.filter((entry) => entry.slug !== imageCase.slug).slice(0, 3)
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'ImageObject',
    name: imageCase.title,
    description: imageCase.summary,
    contentUrl: siteUrl + imageCase.imageUrl,
    thumbnailUrl: siteUrl + imageCase.imageUrl,
    uploadDate: '2026-09-26',
    creator: { '@type': 'Organization', name: 'SEEDANCE 3.0' },
    url: siteUrl + gptImageCaseUrl(imageCase.slug),
  }

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') window.location.assign('/gpt-image-2-prompts')
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
        <div className="video-case-backdrop-brand">SEEDANCE 3.0 <span>Image Prompt Library</span></div>
        <div className="video-case-backdrop-grid">{gptImageCases.map((entry) => <img key={entry.slug} src={entry.imageUrl} alt="" />)}</div>
      </div>
      <article className="video-case-modal" role="dialog" aria-modal="true" aria-labelledby="image-case-title">
        <a className="video-case-close" href="/gpt-image-2-prompts" aria-label="Close case and return to image library">×</a>
        <nav className="video-case-breadcrumbs" aria-label="Breadcrumb"><a href="/showcase">Showcase</a><span aria-hidden="true">/</span><a href="/gpt-image-2-prompts">Image Prompt Library</a></nav>
        <h1 id="image-case-title">{imageCase.title}</h1>
        <div className="video-case-modal-top">
          <div className={'video-case-player image-case-player' + (imageCase.aspectRatio === '2:3' ? ' is-portrait' : '')}>
            <img src={imageCase.imageUrl} alt={imageCase.summary} width={imageCase.size.split('x')[0]} height={imageCase.size.split('x')[1]} />
          </div>
          <aside className="video-case-facts" aria-label="Image details">
            <p className="video-case-facts-heading">Original image</p>
            <dl>
              <div><dt>Created</dt><dd>September 26, 2026</dd></div>
              <div><dt>Model</dt><dd>GPT Image 2</dd></div>
              <div><dt>Style</dt><dd>{imageCase.style}</dd></div>
              <div><dt>Format</dt><dd>{imageCase.aspectRatio}</dd></div>
            </dl>
            <p>Explore the finished image, then use the exact text prompt as a starting point for your own variation.</p>
            <a href={gptImageCaseTryUrl(imageCase)}>Open GPT Image 2 ↗</a>
          </aside>
        </div>
        <p className="video-case-summary">{imageCase.summary}</p>
        <section className="video-case-prompt-panel" aria-labelledby="image-case-prompt-title">
          <div className="video-case-prompt-heading">
            <div><span className="video-case-details-label">Prompt used for this image</span><h2 id="image-case-prompt-title">Prompt</h2></div>
            <div className="video-case-actions"><a href={gptImageCaseTryUrl(imageCase)}>Generate Image ↗</a><button type="button" onClick={copyPrompt}>{copyLabel}</button></div>
          </div>
          <p>{imageCase.prompt}</p>
        </section>
        <section className="video-case-note">
          <span className="video-case-details-label">Creative direction</span>
          <h2>How this image was framed</h2>
          <p>{imageCase.creativeNote}</p>
          <p><a href={imageCase.sourceUrl} target="_blank" rel="noopener noreferrer">Topic reference ↗</a></p>
        </section>
        <section className="video-case-related" aria-labelledby="related-image-cases">
          <div className="video-case-related-heading"><h2 id="related-image-cases">More original image prompts</h2><a href="/gpt-image-2-prompts">View all five ↗</a></div>
          <div className="video-case-related-grid">{related.map((entry) => <RelatedCaseCard key={entry.slug} imageCase={entry} />)}</div>
        </section>
      </article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />
    </main>
  )
}
