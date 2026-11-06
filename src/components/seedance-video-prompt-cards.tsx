import { playShowcaseVideo } from '../lib/showcase-video-playback'
import { useSiteI18n } from '../lib/site-i18n'
import { mixedVideoPromptCards } from '../data/seedance-video-prompt-cards'
import '../styles/seedance-video-prompt-cards.css'
const bottomExampleIds = new Set(['backstage', 'opera', 'painterly'])
export function SeedanceVideoPromptCards({ bottom = false }: { bottom?: boolean }) {
  const cards = mixedVideoPromptCards.filter(item => bottomExampleIds.has(item.id) === bottom)
  const { locale, path, t } = useSiteI18n()
  const zh = locale === 'zh'
  return <section className={`studio-showcase-grid seedance-video-library${bottom ? " is-bottom" : " is-masonry"}`} aria-label={zh ? '视频提示词案例' : 'Video prompt examples'}>
    {cards.map(item => <article key={item.id} className="studio-showcase-card seedance-library-card">
      <div className="studio-showcase-media" style={{aspectRatio:item.previewRatio}}>
        <video className="seedance-library-video" src={item.src} data-showcase-video onPlay={playShowcaseVideo} poster={item.poster} playsInline controls preload="none" aria-label={t(item.title[zh ? 1 : 0])} />
      </div>
      <div className="seedance-library-caption"><h2>{t(item.title[zh ? 1 : 0])}</h2><a href={path('/app/video/seedance-2-5?' + new URLSearchParams({prompt:item.prompt,duration:'5',aspect_ratio:item.ratio}).toString())}>{zh ? '立即使用 ↗' : 'Use now ↗'}</a></div>
      <details className="seedance-library-prompt"><summary>{zh ? '查看提示词' : 'View prompt'}</summary><p lang="en">{item.prompt}</p></details>
    </article>)}
  </section>
}
