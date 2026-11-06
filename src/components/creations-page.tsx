import { useCallback, useEffect, useRef, useState } from 'react'
import { authClient } from '../lib/auth-client'
import { useSiteI18n } from '../lib/site-i18n'
import { AuthDialog } from './auth-dialog'
import { UserMenu } from './user-menu'
import { SiteLanguageSwitch } from './site-language-switch'
import { BRAND_MARK } from '../../app/site-brand.mjs'
import '../styles/auth.css'
import '../styles/creations.css'

type Creation = {
  id:string; kind:'image'|'video'; status:string; prompt:string; model:string; createdAt:string; expiresAt:string
  duration:number|null; aspectRatio:string|null; mediaState:string; mediaUrl:string|null; downloadUrl:string|null
}
type Library = {items:Creation[];nextCursor:string|null;guest:boolean}
const pending=(item:Creation)=>['submitting','queued','running'].includes(item.status)
function Icon({name}:{name:'grid'|'video'|'image'|'download'|'trash'|'play'|'refresh'|'close'|'arrow'}) {
  const paths={grid:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',video:'M3 5h13v14H3z M16 9l5-3v12l-5-3',image:'M3 3h18v18H3z M3 16l5-5 5 5 3-3 5 5 M15 7h.01',download:'M12 3v12m-5-5 5 5 5-5 M4 16v5h16v-5',trash:'M3 6h18 M9 6V3h6v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7',play:'m9 5 11 7-11 7z',refresh:'M20 7a9 9 0 1 0 1 7 M20 2v6h-6',close:'m6 6 12 12 M6 18 18 6',arrow:'M5 12h14m-6-6 6 6-6 6'}
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]}/></svg>
}

export function CreationsPage() {
  const {locale,path}=useSiteI18n(),zh=locale==='zh'
  const text=(en:string,cn:string)=>zh?cn:en
  const {data:session}=authClient.useSession()
  const [authOpen,setAuthOpen]=useState(false),[kind,setKind]=useState('all')
  const [library,setLibrary]=useState<Library>({items:[],nextCursor:null,guest:true})
  const [loading,setLoading]=useState(true),[loadingMore,setLoadingMore]=useState(false),[error,setError]=useState('')
  const [selected,setSelected]=useState<Creation|null>(null),[deleting,setDeleting]=useState<Creation|null>(null)
  const [deleteBusy,setDeleteBusy]=useState(false),[copied,setCopied]=useState(false),[failedMedia,setFailedMedia]=useState<Set<string>>(new Set())
  const [now,setNow]=useState(Date.now)
  const preview=useRef<HTMLDialogElement>(null),confirmation=useRef<HTMLDialogElement>(null),request=useRef<AbortController|null>(null),generation=useRef(0)
  const load=useCallback(async(cursor='',quiet=false)=>{
    if(quiet && request.current)return
    if(!quiet && !cursor)setFailedMedia(new Set())
    const current=++generation.current
    request.current?.abort();request.current=new AbortController()
    if(cursor)setLoadingMore(true);else if(!quiet)setLoading(true)
    try {
      const response=await fetch(`/api/creations?kind=${kind}${cursor?'&cursor='+encodeURIComponent(cursor):''}`,{credentials:'same-origin',cache:'no-store',signal:request.current.signal})
      if(!response.ok)throw new Error('load')
      const data=await response.json() as Library
      if(current!==generation.current)return
      setLibrary(old=>cursor || quiet ? {...data,nextCursor:quiet?old.nextCursor:data.nextCursor,items:[...new Map([...old.items,...data.items].map(item=>[item.id,item])).values()].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)||b.id.localeCompare(a.id))} : data)
      setError('')
    } catch(error) {if(current===generation.current && (error as Error).name!=='AbortError')setError(zh?'暂时无法加载作品，请重试。':'Could not load your creations. Please try again.')}
    finally {if(current===generation.current){request.current=null;setLoading(false);setLoadingMore(false)}}
  },[kind,session?.user?.id,zh])
  useEffect(()=>{
    setLibrary({items:[],nextCursor:null,guest:!session?.user});setSelected(null);setFailedMedia(new Set());void load()
    const refresh=()=>{if(document.visibilityState==='visible')void load('',true)}
    const timer=setInterval(refresh,15000);window.addEventListener('focus',refresh)
    return()=>{generation.current++;request.current?.abort();clearInterval(timer);window.removeEventListener('focus',refresh)}
  },[load])
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer)},[])
  useEffect(()=>{setSelected(old=>old ? library.items.find(item=>item.id===old.id) ?? old : null)},[library.items])
  useEffect(()=>{
    setCopied(false)
    if(selected)preview.current?.showModal();else preview.current?.close()
  },[selected?.id])
  useEffect(()=>{if(deleting)confirmation.current?.showModal();else confirmation.current?.close()},[deleting])
  const date=(value:string)=>new Date(value).toLocaleString(zh?'zh-CN':'en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})
  const title=(item:Creation)=>item.prompt || (item.kind==='video'?text('Video creation','视频作品'):text('Image creation','图片作品'))
  const status=(item:Creation)=>pending(item)?item.status==='queued'?text('Queued','排队中'):text('Generating','生成中')
    :item.status==='submission_unknown'?text('Submission unconfirmed','提交未确认')
    :item.status!=='succeeded'?text('Generation failed','生成失败')
    :item.mediaState==='expired'?text('File expired','文件已过期'):text('Ready','已完成')
  const elapsed=(item:Creation)=>{
    const seconds=Math.max(0,Math.floor((now-new Date(item.createdAt).getTime())/1000))
    return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`
  }
  async function remove() {
    if(!deleting || deleteBusy)return
    setDeleteBusy(true)
    try {
      const response=await fetch('/api/creations?id='+deleting.id,{method:'DELETE',credentials:'same-origin'})
      if(!response.ok)throw new Error('delete')
      setLibrary(old=>({...old,items:old.items.filter(item=>item.id!==deleting.id)}))
      if(selected?.id===deleting.id)setSelected(null)
      setDeleting(null)
    } catch {setError(text('Could not delete this creation. Please try again.','删除失败，请重试。'));setDeleting(null)}
    finally {setDeleteBusy(false)}
  }
  function mediaFailed(id:string) {setFailedMedia(old=>new Set([...old,id]))}
  function openPreview(item:Creation) {
    setFailedMedia(old=>{const next=new Set(old);next.delete(item.id);return next})
    setSelected(item)
  }
  return <div className="creations-page">
    <header className="creations-header">
      <a className="creations-brand" href={path('/')}><img src={BRAND_MARK} width="38" height="38" alt=""/><span>SEEDANCE 3.0</span></a>
      <nav aria-label={text('Workspace navigation','工作台导航')}><a href={path('/app/video/seedance-2-5')}>{text('AI Video','视频生成')}</a><a href={path('/app/image/gpt-image-2-5-1k')}>{text('AI Image','图片生成')}</a><a href={path('/creations')} aria-current="page">{text('My creations','我的作品')}</a></nav>
      <div className="creations-account"><SiteLanguageSwitch/><UserMenu onLogin={()=>setAuthOpen(true)}/></div>
    </header>
    <main className="creations-main">
      <div className="creations-heading"><div><p className="creations-eyebrow">{text('YOUR CREATIVE SPACE','你的创作空间')}</p><h1>{text('My creations','我的作品')}</h1><p>{text('Your videos and images, ready when you are.','生成中的任务与完成的作品，都在这里。')}</p></div><a className="creations-primary" href={path('/app/video/seedance-2-5')}>{text('Create something new','开始新创作')}<Icon name="arrow"/></a></div>
      <div className="creations-toolbar"><div className="creations-filters" aria-label={text('Filter creations','筛选作品')}>
        {(['all','video','image'] as const).map((value,i)=><button key={value} type="button" aria-pressed={kind===value} onClick={()=>setKind(value)}><Icon name={(['grid','video','image'] as const)[i]}/>{value==='all'?text('All creations','全部作品'):value==='video'?text('Videos','视频'):text('Images','图片')}</button>)}
      </div><button type="button" className="creations-refresh" onClick={()=>void load()} disabled={loading}><Icon name="refresh"/>{text('Refresh','刷新')}</button></div>
      {error && <div className="creations-error" role="alert">{error}<button type="button" onClick={()=>void load()}>{text('Retry','重试')}</button></div>}
      {loading && !library.items.length ? <div className="creations-grid" aria-busy="true" aria-label={text('Loading creations','正在加载作品')}>{[0,1,2].map(i=><div key={i} className="creation-skeleton"/>)}</div>
        :!library.items.length && error?null
        :!library.items.length?<div className="creations-empty"><div className="creations-empty-icon"><Icon name="grid"/></div><h2>{library.guest?text('Your creations, in one place','登录，查看你的作品'):kind!=='all'?text('No creations in this category yet','这里还没有作品'):text('Your next idea starts here','从一个灵感，开始你的第一件作品')}</h2><p>{library.guest?text('Sign in to view the videos and images created with your account.','查看登录后生成的视频和图片，跨设备继续创作。'):text('Create a video or image. Find the result here, even after leaving the page.','生成视频或图片后，可以随时回到这里查看结果。')}</p>{library.guest?<button type="button" className="creations-primary" onClick={()=>setAuthOpen(true)}>{text('Sign in','登录 / 注册')}<Icon name="arrow"/></button>:<a className="creations-primary" href={path(kind==='image'?'/app/image/gpt-image-2-5-1k':'/app/video/seedance-2-5')}>{text('Start creating','开始创作')}<Icon name="arrow"/></a>}</div>
        :<div className="creations-grid">{library.items.map(item=><article className="creation-card" key={item.id}>
          <button type="button" className={'creation-thumbnail'+(pending(item)?' is-pending':'')} onClick={()=>openPreview(item)} aria-label={`${text('View','查看')} ${title(item)}`}>
            {item.mediaUrl && !failedMedia.has(item.id) ? item.kind==='video'
              ?<><video src={item.mediaUrl+'#t=0.1'} preload="metadata" muted playsInline onError={()=>mediaFailed(item.id)}/><span className="creation-play"><Icon name="play"/></span></>
              :<img src={item.mediaUrl} alt={item.prompt || text('Generated image','生成的图片')} loading="lazy" onError={()=>mediaFailed(item.id)}/>
              :<div className="creation-placeholder">{pending(item)?<><span className="creation-spinner"/><strong>{status(item)}</strong><span>{text('Elapsed','已等待')} {elapsed(item)}</span></>:<><Icon name={item.kind}/><span>{failedMedia.has(item.id)?text('Preview unavailable','暂时无法预览'):status(item)}</span></>}</div>}
            {!pending(item) && <span className={'creation-badge'+(item.status==='succeeded' && item.mediaState!=='expired'?' is-ready':'')}>{status(item)}</span>}
            <span className="creation-kind">{item.kind==='video'?`${item.duration ?? ''}${text('s video','秒视频')}`:text('Image','图片')}</span>
          </button>
          <div className="creation-card-body"><h2 title={title(item)}>{title(item)}</h2><div className="creation-card-bottom"><time dateTime={item.createdAt}>{date(item.createdAt)}</time><div>
            <button type="button" className="creation-icon-button" onClick={()=>openPreview(item)} aria-label={text('View details','查看详情')}><Icon name="grid"/></button>
            {item.downloadUrl && <a className="creation-icon-button" href={item.downloadUrl} aria-label={text('Download','下载')} title={text('Download','下载')}><Icon name="download"/></a>}
            {!pending(item) && <button type="button" className="creation-icon-button" onClick={()=>setDeleting(item)} aria-label={text('Delete creation','删除作品')}><Icon name="trash"/></button>}
          </div></div></div>
        </article>)}</div>}
      {library.nextCursor && <div className="creations-load-more"><button type="button" onClick={()=>void load(library.nextCursor!)} disabled={loadingMore}>{loadingMore?text('Loading…','加载中…'):text('Load more','加载更多')}</button></div>}
      <p className="creations-retention">{text('Files are kept for 30 days from generation. Download the creations you want to keep.','作品文件自生成起保存 30 天，请及时下载需要长期保留的作品。')}</p>
    </main>
    <dialog ref={preview} className="creation-dialog" aria-label={text('Creation details','作品详情')} onCancel={()=>setSelected(null)} onClick={event=>{if(event.target===preview.current)setSelected(null)}}>
      {selected && <><button className="creation-dialog-close" type="button" onClick={()=>setSelected(null)} aria-label={text('Close preview','关闭预览')}><Icon name="close"/></button><div className="creation-dialog-media">
        {selected.mediaUrl && !failedMedia.has(selected.id)?selected.kind==='video'?<video src={selected.mediaUrl} controls autoPlay playsInline onError={()=>mediaFailed(selected.id)}/>:<img src={selected.mediaUrl} alt={title(selected)} onError={()=>mediaFailed(selected.id)}/>
          :<div className="creation-placeholder"><Icon name={selected.kind}/><strong>{failedMedia.has(selected.id)?text('This file is currently unavailable.','当前文件无法读取。'):status(selected)}</strong>{pending(selected)&&<p>{text('Generation continues in the background. You can return to this page later.','任务正在后台处理，可以稍后回到本页查看。')}</p>}</div>}
      </div><div className="creation-dialog-details"><div className="creation-dialog-top"><h2>{text('Creation details','作品详情')}</h2><time>{date(selected.createdAt)}</time></div>
        {selected.prompt && <><p className="creation-prompt">{selected.prompt}</p><button className="creation-copy" type="button" onClick={()=>{void navigator.clipboard.writeText(selected.prompt).then(()=>setCopied(true)).catch(()=>setCopied(false))}}>{copied?text('Copied','已复制'):text('Copy prompt','复制提示词')}</button></>}
        <div className="creation-dialog-footer"><span>{text('Available until','文件保留至')} {new Date(selected.expiresAt).toLocaleDateString(zh?'zh-CN':'en-US')}</span>{selected.downloadUrl && <a className="creations-primary" href={selected.downloadUrl}><Icon name="download"/>{text('Download','下载作品')}</a>}</div>
        {selected.mediaState==='unavailable' && <p className="creations-error">{text('We could not save a copy. Download from the original link while it is available.','暂未能保存文件副本，请尽快从原始结果下载。')}</p>}
      </div></>}
    </dialog>
    <dialog ref={confirmation} className="creation-confirm" aria-label={text('Delete creation','删除作品')} onCancel={event=>{if(deleteBusy)event.preventDefault();else setDeleting(null)}}><h2>{text('Delete this creation?','删除这件作品？')}</h2><p>{text('It will be removed from your library. Download a copy first if you want to keep it.','删除后将无法在作品库中找回。如需保留，请先下载。')}</p><div><button type="button" disabled={deleteBusy} onClick={()=>setDeleting(null)}>{text('Keep it','保留')}</button><button type="button" className="creation-delete" disabled={deleteBusy} onClick={()=>void remove()}>{deleteBusy?text('Deleting…','删除中…'):text('Delete','确认删除')}</button></div></dialog>
    <AuthDialog open={authOpen} onClose={()=>setAuthOpen(false)}/>
  </div>
}
