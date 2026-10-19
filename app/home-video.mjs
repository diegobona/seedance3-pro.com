import { requestVideoGeneration, pollVideoGenerationTask } from './video-generation.mjs';
import { saveVideoHandoff, readVideoHandoff, ACTIVE_VIDEO_TASK_KEY } from './studio-handoff.mjs';
import { videoReferenceFrameSize } from './video-reference-frame.mjs';

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
  const input = el('file'), reference = el('reference'), thumb = el('thumb');
  const submit = el('generate'), status = el('status'), player = el('player');
  const pending = el('pending'), result = el('result'), examples = el('examples');
  let file = null, fileURL = '', mode = 'text', busy = false, disposed = false;
  let guest = true, remaining = null, taskId = '', completed = false, controller = null, selectedExample = 0, pendingTask = false;
  const listeners = [];
  const listen = (node, event, handler) => { node?.addEventListener(event, handler); listeners.push(() => node?.removeEventListener(event, handler)); };
  function message(value, error = false) { status.textContent = value; status.classList.toggle('is-error', error && !busy); }
  const trialUsedUp = () => guest && remaining !== null && remaining < 5;
  function update() {
    const showSignup = trialUsedUp() && !busy && !pendingTask;
    const exhausted = remaining !== null && remaining < Number(duration.value);
    for (const option of duration.options) option.disabled = guest && remaining !== null && Number(option.value) > remaining;
    if (!busy && exhausted && remaining >= 5) duration.value = '5';
    submit.disabled = busy || pendingTask || !showSignup && (!prompt.value.trim() || mode === 'reference' && !file || remaining !== null && remaining < 5);
    submit.textContent = busy ? text('Generating…', '正在生成…') : showSignup ? text('Sign up to keep creating', '注册后继续创作')
      : guest ? text('Generate for free ↗', '免费生成视频 ↗') : text('Generate video ↗', '生成视频 ↗');
    el('exhausted').hidden = !showSignup;
    duration.disabled = ratio.disabled = prompt.disabled = input.disabled = el('model').disabled = busy || pendingTask;
    root.querySelectorAll('[data-home-mode]').forEach(button => { button.disabled = busy; button.setAttribute('aria-pressed', String(button.dataset.homeMode === mode)); });
    reference.hidden = mode !== 'reference';
    const square = [...ratio.options].find(option => option.value === '1:1');
    if (square) square.disabled = mode === 'reference';
    if (mode === 'reference' && ratio.value === '1:1') ratio.value = '16:9';
    if (file) { const frame = videoReferenceFrameSize(ratio.value); thumb.style.aspectRatio = `${frame.width} / ${frame.height}`; }
    el('balance').textContent = remaining === null ? text('10 free seconds · no sign-up or login', '10 秒免费额度 · 无需注册和登录')
      : guest ? text(`${remaining} free seconds remaining`, `实际剩余 ${remaining} 秒免费额度`) : text(`${remaining} credits available`, `可用 ${remaining} 积分`);
    el('cost').textContent = guest ? text(`This video: ${duration.value}s free`, `本次免费 ${duration.value} 秒`) : text(`This video: ${duration.value} credits`, `本次 ${duration.value} 积分`);
  }
  function acceptCredits(credits) {
    if (!credits) return;
    remaining = credits.remaining;
    if (credits.context) guest = credits.context === 'guest-video';
    update();
  }
  async function loadBalance() {
    try {
      const response = await fetchImpl('/api/credits/balance?guest_video=1', { credentials: 'same-origin' });
      const payload = await response.json();
      if (!disposed && response.ok && payload.credits) { guest = payload.credits.guest === true; remaining = payload.credits.remaining; update(); }
    } catch { /* The protected submit endpoint remains authoritative. */ }
  }
  function useExample(index, fillPrompt = false) {
    if (busy || pendingTask) return;
    selectedExample = index;
    const example = HOME_VIDEO_EXAMPLES[index];
    if (!completed) {
      player.src = example.src; player.muted = true; player.loop = false;
      el('example-title').textContent = example.title[zh ? 1 : 0];
      void player.play().catch(() => {});
    }
    el('example-count').textContent = `${String(index + 1).padStart(2, '0')} / ${String(HOME_VIDEO_EXAMPLES.length).padStart(2, '0')}`;
    if (fillPrompt) {
      prompt.value = example.prompt; duration.value = '5'; ratio.value = '16:9'; mode = 'text';
      update(); prompt.focus(); root.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
  function setFile(next) {
    if (busy) return false;
    if (next && (!['image/png', 'image/jpeg', 'image/webp'].includes(next.type) || !next.size || next.size > 10 * 1024 * 1024)) {
      message(text('Choose PNG, JPEG or WebP, up to 10 MB.', '请选择不超过 10 MB 的 PNG、JPEG 或 WebP 图片。'), true); return false;
    }
    if (fileURL) URL.revokeObjectURL(fileURL);
    file = next; fileURL = next ? URL.createObjectURL(next) : '';
    thumb.hidden = !next; el('remove').hidden = !next;
    if (next) { thumb.src = fileURL; el('filename').textContent = next.name; }
    else { thumb.removeAttribute('src'); el('filename').textContent = text('Choose or paste one image', '选择或粘贴一张参考图'); }
    update(); return true;
  }
  const draft = () => ({ prompt: prompt.value, duration: Number(duration.value), aspectRatio: ratio.value, mode, file: mode === 'reference' ? file : null, taskId });
  async function handoff(event) {
    event.preventDefault();
    await openWorkspace(event.currentTarget.href);
  }
  async function openWorkspace(href) {
    try { await saveVideoHandoff(draft()); controller?.abort(); window.location.assign(href); }
    catch { message(text('Could not transfer the draft. Please try again.', '草稿暂时无法转入工作台，请重试。'), true); }
  }
  document.querySelectorAll('[data-video-workbench]').forEach(link => listen(link, 'click', handoff));
  async function run(resume = '') {
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
        referenceFiles: captured.file ? [captured.file] : [],
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
      if (error.terminal || error.status === 404 || error.code === 'INVALID_VIDEO_TASK') { sessionStorage.removeItem(ACTIVE_VIDEO_TASK_KEY); taskId = ''; pendingTask = false; }
      pending.hidden = true;
      if (taskId) { el('resume').hidden = false; message(text('Your task is saved. Continue checking or open the workspace.', '任务已保存，可继续查看进度或进入工作台。')); }
      else { examples.hidden = false; player.hidden = false; useExample(selectedExample); message(error.message || text('Please try again.', '请重试。')); }
    } finally { busy = false; if (!completed && !taskId) useExample(selectedExample); update(); if (!disposed) void loadBalance(); }
  }
  listen(form, 'submit', event => {
    event.preventDefault();
    if (submit.disabled) return;
    if (trialUsedUp()) { void openWorkspace(el('signup').href); return; }
    taskId = ''; void run();
  });
  listen(prompt, 'input', update); listen(duration, 'change', update); listen(ratio, 'change', update);
  listen(input, 'change', () => { setFile(input.files?.[0] || null); input.value = ''; });
  listen(el('choose'), 'click', () => input.click()); listen(el('remove'), 'click', () => setFile(null));
  listen(el('resume'), 'click', () => { el('resume').hidden = true; void run(taskId); });
  root.querySelectorAll('[data-home-mode]').forEach(button => listen(button, 'click', () => { mode = button.dataset.homeMode; if (mode === 'reference' && ratio.value === '1:1') ratio.value = '16:9'; update(); }));
  listen(player, 'ended', () => {
    if (!busy && !pendingTask && !completed && !disposed) useExample((selectedExample + 1) % HOME_VIDEO_EXAMPLES.length);
  });
  listen(el('try'), 'click', () => useExample(selectedExample, true));
  document.querySelectorAll('[data-home-focus]').forEach(link => listen(link, 'click', event => {
    event.preventDefault(); root.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (!busy && !pendingTask) prompt.focus({ preventScroll: true });
  }));
  listen(root, 'paste', event => {
    if (mode !== 'reference' || busy) return;
    const incoming = [...(event.clipboardData?.files || [])].filter(item => item.type.startsWith('image/'));
    if (incoming.length === 1 && setFile(incoming[0])) event.preventDefault();
  });
  const restore = readVideoHandoff({ consume: false }).then(value => {
    if (!value || disposed) return;
    prompt.value = value.prompt; duration.value = String(value.duration === 15 ? 10 : value.duration); ratio.value = value.aspectRatio; mode = value.mode;
    if (value.file) setFile(value.file); update();
  }).catch(() => {});
  useExample(0); update(); void loadBalance();
  void restore.then(() => {
    const active = sessionStorage.getItem(ACTIVE_VIDEO_TASK_KEY);
    if (active && !disposed) { taskId = active; void run(active); }
  });
  const cleanup = () => { disposed = true; controller?.abort(); if (fileURL) URL.revokeObjectURL(fileURL); listeners.forEach(remove => remove()); };
  listen(window, 'pagehide', cleanup);
  return cleanup;
}

if (typeof document !== 'undefined') {
  let cleanup = initializeHomeVideo();
  window.addEventListener('pageshow', event => { if (event.persisted) { cleanup(); cleanup = initializeHomeVideo(); } });
}
