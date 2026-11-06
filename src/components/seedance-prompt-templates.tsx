import { useState } from 'react'
import { useSiteI18n } from '../lib/site-i18n'
import { promptReferences, seedancePromptTemplates, templateTryUrl } from '../data/seedance-prompt-templates'
import '../styles/seedance-prompt-templates.css'

const categories = [ ['all', 'All scenes', '全部'], ['product', 'Product', '产品广告'], ['food', 'Food & drink', '美食饮品'], ['portrait', 'Portraits', '人物写真'], ['landscape', 'Landscapes', '自然风景'], ['pets', 'Pets', '宠物'], ['animation', 'Animation', '创意动画'] ]
export function SeedancePromptTemplates() {
  const { locale, path } = useSiteI18n()
  const zh = locale === 'zh'
  const [category, setCategory] = useState('all')
  const [copied, setCopied] = useState('')
  const [failed, setFailed] = useState(false)
  const visible = seedancePromptTemplates.filter(item => category === 'all' || item.category === category)
  async function copy(id: string, prompt: string) {
    try { await navigator.clipboard.writeText(prompt); setCopied(id); setFailed(false) }
    catch { setCopied(''); setFailed(true) }
  }
  return <section className="prompt-collection" aria-labelledby="prompt-collection-title">
    <header><span className="prompt-collection-eyebrow">{zh ? '12 个场景 · 5 秒短镜头' : '12 SCENES · 5-SECOND SHOTS'}</span><h2 id="prompt-collection-title">{zh ? '选个场景，开始创作' : 'Find your next scene'}</h2><p>{zh ? '根据公开提示词指南编写的短镜头模板，可直接使用或替换主体。尚未逐条生成验证，实际效果以生成结果为准。' : 'Short-shot templates written using public prompting guides. Use them as-is or change the subject. These templates have not been individually generation-tested; results may vary.'}</p></header>
    <div className="prompt-collection-filters" role="group" aria-label={zh ? '场景分类' : 'Scene categories'}>{categories.map(([id, en, cn]) => <button key={id} type="button" aria-pressed={category === id} onClick={() => setCategory(id)}>{zh ? cn : en}</button>)}</div>
    <p role="status" className="prompt-copy-status">{failed ? (zh ? '复制失败，请展开提示词后手动复制。' : 'Could not copy. Expand the prompt to copy it manually.') : copied ? (zh ? '提示词已复制' : 'Prompt copied') : ''}</p>
    <div className="prompt-template-grid">{visible.map((item) => <article className="prompt-template-card" key={item.id}>
      <div className="prompt-template-meta"><span>{categories.find(c => c[0] === item.category)?.[zh ? 2 : 1]}</span><span>5s · {item.ratio}</span></div>
      <h3>{item.title[zh ? 1 : 0]}</h3>
      <details><summary>{zh ? '查看提示词' : 'View prompt'}</summary><p lang="en">{item.prompt}</p></details>
      <div className="prompt-template-actions"><button type="button" onClick={() => void copy(item.id, item.prompt)}>{copied === item.id ? (zh ? '已复制' : 'Copied') : (zh ? '复制提示词' : 'Copy prompt')}</button><a href={path(templateTryUrl(item))}>{zh ? '立即试用 ↗' : 'Try it ↗'}</a></div>
    </article>)}</div>
    <details className="prompt-template-references"><summary>{zh ? '编写参考' : 'Writing references'}</summary><p>{zh ? '模板为本站编写，并非下列示例视频的原始提示词。' : 'Templates were written for this site and are not the original prompts of the linked demonstration videos.'}</p>{promptReferences.map(source => <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">{source.label} ↗</a>)}</details>
  </section>
}
