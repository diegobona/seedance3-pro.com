import '../styles/resource-preview.css'

export function ComingSoonPage({ kind, title, description, primaryHref, primaryLabel }: {
  kind: string
  title: string
  description: string
  primaryHref: string
  primaryLabel: string
}) {
  return (
    <main className="resource-page">
      <header className="resource-header">
        <a className="resource-brand" href="/"><img src="/assets/seedance-mark.svg" width="38" height="38" alt="" /><span>SEEDANCE 3.0</span></a>
        <nav aria-label="Explore published pages">
          <a href="/">Seedance 3.0 <span className="release-badge">Release Updates</span></a>
          <a href="/app/video/minimax-h3">H3 Video</a>
          <a href="/app/image/gpt-image-2">GPT Image 2</a>
          <a href="/showcase.html">Showcase</a>
        </nav>
      </header>

      <section className="resource-hero" aria-labelledby="resource-title">
        <p className="resource-eyebrow">{kind}</p>
        <span className="resource-status">Coming soon</span>
        <h1 id="resource-title">{title}</h1>
        <p className="resource-description">{description}</p>
        <p className="resource-note">We are preparing examples and practical guidance for this section. The full guide and case collections are not published yet.</p>
        <div className="resource-actions">
          <a className="resource-primary" href={primaryHref}>{primaryLabel} <span aria-hidden="true">↗</span></a>
          <a className="resource-secondary" href="/showcase.html">View current examples</a>
        </div>
      </section>

      <section className="resource-links" aria-label="Available now">
        <p>Explore what is available now</p>
        <div>
          <a href="/app/video/minimax-h3">MiniMax H3 video generator</a>
          <a href="/app/image/gpt-image-2">GPT Image 2 image generator</a>
          <a href="/pose-to-image">Pose Control</a>
          <a href="/blog.html">Blog</a>
        </div>
      </section>
    </main>
  )
}
