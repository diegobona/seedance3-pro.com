import { playShowcaseVideo } from '../lib/showcase-video-playback'
import { useSiteI18n } from '../lib/site-i18n'
import { mixedVideoPromptCards } from '../data/seedance-video-prompt-cards'
import { SEEDANCE_VIDEO_EXAMPLES } from '../../app/seedance-video-examples.mjs'
import '../styles/seedance-video-prompt-cards.css'
const bottomExampleIds = new Set(SEEDANCE_VIDEO_EXAMPLES.slice(0, 3).map(item => item.id))
const localizedPrompt = (item: { prompt: string; promptZh?: unknown }, zh: boolean) => zh && typeof item.promptZh === 'string' ? item.promptZh : item.prompt
export function SeedanceVideoPromptCards({ bottom = false }: { bottom?: boolean }) {
  const cards = mixedVideoPromptCards.filter(item => bottomExampleIds.has(item.id) === bottom)
  const { locale, path, t } = useSiteI18n()
  const zh = locale === 'zh'
  return <section className={`studio-showcase-grid seedance-video-library${bottom ? " is-bottom" : " is-masonry"}`} aria-label={zh ? '视频提示词案例' : 'Video prompt examples'}>
    {cards.map(item => <article key={item.id} className="studio-showcase-card seedance-library-card">
      <div className="studio-showcase-media" style={{aspectRatio:item.previewRatio}}>
        <video className="seedance-library-video" src={item.src} data-showcase-video onPlay={playShowcaseVideo} poster={item.poster} playsInline controls preload="none" aria-label={t(item.title[zh ? 1 : 0])} />
      </div>
      <div className="seedance-library-caption"><h2>{t(item.title[zh ? 1 : 0])}</h2><a href={path('/app/video/seedance-2-5?' + new URLSearchParams({prompt:localizedPrompt(item,zh),duration:String('durationSeconds' in item && item.durationSeconds || 5),aspect_ratio:item.ratio}).toString())}>{zh ? '立即使用 ↗' : 'Use now ↗'}</a></div>
      <details className="seedance-library-prompt"><summary>{'promptReconstructed' in item && item.promptReconstructed ? t('View reconstructed prompt') : zh ? '查看提示词' : 'View prompt'}</summary><p lang={zh && 'promptZh' in item && item.promptZh ? 'zh' : 'en'} style={{ whiteSpace: 'pre-line' }}>{localizedPrompt(item,zh)}</p></details>
    </article>)}
  </section>
}
