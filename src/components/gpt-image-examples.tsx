import { useState } from 'react'
import { getGptImageCase } from '../data/gpt-image-cases'
import '../styles/h3-video-examples.css'
import '../styles/gpt-image-examples.css'

const exampleSlugs = ['foldable-pocket-universe', 'climate-week-rooftops', 'ai-classroom-claymation'] as const
const examples = exampleSlugs.map((slug) => {
  const imageCase = getGptImageCase(slug)
  if (!imageCase) throw new Error(`Missing GPT Image 2 example: ${slug}`)
  return imageCase
})

export function GptImageExamples() {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const selected = examples[selectedIndex]

  function tryExample() {
    const prompt = document.getElementById('studio-prompt') as HTMLTextAreaElement | null
    if (!prompt) return
    prompt.value = selected.prompt
    prompt.dispatchEvent(new Event('input', { bubbles: true }))

    const aspectRatio = document.getElementById('image-aspect-ratio') as HTMLSelectElement | null
    if (aspectRatio) {
      aspectRatio.value = selected.aspectRatio
      aspectRatio.dispatchEvent(new Event('change', { bubbles: true }))
    }
    prompt.focus()
    prompt.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <section className="context-card h3-examples gpt-image-examples" id="gpt-image-examples" aria-label="GPT Image 2 image examples">
      <div className="h3-examples-heading"><span>IMAGE EXAMPLES</span><small>MADE WITH GPT IMAGE 2</small></div>
      <div className="gpt-example-frame">
        <img key={selected.slug} src={selected.imageUrl} alt={selected.summary} />
      </div>
      <div className="h3-example-details">
        <div className="h3-example-title"><div><span>{selected.style.toUpperCase()}</span><h2>{selected.title}</h2></div><button type="button" onClick={tryExample}>Try it ↗</button></div>
        <p className="h3-example-prompt">{selected.prompt}</p>
      </div>
      <div className="h3-example-options" aria-label="Choose an example image">
        {examples.map((imageCase, index) => (
          <button key={imageCase.slug} className={index === selectedIndex ? 'is-selected' : ''} type="button" onClick={() => setSelectedIndex(index)} aria-pressed={index === selectedIndex} aria-label={`Show ${imageCase.title} example`}>
            <img src={imageCase.imageUrl} alt="" loading="lazy" />
            <span>{imageCase.title}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
