import { useSiteI18n } from '../lib/site-i18n'
import { useState } from 'react'
import { SEEDANCE_VIDEO_EXAMPLES } from '../../app/seedance-video-examples.mjs'
import '../styles/h3-video-examples.css'

const examples = SEEDANCE_VIDEO_EXAMPLES.slice(0, 3)

export function H3VideoExamples() {
  const { t } = useSiteI18n()
  const [selectedIndex, setSelectedIndex] = useState(0)
  const selected = examples[selectedIndex]

  function tryExample() {
    const prompt = document.getElementById('studio-prompt') as HTMLTextAreaElement | null
    if (!prompt) return
    prompt.value = selected.prompt
    prompt.dispatchEvent(new Event('input', { bubbles: true }))

    const duration = document.getElementById('video-duration') as HTMLSelectElement | null
    if (duration) {
      duration.value = '5'
      duration.dispatchEvent(new Event('change', { bubbles: true }))
    }
    const aspectRatio = document.getElementById('video-aspect-ratio') as HTMLSelectElement | null
    if (aspectRatio) {
      aspectRatio.value = '16:9'
      aspectRatio.dispatchEvent(new Event('change', { bubbles: true }))
    }
    prompt.focus()
    prompt.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <section className="context-card h3-examples" aria-label={t("Seedance 2.5 video examples")}>
      <div className="h3-examples-heading"><span>{t("VIDEO EXAMPLES")}</span><small>{t("MADE WITH Seedance 2.5")}</small></div>
      <video key={selected.id} className="h3-example-player" src={selected.src} poster={selected.poster} controls playsInline autoPlay muted preload="metadata" onEnded={() => setSelectedIndex(index => (index + 1) % examples.length)} aria-label={`${t(selected.title[0])} — ${t("Example video")}`} />
      <div className="h3-example-pagination" role="group" aria-label={t("Choose an example video")}>
        {examples.map((example, index) => (
          <button key={example.id} className={index === selectedIndex ? 'is-selected' : ''} type="button" onClick={() => setSelectedIndex(index)} aria-pressed={index === selectedIndex} aria-label={`${t("Show example")}: ${t(example.title[0])}`} />
        ))}
      </div>
      <div className="h3-example-details">
        <div className="h3-example-title"><div><span>{t(selected.style)}</span><h2>{t(selected.title[0])}</h2></div><button type="button" onClick={tryExample}>{t("Try it ↗")}</button></div>
        <p className="h3-example-prompt">{selected.prompt}</p>
      </div>
    </section>
  )
}
