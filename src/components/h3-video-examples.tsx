import { useState } from 'react'
import cinematicVideo from '../../assets/h3-example-cinematic.mp4'
import productVideo from '../../assets/h3-example-product.mp4'
import animationVideo from '../../assets/h3-example-animation.mp4'
import '../styles/h3-video-examples.css'

const examples = [
  {
    id: 'cinematic',
    title: 'Cinematic scene',
    style: 'CINEMATIC',
    src: cinematicVideo,
    prompt: 'At blue hour on a windswept salt flat, a lone traveler in a saffron coat walks toward a glowing glass observatory. One continuous slow dolly-in shot; drifting dust, soft volumetric light, grounded realistic motion, film-grain, high-contrast cinematic color. No text, no logos.',
  },
  {
    id: 'product',
    title: 'Product film',
    style: 'COMMERCIAL',
    src: productVideo,
    prompt: 'A sculptural matte-black ceramic espresso cup rotates above a pale limestone pedestal as warm morning sunlight slides across the rim. Macro lens, crisp reflections, gentle orbit camera, premium commercial film, clean minimal background. No text, no logos.',
  },
  {
    id: 'animation',
    title: 'Paper animation',
    style: 'ANIMATION',
    src: animationVideo,
    prompt: 'A tiny paper fox with folded origami fur leaps between floating lanterns over a moonlit forest pond. Handcrafted stop-motion paper texture, playful squash-and-stretch, smooth sideways tracking camera, saturated indigo and amber palette. No text, no logos.',
  },
]

export function H3VideoExamples() {
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
    <section className="context-card h3-examples" aria-label="MiniMax H3 video examples">
      <div className="h3-examples-heading"><span>VIDEO EXAMPLES</span><small>MADE WITH MINIMAX H3</small></div>
      <video key={selected.id} className="h3-example-player" src={selected.src} controls playsInline preload="metadata" aria-label={`${selected.title} example video`} />
      <div className="h3-example-details">
        <div className="h3-example-title"><div><span>{selected.style}</span><h2>{selected.title}</h2></div><button type="button" onClick={tryExample}>Try it ↗</button></div>
        <p className="h3-example-prompt">{selected.prompt}</p>
      </div>
      <div className="h3-example-options" aria-label="Choose an example video">
        {examples.map((example, index) => (
          <button key={example.id} className={index === selectedIndex ? 'is-selected' : ''} type="button" onClick={() => setSelectedIndex(index)} aria-pressed={index === selectedIndex} aria-label={`Show ${example.title} example`}>
            <video src={`${example.src}#t=0.1`} muted playsInline preload="metadata" aria-hidden="true" tabIndex={-1} />
            <span>{example.title}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
