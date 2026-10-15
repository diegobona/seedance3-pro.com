import { useCallback, useEffect, useRef, useState } from 'react'
import { AuthDialog } from './auth-dialog'
import { SiteLanguageSwitch } from './site-language-switch'
import { UserMenu } from './user-menu'
import { useSiteI18n } from '../lib/site-i18n'
import { museImagePrompts, museVideoPrompts, type MuseModel } from '../data/muse-prompts'
import '../../app/studio.css'
import '../styles/auth.css'
import '../styles/seedance3-preview.css'
import '../styles/muse-workspace.css'

export function MuseWorkspacePage({ model }: { model: MuseModel }) {
  const { t, path } = useSiteI18n()
  const isVideo = model === 'muse-video'
  const modelName = isVideo ? 'Muse Video' : 'Muse Image'
  const libraryName = isVideo ? 'Muse Video Prompt Library' : 'Muse Image Prompt Library'
  const libraryPath = isVideo ? '/muse-video-prompts' : '/muse-image-prompts'
  const featuredPrompts = (isVideo ? museVideoPrompts : museImagePrompts).slice(0, 3)
  const [prompt, setPrompt] = useState('')
  const [mode, setMode] = useState<'text' | 'reference'>('text')
  const [referenceFiles, setReferenceFiles] = useState<File[]>([])
  const [selectedExample, setSelectedExample] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const promptRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const example = featuredPrompts[selectedExample]

  useEffect(() => {
    const incomingPrompt = new URLSearchParams(window.location.search).get('prompt')
    setPrompt(incomingPrompt?.slice(0, 2500) ?? '')
    setMode('text')
    setReferenceFiles([])
    setSelectedExample(0)
  }, [model])

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
      <div className="studio-shell seedance3-preview-shell muse-workspace-shell">
        <aside className={`sidebar${sidebarOpen ? ' is-open' : ''}`} id="studio-sidebar">
          <a className="studio-brand" href={path('/')}><img src="/assets/seedance-mark.svg" width="40" height="40" alt="" /><strong>{t('SEEDANCE')}<br /><small>{t('CREATIVE STUDIO')}</small></strong></a>
          <button className="sidebar-close" type="button" aria-label={t('Close model navigation')} onClick={() => setSidebarOpen(false)}>×</button>
          <nav aria-label={t('Model navigation')}>
            <div className="nav-section">
              <div className="section-heading"><span>{t('AI VIDEO')}</span><span>03</span></div>
              <a className="model-button price-model" href={path('/app/video/minimax-h3')}><span className="model-symbol cyan">{t('H3')}</span><span><strong>{t('MiniMax H3')}</strong><small>{t('Text-to-video, image-to-video')}</small></span><em className="price-badge">{t('FROM ')}<b>$0.01</b></em></a>
              <a className={`model-button release-model${isVideo ? ' is-active' : ''}`} href={path('/app/video/muse-video')} aria-current={isVideo ? 'page' : undefined}><span className="model-symbol cyan">MV</span><span className="release-model-copy"><span className="release-title-row"><strong>{t('Muse Video')}</strong><em className="release-status">{t('Coming soon')}</em></span><small>{t('Workspace preview')}</small></span></a>
              <a className="model-button release-model" href={path('/app/video/seedance-3')}><img src="/assets/seedance-mark.svg" width="40" height="40" alt="" style={{ flexShrink: 0 }} /><span className="release-model-copy"><span className="release-title-row"><strong>{t('SEEDANCE 3.0')}</strong><em className="release-status">{t('Coming soon')}</em></span><small>{t('Workspace preview')}</small></span></a>
            </div>
            <div className="nav-section">
              <div className="section-heading"><span>{t('AI IMAGE')}</span></div>
              <a className="model-button pose-workflow-button" href={path('/app/?model=pose-to-image')}><span className="pose-symbol" aria-hidden="true"><svg viewBox="0 0 32 32"><circle cx="16" cy="5.5" r="3" /><path d="M16 9v9m0-6-7 4m7-4 7 3m-7 3-5 9m5-9 6 9" /><circle cx="9" cy="16" r="1.25" /><circle cx="23" cy="15" r="1.25" /><circle cx="11" cy="27" r="1.25" /><circle cx="22" cy="27" r="1.25" /></svg></span><span className="pose-workflow-copy"><strong>{t('Pose to Image')}</strong><small>{t('Build poses in 3D')}</small></span><em className="signature">{t('SIGNATURE')}</em><span className="workflow-cta">{t('Open Pose Studio ')}<b>↗</b></span></a>
              <div className="section-heading image-models-heading"><span>{t('IMAGE MODELS')}</span><span>03</span></div>
              <a className="model-button price-model" href={path('/app/image/gpt-image-2')}><span className="model-symbol orange">{t('G2')}</span><span><strong>{t('GPT Image 2')}</strong><small>{t('Generation & editing')}</small></span><em className="price-badge">{t('FROM ')}<b>$0.01</b></em></a>
              <a className="model-button price-model" href={path('/app/image/gpt-image-2-5-1k')}><span className="model-symbol orange">G2.5</span><span><strong>{t('GPT Image 2.5')}</strong><small>{t('Generation & editing')}</small></span><em className="price-badge">{t('FROM ')}<b>$0.01</b></em></a>
              <a className={`model-button release-model${!isVideo ? ' is-active' : ''}`} href={path('/app/image/muse-image')} aria-current={!isVideo ? 'page' : undefined}><span className="model-symbol orange">MI</span><span className="release-model-copy"><span className="release-title-row"><strong>{t('Muse Image')}</strong><em className="release-status">{t('Coming soon')}</em></span><small>{t('Workspace preview')}</small></span></a>
            </div>
            <div className="nav-section showcase-nav-section">
              <div className="section-heading"><span>{t('PROMPT LIBRARIES')}</span><span>06</span></div>
              <a className="showcase-nav-link" href={path('/ai-christmas-photo-prompt')}><span className="model-symbol orange">CP</span><span>{t('Christmas Photo Prompts')}<small>{t('Seasonal collection')}</small></span></a>
              <a className="showcase-nav-link" href={path('/minimax-h3-prompts')} target="_blank" rel="noopener noreferrer"><span className="model-symbol cyan">{t('H3')}</span><span>{t('MiniMax H3 Prompt Library')}</span></a>
              <a className="showcase-nav-link" href={path('/gpt-image-2-prompts')} target="_blank" rel="noopener noreferrer"><span className="model-symbol orange">{t('G2')}</span><span>{t('GPT Image 2 Prompt Library')}</span></a>
              <a className="showcase-nav-link" href={path('/muse-video-prompts')} target="_blank" rel="noopener noreferrer"><span className="model-symbol cyan">MV</span><span>{t('Muse Video Prompt Library')}</span></a>
              <a className="showcase-nav-link" href={path('/muse-image-prompts')} target="_blank" rel="noopener noreferrer"><span className="model-symbol orange">MI</span><span>{t('Muse Image Prompt Library')}</span></a>
              <a className="showcase-nav-link" href={path('/seedance-3-0-prompts')} target="_blank" rel="noopener noreferrer"><img src="/assets/seedance-mark.svg" width="34" height="34" alt="" /><span>{t('Seedance 3.0 Prompt Library')}<small>{t('Planned tests')}</small></span></a>
            </div>
          </nav>
          <div className="sidebar-foot"><a href={path('/')}>{t('← Back to SEEDANCE 3.0')}</a></div>
        </aside>

        <main className="workspace">
          <header className="workspace-header"><div><button className="sidebar-open" type="button" aria-label={t('Open model navigation')} onClick={() => setSidebarOpen(true)}>☰</button><a href={path('/')}>{t('Home')}</a></div><div className="workspace-header-account"><SiteLanguageSwitch /><UserMenu onLogin={() => setAuthOpen(true)} /></div></header>
          <div className="workspace-body">
            <div className="workspace-title"><div><p>{t(isVideo ? 'AI VIDEO / WORKSPACE PREVIEW' : 'AI IMAGE / WORKSPACE PREVIEW')}</p><h1>{t(isVideo ? 'Muse Video Workspace' : 'Muse Image Workspace')}</h1></div><span className="model-status">{t('Coming soon')}</span></div>
            <p className="model-landing-intro">{t(isVideo ? 'Draft your video idea here or explore the ' : 'Draft your image idea here or explore the ')}<a href={path(libraryPath)} target="_blank" rel="noopener noreferrer">{t(libraryName)}</a>{t('. Generation and output settings are not available in this workspace yet.')}</p>
            <div className="creation-grid">
              <section className="creation-panel" aria-label={t(isVideo ? 'Muse Video workspace preview' : 'Muse Image workspace preview')}>
                <div className="model-select"><span className={`model-symbol ${isVideo ? 'cyan' : 'orange'}`}>{isVideo ? 'MV' : 'MI'}</span><div><small>{t('Selected model')}</small><strong>{t(modelName)}</strong></div></div>
                <div className="field-group"><label>{t('Create from')}</label><div className="segmented seedance3-mode-tabs"><button type="button" className={mode === 'text' ? 'is-selected' : ''} aria-pressed={mode === 'text'} onClick={() => setMode('text')}>{t(isVideo ? 'Text to video' : 'Text to image')}</button><button type="button" className={mode === 'reference' ? 'is-selected' : ''} aria-pressed={mode === 'reference'} onClick={() => setMode('reference')}>{t(isVideo ? 'Reference to video' : 'Reference to image')}</button></div></div>
                {mode === 'reference' && <div className="field-group"><div className="label-line"><label htmlFor={`${model}-references`}>{t('Reference images')}</label><span>{t('Local preview only')}</span></div><input id={`${model}-references`} ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" multiple hidden onChange={event => { setReferenceFiles(Array.from(event.target.files ?? [])); event.target.value = '' }} /><button className="upload-box is-enabled" type="button" onClick={() => fileRef.current?.click()}><span>＋</span><strong>{t('Choose reference images')}</strong><small>{t('Files remain on this device until generation is available')}</small></button>{referenceFiles.length > 0 && <div className="seedance3-reference-list">{referenceFiles.map((file, index) => <div key={`${file.name}-${index}`}><span>{t('Image ')}{index + 1}: {file.name}</span><button type="button" aria-label={`${t('Remove')} ${t('Image')} ${index + 1}`} onClick={() => setReferenceFiles(files => files.filter((_, fileIndex) => fileIndex !== index))}>×</button></div>)}</div>}</div>}
                <div className="field-group"><div className="label-line"><label htmlFor={`${model}-prompt`}>{t('Prompt')}</label><span>{prompt.length}/2500</span></div><textarea id={`${model}-prompt`} ref={promptRef} maxLength={2500} value={prompt} onChange={event => setPrompt(event.target.value)} placeholder={t(isVideo ? 'Describe the subject, action, setting, camera movement, and visual style…' : 'Describe the subject, composition, lighting, materials, and visual style…')} /></div>
                <div className="settings-grid seedance3-settings"><label>{t(isVideo ? 'Duration' : 'Quality')}<select disabled aria-label={t(isVideo ? 'Duration coming soon' : 'Quality coming soon')}><option>{t('Coming soon')}</option></select></label><label>{t('Resolution')}<select disabled aria-label={t('Resolution coming soon')}><option>{t('Coming soon')}</option></select></label><label>{t('Aspect ratio')}<select disabled aria-label={t('Aspect ratio coming soon')}><option>{t('Coming soon')}</option></select></label></div>
                <button className="generate-button" type="button" disabled>{t(isVideo ? 'Generate video · Coming soon' : 'Generate image · Coming soon')}</button>
                <p className="seedance3-preview-note">{t(isVideo ? 'This is a workspace preview. No video request is sent and no credits are charged.' : 'This is a workspace preview. No image request is sent and no credits are charged.')}</p>
              </section>
              <aside className="context-panel">
                <section className="context-card muse-prompt-examples" aria-label={t(isVideo ? 'Muse Video prompt templates' : 'Muse Image prompt templates')}>
                  <div className="muse-examples-heading"><span>{t(isVideo ? 'VIDEO PROMPT TEMPLATES' : 'IMAGE PROMPT TEMPLATES')}</span><a href={path(libraryPath)} target="_blank" rel="noopener noreferrer">{t('View prompt library ↗')}</a></div>
                  <p className="muse-template-note">{t('Writing templates · No generated results yet')}</p>
                  <div className="muse-template-detail"><span>{t(example.category)}</span><h2>{t(example.title)}</h2><p>{t(example.summary)}</p><blockquote>{example.prompt}</blockquote><button type="button" onClick={() => useExample(selectedExample)}>{t('Use prompt ↗')}</button></div>
                  <div className="muse-template-options" aria-label={t('Choose a prompt template')}>{featuredPrompts.map((item, index) => <button key={item.slug} type="button" className={selectedExample === index ? 'is-selected' : ''} aria-pressed={selectedExample === index} onClick={() => setSelectedExample(index)}><span aria-hidden="true">0{index + 1}</span><span>{t(item.title)}</span></button>)}</div>
                </section>
              </aside>
            </div>
          </div>
        </main>
      </div>
      <AuthDialog open={authOpen} onClose={closeAuth} onAuthenticated={refreshCreditsAfterAuth} />
    </>
  )
}
