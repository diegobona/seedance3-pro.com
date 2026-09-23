import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import { AuthDialog } from '../components/auth-dialog'
import { UserMenu } from '../components/user-menu'
import '../../app/studio.css'
import '../styles/auth.css'
import crossedArmsPresetImage from '../../app/pose-assets/presets/anyposes-crossed-arms.png'
import kneelingPresetImage from '../../app/pose-assets/presets/anyposes-kneeling.png'
import joggingPresetImage from '../../app/pose-assets/presets/anyposes-jogging.png'
import studio01Preview from '../../app/pose-assets/studio-01-preview.png'
import studio02Preview from '../../app/pose-assets/studio-02-preview.png'
import catPreview from '../../app/pose-assets/animals/cat-preview.png'
import dogPreview from '../../app/pose-assets/animals/dog-preview.png'
import horsePreview from '../../app/pose-assets/animals/horse-preview.png'

export const Route = createFileRoute('/app')({
  validateSearch: (search: Record<string, unknown>) => ({ model: typeof search.model === 'string' ? search.model : '' }),
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
  const { model: initialModel } = Route.useSearch()
  const initiallyPose = initialModel === 'pose-to-image'
  const [authOpen, setAuthOpen] = useState(false)
  const closeAuth = useCallback(() => setAuthOpen(false), [])
  const refreshCreditsAfterAuth = useCallback(() => {
    window.dispatchEvent(new CustomEvent('seedance:auth-changed'))
  }, [])

  useEffect(() => {
    let disposed = false
    let studioCleanup: undefined | (() => void)
    void import('../../app/studio.js').then(({ initializeStudio }) => {
      if (disposed) return
      studioCleanup = initializeStudio()
    })
    const requestLogin = () => setAuthOpen(true)
    window.addEventListener('seedance:auth-required', requestLogin)
    return () => {
      disposed = true
      studioCleanup?.()
      window.removeEventListener('seedance:auth-required', requestLogin)
    }
  }, [])

  return (
    <>
      <div className={`studio-shell${initiallyPose ? ' is-pose-mode' : ''}`}>
        <aside className="sidebar" id="studio-sidebar">
          <a className="studio-brand" href="/"><img src="/assets/seedance-mark.svg" width="40" height="40" alt="" /><strong>SEEDANCE<br /><small>CREATIVE STUDIO</small></strong></a>
          <button className="sidebar-close" type="button" aria-label="Close model navigation">×</button>
          <nav aria-label="Model navigation">
            <div className="nav-section">
              <div className="section-heading"><span>AI VIDEO</span><span>02</span></div>
              <button className="model-button price-model" type="button" data-model="minimax-h3"><span className="model-symbol cyan">H3</span><span><strong>MiniMax H3</strong><small>Text-to-video</small></span><em className="price-badge">FROM <b>$0.01</b></em></button>
              <button className="model-button" type="button" data-model="seedance-3" disabled><img src="/assets/seedance-mark.svg" width="40" height="40" alt="" style={{ flexShrink: 0 }} /><span><strong>SEEDANCE 3.0</strong><small>Next-gen video</small></span><em className="soon">Coming Soon</em></button>
            </div>
            <div className="nav-section">
              <div className="section-heading"><span>AI IMAGE</span></div>
              <button className={`model-button pose-workflow-button${initiallyPose ? ' is-active' : ''}`} type="button" data-model="pose-to-image">
                <span className="pose-symbol" aria-hidden="true">
                  <svg viewBox="0 0 32 32" role="presentation"><circle cx="16" cy="5.5" r="3" /><path d="M16 9v9m0-6-7 4m7-4 7 3m-7 3-5 9m5-9 6 9" /><circle cx="9" cy="16" r="1.25" /><circle cx="23" cy="15" r="1.25" /><circle cx="11" cy="27" r="1.25" /><circle cx="22" cy="27" r="1.25" /></svg>
                </span>
                <span className="pose-workflow-copy"><strong>Pose to Image</strong><small>Build poses in 3D</small></span>
                <em className="signature">SIGNATURE</em>
                <span className="workflow-cta">Open Pose Studio <b>↗</b></span>
              </button>
              <div className="section-heading image-models-heading"><span>IMAGE MODELS</span><span>02</span></div>
              <button className={`model-button price-model${initiallyPose ? '' : ' is-active'}`} type="button" data-model="gpt-image-2"><span className="model-symbol orange">G2</span><span><strong>GPT Image 2</strong><small>Generation &amp; editing</small></span><em className="price-badge">FROM <b>$0.01</b></em></button>
              <button className="model-button" type="button" data-model="nano-banana-2-lite" disabled><span className="model-symbol violet">NB</span><span><strong>Nano Banana 2 Lite</strong><small>Fast image drafts</small></span><em className="soon">Coming Soon</em></button>
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
            <div className="workspace-title"><div><p id="model-category">{initiallyPose ? 'AI IMAGE / POSE CONTROL' : 'AI IMAGE / GENERATE & EDIT'}</p><h1 id="model-name">{initiallyPose ? 'Pose Studio' : 'GPT Image 2'}</h1></div><span className="model-status" id="model-status" hidden={initiallyPose}>{initiallyPose ? '' : 'Image generator'}</span></div>
            <div className="creation-grid" id="creation-grid" hidden={initiallyPose}>
              <section className="creation-panel">
                <div className="model-select"><span className="model-symbol orange" id="selected-symbol">G2</span><div><small>Selected model</small><strong id="selected-name">GPT Image 2</strong></div></div>
                <div className="field-group" id="mode-group" hidden><label>Create from</label><div className="segmented"><button className="is-selected" type="button">Media</button><button type="button">Image</button><button type="button">Text</button></div></div>
                <div className="field-group" id="upload-group">
                  <div className="label-line"><label id="reference-label">Reference image</label><span id="reference-meta">Optional · enables image-to-image</span></div>
                  <input id="reference-input" type="file" accept="image/png,image/jpeg,image/webp" hidden />
                  <button className="upload-box is-enabled" id="upload-box" type="button"><span>＋</span><strong id="upload-title">Choose a reference image</strong><small id="upload-hint">PNG, JPEG or WebP · max 10 MB</small></button>
                  <div className="reference-preview" id="reference-preview" hidden><img id="reference-preview-image" alt="Reference image preview" /><div><span className="reference-attached-badge">REFERENCE READY</span><strong id="reference-file-name" /><small>Used for image-to-image generation</small></div><button id="reference-clear" type="button">Remove</button></div>
                </div>
                <div className="field-group">
                  <div className="label-line"><label htmlFor="studio-prompt">Prompt</label><span><b id="prompt-count">0</b>/2500</span></div>
                  <textarea id="studio-prompt" maxLength={2500} placeholder="Describe the subject, action, environment, composition, lighting, style, and details to preserve…" />
                  <div className="prompt-tools"><button id="prompt-structure-button" type="button">✦ Prompt structure</button><button id="example-prompt-button" type="button">View examples</button></div>
                </div>
                <div className="settings-grid" id="video-settings" hidden>
                  <label>Duration<select id="video-duration" defaultValue="5"><option value="5">5 seconds</option><option value="10">10 seconds</option><option value="15">15 seconds</option></select></label>
                  <label className="resolution-setting"><span className="resolution-heading"><span>Resolution</span><small>TRIAL · 480P ONLY</small></span><select id="video-resolution" value="480p" disabled><option value="480p">480p</option></select></label>
                  <label>Aspect ratio<select id="video-aspect-ratio" defaultValue="16:9"><option value="9:16">9:16 portrait</option><option value="16:9">16:9 landscape</option><option value="1:1">1:1 square</option></select></label>
                </div>
                <div className="settings-grid image-settings" id="image-settings">
                  <label>Quantity<select id="image-quantity"><option value="1">1 image</option><option value="2">2 images</option><option value="3">3 images</option></select></label>
                  <label className="resolution-setting">
                    <span className="resolution-heading"><span>Resolution</span><small>TRIAL · 1K ONLY</small></span>
                    <select id="image-quality" defaultValue="1K">
                      <option value="1K">1K</option>
                      <option value="2K" disabled>2K · Locked</option>
                      <option value="4K" disabled>4K · Locked</option>
                    </select>
                  </label>
                  <label>Aspect ratio<select id="image-aspect-ratio"><option value="1:1">1:1</option><option value="3:2">3:2 landscape</option><option value="2:3">2:3 portrait</option></select></label>
                </div>
                <section id="credit-summary" className="credit-summary" aria-label="Generation credit summary" aria-live="polite">
                  <div className="credit-summary-panel credit-summary-cost"><span>THIS GENERATION</span><strong id="generation-credit-cost" className="credit-summary-value">5 credits</strong></div>
                  <div className="credit-summary-panel credit-summary-balance"><span>YOUR BALANCE</span><strong id="current-credit-balance" className="credit-summary-value">— credits</strong></div>
                </section>
                <section className="launch-waitlist" id="launch-waitlist" aria-labelledby="launch-waitlist-title" hidden>
                  <span className="launch-waitlist-eyebrow">EARLY ACCESS</span>
                  <h2 id="launch-waitlist-title">Full launch is coming soon</h2>
                  <p>Video generation from <strong>$0.01/sec</strong>. Join the launch list and receive <strong>5 bonus credits</strong> when we go live.</p>
                  <button id="launch-waitlist-button" type="button">Notify me &amp; claim 5 credits</button>
                  <small>We'll email your account address once paid plans open. No spam.</small>
                  <div className="launch-waitlist-status" id="launch-waitlist-status" role="status" aria-live="polite" />
                </section>
                <button className="generate-button" id="generate-button" type="button" disabled><span id="generate-button-label">Generate image · 5 credits</span></button>
                <div className="generation-status" id="generation-status" role="status" aria-live="polite" />
              </section>

              <aside className="context-panel">
                <div className="context-card result-card" id="result-card" hidden>
                  <div className="result-heading"><span id="result-heading-label">GENERATED IMAGES</span><small id="result-model-label">GPT Image 2</small></div>
                  <div className="result-gallery" id="result-gallery" />
                  <div className="pose-result-actions" id="pose-result-actions" hidden>
                    <div><span>POSE GUIDED</span><small>Keep refining this pose or create another variation.</small></div>
                    <div className="pose-result-buttons">
                      <button id="edit-pose-button" type="button">Edit pose</button>
                      <button id="generate-again-button" type="button">Generate again · 5 credits</button>
                    </div>
                  </div>
                  <p id="result-note">Provider image links may expire. Open or download each result when it is ready.</p>
                </div>
                <section className="context-card example-carousel" id="example-carousel" aria-labelledby="example-carousel-heading">
                  <div className="result-heading"><span id="example-carousel-heading">IMAGE PREVIEW</span><small>3 DISTINCT STYLES</small></div>
                  <div className="example-carousel-viewport">
                    <figure className="example-carousel-slide" data-title="Editorial architecture" data-description="Photoreal fashion direction with strong geometry and cinematic light."><img src="/assets/gpt-image-2-editorial-fashion.webp" alt="Editorial fashion portrait inside a futuristic gallery" /></figure>
                    <figure className="example-carousel-slide" data-title="Playful 3D world" data-description="A tactile character scene with expressive details and luminous color." hidden><img src="/assets/gpt-image-2-lunar-garden.webp" alt="Stylized astronaut tending a luminous garden on the moon" /></figure>
                    <figure className="example-carousel-slide" data-title="Fantasy concept art" data-description="An expansive cinematic environment built for scale, depth, and atmosphere." hidden><img src="/assets/gpt-image-2-floating-city.webp" alt="Fantasy floating city above clouds at sunrise" /></figure>
                    <button className="example-carousel-arrow previous" id="example-carousel-previous" type="button" aria-label="Previous example image">←</button>
                    <button className="example-carousel-arrow next" id="example-carousel-next" type="button" aria-label="Next example image">→</button>
                  </div>
                  <div className="example-carousel-footer">
                    <div><h3 id="example-title">Editorial architecture</h3><p id="example-prompt">Photoreal fashion direction with strong geometry and cinematic light.</p></div>
                    <div className="example-carousel-dots" aria-label="Choose an example image">
                      <button className="is-active" type="button" data-carousel-dot aria-label="Show editorial architecture example" aria-current="true" />
                      <button type="button" data-carousel-dot aria-label="Show playful 3D example" aria-current="false" />
                      <button type="button" data-carousel-dot aria-label="Show fantasy concept art example" aria-current="false" />
                    </div>
                  </div>
                </section>
              </aside>
            </div>

            <section className="pose-studio" id="pose-studio" aria-label="3D pose editor" hidden={!initiallyPose}>
              <div className="pose-export-bar" aria-label="Generate, export and share">
                <div className="pose-export-actions">
                  <button type="button" data-pose-action="use" disabled>Pose to Image</button>
                  <button type="button" data-pose-action="download" disabled>Download PNG</button>
                  <button type="button" data-pose-action="copy" disabled>Copy image</button>
                  <button type="button" data-pose-action="share" disabled>Copy editable scene link</button>
                </div>
                <details className="pose-action-help"><summary>How it works</summary><p>Pose to Image sends a clean scene capture to the image workspace as a pose and camera reference. Downloading and copying reference images do not require sign-in.</p></details>
                <input id="pose-share-link" className="pose-share-link" aria-label="Editable scene link" readOnly hidden onFocus={event => event.currentTarget.select()} />
              </div>
              <div className="pose-stage-card">
                <div className="pose-toolbar">
                  <div className="pose-stage-heading">
                    <button className="pose-sidebar-toggle" type="button" aria-controls="studio-sidebar" aria-expanded="true" title="Collapse menu">‹ <span>Collapse menu</span></button>
                    
                  </div>
                  <div className="pose-object-toolbar" id="pose-object-toolbar" role="toolbar" aria-label="Selected object tools" hidden>
                    <div className="pose-object-tools">
                      <button type="button" data-pose-tool="pose" aria-label="Pose joints" aria-pressed="true" title="Adjust body pose"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="4" r="2" /><path d="M12 7v7m-7-5 7 2 7-2M7 21l5-7 5 7" /></svg><span>Pose</span></button>
                      <button type="button" data-pose-tool="translate" aria-label="Move object" aria-pressed="false" title="Move object"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2v20M2 12h20M8 6l4-4 4 4M8 18l4 4 4-4M6 8l-4 4 4 4m12-8 4 4-4 4" /></svg><span>Move</span></button>
                      <button type="button" data-pose-tool="rotate" aria-label="Rotate object" aria-pressed="false" title="Rotate object"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7a9 9 0 0 0-15-1M4 17a9 9 0 0 0 15 1M20 2v5h-5M4 22v-5h5" /></svg><span>Rotate</span></button>
                      <button type="button" data-pose-tool="scale" aria-label="Scale object" aria-pressed="false" title="Scale object proportionally"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3h7v7M21 3l-9 9M3 14v7h7M3 21l9-9" /></svg><span>Scale</span></button>
                      <button type="button" data-pose-action="remove" className="pose-delete-tool" aria-label="Delete object" title="Delete selected object"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7" /></svg><span>Delete</span></button>
                    </div>
                  </div>
                  <div className="pose-history-controls" aria-label="Pose history">
                    <button type="button" data-pose-action="undo" aria-label="Undo pose change" disabled>↶ <span>Undo</span></button>
                    <button type="button" data-pose-action="redo" aria-label="Redo pose change" disabled>↷ <span>Redo</span></button>
                    <button type="button" data-pose-action="reset">Reset</button>
                    <button type="button" data-pose-action="mirror" disabled>Mirror</button>
                  </div>
                </div>
                <div className="pose-canvas" id="pose-canvas" role="application" aria-label="Interactive 3D characters. Drag the glowing handles to pose the body.">
                  <div className="pose-canvas-loading" id="pose-canvas-loading"><span /> Loading character…</div>
                  <div className="pose-canvas-hint" id="pose-canvas-hint">Drag handles to pose · Left-drag empty space to orbit · Right-drag / Shift + left-drag to pan · Scroll to zoom</div>
                </div>
              </div>

              <aside className="pose-control-panel">
                <section className="pose-control-card pose-actors-card">
                  <div className="pose-control-heading"><div><span>BUILD YOUR SCENE</span><h3>Characters</h3></div></div>
                  <div className="pose-model-grid" aria-label="Character models">
                    <button type="button" data-pose-model="studio-02" className="is-active" aria-pressed="true"><img src={studio02Preview} alt="Male character preview" /><span>Male</span></button>
                    <button type="button" data-pose-model="studio-01" aria-pressed="false"><img src={studio01Preview} alt="Female character preview" /><span>Female</span></button>
                    {([['cat',catPreview],['dog',dogPreview],['horse',horsePreview]] as const).map(([kind,preview]) => <button type="button" key={kind} data-pose-model={kind} aria-pressed="false"><img src={preview} alt="" /><span>{kind.charAt(0).toUpperCase()+kind.slice(1)}</span></button>)}
                  </div>
                  <button type="button" className="pose-add-button" data-pose-action="add">+ Add character</button>
                </section>
                <section className="pose-control-card pose-props-card">
                  <div className="pose-control-heading"><div><span>SET THE SCENE</span><h3>Props</h3></div></div>
                  <div className="pose-view-grid">{[['chair','Chair'],['stool','Stool'],['table','Table'],['box','Box'],['ball','Ball'],['staff','Staff']].map(([kind,label]) => <button type="button" key={kind} data-pose-prop={kind}>+ {label}</button>)}</div>
                </section>
                <section className="pose-control-card">
                  <div className="pose-control-heading"><div><span>COMPOSE</span><h3>Camera &amp; colors</h3></div></div>
                  <div className="pose-view-grid" aria-label="Camera views">{[['front','Front'],['three','¾ view'],['left','Left'],['right','Right'],['back','Back'],['high','High']].map(([view,label]) => <button type="button" key={view} data-pose-view={view}>{label}</button>)}</div>
                  <label className="pose-field">Selected object<input type="color" id="pose-body-color" defaultValue="#d9d9d9" /></label>
                  <label className="pose-field">Background<input type="color" id="pose-background-color" defaultValue="#0b0d0d" /></label>
                  <div className="pose-view-grid" aria-label="Color themes"><button type="button" data-pose-palette="#d9d9d9,#0b0d0d">Dark</button><button type="button" data-pose-palette="#334155,#e5e7eb">Light</button><button type="button" data-pose-palette="#e0a442,#183044">Contrast</button></div>
                  <div className="pose-guide-options"><label><input type="checkbox" id="pose-show-ground" />Ground</label><label><input type="checkbox" id="pose-show-grid" />Grid</label></div>
                </section>
                <section className="pose-control-card pose-library-card">
                  <div className="pose-control-heading"><div><span>QUICK START</span><h3>Pose presets</h3></div></div>
                  <label className="pose-field">Category<select id="pose-preset-category" defaultValue="All">{['All','Standing','Gesture','Action','Seated','Floor'].map(category => <option key={category}>{category}</option>)}</select></label>
                  <div className="pose-preset-grid">
                    <button type="button" data-pose-preset="crossed-arms"><span className="pose-preset-preview crossed-arms"><img src={crossedArmsPresetImage} alt="" /></span>Crossed arms</button>
                    <button type="button" data-pose-preset="kneeling"><span className="pose-preset-preview kneeling"><img src={kneelingPresetImage} alt="" /></span>Kneeling</button>
                    <button type="button" data-pose-preset="jogging"><span className="pose-preset-preview jogging"><img src={joggingPresetImage} alt="" /></span>Jogging</button>
                  </div>
                </section>

              </aside>
              <footer className="pose-model-credits"><p>Cat by <a href="https://blendswap.com/blend/18519" target="_blank" rel="noreferrer">JonasDichelle</a> and horse by <a href="https://blendswap.com/blend/13903" target="_blank" rel="noreferrer">b2przemo</a>, <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noreferrer">CC BY 3.0</a>. Source conversion by <a href="https://github.com/nrz/ylikuutio" target="_blank" rel="noreferrer">Antti Nuortimo</a>. Dog by <a href="https://opengameart.org/content/dog-low-poly-rigged" target="_blank" rel="noreferrer">crownjoshua</a>, CC0. Meshes adapted and rigged for Pose Studio.</p></footer>
            </section>
          </div>
        </main>
      </div>
      <AuthDialog open={authOpen} onClose={closeAuth} onAuthenticated={refreshCreditsAfterAuth} />
    </>
  )
}
