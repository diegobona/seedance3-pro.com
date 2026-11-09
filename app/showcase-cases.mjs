import { SEEDANCE_VIDEO_EXAMPLES } from './seedance-video-examples.mjs';
import { h3VideoCases } from '../src/data/h3-video-cases.ts';
import translations from '../src/data/ui-zh.json';
import { xVideoSources } from './showcase-video-sources.mjs';
import { renderRelatedVideoCases } from './showcase-related.mjs';

const zh = document.documentElement.lang.startsWith('zh');
const text = (en, cn) => zh ? cn : en;
const translate = value => zh ? translations[value] || value : value;
const dialog = document.querySelector('#showcase-case');
const summaries = {
  'front-row-confidence': ['An outdoor fashion moment built around a playful sunglasses gesture.', '户外时尚活动中，以墨镜动作和人物神态展开的一段镜头。'],
  'fire-and-shadow-duel': ['Two fighters clash through contrasting fire and shadow effects.', '两名角色近身交锋，以火焰与暗影的对比强化动作节奏。'],
  backstage: ['Follow a performer from the dressing room toward the stage.', '跟随表演者从化妆间走向舞台，观察人物与镜头的连续运动。'],
  clockwork: ['A miniature flying machine travels through an intricate clockwork world.', '微型飞行器穿行于机械世界，展现材质细节与空间层次。'],
  'desert-museum': ['A quiet architectural scene shaped by desert light and drifting fabric.', '沙漠光线、建筑空间与轻柔织物构成安静的场景。'],
  orchestra: ['Warm concert-hall lighting frames a musical performance.', '音乐厅的暖色灯光与演奏场景形成电影感画面。'],
  chase: ['Character movement and camera motion carry the scene forward.', '人物运动与摄影机调度共同推动场景叙事。'],
  stage: ['A theatrical scene moves into the spotlight.', '以舞台灯光和人物动作展现表演瞬间。'],
};

function stableId(value) {
  let hash = 2166136261;
  for (const char of value) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return `video-${(hash >>> 0).toString(36)}`;
}
function readCase(card, index) {
  const sample = SEEDANCE_VIDEO_EXAMPLES.find(item => item.id === card.dataset.sampleId);
  const slug = card.getAttribute('href')?.split('/').pop();
  const original = h3VideoCases.find(item => item.slug === slug);
  const video = card.querySelector('video');
  const external = card.querySelector('.community-video-play');
  const source = card.querySelector('.community-video-links a');
  const originalUrl = sample?.sourceUrl || source?.href || '';
  const xId = /\/status\/(\d+)/.exec(external?.dataset.xPostUrl || '')?.[1];
  const prompt = sample ? (zh && sample.promptZh || sample.prompt) : original?.prompt || card.querySelector('.community-video-prompt')?.textContent.trim() || '';
  const localOriginal = card.classList.contains('community-video-card--original');
  const model = sample?.sourceType === 'user-provided' ? '' : sample || localOriginal ? 'Seedance 2.5' : /Seedance 2\.0/.test(card.textContent) ? 'Seedance 2.0' : '';
  return {
    id: sample?.id || slug || (xId && `x-${xId}`) || (external?.dataset.communityVideoId && `youtube-${external.dataset.communityVideoId}`) || stableId(originalUrl || prompt),
    caseUrl: original ? `${zh ? '/zh' : ''}/seedance-2-5-prompts/${original.slug}` : '',
    title: original ? translate(original.title) : card.querySelector('h3')?.textContent.trim() || '', prompt,
    src: sample?.src || video?.dataset.previewSrc || (xId && xVideoSources[xId]) || '',
    youtubeId: external?.dataset.communityVideoId || '',
    poster: sample?.poster || video?.poster || card.querySelector('img')?.src || '',
    summary: sample ? summaries[sample.id]?.[zh ? 1 : 0] : original ? translate(original.summary) : prompt.split(/(?<=[.!?。])\s/)[0],
    creativeNote: original ? translate(original.creativeNote) : '',
    credit: sample?.sourceType === 'user-provided' ? text('Video reference', '视频参考') : sample ? (originalUrl.includes('seed.bytedance.com') ? 'ByteDance Seed' : 'Evolink AI') : card.querySelector('.community-video-credit')?.textContent.trim() || '',
    originalUrl, model,
    duration: sample?.durationSeconds || Number(card.dataset.durationSeconds) || null,
    generationDuration: sample?.durationSeconds || 5,
    ratio: original?.aspectRatio || (sample ? sample.previewRatio?.replace(/\s*\/\s*/, ':') || '16:9' : localOriginal ? card.classList.contains('community-video-card--original-portrait') ? '9:16' : '16:9' : null),
    promptKind: localOriginal && !sample ? text('Prompt used for this video', '此视频使用的提示词') : text('Suggested prompt based on this video', '根据视频画面整理的参考提示词'),
  };
}

let lastTrigger, previousOverflow, activeCase;
const casesById = new Map();
const media = dialog.querySelector('[data-case-media]');
const copy = dialog.querySelector('[data-case-copy]');
const share = dialog.querySelector('[data-case-share]');
const shareStatus = dialog.querySelector('[data-case-share-status]');
const shareFallback = dialog.querySelector('[data-case-share-url]');
function caseUrl(id) {
  const url = new URL(location.href);
  url.searchParams.set('case', id);
  return url;
}
const facts = dialog.querySelector('[data-case-facts]');
function addFact(label, value, name) {
  const row = document.createElement('div');
  if (name) row.dataset.caseFact = name;
  const term = document.createElement('dt'), detail = document.createElement('dd');
  term.textContent = label; detail.textContent = value;
  row.append(term, detail); facts.append(row);
  return detail;
}
function setDuration(value) {
  if (!Number.isFinite(value) || value <= 0) return;
  let detail = facts.querySelector('[data-case-fact="duration"] dd');
  if (!detail) detail = addFact(text('Video length', '视频时长'), '', 'duration');
  detail.textContent = `${Number(value.toFixed(1))}${text(' seconds', ' 秒')}`;
}
function openCase(item, trigger, syncUrl = true) {
  const wasOpen = dialog.open;
  if (!wasOpen) {
    lastTrigger = trigger;
    previousOverflow = document.documentElement.style.overflow;
  }
  activeCase = item;
  if (syncUrl && new URL(location.href).searchParams.get('case') !== item.id) {
    history.pushState(history.state, '', caseUrl(item.id));
  }
  shareStatus.textContent = ''; shareFallback.hidden = true;
  document.querySelectorAll('.community-video-preview').forEach(video => video.pause());
  dialog.querySelector('#showcase-case-title').textContent = item.title;
  dialog.querySelector('[data-case-summary]').textContent = item.summary || '';
  dialog.querySelector('[data-case-credit]').textContent = item.credit;
  dialog.querySelector('[data-case-prompt-label]').textContent = item.promptKind;
  dialog.querySelector('[data-case-prompt]').textContent = item.prompt;
  const related = dialog.querySelector('[data-case-related]');
  const previousIds = [...related.querySelectorAll('[data-related-case]')].map(link => link.dataset.relatedCase);
  related.innerHTML = renderRelatedVideoCases([...casesById.values()].map(entry => ({
    slug:entry.id, title:entry.title, summary:entry.summary || '', posterUrl:entry.poster,
    caseUrl:entry.caseUrl || `${zh ? '/zh' : ''}/showcase?case=${encodeURIComponent(entry.id)}`,
  })), {locale:zh ? 'zh' : 'en', currentId:item.id, translate, randomize:true, previousIds});
  const creative = dialog.querySelector('[data-case-creative]');
  creative.hidden = !item.creativeNote; creative.querySelector('p').textContent = item.creativeNote;
  const original = dialog.querySelector('[data-case-source]');
  original.hidden = !item.originalUrl;
  if (item.originalUrl) original.href = item.originalUrl; else original.removeAttribute('href');
  const tryLink = dialog.querySelector('[data-case-try]');
  tryLink.href = `${zh ? '/zh' : ''}/app/video/seedance-2-5?` + new URLSearchParams({prompt:item.prompt,duration:String(item.generationDuration),aspect_ratio:item.ratio || '16:9'});
  copy.textContent = text('Copy prompt', '复制提示词');
  facts.replaceChildren();
  if (item.model) addFact(text('Model', '模型'), item.model);
  if (item.duration) setDuration(item.duration);
  if (item.ratio) addFact(text('Format', '画幅'), item.ratio);
  const unavailable = dialog.querySelector('[data-case-unavailable]'); unavailable.hidden = true;
  media.querySelector('video')?.pause();
  media.replaceChildren();
  if (item.src) {
    const player = document.createElement('video');
    player.controls = true; player.playsInline = true; player.preload = 'metadata'; player.poster = item.poster; player.src = item.src;
    player.setAttribute('aria-label', item.title);
    player.addEventListener('loadedmetadata', () => { if (activeCase === item) setDuration(player.duration); });
    player.addEventListener('error', () => { if (activeCase === item) unavailable.hidden = false; });
    media.append(player);
  } else if (/^[\w-]{11}$/.test(item.youtubeId)) {
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube-nocookie.com/embed/${item.youtubeId}`;
    iframe.title = item.title; iframe.referrerPolicy = 'strict-origin-when-cross-origin'; iframe.allowFullscreen = true;
    iframe.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';
    media.append(iframe);
  } else {
    const poster = document.createElement('img'); poster.src = item.poster; poster.alt = item.title; media.append(poster);
    unavailable.hidden = false;
  }
  document.documentElement.style.overflow = 'hidden';
  if (!wasOpen) dialog.showModal();
  dialog.scrollTop = 0; dialog.querySelector('[data-case-close]').focus();
}

document.querySelectorAll('.community-video-card').forEach((element, index) => {
  const item = readCase(element, index);
  casesById.set(item.id, item);
  let card = element;
  if (card.tagName === 'A') {
    card = document.createElement('article');
    for (const attr of element.attributes) if (!['href','aria-label'].includes(attr.name)) card.setAttribute(attr.name, attr.value);
    card.append(...element.childNodes); element.replaceWith(card);
  }
  card.dataset.caseId = item.id;
  const title = card.querySelector('h3');
  if (title) title.textContent = item.title;
  card.querySelectorAll('.community-video-case-link,.community-video-info-button').forEach(el => el.remove());
  const badge = document.createElement(item.caseUrl ? 'a' : 'button');
  if (item.caseUrl) badge.href = item.caseUrl; else badge.type = 'button';
  badge.className = 'community-video-case-link'; badge.textContent = text('View case ↗', '查看案例 ↗');
  badge.setAttribute('aria-haspopup','dialog'); badge.setAttribute('aria-label',text(`View case: ${item.title}`,`查看案例：${item.title}`));
  badge.addEventListener('click', event => {
    if (item.caseUrl && (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)) return;
    event.preventDefault(); openCase(item,badge);
  }); card.append(badge);
  let preview = card.querySelector('.community-video-play');
  if (!preview) {
    preview = document.createElement('button'); preview.type = 'button'; preview.className = 'community-video-play';
    const player = card.querySelector('.community-video-player'); preview.append(...player.childNodes); player.append(preview);
  }
  preview.setAttribute('aria-label',badge.getAttribute('aria-label')); preview.setAttribute('aria-haspopup','dialog');
  preview.addEventListener('click', () => openCase(item,preview));
});

dialog.querySelector('[data-case-related]').addEventListener('click', event => {
  const link = event.target.closest('a[data-related-case]');
  if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const item = casesById.get(link.dataset.relatedCase);
  if (!item) return;
  event.preventDefault();
  openCase(item, link);
});

copy.addEventListener('click', async () => {
  const item = activeCase;
  try { await navigator.clipboard.writeText(item.prompt); if (activeCase === item) copy.textContent = text('Copied', '已复制'); }
  catch { if (activeCase === item) copy.textContent = text('Copy failed — select the text below', '复制失败，请选择下方文字'); }
});
share.addEventListener('click', async () => {
  const item = activeCase;
  if (!item) return;
  const url = caseUrl(item.id).href;
  try {
    await navigator.clipboard.writeText(url);
    if (activeCase === item) shareStatus.textContent = text('Link copied', '链接已复制');
  } catch {
    if (activeCase !== item) return;
    shareStatus.textContent = text('Copy this link to share', '复制此链接即可分享');
    shareFallback.hidden = false; shareFallback.value = url;
    shareFallback.focus(); shareFallback.select();
  }
});
dialog.querySelector('[data-case-close]').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const r = dialog.getBoundingClientRect();
  if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
});
dialog.addEventListener('close', () => {
  if (dialog.open) return;
  const url = new URL(location.href);
  if (activeCase && url.searchParams.get('case') === activeCase.id) {
    url.searchParams.delete('case'); history.replaceState(history.state, '', url);
  }
  media.querySelector('video')?.pause(); media.replaceChildren(); activeCase = null;
  document.documentElement.style.overflow = previousOverflow; lastTrigger?.focus();
});

function syncCaseFromUrl() {
  const item = casesById.get(new URL(location.href).searchParams.get('case'));
  if (item) {
    const card = [...document.querySelectorAll('.community-video-card')].find(node => node.dataset.caseId === item.id);
    openCase(item, card?.querySelector('.community-video-case-link'), false);
  } else if (dialog.open) dialog.close();
}
window.addEventListener('popstate', syncCaseFromUrl);
syncCaseFromUrl();

if ('IntersectionObserver' in window) {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches || navigator.connection?.saveData;
  const observer = new IntersectionObserver(entries => entries.forEach(({target, isIntersecting}) => {
    if (!isIntersecting || reducedMotion || dialog.open || document.hidden) { target.pause(); return; }
    if (!target.src) target.src = target.dataset.previewSrc;
    target.play().catch(() => {});
  }), {threshold:0.35});
  document.querySelectorAll('.community-video-preview').forEach(video => observer.observe(video));
  document.addEventListener('visibilitychange', () => { if(document.hidden) document.querySelectorAll('.community-video-preview').forEach(video=>video.pause()); });
}
