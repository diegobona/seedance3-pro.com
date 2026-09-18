import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import { AuthDialog } from '../components/auth-dialog'
import { UserMenu } from '../components/user-menu'
import '../../app/studio.css'
import '../styles/auth.css'

export const Route = createFileRoute('/app')({
  head: () => ({
    meta: [
      { title: 'AI Creative Studio | SEEDANCE 3.0' },
      { name: 'description', content: 'Generate and edit images in the SEEDANCE creative studio.' },
      { name: 'robots', content: 'noindex,follow' },
    ],
    links: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
  }),
  component: StudioPage,
})

function StudioPage() {
  const [authOpen, setAuthOpen] = useState(false)
  const closeAuth = useCallback(() => setAuthOpen(false), [])

  useEffect(() => {
    void import('../../app/studio.js')
    const requestLogin = () => setAuthOpen(true)
    window.addEventListener('seedance:auth-required', requestLogin)
    return () => window.removeEventListener('seedance:auth-required', requestLogin)
  }, [])

  return (
    <>
      <div className="studio-shell">
        <aside className="sidebar" id="studio-sidebar">
          <a className="studio-brand" href="/"><img src="/assets/seedance-mark.svg" width="40" height="40" alt="" /><strong>SEEDANCE<br /><small>CREATIVE STUDIO</small></strong></a>
          <button className="sidebar-close" type="button" aria-label="Close model navigation">×</button>
          <nav aria-label="Model navigation">
            <div className="nav-section">
              <div className="section-heading"><span>AI VIDEO</span><span>02</span></div>
              <button className="model-button is-active" type="button" data-model="minimax-h3"><span className="model-symbol cyan">H3</span><span><strong>MiniMax H3</strong><small>Multimodal video</small></span><em>Featured</em></button>
              <button className="model-button" type="button" data-model="seedance-3"><img src="/assets/seedance-mark.svg" width="40" height="40" alt="" style={{ flexShrink: 0 }} /><span><strong>SEEDANCE 3.0</strong><small>Next-gen video</small></span><em className="soon">Coming Soon</em></button>
            </div>
            <div className="nav-section">
              <div className="section-heading"><span>AI IMAGE</span></div>
              <button className="model-button pose-workflow-button" type="button" data-model="pose-to-image">
                <span className="pose-symbol" aria-hidden="true">
                  <svg viewBox="0 0 32 32" role="presentation"><circle cx="16" cy="5.5" r="3" /><path d="M16 9v9m0-6-7 4m7-4 7 3m-7 3-5 9m5-9 6 9" /><circle cx="9" cy="16" r="1.25" /><circle cx="23" cy="15" r="1.25" /><circle cx="11" cy="27" r="1.25" /><circle cx="22" cy="27" r="1.25" /></svg>
                </span>
                <span className="pose-workflow-copy"><strong>Pose to Image</strong><small>Build poses in 3D</small></span>
                <em className="signature">Signature</em><span className="workflow-cta">Open Pose Studio <b>→</b></span>
              </button>
              <div className="section-heading image-models-heading"><span>IMAGE MODELS</span><span>02</span></div>
              <button className="model-button" type="button" data-model="nano-banana-2-lite"><span className="model-symbol violet">NB</span><span><strong>Nano Banana 2 Lite</strong><small>Fast image drafts</small></span></button>
              <button className="model-button" type="button" data-model="gpt-image-2"><span className="model-symbol orange">G2</span><span><strong>GPT Image 2</strong><small>Generation &amp; editing</small></span></button>
            </div>
          </nav>
          <div className="sidebar-foot"><a href="/">← Back to SEEDANCE 3.0</a></div>
        </aside>

        <main className="workspace">
          <header className="workspace-header">
            <div><button className="sidebar-open" type="button" aria-label="Open model navigation">☰</button><a href="/">Home</a></div>
            <div className="workspace-header-account"><UserMenu onLogin={() => setAuthOpen(true)} /></div>
          </header>

          <div className="workspace-body">
            <div className="workspace-title"><div><p id="model-category">AI VIDEO / MULTIMODAL</p><h1 id="model-name">MiniMax H3</h1></div><span className="model-status" id="model-status">Featured guide</span></div>
            <div className="creation-grid">
              <section className="creation-panel">
                <div className="model-select"><span className="model-symbol cyan" id="selected-symbol">H3</span><div><small>Selected model</small><strong id="selected-name">MiniMax H3</strong></div><span className="chevron">⌄</span></div>
                <div className="field-group" id="mode-group"><label>Create from</label><div className="segmented"><button className="is-selected" type="button">Media</button><button type="button">Image</button><button type="button">Text</button></div></div>
                <div className="field-group" id="upload-group">
                  <div className="label-line"><label id="reference-label">Reference files</label><span id="reference-meta">Image · Video · Audio</span></div>
                  <input id="reference-input" type="file" accept="image/png,image/jpeg,image/webp" hidden />
                  <button className="upload-box" id="upload-box" type="button"><span>＋</span><strong id="upload-title">Drop or choose reference media</strong><small id="upload-hint">Interface preview only—files are not uploaded</small></button>
                  <div className="reference-preview" id="reference-preview" hidden><img id="reference-preview-image" alt="Reference image preview" /><div><strong id="reference-file-name" /><small>Used for image-to-image generation</small></div><button id="reference-clear" type="button">Remove</button></div>
                </div>
                <div className="field-group">
                  <div className="label-line"><label htmlFor="studio-prompt">Prompt</label><span><b id="prompt-count">0</b>/2500</span></div>
                  <textarea id="studio-prompt" maxLength={2500} placeholder="Describe the subject, action, environment, camera, timing, and sound direction…" />
                  <div className="prompt-tools"><button type="button">✦ Prompt structure</button><button type="button">View examples</button></div>
                </div>
                <div className="settings-grid" id="video-settings"><label>Duration<select disabled><option>8 seconds</option></select></label><label>Resolution<select disabled><option>Preview</option></select></label><label>Aspect ratio<select disabled><option>16:9</option></select></label></div>
                <div className="settings-grid image-settings" id="image-settings" hidden><label>Quantity<select disabled><option>1 image</option></select></label><label>Quality<select disabled><option>Preview</option></select></label><label>Aspect ratio<select disabled><option>1:1</option></select></label></div>
                <button className="generate-button" id="generate-button" type="button" disabled><span id="generate-button-label">Generation coming soon</span></button>
                <div className="generation-status" id="generation-status" role="status" aria-live="polite" />
              </section>

              <aside className="context-panel">
                <div className="context-card spotlight"><span>MODEL NOTE</span><h2 id="context-title">MiniMax H3 is available from its official provider.</h2></div>
                <div className="context-card result-card" id="result-card" hidden><div className="result-heading"><span>GENERATED IMAGE</span><small>GPT Image 2</small></div><div className="result-frame"><img id="result-image" alt="Generated image result" /></div><p id="result-note">Provider image links may expire. Open the original and save it when the result is ready.</p><a id="result-link" href="#" target="_blank" rel="noopener noreferrer">Open / save original →</a></div>
                <div className="context-card"><div className="context-tabs"><button className="is-selected" type="button">Examples</button><button type="button">Tips</button></div><div className="example-art"><div className="orb" /><span>CREATIVE DIRECTION</span></div><h3 id="example-title">Cinematic product reveal</h3><p id="example-prompt">A slow orbital camera, controlled reflections, native room tone, and a clean final composition.</p></div>
              </aside>
            </div>
          </div>
        </main>
      </div>
      <AuthDialog open={authOpen} onClose={closeAuth} />
    </>
  )
}
