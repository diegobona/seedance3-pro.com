import { requestVideoGeneration, pollVideoGenerationTask, validateVideoReferenceFiles } from './video-generation.mjs';
import { saveVideoHandoff, readVideoHandoff, ACTIVE_VIDEO_TASK_KEY } from './studio-handoff.mjs';
import { videoReferenceFrameSize } from './video-reference-frame.mjs';
import {homeGenerationAction, initializeHomePurchase} from './home-purchase.mjs';
import {millisecondsUntilCreditReset} from './daily-credits.mjs';
import { guestDeviceHeaders } from '../assets/guest-device.mjs';

export const HOME_VIDEO_EXAMPLES = [
  { title: ['Cinematic scene', '电影感场景'], src: '/assets/h3-example-cinematic.mp4',
    prompt: 'At blue hour on a windswept salt flat, a lone traveler in a saffron coat walks toward a glowing glass observatory. One continuous slow dolly-in shot; drifting dust, soft volumetric light, grounded realistic motion, film-grain, high-contrast cinematic color. No text, no logos.' },
  { title: ['Product film', '产品短片'], src: '/assets/h3-example-product.mp4',
    prompt: 'A sculptural matte-black ceramic espresso cup rotates above a pale limestone pedestal as warm morning sunlight slides across the rim. Macro lens, crisp reflections, gentle orbit camera, premium commercial film, clean minimal background. No text, no logos.' },
  { title: ['Paper animation', '纸艺动画'], src: '/assets/h3-example-animation.mp4',
    prompt: 'A tiny paper fox with folded origami fur leaps between floating lanterns over a moonlit forest pond. Handcrafted stop-motion paper texture, playful squash-and-stretch, smooth sideways tracking camera, saturated indigo and amber palette. No text, no logos.' },
];

export function initializeHomeVideo(root = document.querySelector('[data-home-video]'), {
  fetchImpl = fetch, requestImpl = requestVideoGeneration, pollImpl = pollVideoGenerationTask,
} = {}) {
  if (!root) return () => {};
  const zh = document.documentElement.lang.startsWith('zh');
  const text = (en, cn) => zh ? cn : en;
  const el = name => root.querySelector(`[data-home-${name}]`);
  const form = el('form'), prompt = el('prompt'), duration = el('duration'), ratio = el('ratio');
  const input = el('file'), reference = el('reference');
  const grid = el('reference-grid') || Object.assign(document.createElement('div'), { className: 'home-reference-grid' });
  if (!grid.parentNode) { grid.dataset.homeReferenceGrid = ''; reference.append(grid); }
  input.multiple = true;
  el('thumb')?.remove(); el('remove')?.remove();
  const submit = el('generate'), status = el('status'), player = el('player');
  const pending = el('pending'), result = el('result'), examples = el('examples');
  let references = [], mode = 'text', busy = false, disposed = false, draftEdited = false;
  let guest = true, remaining = null, taskId = '', completed = false, controller = null, selectedExample = 0, pendingTask = false;
  let paidRemaining=0, freeBudgetBlocked=false, purchaseBusy=false, balanceVersion=0, balanceController, dailyTimer;
  let restoreReady=Promise.resolve(), restoreFailed=false;
  const listeners = [];
  const listen = (node, event, handler) => { node?.addEventListener(event, handler); listeners.push(() => node?.removeEventListener(event, handler)); };
  function message(value, error = false) { status.textContent = value; status.classList.toggle('is-error', error && !busy); }
  const trialUsedUp = () => guest && remaining !== null && remaining < 5;
  const action = () => homeGenerationAction({guest,remaining,duration:duration.value,freeBudgetBlocked,paidRemaining});
  function update() {
    const showSignup = trialUsedUp() && !busy && !pendingTask;
    for (const option of duration.options) option.disabled = remaining !== null && Number(option.value) > remaining;
    if (!busy && remaining !== null && remaining < Number(duration.value) && remaining >= 5) duration.value = '5';
    const next=action(), generating=next==='generate'||next==='paid-generate';
    submit.disabled = busy || pendingTask || purchaseBusy || generating && (!prompt.value.trim() || mode === 'reference' && !references.length);
    submit.textContent = purchaseBusy ? text('Opening checkout…','正在打开付款…') : busy ? text('Generating…', '正在生成…')
      : next==='auth' ? text('Register / log in to continue', '注册 / 登录后继续')
      : next==='buy' ? text('Buy 500 credits · US$4.99', '购买 500 积分 · US$4.99')
      : next==='paid-generate' ? text(`Generate with purchased credits · ${duration.value} credits`,`使用购买积分生成 · ${duration.value} 积分`)
      : guest ? text('Generate for free ↗', '免费生成视频 ↗') : text('Generate video ↗', '生成视频 ↗');
    el('exhausted').hidden = !showSignup;
    const accountNotice=el('account-notice');
    if(accountNotice){accountNotice.hidden=guest||!['buy','paid-generate'].includes(next);accountNotice.textContent=freeBudgetBlocked
      ? text('Today’s free allowance is used up. Wait for the daily reset, or use purchased credits.','今日免费额度已用完，可等待积分每日重置，或使用购买积分继续。')
      : text('Not enough credits. Purchased credits never expire.','积分不足，购买积分永久有效。');}
    duration.disabled = ratio.disabled = prompt.disabled = input.disabled = el('model').disabled = busy || pendingTask || purchaseBusy;
    root.querySelectorAll('[data-home-mode]').forEach(button => { button.disabled = busy || pendingTask || purchaseBusy; button.setAttribute('aria-pressed', String(button.dataset.homeMode === mode)); });
    el('choose').disabled = busy || pendingTask || purchaseBusy || references.length >= 9;
    grid.querySelectorAll('button').forEach(button => { button.disabled = busy || pendingTask || purchaseBusy; });
    reference.hidden = mode !== 'reference';
    const square = [...ratio.options].find(option => option.value === '1:1');
    if (square) square.disabled = false;
    const frame = videoReferenceFrameSize(ratio.value);
    grid.querySelectorAll('img').forEach(image => { image.style.aspectRatio = `${frame.width} / ${frame.height}`; });
    if (el('reference-count')) el('reference-count').textContent = `${references.length} / 9`;
    el('filename').textContent = references.length ? text('Add more images', '继续添加参考图') : text('Choose or paste images', '选择或粘贴参考图');
    el('balance').textContent = remaining === null ? text('10 free seconds · no sign-up or login', '10 秒免费额度 · 无需注册和登录')
      : guest ? text(`${remaining} free seconds remaining`, `实际剩余 ${remaining} 秒免费额度`) : text(`${remaining} credits available`, `可用 ${remaining} 积分`);
    el('cost').textContent = guest ? text(`This video: ${duration.value}s free`, `本次免费 ${duration.value} 秒`) : text(`This video: ${duration.value} credits`, `本次 ${duration.value} 积分`);
  }
  function acceptCredits(credits) {
    if (!credits) return;
    remaining = credits.remaining;
    if (credits.context) guest = credits.context === 'guest-video';
    if(credits.context==='account')window.dispatchEvent(new CustomEvent('seedance:credits-updated',{detail:credits}));
    update();
  }
  async function loadBalance() {
    const version=++balanceVersion;balanceController?.abort();const controller=new AbortController();balanceController=controller;
    try {
      const response = await fetchImpl('/api/credits/balance?guest_video=1', { headers: await guestDeviceHeaders(), credentials: 'same-origin',cache:'no-store',signal:controller.signal });
      const payload = await response.json();
      if (!disposed && version===balanceVersion && response.ok && Number.isSafeInteger(payload.credits?.remaining)) {
        guest = payload.credits.guest === true; remaining = payload.credits.remaining;
        paidRemaining=payload.credits.paidRemaining||0;update();
        clearTimeout(dailyTimer);if(!guest)dailyTimer=setTimeout(()=>{freeBudgetBlocked=false;void loadBalance();},millisecondsUntilCreditReset());
        const intro=document.querySelector('.home-intro-copy');
        if(intro){intro.querySelector('.home-free-badge').textContent=guest?text('10 FREE SECONDS','首次共 10 秒免费额度'):text('5 DAILY FREE CREDITS','每日 5 免费积分');
          intro.querySelector('.home-guest-benefit strong').textContent=guest?text('No sign-up or login required','无需注册或登录，即可试用'):text('Credits reset daily and do not accumulate.','积分每日重置，不累积。');
          intro.querySelector('.home-member-offer').hidden=!guest;}
      }
    } catch { /* The protected submit endpoint remains authoritative. */ }
  }
  function useExample(index, fillPrompt = false) {
    if (busy || pendingTask || purchaseBusy) return;
    selectedExample = index;
    const example = HOME_VIDEO_EXAMPLES[index];
    if (!completed) {
      player.src = example.src; player.muted = true; player.loop = false;
      el('example-title').textContent = example.title[zh ? 1 : 0];
      void player.play().catch(() => {});
    }
    el('example-count').textContent = `${String(index + 1).padStart(2, '0')} / ${String(HOME_VIDEO_EXAMPLES.length).padStart(2, '0')}`;
    if (fillPrompt) {
      draftEdited=true;
      prompt.value = example.prompt; duration.value = '5'; ratio.value = '16:9'; mode = 'text';
      update(); prompt.focus(); root.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
  function renderReferences() {
    grid.replaceChildren();
    for (const [index,item] of references.entries()) {
      const card = Object.assign(document.createElement('div'), { className: 'home-reference-item' });
      const image = Object.assign(document.createElement('img'), { src: item.url, alt: text(`Image ${index + 1}: ${item.file.name}`, `参考图 ${index + 1}：${item.file.name}`) });
      const label = Object.assign(document.createElement('span'), { textContent: text(`Image ${index + 1}`, `参考图 ${index + 1}`) });
      const remove = Object.assign(document.createElement('button'), { type: 'button', textContent: '×' });
      remove.dataset.homeRemoveReference = String(index);
      remove.setAttribute('aria-label', text(`Remove reference image ${index + 1}`, `移除参考图 ${index + 1}`));
      card.append(image,label,remove); grid.append(card);
    }
  }
  function addFiles(incoming, { restoring = false } = {}) {
    if (busy || pendingTask || purchaseBusy && !restoring || !incoming.length) return false;
    try { validateVideoReferenceFiles(incoming, { existingCount: references.length }); }
    catch (error) { message(error.message, true); return false; }
    references.push(...incoming.map(file => ({ file, url: URL.createObjectURL(file) })));
    if (!restoring) draftEdited = true;
    message(text('Reference images ready.', '参考图已就绪。'));
    renderReferences(); update(); return true;
  }
  const draft = () => ({ prompt: prompt.value, duration: Number(duration.value), aspectRatio: ratio.value, mode,
    files: references.map(item => item.file), taskId });
  listen(window,'seedance:home-before-leave',event=>{event.detail.promises.push(restoreReady.then(()=>{
    if(busy&&!taskId)throw Error('Wait for the current submission');
    if(restoreFailed&&!draftEdited)throw Error('Restore the references before leaving');
    return saveVideoHandoff(draft());
  }));});
  listen(window,'seedance:home-purchase-state',event=>{purchaseBusy=event.detail.busy;update();});
  listen(window,'seedance:auth-changed',()=>{freeBudgetBlocked=false;remaining=null;void loadBalance();});
  listen(window,'seedance:account-changed',()=>{freeBudgetBlocked=false;remaining=null;void loadBalance();});
  listen(window,'seedance:payment-verified',()=>{void loadBalance();});
  listen(window,'focus',()=>{void loadBalance();});
  async function handoff(event) {
    event.preventDefault();
    await openWorkspace(event.currentTarget.href);
  }
  async function openWorkspace(href) {
    try { await saveVideoHandoff(draft()); controller?.abort(); window.location.assign(href); }
    catch { message(text('Could not transfer the draft. Please try again.', '草稿暂时无法转入工作台，请重试。'), true); }
  }
  document.querySelectorAll('[data-video-workbench]').forEach(link => listen(link, 'click', handoff));
  async function run(resume = '', paidOnly=false) {
    if (busy || disposed) return;
    const captured = draft();
    if (resume) pendingTask = true;
    busy = true; completed = false; controller = new AbortController();
    pending.hidden = false; result.hidden = true; examples.hidden = true; player.hidden = true; player.pause();
    message(text(resume ? 'Checking your video…' : 'Preparing your video…', resume ? '正在查看生成进度…' : '正在准备生成…')); update();
    if (matchMedia('(max-width: 760px)').matches) el('preview').scrollIntoView({ behavior: 'smooth', block: 'start' });
    try {
      if (!resume) await saveVideoHandoff(captured).catch(() => {});
      const common = { fetchImpl, signal: controller.signal, onStatus(updateState) {
        if (disposed) return;
        acceptCredits(updateState.credits);
        const value = updateState.status === 'queued' ? text('Queued for generation…', '已排队，等待生成…')
          : updateState.status === 'running' ? text('Generating your video…', '正在生成视频…') : text('Checking generation progress…', '正在查看生成进度…');
        el('pending-text').textContent = value; message(value);
      } };
      const video = resume ? await pollImpl({ ...common, taskId: resume }) : await requestImpl({ ...common,
        prompt: captured.prompt, duration: captured.duration, aspectRatio: captured.aspectRatio,
        referenceFiles: captured.mode==='reference'?captured.files:[],paidOnly,
        onTask(id) {
          taskId = id; pendingTask = true;
          try { sessionStorage.setItem(ACTIVE_VIDEO_TASK_KEY, id); sessionStorage.setItem('seedance:video:active-model', 'minimax-h3'); } catch { /* Current-page polling still works without storage. */ }
        },
      });
      if (disposed) return;
      acceptCredits(video.credits); completed = true; pendingTask = false;
      player.src = video.videoUrl; player.muted = false; player.loop = false; player.hidden = false;
      pending.hidden = true; result.hidden = false;
      el('download').href = video.videoUrl;
      el('example-title').textContent = text('Your generated video', '你的生成结果');
      sessionStorage.removeItem(ACTIVE_VIDEO_TASK_KEY); sessionStorage.removeItem('seedance:video:active-model');
      message(text('Your video is ready. Download it or continue in the workspace.', '视频已生成，可下载或进入工作台继续创作。'));
    } catch (error) {
      if (disposed || error.name === 'AbortError') return;
      acceptCredits(error.credits);
      if(['FREE_BUDGET_EXCEEDED','NETWORK_FREE_BUDGET_EXCEEDED'].includes(error.code))freeBudgetBlocked=true;
      if(error.code==='AUTH_REQUIRED'){window.dispatchEvent(new CustomEvent('seedance:home-auth',{detail:{mode:'login'}}));}
      if (error.terminal || error.status === 404 || error.code === 'INVALID_VIDEO_TASK') { sessionStorage.removeItem(ACTIVE_VIDEO_TASK_KEY); taskId = ''; pendingTask = false; }
      pending.hidden = true;
      if (taskId) { el('resume').hidden = false; message(text('Your task is saved. Continue checking or open the workspace.', '任务已保存，可继续查看进度或进入工作台。')); }
      else { examples.hidden = false; player.hidden = false; useExample(selectedExample); message(error.message || text('Please try again.', '请重试。')); }
    } finally { busy = false; if (!completed && !taskId) useExample(selectedExample); update(); if (!disposed) void loadBalance(); }
  }
  listen(form, 'submit', event => {
    event.preventDefault();
    if (submit.disabled) return;
    const next=action();
    if(next==='auth'){window.dispatchEvent(new CustomEvent('seedance:home-auth',{detail:{mode:'register'}}));return;}
    if(next==='buy'){window.dispatchEvent(new Event('seedance:home-buy'));return;}
    taskId = ''; void run('',next==='paid-generate');
  });
  const edit = () => { draftEdited = true; update(); };
  listen(prompt, 'input', edit); listen(duration, 'change', edit); listen(ratio, 'change', edit);
  listen(input, 'change', () => { addFiles([...(input.files || [])]); input.value = ''; });
  listen(el('choose'), 'click', () => input.click());
  listen(grid, 'click', event => {
    const button = event.target.closest('[data-home-remove-reference]');
    if (!button || busy || pendingTask || purchaseBusy) return;
    const index = Number(button.dataset.homeRemoveReference);
    if (!Number.isInteger(index) || !references[index]) return;
    URL.revokeObjectURL(references[index].url); references.splice(index,1); draftEdited = true;
    renderReferences(); update();
  });
  listen(el('resume'), 'click', () => { el('resume').hidden = true; void run(taskId); });
  root.querySelectorAll('[data-home-mode]').forEach(button => listen(button, 'click', () => { mode = button.dataset.homeMode; edit(); }));
  listen(player, 'ended', () => {
    if (!busy && !pendingTask && !completed && !disposed) useExample((selectedExample + 1) % HOME_VIDEO_EXAMPLES.length);
  });
  listen(el('try'), 'click', () => useExample(selectedExample, true));
  document.querySelectorAll('[data-home-focus]').forEach(link => listen(link, 'click', event => {
    event.preventDefault(); root.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (!busy && !pendingTask) prompt.focus({ preventScroll: true });
  }));
  listen(root, 'paste', event => {
    if (mode !== 'reference' || busy || pendingTask || purchaseBusy) return;
    const incoming = [...(event.clipboardData?.files || [])].filter(item => item.type.startsWith('image/'));
    if (incoming.length && addFiles(incoming)) event.preventDefault();
  });
  const restore = readVideoHandoff({ consume: false,maxAgeMs:24*60*60*1000 }).then(value => {
    if (!value || disposed || draftEdited) return;
    prompt.value = value.prompt; duration.value = String(value.duration === 15 ? 10 : value.duration); ratio.value = value.aspectRatio; mode = value.mode;
    const files = value.files ?? (value.file ? [value.file] : []);
    if (files.length) addFiles(files, { restoring: true }); update();
  }).catch(() => {restoreFailed=true;message(text('Could not restore your draft. Please reselect your reference images.','无法恢复草稿，请重新选择参考图。'),true);});
  restoreReady=restore;
  useExample(0); update(); void loadBalance();
  void restore.then(() => {
    const active = sessionStorage.getItem(ACTIVE_VIDEO_TASK_KEY);
    if (active && !disposed) { taskId = active; void run(active); }
  });
  const cleanup = () => { disposed = true; controller?.abort();balanceVersion++;balanceController?.abort();clearTimeout(dailyTimer); references.forEach(item => URL.revokeObjectURL(item.url)); listeners.forEach(remove => remove()); };
  listen(window, 'pagehide', cleanup);
  return cleanup;
}

if (typeof document !== 'undefined') {
  initializeHomePurchase();
  let cleanup = initializeHomeVideo();
  window.addEventListener('pageshow', event => { if (event.persisted) { cleanup(); cleanup = initializeHomeVideo(); } });
}
