import { useEffect, useRef, useState } from 'react'
import { christmasPhotoCategories, christmasPhotoPromptTryUrl, filterChristmasPhotoPrompts, type ChristmasPhotoFilter, type ChristmasPhotoPrompt } from '../data/christmas-photo-prompts'
import { useSiteI18n } from '../lib/site-i18n'

function ChristmasPromptCard({ item }: { item: ChristmasPhotoPrompt }) {
  const { t, path } = useSiteI18n()
  const [copyState, setCopyState] = useState<'ready' | 'copied' | 'failed'>('ready')
  const manualCopy = useRef<HTMLTextAreaElement>(null)
  const category = christmasPhotoCategories.find(category => category.id === item.category)!

  useEffect(() => {
    if (copyState === 'failed') {
      manualCopy.current?.focus()
      manualCopy.current?.select()
    }
    if (copyState === 'copied') {
      const timeout = window.setTimeout(() => setCopyState('ready'), 2500)
      return () => window.clearTimeout(timeout)
    }
  }, [copyState])

  async function copyPrompt() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(item.prompt)
      setCopyState('copied')
    } catch {
      setCopyState('failed')
      manualCopy.current?.focus()
      manualCopy.current?.select()
    }
  }

  return (
    <article className="christmas-prompt-card" id={item.slug} aria-labelledby={`${item.slug}-title`}>
      <div className="christmas-card-meta"><span>{t(category.label)}</span><span>{item.aspectRatio}</span></div>
      <h2 id={`${item.slug}-title`}><a href={`#${item.slug}`}>{t(item.title)}</a></h2>
      <p className="christmas-card-summary">{t(item.summary)}</p>
      <blockquote className="christmas-card-prompt" lang="en">{item.prompt}</blockquote>
      <p className="christmas-card-customize"><strong>{t('Make it yours')}</strong>{t(item.editGuidance)}</p>
      <div className="christmas-card-actions">
        <button type="button" onClick={() => void copyPrompt()} aria-label={`${t('Copy prompt')}: ${t(item.title)}`}>{t(copyState === 'copied' ? 'Copied' : 'Copy prompt')}</button>
        <a href={path(christmasPhotoPromptTryUrl(item))}>{t('Try in GPT Image 2')} <span aria-hidden="true">↗</span></a>
      </div>
      <p className="christmas-copy-status" role="status" aria-live="polite">{copyState === 'copied' ? t('Prompt copied. Paste it into your image tool.') : copyState === 'failed' ? t('Copy unavailable. Select the prompt below.') : ''}</p>
      {copyState === 'failed' && <textarea ref={manualCopy} className="christmas-manual-copy" readOnly value={item.prompt} aria-label={`${t('Select prompt to copy')}: ${t(item.title)}`} lang="en" />}
    </article>
  )
}

export function ChristmasPhotoPrompts() {
  const { t, path } = useSiteI18n()
  const [category, setCategory] = useState<ChristmasPhotoFilter>('all')
  const visiblePrompts = filterChristmasPhotoPrompts(category)

  return (
    <div className="christmas-photo-collection">
      <section className="christmas-collection-toolbar" aria-label={t('Choose a Christmas photo style')}>
        <div className="christmas-category-filters" role="group" aria-label={t('Filter Christmas photo prompts')}>
          {christmasPhotoCategories.map(item => <button key={item.id} type="button" aria-pressed={category === item.id} onClick={() => setCategory(item.id)}>{t(item.label)}</button>)}
        </div>
        <p className="christmas-prompt-count" role="status" aria-live="polite"><strong>{visiblePrompts.length}</strong> {t('prompts')}</p>
      </section>
      <section className="christmas-prompt-grid" aria-label={t('Christmas photo prompt collection')}>
        {visiblePrompts.map(item => <ChristmasPromptCard key={item.slug} item={item} />)}
      </section>
      <section className="christmas-how-to" aria-labelledby="christmas-how-to-title">
        <div><span>{t('YOUR HOLIDAY PHOTO, IN THREE STEPS')}</span><h2 id="christmas-how-to-title">{t('How to use an AI Christmas photo prompt')}</h2><p>{t('Start with a scene you like, then adjust it for the people or pets in your photo.')}</p></div>
        <ol>
          <li><strong>{t('Choose a scene')}</strong><p>{t('Pick a category and composition. Copy the prompt or open it in GPT Image 2 with its suggested aspect ratio.')}</p></li>
          <li><strong>{t('Personalize the details')}</strong><p>{t('Change the clothing, setting and decorations. Upload reference photos in the generator if you want to preserve specific people or pets.')}</p></li>
          <li><strong>{t('Generate and refine')}</strong><p>{t('Review the image settings before generating. Check faces, hands and pet markings, then adjust your prompt. Add card greetings manually in an editor.')}</p></li>
        </ol>
      </section>
      <section className="christmas-faq" aria-labelledby="christmas-faq-title">
        <h2 id="christmas-faq-title">{t('Christmas photo prompt questions')}</h2>
        <details><summary>{t('Can I use my own photo as a reference?')}</summary><p>{t('Yes. Open the prompt in GPT Image 2 and upload your reference there. The prompts ask to preserve identity when a reference is provided. Review the result and refine any details that drift.')}</p></details>
        <details><summary>{t('Which aspect ratio should I choose?')}</summary><p>{t('Use 2:3 for vertical portraits and cards, 3:2 for wider couple or family photos, and 1:1 for a square portrait or pet photo. Each prompt includes a suggested ratio you can change in the generator.')}</p></details>
        <details><summary>{t('How do I add a Christmas greeting?')}</summary><p>{t('The card prompts leave a blank area for your message. Generate the photo first, then add your greeting in an image or card editor so you control the wording, font and placement.')}</p></details>
        <p className="christmas-related-link"><a href={path('/gpt-image-2-prompts')}>{t('Explore the GPT Image 2 Prompt Library')} <span aria-hidden="true">↗</span></a></p>
      </section>
    </div>
  )
}
