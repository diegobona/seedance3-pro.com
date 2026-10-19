import { FLUX_3_IMAGE_DISCLOSURE, FLUX_3_SOURCES, FLUX_3_VIDEO_DISCLOSURE, flux3Content, flux3FaqSchema } from '../../app/flux-3-content.mjs'
import { useSiteI18n } from '../lib/site-i18n'

export function Flux3LandingEntry() {
  const { locale, path } = useSiteI18n()
  const page = flux3Content(locale)
  return <div className="model-landing-entry">
    <p className="model-landing-intro">{page.intro}</p>
    <div className="model-landing-intents">
      <div><a className="generate-button model-landing-entry-button" href="#creation-grid">{page.videoCta} ↗</a><p className="model-landing-disclosure" id="generation-model-disclosure">{FLUX_3_VIDEO_DISCLOSURE}</p></div>
      <div><a className="generate-button model-landing-entry-button" href={path('/app/image/gpt-image-2-5-1k')}>{page.imageCta} ↗</a><p className="model-landing-disclosure">{FLUX_3_IMAGE_DISCLOSURE}</p></div>
    </div>
  </div>
}

export function Flux3LandingContent() {
  const { locale, path, t } = useSiteI18n()
  const page = flux3Content(locale)
  return <section className="model-landing-content" id="model-details" aria-label="FLUX 3">
    <div className="model-landing-inner">
      <p className="model-landing-eyebrow">FLUX 3 · VIDEO / IMAGE / AUDIO</p>
      <h2>{page.headings[0]}</h2><p className="model-landing-summary">{page.about}</p>
      <h2>{page.headings[1]}</h2>
      <div className="model-landing-grid">{page.videoFeatures.map(([title, text]) => <article key={title}><h3>{title}</h3><p>{text}</p></article>)}</div>
      <h2>{page.headings[2]}</h2><p className="model-landing-summary">{page.image}</p><p className="model-learning-links">{page.imageNote}</p>
      <h2>{page.headings[3]}</h2>
      <div className="model-landing-table-wrap"><table className="model-landing-table"><caption>{page.comparisonNote}</caption><thead><tr>{page.columns.map(column => <th scope="col" key={column}>{column}</th>)}</tr></thead><tbody>{page.comparison.map(([label, previous, current]) => <tr key={label}><th scope="row">{label}</th><td>{previous}</td><td>{current}</td></tr>)}</tbody></table></div>
      <h2>{page.headings[4]}</h2><p className="model-landing-summary">{page.access}</p><p className="model-learning-links">{page.accessNote}</p>
      <p className="model-learning-links"><a href={FLUX_3_SOURCES.dashboard} target="_blank" rel="noopener noreferrer">{page.officialCta}</a></p>
      <h2>{page.headings[5]}</h2><ol className="model-landing-steps">{page.steps.map(step => <li key={step}>{step}</li>)}</ol><p className="model-learning-links">{page.trial}</p>
      <h2>{page.headings[6]}</h2>
      <div className="model-landing-faq" id="flux-3-faq">{page.questions.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div>
      <p className="model-learning-links">{page.sourcesLabel}: {Object.values(FLUX_3_SOURCES).slice(0, 4).map((href, index) => <span key={href}>{index > 0 ? ' · ' : ''}<a href={href} target="_blank" rel="noopener noreferrer">{page.sourceLabels[index]}</a></span>)}</p>
      <nav className="model-landing-links" aria-label={t('Explore related tools')}>
        <a href={path('/')}>{t('Seedance home')}</a><a href={path('/app/video/minimax-h3')}>MiniMax H3</a>
        <a href={path('/app/image/gpt-image-2-5-1k')}>GPT Image 2.5</a><a href={path('/app/image/gpt-image-2')}>GPT Image 2</a>
        <a href={path('/minimax-h3-prompts')}>{t('MiniMax H3 Prompt Library')}</a>
      </nav>
    </div>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(flux3FaqSchema(locale)).replace(/</g, '\\u003c') }} />
  </section>
}
