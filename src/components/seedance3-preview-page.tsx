import { useCallback, useEffect, useRef, useState } from 'react'
import { AuthDialog } from './auth-dialog'
import { UserMenu } from './user-menu'
import { seedance3PlannedPrompts } from '../data/seedance3-planned-prompts'
import '../../app/studio.css'
import '../styles/auth.css'
import '../styles/seedance3-preview.css'

const featuredPrompts = seedance3PlannedPrompts.slice(0, 3)

export function Seedance3PreviewPage() {
  const [prompt, setPrompt] = useState('')
  const [mode, setMode] = useState<'text' | 'reference'>('text')
  const [referenceFiles, setReferenceFiles] = useState<File[]>([])
  const [selectedExample, setSelectedExample] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const promptRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const incomingPrompt = new URLSearchParams(window.location.search).get('prompt')
    if (incomingPrompt) setPrompt(incomingPrompt.slice(0, 2500))
  }, [])

  const closeAuth = useCallback(() => setAuthOpen(false), [])
  const refreshCreditsAfterAuth = useCallback(() => {
    window.dispatchEvent(new CustomEvent('seedance:auth-changed'))
  }, [])

  function useExample(index: number) {
    setSelectedExample(index)
    setPrompt(featuredPrompts[index].prompt)
    promptRef.current?.focus()
    promptRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <>
      <div className="studio-shell seedance3-preview-shell">
        <aside className={`sidebar${sidebarOpen ? ' is-open' : ''}`} id="studio-sidebar">
          <a className="studio-brand" href="/"><img src="/assets/seedance-mark.svg" width="40" height="40" alt="" /><strong>SEEDANCE<br /><small>CREATIVE STUDIO</small></strong></a>
          <button className="sidebar-close" type="button" aria-label="Close model navigation" onClick={() => setSidebarOpen(false)}>×</button>
          <nav aria-label="Model navigation">
            <div className="nav-section">
              <div className="section-heading"><span>AI VIDEO</span><span>02</span></div>
              <a className="model-button price-model" href="/app/video/minimax-h3"><span className="model-symbol cyan">H3</span><span><strong>MiniMax H3</strong><small>Text-to-video</small></span><em className="price-badge">FROM <b>$0.01</b></em></a>
              <a className="model-button release-model is-active" href="/app/video/seedance-3" aria-current="page"><img src="/assets/seedance-mark.svg" width="40" height="40" alt="" style={{ flexShrink: 0 }} /><span className="release-model-copy"><span className="release-title-row"><strong>SEEDANCE 3.0</strong><em className="release-status">Coming soon</em></span><small>Workspace preview</small></span></a>
            </div>
            <div className="nav-section">
              <div className="section-heading"><span>AI IMAGE</span></div>
              <a className="model-button pose-workflow-button" href="/app/?model=pose-to-image"><span className="pose-symbol" aria-hidden="true"><svg viewBox="0 0 32 32"><circle cx="16" cy="5.5" r="3" /><path d="M16 9v9m0-6-7 4m7-4 7 3m-7 3-5 9m5-9 6 9" /><circle cx="9" cy="16" r="1.25" /><circle cx="23" cy="15" r="1.25" /><circle cx="11" cy="27" r="1.25" /><circle cx="22" cy="27" r="1.25" /></svg></span><span className="pose-workflow-copy"><strong>Pose to Image</strong><small>Build poses in 3D</small></span><em className="signature">SIGNATURE</em><span className="workflow-cta">Open Pose Studio <b>↗</b></span></a>
              <div className="section-heading image-models-heading"><span>IMAGE MODELS</span><span>01</span></div>
              <a className="model-button price-model" href="/app/image/gpt-image-2"><span className="model-symbol orange">G2</span><span><strong>GPT Image 2</strong><small>Generation &amp; editing</small></span><em className="price-badge">FROM <b>$0.01</b></em></a>
            </div>
            <div className="nav-section showcase-nav-section">
              <div className="section-heading"><span>PROMPT LIBRARIES</span><span>03</span></div>
              <a className="showcase-nav-link" href="/minimax-h3-prompts"><span className="model-symbol cyan">H3</span><span>MiniMax H3 Prompt Library</span></a>
              <a className="showcase-nav-link" href="/gpt-image-2-prompts"><span className="model-symbol orange">G2</span><span>GPT Image 2 Prompt Library</span></a>
              <a className="showcase-nav-link" href="/seedance-3-0-prompts"><img src="/assets/seedance-mark.svg" width="34" height="34" alt="" /><span>Seedance 3.0 Prompt Library<small>Planned tests</small></span></a>
            </div>
          </nav>
          <div className="sidebar-foot"><a href="/">← Back to SEEDANCE 3.0</a></div>
        </aside>

        <main className="workspace">
          <header className="workspace-header"><div><button className="sidebar-open" type="button" aria-label="Open model navigation" onClick={() => setSidebarOpen(true)}>☰</button><a href="/">Home</a></div><div className="workspace-header-account"><UserMenu onLogin={() => setAuthOpen(true)} /></div></header>
          <div className="workspace-body">
            <div className="workspace-title"><div><p>AI VIDEO / WORKSPACE PREVIEW</p><h1>Seedance 3.0 Video Generator</h1></div><span className="model-status">Coming soon</span></div>
            <p className="model-landing-intro">Draft your video idea here or explore the <a href="/seedance-3-0-prompts">Seedance 3.0 Prompt Library</a>. Generation and output settings will be available when this model launches.</p>
            <div className="creation-grid">
              <section className="creation-panel" aria-label="Seedance 3.0 workspace preview">
                <div className="model-select"><span className="model-symbol lime">S3</span><div><small>Selected model</small><strong>SEEDANCE 3.0</strong></div></div>
                <div className="field-group"><label>Create from</label><div className="segmented seedance3-mode-tabs"><button type="button" className={mode === 'text' ? 'is-selected' : ''} aria-pressed={mode === 'text'} onClick={() => setMode('text')}>Text to video</button><button type="button" className={mode === 'reference' ? 'is-selected' : ''} aria-pressed={mode === 'reference'} onClick={() => setMode('reference')}>Reference to video</button></div></div>
                {mode === 'reference' && <div className="field-group"><div className="label-line"><label htmlFor="seedance3-references">Reference images</label><span>Local preview only</span></div><input id="seedance3-references" ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" multiple hidden onChange={event => { setReferenceFiles(Array.from(event.target.files ?? [])); event.target.value = '' }} /><button className="upload-box is-enabled" type="button" onClick={() => fileRef.current?.click()}><span>＋</span><strong>Choose reference images</strong><small>Files remain on this device until generation is available</small></button>{referenceFiles.length > 0 && <div className="seedance3-reference-list">{referenceFiles.map((file, index) => <div key={`${file.name}-${index}`}><span>Image {index + 1}: {file.name}</span><button type="button" aria-label={`Remove Image ${index + 1}`} onClick={() => setReferenceFiles(files => files.filter((_, fileIndex) => fileIndex !== index))}>×</button></div>)}</div>}</div>}
                <div className="field-group"><div className="label-line"><label htmlFor="seedance3-prompt">Prompt</label><span>{prompt.length}/2500</span></div><textarea id="seedance3-prompt" ref={promptRef} maxLength={2500} value={prompt} onChange={event => setPrompt(event.target.value)} placeholder="Describe the subject, action, setting, camera movement, and visual style…" /></div>
                <div className="settings-grid seedance3-settings"><label>Duration<select disabled aria-label="Duration coming soon"><option>Coming soon</option></select></label><label>Resolution<select disabled aria-label="Resolution coming soon"><option>Coming soon</option></select></label><label>Aspect ratio<select disabled aria-label="Aspect ratio coming soon"><option>Coming soon</option></select></label></div>
                <button className="generate-button" type="button" disabled>Generate video · Coming soon</button>
                <p className="seedance3-preview-note">This is a workspace preview. No video request is sent and no credits are charged.</p>
              </section>
              <aside className="context-panel"><section className="context-card seedance3-examples" aria-label="Planned Seedance 3.0 video prompts"><div className="seedance3-examples-heading"><span>PLANNED VIDEO TESTS</span><a href="/seedance-3-0-prompts">View prompt library ↗</a></div><div className="seedance3-video-placeholder" role="img" aria-label="Video placeholder; no video has been generated"><span className="seedance3-play-symbol" aria-hidden="true">▶</span><strong>Video coming soon</strong><small>Planned test · No generated video yet</small></div><div className="h3-example-details"><div className="h3-example-title"><div><span>{featuredPrompts[selectedExample].category.toUpperCase()}</span><h2>{featuredPrompts[selectedExample].title}</h2></div><button type="button" onClick={() => useExample(selectedExample)}>Use prompt ↗</button></div><p className="h3-example-prompt">{featuredPrompts[selectedExample].prompt}</p></div><div className="seedance3-example-options" aria-label="Choose a planned prompt">{featuredPrompts.map((example, index) => <button key={example.slug} type="button" className={selectedExample === index ? 'is-selected' : ''} aria-pressed={selectedExample === index} onClick={() => setSelectedExample(index)}><span className="seedance3-mini-placeholder" aria-hidden="true">▶</span><span>{example.title}</span></button>)}</div></section></aside>
            </div>
          </div>
        </main>
      </div>
      <AuthDialog open={authOpen} onClose={closeAuth} onAuthenticated={refreshCreditsAfterAuth} />
    </>
  )
}
