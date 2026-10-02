import { localizeHead } from '../lib/site-i18n'
import { SiteLanguageSwitch } from '../components/site-language-switch'
import { useSiteI18n } from '../lib/site-i18n'
import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import { AuthDialog } from '../components/auth-dialog'
import { UserMenu } from '../components/user-menu'
import { ModelLandingContent } from '../components/model-landing-content'
import { H3VideoExamples } from '../components/h3-video-examples'
import { GptImageExamples } from '../components/gpt-image-examples'
import { TRIAL_CREDIT_GRANT } from '../lib/generation-credits'
import '../../app/studio.css'
import '../styles/auth.css'
import '../styles/model-landing.css'
import crossedArmsPresetImage from '../../app/pose-assets/presets/anyposes-crossed-arms.png'
import kneelingPresetImage from '../../app/pose-assets/presets/anyposes-kneeling.png'
import joggingPresetImage from '../../app/pose-assets/presets/anyposes-jogging.png'
import studio01Preview from '../../app/pose-assets/studio-01-preview.png'
import studio02Preview from '../../app/pose-assets/studio-02-preview.png'
import catPreview from '../../app/pose-assets/animals/cat-preview.png'
import dogPreview from '../../app/pose-assets/animals/dog-preview.png'
import horsePreview from '../../app/pose-assets/animals/horse-preview.png'

export const Route = createFileRoute('/app')({
  validateSearch: (search: Record<string, unknown>) =>
    typeof search.model === 'string' && search.model ? { model: search.model } : {},
  head: () => (localizeHead({
    meta: [
      { title: 'AI Creative Studio | SEEDANCE 3.0' },
      { name: 'description', content: 'Generate and edit images in the SEEDANCE creative studio.' },
      { name: 'robots', content: 'noindex,follow' },
    ],
    links: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
  }, "/app", 'en')),
  component: AppPage,
})

function AppPage() {
  const { model } = Route.useSearch()
  return <StudioPage initialModel={model} />
}

export function StudioPage({ initialModel = 'gpt-image-2', modelLanding = false }: { initialModel?: string; modelLanding?: boolean }) {
  const { t, path } = useSiteI18n()
  const initiallyPose = initialModel === 'pose-to-image'
  const initiallyH3 = initialModel === 'minimax-h3'
  const initiallySeedance25 = initialModel === 'seedance-2-5'
  const initiallyVideo = initiallyH3 || initiallySeedance25
  const showGptImageExamples = initialModel === 'gpt-image-2' && modelLanding
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
          <a className="studio-brand" href={path("/")}><img src="/assets/seedance-mark.svg" width="40" height="40" alt="" /><strong>{t("SEEDANCE")}<br /><small>{t("CREATIVE STUDIO")}</small></strong></a>
          <button className="sidebar-close" type="button" aria-label={t("Close model navigation")}>×</button>
          <nav aria-label={t("Model navigation")}>
            <div className="nav-section">
              <div className="section-heading"><span>{t("AI VIDEO")}</span><span>02</span></div>
              <button className={`model-button price-model${initiallyH3 ? ' is-active' : ''}`} type="button" data-model="minimax-h3"><span className="model-symbol cyan">{t("H3")}</span><span><strong>{t("MiniMax H3")}</strong><small>{t("Text-to-video")}</small></span><em className="price-badge">{t("FROM ")}<b>$0.01</b></em></button>
              <a className="model-button release-model" href={path("/app/video/seedance-3")}><img src="/assets/seedance-mark.svg" width="40" height="40" alt="" style={{ flexShrink: 0 }} /><span className="release-model-copy"><span className="release-title-row"><strong>{t("SEEDANCE 3.0")}</strong><em className="release-status">{t("Release Updates")}</em></span><small>{t("Workspace preview")}</small></span></a>
            </div>
            <div className="nav-section">
              <div className="section-heading"><span>{t("AI IMAGE")}</span></div>
              <button className={`model-button pose-workflow-button${initiallyPose ? ' is-active' : ''}`} type="button" data-model="pose-to-image">
                <span className="pose-symbol" aria-hidden="true">
                  <svg viewBox="0 0 32 32" role="presentation"><circle cx="16" cy="5.5" r="3" /><path d="M16 9v9m0-6-7 4m7-4 7 3m-7 3-5 9m5-9 6 9" /><circle cx="9" cy="16" r="1.25" /><circle cx="23" cy="15" r="1.25" /><circle cx="11" cy="27" r="1.25" /><circle cx="22" cy="27" r="1.25" /></svg>
                </span>
                <span className="pose-workflow-copy"><strong>{t("Pose to Image")}</strong><small>{t("Build poses in 3D")}</small></span>
                <em className="signature">{t("SIGNATURE")}</em>
                <span className="workflow-cta">{t("Open Pose Studio ")}<b>↗</b></span>
              </button>
              <div className="section-heading image-models-heading"><span>{t("IMAGE MODELS")}</span><span>01</span></div>
              <button className={`model-button price-model${initiallyPose || initiallyVideo ? '' : ' is-active'}`} type="button" data-model="gpt-image-2"><span className="model-symbol orange">{t("G2")}</span><span><strong>{t("GPT Image 2")}</strong><small>{t("Generation & editing")}</small></span><em className="price-badge">{t("FROM ")}<b>$0.01</b></em></button>
            </div>
            <div className="nav-section showcase-nav-section">
              <div className="section-heading"><span>{t("PROMPT LIBRARIES")}</span><span>03</span></div>
              <a className="showcase-nav-link" href={path("/minimax-h3-prompts")} target="_blank" rel="noopener"><span className="model-symbol cyan">{t("H3")}</span><span>{t("MiniMax H3 Prompt Library")}</span></a>
              <a className="showcase-nav-link" href={path("/gpt-image-2-prompts")} target="_blank" rel="noopener"><span className="model-symbol orange">{t("G2")}</span><span>{t("GPT Image 2 Prompt Library")}</span></a>
              <a className="showcase-nav-link" href={path("/seedance-3-0-prompts")} target="_blank" rel="noopener"><img src="/assets/seedance-mark.svg" width="34" height="34" alt="" /><span>{t("Seedance 3.0 Prompt Library")}<small>{t("Planned tests")}</small></span></a>
            </div>
          </nav>
          <div className="sidebar-foot"><a href={path("/")}>{t("← Back to SEEDANCE 3.0")}</a></div>
        </aside>

        <main className="workspace" id="workspace">
          <header className="workspace-header">
            <div><button className="sidebar-open" type="button" aria-label={t("Open model navigation")}>☰</button><a href={path("/")}>{t("Home")}</a></div>
            <div className="workspace-header-account"><SiteLanguageSwitch /><UserMenu onLogin={() => setAuthOpen(true)} /></div>
          </header>

          <div className="workspace-body">
            <div className="workspace-title"><div><p id="model-category">{initiallyPose ? t("AI IMAGE / POSE CONTROL") : initiallyVideo ? t("AI VIDEO / TEXT TO VIDEO") : t("AI IMAGE / GENERATE & EDIT")}</p><h1 id="model-name" data-landing-model={modelLanding ? initialModel : undefined}>{initiallyPose ? t("Pose Studio") : initiallySeedance25 ? t("Seedance 2.5 Video Generator") : initiallyH3 ? t("MiniMax H3 AI Video Generator") : modelLanding ? t("GPT Image 2 Generator & Editor") : t("GPT Image 2")}</h1></div><span className="model-status" id="model-status" hidden={initiallyPose}>{initiallyPose ? '' : initiallyVideo ? t("Video generator") : t("Image generator")}</span></div>
            {modelLanding && <p className="model-landing-intro">{initiallySeedance25 ? t("Create a video from a text prompt in the Seedance 2.5 workspace. Choose your video settings and follow the result here.") : initiallyH3 ? <>{t("Turn text or reference images into a MiniMax H3 video. Describe your scene, choose your settings, or start with an example from the ")}<a href={path("/minimax-h3-prompts")} target="_blank" rel="noopener">{t("MiniMax H3 Prompt Library")}</a>.</> : <>{t("Create or edit images with GPT Image 2 using text and reference images. Describe your idea, combine visual references, or start with an example from the ")}<a href={path("/gpt-image-2-prompts")} target="_blank" rel="noopener">{t("GPT Image 2 Prompt Library")}</a>.</>}</p>}
            <aside className="studio-trial-notice" role="note" aria-label={t("Free trial")}>
              <span className="studio-trial-icon" aria-hidden="true">✦</span>
              <div><strong>{t("Free trial")}</strong><span>{t("Sign up for {credits} free credits per account.").replace('{credits}', String(TRIAL_CREDIT_GRANT))}</span><p>{t("Image and video generation share your balance. Credit cost is shown before generation.")}</p></div>
            </aside>
            <div className="creation-grid" id="creation-grid" hidden={initiallyPose}>
              <section className="creation-panel">
                <div className="model-select"><span className={`model-symbol ${initiallySeedance25 ? 'lime' : initiallyH3 ? 'cyan' : 'orange'}`} id="selected-symbol">{initiallySeedance25 ? t("S2") : initiallyH3 ? t("H3") : t("G2")}</span><div><small>{t("Selected model")}</small><strong id="selected-name">{initiallySeedance25 ? t("SEEDANCE 2.5") : initiallyH3 ? t("MiniMax H3") : t("GPT Image 2")}</strong></div></div>
                <div className="field-group" id="mode-group" hidden={!initiallyH3}><label>{t("Create from")}</label><div className="segmented"><button className="is-selected" type="button" data-video-mode="text" aria-pressed="true">{t("Text to video")}</button><button type="button" data-video-mode="reference" aria-pressed="false">{t("Reference to video")}</button></div></div>
                <div className="field-group" id="video-reference-group" hidden>
                  <div className="label-line"><label htmlFor="video-reference-input">{t("Reference images")}</label><span id="video-reference-count">0 / 9</span></div>
                  <input id="video-reference-input" type="file" accept="image/png,image/jpeg,image/webp" multiple hidden />
                  <button className="upload-box is-enabled" id="video-reference-add" type="button"><span>＋</span><strong>{t("Add reference images")}</strong><small>{t("1–9 images · PNG, JPEG or WebP · max 10 MB each")}</small></button>
                  <p className="reference-paste-hint"><strong>{t("Paste reference images")}</strong><span>{t("Copy an image, then press")} <kbd>Ctrl + V</kbd> / <kbd>⌘ + V</kbd> {t("anywhere on this page.")}</span></p>
                  <div className="video-reference-grid" id="video-reference-grid" />
                  <p className="video-reference-hint">{t("Describe how the subjects in Image 1, Image 2, etc. should interact. Images are numbered in upload order.")}</p>
                </div>
                <div className="field-group" id="upload-group" hidden={initiallyVideo}>
                  <div className="label-line"><label id="reference-label">{t("Reference image")}</label><span id="reference-meta">{t("Optional · enables image-to-image")}</span></div>
                  <input id="reference-input" type="file" accept="image/png,image/jpeg,image/webp" multiple hidden />
                  <button className="upload-box is-enabled" id="upload-box" type="button"><span>＋</span><strong id="upload-title">{t("Choose a reference image")}</strong><small id="upload-hint">{t("PNG, JPEG or WebP · max 10 MB")}</small></button>
                  <p className="reference-paste-hint"><strong>{t("Paste reference images")}</strong><span>{t("Copy an image, then press")} <kbd>Ctrl + V</kbd> / <kbd>⌘ + V</kbd> {t("anywhere on this page.")}</span></p>
                  <div className="reference-preview" id="reference-preview" hidden><img id="reference-preview-image" alt={t("Reference image preview")} /><div><span className="reference-attached-badge">{t("REFERENCE READY")}</span><strong id="reference-file-name" /><small>{t("Used for image-to-image generation")}</small></div><button id="reference-clear" type="button">{t("Remove")}</button></div>
                </div>
                <div className="field-group">
                  <div className="label-line"><label htmlFor="studio-prompt">{t("Prompt")}</label><span><b id="prompt-count">0</b>/2500</span></div>
                  <textarea id="studio-prompt" maxLength={2500} placeholder={t(initiallyVideo ? 'Describe the subject, action, setting, camera movement, lighting, and final shot…' : 'Describe the subject, action, environment, composition, lighting, style, and details to preserve…')} />
                  <div className="prompt-tools" hidden={initiallyVideo}><button id="prompt-structure-button" type="button">{t("✦ Prompt structure")}</button><button id="example-prompt-button" type="button">{t("View examples")}</button></div>
                </div>
                <div className="settings-grid" id="video-settings" hidden={!initiallyVideo}>
                  <label>{t("Duration")}<select id="video-duration" defaultValue="5"><option value="5">{t("5 seconds")}</option><option value="10">{t("10 seconds")}</option><option value="15">{t("15 seconds")}</option></select></label>
                  <label className="resolution-setting"><span className="resolution-heading"><span>{t("Resolution")}</span><small>{t("TRIAL · 480P ONLY")}</small></span><select id="video-resolution" value="480p" disabled><option value="480p">{t("480p")}</option></select></label>
                  <label>{t("Aspect ratio")}<select id="video-aspect-ratio" defaultValue="16:9"><option value="9:16">{t("9:16 portrait")}</option><option value="16:9">{t("16:9 landscape")}</option><option value="1:1">{t("1:1 square")}</option></select></label>
                </div>
                <div className="settings-grid image-settings" id="image-settings" hidden={initiallyVideo}>
                  <label>{t("Quantity")}<select id="image-quantity"><option value="1">{t("1 image")}</option><option value="2">{t("2 images")}</option><option value="3">{t("3 images")}</option></select></label>
                  <label className="resolution-setting">
                    <span className="resolution-heading"><span>{t("Resolution")}</span><small>{t("TRIAL · 1K ONLY")}</small></span>
                    <select id="image-quality" defaultValue="1K">
                      <option value="1K">{t("1K")}</option>
                      <option value="2K" disabled>{t("2K · Locked")}</option>
                      <option value="4K" disabled>{t("4K · Locked")}</option>
                    </select>
                  </label>
                  <label>{t("Aspect ratio")}<select id="image-aspect-ratio"><option value="1:1">1:1</option><option value="3:2">{t("3:2 landscape")}</option><option value="2:3">{t("2:3 portrait")}</option></select></label>
                </div>
                <section id="credit-summary" className="credit-summary" aria-label={t("Generation credit summary")} aria-live="polite">
                  <div className="credit-summary-panel credit-summary-cost"><span>{t("THIS GENERATION")}</span><strong id="generation-credit-cost" className="credit-summary-value">{t("5 credits")}</strong></div>
                  <div className="credit-summary-panel credit-summary-balance"><span>{t("YOUR BALANCE")}</span><strong id="current-credit-balance" className="credit-summary-value">{t("— credits")}</strong></div>
                </section>
                <section className="launch-waitlist" id="launch-waitlist" aria-labelledby="launch-waitlist-title" hidden>
                  <span className="launch-waitlist-eyebrow">{t("EARLY ACCESS")}</span>
                  <h2 id="launch-waitlist-title">{t("Full launch is coming soon")}</h2>
                  <p>{t("Video generation from ")}<strong>{t("$0.01/sec")}</strong>{t(". Join the launch list and receive ")}<strong>{t("5 bonus credits")}</strong>{t(" when we go live.")}</p>
                  <button id="launch-waitlist-button" type="button">{t("Notify me & claim 5 credits")}</button>
                  <small>{t("We'll email your account address once paid plans open. No spam.")}</small>
                  <div className="launch-waitlist-status" id="launch-waitlist-status" role="status" aria-live="polite" />
                </section>
                <button className="generate-button" id="generate-button" type="button" disabled><span id="generate-button-label">{initiallyVideo ? t("Generate video · 5 credits") : t("Generate image · 5 credits")}</span></button>
                <div className="generation-status" id="generation-status" role="status" aria-live="polite" />
              </section>

              <aside className="context-panel">
                {initiallyH3 && modelLanding && <H3VideoExamples />}
                {showGptImageExamples && <GptImageExamples />}
                <section className="context-card pose-reference-card" id="pose-reference-card" hidden>
                  <div className="result-heading"><span>{t("YOUR POSE SCENE")}</span><small>{t("Pose Studio")}</small></div>
                  <div className="result-frame"><img id="pose-scene-preview" alt={t("Your captured Pose Studio scene")} /></div>
                  <p>{t("Describe the characters, clothing, scene and style on the left, then generate your image.")}</p>
                </section>
                {initiallySeedance25 && modelLanding && <section className="context-card model-video-guide" aria-label={t("Video trial details")}><p className="model-landing-eyebrow">{t("Seedance 2.5 trial")}</p><h2>{t("Direct your first shot")}</h2><p>{t("Start with the subject and action, then add camera movement, setting and lighting. Describe the scene you want to bring to life.")}</p><ul><li>{t("Choose from the available video durations")}</li><li>{t("Select a frame format for your scene")}</li><li>{t("Credit cost shown before generation")}</li></ul><a href="#model-details">{t("How this tool works ↓")}</a></section>}
                <div className="context-card result-card" id="result-card" hidden>
                  <div className="result-heading"><span id="result-heading-label">{t("GENERATED IMAGES")}</span><small id="result-model-label">{t("GPT Image 2")}</small></div>
                  <div className="result-gallery" id="result-gallery" />
                  <div className="pose-result-actions" id="pose-result-actions" hidden>
                    <div><span>{t("POSE GUIDED")}</span><small>{t("Keep refining this pose or create another variation.")}</small></div>
                    <div className="pose-result-buttons">
                      <button id="edit-pose-button" type="button">{t("Edit pose")}</button>
                      <button id="generate-again-button" type="button">{t("Generate again · 5 credits")}</button>
                    </div>
                  </div>
                  <p id="result-note">{t("Provider image links may expire. Open or download each result when it is ready.")}</p>
                </div>
                <section className="context-card example-carousel" id="example-carousel" aria-labelledby="example-carousel-heading" hidden={initiallyVideo || showGptImageExamples}>
                  <div className="result-heading"><span id="example-carousel-heading">{t("IMAGE PREVIEW")}</span><small>{t("3 DISTINCT STYLES")}</small></div>
                  <div className="example-carousel-viewport">
                    <figure className="example-carousel-slide" data-title={t("Editorial architecture")} data-description={t("Photoreal fashion direction with strong geometry and cinematic light.")}><img src="/assets/gpt-image-2-editorial-fashion.webp" alt={t("Editorial fashion portrait inside a futuristic gallery")} /></figure>
                    <figure className="example-carousel-slide" data-title={t("Playful 3D world")} data-description={t("A tactile character scene with expressive details and luminous color.")} hidden><img src="/assets/gpt-image-2-lunar-garden.webp" alt={t("Stylized astronaut tending a luminous garden on the moon")} /></figure>
                    <figure className="example-carousel-slide" data-title={t("Fantasy concept art")} data-description={t("An expansive cinematic environment built for scale, depth, and atmosphere.")} hidden><img src="/assets/gpt-image-2-floating-city.webp" alt={t("Fantasy floating city above clouds at sunrise")} /></figure>
                    <button className="example-carousel-arrow previous" id="example-carousel-previous" type="button" aria-label={t("Previous example image")}>←</button>
                    <button className="example-carousel-arrow next" id="example-carousel-next" type="button" aria-label={t("Next example image")}>→</button>
                  </div>
                  <div className="example-carousel-footer">
                    <div><h3 id="example-title">{t("Editorial architecture")}</h3><p id="example-prompt">{t("Photoreal fashion direction with strong geometry and cinematic light.")}</p></div>
                    <div className="example-carousel-dots" aria-label={t("Choose an example image")}>
                      <button className="is-active" type="button" data-carousel-dot aria-label={t("Show editorial architecture example")} aria-current="true" />
                      <button type="button" data-carousel-dot aria-label={t("Show playful 3D example")} aria-current="false" />
                      <button type="button" data-carousel-dot aria-label={t("Show fantasy concept art example")} aria-current="false" />
                    </div>
                  </div>
                </section>
              </aside>
            </div>

            <section className="pose-studio" id="pose-studio" aria-label={t("3D pose editor")} hidden={!initiallyPose}>
              <div className="pose-export-bar" aria-label={t("Generate, export and share")}>
                <div className="pose-export-actions">
                  <button type="button" data-pose-action="use" disabled>{t("Pose to Image")}</button>
                  <button type="button" data-pose-action="download" disabled>{t("Download PNG")}</button>
                  <button type="button" data-pose-action="copy" disabled>{t("Copy image")}</button>
                  <button type="button" data-pose-action="share" disabled>{t("Copy editable scene link")}</button>
                </div>
                <details className="pose-action-help"><summary>{t("How it works")}</summary><p>{t("Pose to Image sends a clean scene capture to the image workspace as a pose and camera reference. Downloading and copying reference images do not require sign-in.")}</p></details>
                <input id="pose-share-link" className="pose-share-link" aria-label={t("Editable scene link")} readOnly hidden onFocus={event => event.currentTarget.select()} />
              </div>
              <div className="pose-stage-card">
                <div className="pose-toolbar">
                  <div className="pose-stage-heading">
                    <button className="pose-sidebar-toggle" type="button" aria-controls="studio-sidebar" aria-expanded="true" title={t("Collapse menu")}>‹ <span>{t("Collapse menu")}</span></button>
                  </div>
                  <div className="pose-object-toolbar" id="pose-object-toolbar" role="toolbar" aria-label={t("Selected object tools")} hidden>
                    <div className="pose-object-tools">
                      <button type="button" data-pose-tool="pose" aria-label={t("Pose joints")} aria-pressed="true" title={t("Adjust body pose")}><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="4" r="2" /><path d="M12 7v7m-7-5 7 2 7-2M7 21l5-7 5 7" /></svg><span>{t("Pose")}</span></button>
                      <button type="button" data-pose-tool="translate" aria-label={t("Move object")} aria-pressed="false" title={t("Move object")}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2v20M2 12h20M8 6l4-4 4 4M8 18l4 4 4-4M6 8l-4 4 4 4m12-8 4 4-4 4" /></svg><span>{t("Move")}</span></button>
                      <button type="button" data-pose-tool="rotate" aria-label={t("Rotate object")} aria-pressed="false" title={t("Rotate object")}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7a9 9 0 0 0-15-1M4 17a9 9 0 0 0 15 1M20 2v5h-5M4 22v-5h5" /></svg><span>{t("Rotate")}</span></button>
                      <button type="button" data-pose-tool="scale" aria-label={t("Scale object")} aria-pressed="false" title={t("Scale object proportionally")}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3h7v7M21 3l-9 9M3 14v7h7M3 21l9-9" /></svg><span>{t("Scale")}</span></button>
                      <button type="button" data-pose-action="remove" className="pose-delete-tool" aria-label={t("Delete object")} title={t("Delete selected object")}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7" /></svg><span>{t("Delete")}</span></button>
                    </div>
                  </div>
                  <div className="pose-history-controls" aria-label={t("Pose history")}>
                    <button type="button" data-pose-action="undo" aria-label={t("Undo pose change")} disabled>↶ <span>{t("Undo")}</span></button>
                    <button type="button" data-pose-action="redo" aria-label={t("Redo pose change")} disabled>↷ <span>{t("Redo")}</span></button>
                    <button type="button" data-pose-action="reset">{t("Reset")}</button>
                    <button type="button" data-pose-action="mirror" disabled>{t("Mirror")}</button>
                  </div>
                </div>
                <div className="pose-canvas" id="pose-canvas" role="application" aria-label={t("Interactive 3D characters. Drag the glowing handles to pose the body.")}>
                  <div className="pose-canvas-loading" id="pose-canvas-loading"><span />{t(" Loading character…")}</div>
                  <div className="pose-canvas-hint" id="pose-canvas-hint">{t("Drag handles to pose · Left-drag empty space to orbit · Right-drag / Shift + left-drag to pan · Scroll to zoom")}</div>
                </div>
              </div>

              <aside className="pose-control-panel">
                <section className="pose-control-card pose-actors-card">
                  <div className="pose-control-heading"><div><span>{t("BUILD YOUR SCENE")}</span><h3>{t("Characters")}</h3></div></div>
                  <div className="pose-model-grid" aria-label={t("Character models")}>
                    <button type="button" data-pose-model="studio-02" className="is-active" aria-pressed="true"><img src={studio02Preview} alt={t("Male character preview")} /><span>{t("Male")}</span></button>
                    <button type="button" data-pose-model="studio-01" aria-pressed="false"><img src={studio01Preview} alt={t("Female character preview")} /><span>{t("Female")}</span></button>
                    {([['cat',catPreview],['dog',dogPreview],['horse',horsePreview]] as const).map(([kind,preview]) => <button type="button" key={kind} data-pose-model={kind} aria-pressed="false"><img src={preview} alt="" /><span>{t(kind.charAt(0).toUpperCase()+kind.slice(1))}</span></button>)}
                  </div>
                  <button type="button" className="pose-add-button" data-pose-action="add">{t("+ Add character")}</button>
                </section>
                <section className="pose-control-card pose-props-card">
                  <div className="pose-control-heading"><div><span>{t("SET THE SCENE")}</span><h3>{t("Props")}</h3></div></div>
                  <div className="pose-view-grid">{[['chair','Chair'],['stool','Stool'],['table','Table'],['box','Box'],['ball','Ball'],['staff','Staff']].map(([kind,label]) => <button type="button" key={kind} data-pose-prop={kind}>+ {t(label)}</button>)}</div>
                </section>
                <section className="pose-control-card">
                  <div className="pose-control-heading"><div><span>{t("COMPOSE")}</span><h3>{t("Camera & colors")}</h3></div></div>
                  <div className="pose-view-grid" aria-label={t("Camera views")}>{[['front','Front'],['three','¾ view'],['left','Left'],['right','Right'],['back','Back'],['high','High']].map(([view,label]) => <button type="button" key={view} data-pose-view={view}>{t(label)}</button>)}</div>
                  <label className="pose-field">{t("Selected object")}<input type="color" id="pose-body-color" defaultValue="#d9d9d9" /></label>
                  <label className="pose-field">{t("Background")}<input type="color" id="pose-background-color" defaultValue="#0b0d0d" /></label>
                  <div className="pose-view-grid" aria-label={t("Color themes")}><button type="button" data-pose-palette="#d9d9d9,#0b0d0d">{t("Dark")}</button><button type="button" data-pose-palette="#334155,#e5e7eb">{t("Light")}</button><button type="button" data-pose-palette="#e0a442,#183044">{t("Contrast")}</button></div>
                  <div className="pose-guide-options"><label><input type="checkbox" id="pose-show-ground" />{t("Ground")}</label><label><input type="checkbox" id="pose-show-grid" />{t("Grid")}</label></div>
                </section>
                <section className="pose-control-card pose-library-card">
                  <div className="pose-control-heading"><div><span>{t("QUICK START")}</span><h3>{t("Pose presets")}</h3></div></div>
                  <label className="pose-field">{t("Category")}<select id="pose-preset-category" defaultValue="All">{['All','Standing','Gesture','Action','Seated','Floor'].map(category => <option key={category} value={category}>{t(category)}</option>)}</select></label>
                  <div className="pose-preset-grid">
                    <button type="button" data-pose-preset="crossed-arms"><span className="pose-preset-preview crossed-arms"><img src={crossedArmsPresetImage} alt="" /></span>{t("Crossed arms")}</button>
                    <button type="button" data-pose-preset="kneeling"><span className="pose-preset-preview kneeling"><img src={kneelingPresetImage} alt="" /></span>{t("Kneeling")}</button>
                    <button type="button" data-pose-preset="jogging"><span className="pose-preset-preview jogging"><img src={joggingPresetImage} alt="" /></span>{t("Jogging")}</button>
                  </div>
                </section>

              </aside>
              <footer className="pose-model-credits"><p>{t("Cat by ")}<a href="https://blendswap.com/blend/18519" target="_blank" rel="noreferrer">{t("JonasDichelle")}</a>{t(" and horse by ")}<a href="https://blendswap.com/blend/13903" target="_blank" rel="noreferrer">{t("b2przemo")}</a>, <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noreferrer">{t("CC BY 3.0")}</a>{t(". Source conversion by ")}<a href="https://github.com/nrz/ylikuutio" target="_blank" rel="noreferrer">{t("Antti Nuortimo")}</a>{t(". Dog by ")}<a href="https://opengameart.org/content/dog-low-poly-rigged" target="_blank" rel="noreferrer">{t("crownjoshua")}</a>{t(", CC0. Meshes adapted and rigged for Pose Studio.")}</p></footer>
            </section>
          </div>
        </main>
      </div>
        {modelLanding && <ModelLandingContent modelId={initialModel} />}
        <AuthDialog open={authOpen} onClose={closeAuth} onAuthenticated={refreshCreditsAfterAuth} />
    </>
  )
}
