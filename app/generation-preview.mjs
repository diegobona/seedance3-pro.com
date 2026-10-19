import { currentLocale, t } from './i18n.mjs';

function previewRatio(value) {
  const parts = /^\s*(\d+(?:\.\d+)?)\s*[:/]\s*(\d+(?:\.\d+)?)\s*$/.exec(String(value));
  if (!parts) return '1 / 1';
  const width = Number(parts[1]);
  const height = Number(parts[2]);
  return width > 0 && height > 0 && Number.isFinite(width) && Number.isFinite(height)
    ? `${width} / ${height}` : '1 / 1';
}

function elapsedTime(startedAt, now) {
  const seconds = Math.max(0, Math.floor((now - startedAt) / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function retainChildren(host, children) {
  const existing = [...host.childNodes];
  if (existing.length !== children.length || existing.some((child, index) => child !== children[index])) {
    host.replaceChildren(...children);
  }
}

/** Page-local preview state. Only generated result items move between DOM hosts. */
export function createGenerationPreviewController({
  root,
  onRetry = () => {},
  onRevealModel = () => {},
  onChange = () => {},
  nowImpl = Date.now,
  setIntervalImpl = globalThis.setInterval,
  clearIntervalImpl = globalThis.clearInterval,
  windowImpl = root?.ownerDocument?.defaultView || globalThis.window,
  matchMediaImpl = windowImpl?.matchMedia?.bind(windowImpl),
} = {}) {
  if (!root?.ownerDocument) throw new TypeError('A generation preview root is required.');
  const document = root.ownerDocument;
  const find = id => {
    const element = root.querySelector(`#${id}`);
    if (!element) throw new TypeError(`Missing generation preview element: ${id}`);
    return element;
  };
  const stage = find('generation-preview');
  const idle = find('preview-idle');
  const fallback = find('preview-placeholder');
  const pending = find('preview-pending');
  const status = find('preview-status');
  const elapsed = find('preview-elapsed');
  const placeholders = find('preview-placeholders');
  const resume = find('preview-resume');
  const result = find('result-card');
  const resultGallery = find('result-gallery');
  const resultHeading = find('result-heading-label');
  const resultModel = find('result-model-label');
  const resultNote = find('result-note');
  const error = find('preview-error');
  const errorMessage = find('preview-error-message');
  const retry = find('preview-retry');
  const history = find('generation-history');
  const historyList = find('generation-history-list');
  const reveal = find('view-generation-result');
  const idleGroups = [...idle.querySelectorAll('[data-preview-model]')];
  const states = new Map();
  const notifications = new Map();
  let selectedModel = null;
  let interval = null;
  let renderedPendingHandle = null;
  let destroyed = false;
  let sequence = 0;

  function modelState(modelId) {
    if (!states.has(modelId)) states.set(modelId, { modelId, phase: 'idle', job: null, batches: [] });
    return states.get(modelId);
  }

  function snapshot(modelId = selectedModel) {
    const state = states.get(modelId);
    return {
      modelId,
      phase: state?.phase || 'idle',
      job: state?.job ? { ...state.job } : null,
      completedCount: state?.batches.length || 0,
    };
  }

  function currentJob(handle) {
    if (destroyed || !handle) return null;
    const state = states.get(handle.modelId);
    return state?.phase === 'pending' && state.job?.handle === handle ? state : null;
  }

  function visibleInViewport() {
    if (document.visibilityState === 'hidden') return false;
    const rect = stage.getBoundingClientRect();
    const height = windowImpl?.innerHeight || 800;
    const width = windowImpl?.innerWidth || 1280;
    return rect.bottom > 0 && rect.top < height && rect.right > 0 && rect.left < width;
  }

  function scrollToStage({ focus = false } = {}) {
    const reducedMotion = matchMediaImpl?.('(prefers-reduced-motion: reduce)').matches;
    stage.scrollIntoView?.({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
    if (focus) stage.focus?.({ preventScroll: true });
  }

  function updateElapsed() {
    if (destroyed) return;
    const state = states.get(selectedModel);
    if (state?.phase === 'pending') {
      elapsed.textContent = t('Waiting {time}', { time: elapsedTime(state.job.startedAt, nowImpl()) }, currentLocale());
    }
  }

  function syncTimer() {
    const needsTimer = [...states.values()].some(state => state.phase === 'pending');
    if (needsTimer && interval === null) interval = setIntervalImpl(updateElapsed, 1000);
    if (!needsTimer && interval !== null) {
      clearIntervalImpl(interval);
      interval = null;
    }
  }

  function newestNotification() {
    return [...notifications.values()].at(-1);
  }

  function renderNotification() {
    const notification = newestNotification();
    reveal.hidden = !notification;
    if (notification) reveal.textContent = t('{model} is ready · View result', { model: notification.modelName }, currentLocale());
  }

  function historyBatch(batch) {
    if (!batch.wrapper) {
      batch.wrapper = document.createElement('section');
      batch.wrapper.className = 'preview-history-batch';
      batch.wrapper.setAttribute('data-kind', batch.kind);
      const heading = document.createElement('h3');
      heading.className = 'preview-history-heading';
      heading.textContent = batch.modelName;
      batch.gallery = document.createElement('div');
      batch.gallery.className = 'preview-history-gallery result-gallery';
      const note = document.createElement('p');
      note.className = 'preview-history-note';
      note.textContent = batch.note;
      note.hidden = !batch.note;
      batch.wrapper.append(heading, batch.gallery, note);
    }
    retainChildren(batch.gallery, batch.items);
    return batch.wrapper;
  }

  function render(notify = true) {
    if (destroyed) return;
    const state = modelState(selectedModel);
    const job = state.job;
    stage.setAttribute('data-state', state.phase);
    stage.setAttribute('data-model', selectedModel || '');
    stage.setAttribute('data-kind', job?.kind || '');
    stage.setAttribute('aria-busy', String(state.phase === 'pending'));
    idle.hidden = state.phase !== 'idle';
    pending.hidden = state.phase !== 'pending';
    result.hidden = state.phase !== 'succeeded';
    error.hidden = state.phase !== 'failed';

    let matchingIdleGroup = false;
    for (const group of idleGroups) {
      const matches = group.getAttribute('data-preview-model') === selectedModel;
      group.hidden = !matches;
      matchingIdleGroup ||= matches;
    }
    fallback.hidden = matchingIdleGroup;

    if (state.phase === 'pending') {
      pending.setAttribute('data-kind', job.kind);
      pending.setAttribute('data-stage', job.stage);
      status.textContent = job.message;
      resume.hidden = !job.paused;
      if (renderedPendingHandle !== job.handle) {
        placeholders.style.setProperty('--preview-ratio', job.ratio);
        placeholders.setAttribute('data-count', String(job.count));
        placeholders.replaceChildren(...Array.from({ length: job.count }, () => {
          const slot = document.createElement('div');
          slot.className = 'preview-loading-slot';
          slot.style.setProperty('--preview-ratio', job.ratio);
          slot.setAttribute('aria-hidden', 'true');
          const spinner = document.createElement('span');
          spinner.className = 'preview-spinner';
          slot.append(spinner);
          return slot;
        }));
        renderedPendingHandle = job.handle;
      }
      updateElapsed();
    } else {
      renderedPendingHandle = null;
      resume.hidden = true;
    }

    if (state.phase === 'failed') {
      errorMessage.textContent = job.message;
      retry.hidden = !job.canRetry;
    } else retry.hidden = true;

    const latest = state.phase === 'succeeded' ? state.batches[0] : null;
    // Hold each batch's original nodes even while another model owns these hosts.
    retainChildren(resultGallery, latest?.items || []);
    if (latest) {
      resultHeading.textContent = t(latest.kind === 'video' ? 'GENERATED VIDEO' : 'GENERATED IMAGES', {}, currentLocale());
      resultModel.textContent = latest.modelName;
      resultNote.textContent = latest.note;
      resultNote.hidden = !latest.note;
    }
    const older = latest ? state.batches.slice(1) : state.batches;
    retainChildren(historyList, older.map(historyBatch));
    history.hidden = older.length === 0;
    renderNotification();
    if (notify) onChange(snapshot());
  }

  function changed(state) {
    syncTimer();
    if (state.modelId === selectedModel) render();
    else renderNotification();
  }

  function selectModel(modelId) {
    if (destroyed) return null;
    if (selectedModel === modelId) return snapshot();
    selectedModel = modelId;
    modelState(modelId);
    if (visibleInViewport()) notifications.delete(modelId);
    render();
    return snapshot();
  }

  function begin({ modelId, kind = 'image', modelName = modelId, count = 1, aspectRatio = '1:1', isPose = false, startedAt } = {}) {
    if (destroyed) return null;
    const state = modelState(modelId);
    const handle = Object.freeze({ modelId, token: ++sequence });
    const requestedCount = Number.isFinite(Number(count)) ? Math.floor(Number(count)) : 1;
    state.phase = 'pending';
    state.job = {
      handle, modelId, modelName, kind, isPose,
      count: kind === 'video' ? 1 : Math.min(3, Math.max(1, requestedCount)),
      aspectRatio,
      ratio: previewRatio(aspectRatio),
      startedAt: Number.isFinite(startedAt) ? startedAt : nowImpl(),
      stage: 'submitting',
      message: t('Generating…', {}, currentLocale()),
      paused: false,
      canRetry: false,
    };
    notifications.delete(modelId);
    changed(state);
    if (modelId === selectedModel) {
      const mobile = matchMediaImpl ? matchMediaImpl('(max-width: 980px)').matches : windowImpl?.innerWidth <= 980;
      if (mobile || !visibleInViewport()) scrollToStage();
    }
    return handle;
  }

  function update(handle, { stage: nextStage, message } = {}) {
    const state = currentJob(handle);
    if (!state) return;
    const job = state.job;
    const stageChanged = nextStage !== undefined && nextStage !== job.stage;
    const messageChanged = message !== undefined && String(message) !== job.message;
    if (!stageChanged && !messageChanged && !job.paused) return;
    if (nextStage !== undefined) job.stage = String(nextStage);
    if (message !== undefined) job.message = String(message);
    job.paused = false;
    changed(state);
  }

  function succeed(handle, { items = [], note = '' } = {}) {
    const state = currentJob(handle);
    if (!state) return;
    state.phase = 'succeeded';
    state.job.paused = false;
    state.batches.unshift({ items: [...items], note: String(note), kind: state.job.kind, modelName: state.job.modelName });
    if (state.modelId !== selectedModel || !visibleInViewport()) {
      notifications.delete(state.modelId);
      notifications.set(state.modelId, { modelId: state.modelId, modelName: state.job.modelName });
    }
    changed(state);
  }

  function fail(handle, { message = '', canRetry = true } = {}) {
    const state = currentJob(handle);
    if (!state) return;
    state.phase = 'failed';
    state.job.message = String(message);
    state.job.canRetry = canRetry;
    state.job.paused = false;
    changed(state);
  }

  function pause(handle, { message } = {}) {
    const state = currentJob(handle);
    if (!state) return;
    if (message !== undefined) state.job.message = String(message);
    state.job.paused = true;
    changed(state);
  }

  function resetDraft(modelId) {
    if (destroyed) return;
    const state = modelState(modelId);
    state.phase = 'idle';
    state.job = null;
    notifications.delete(modelId);
    changed(state);
  }

  const retryClick = () => {
    const state = states.get(selectedModel);
    if (!destroyed && state?.phase === 'failed' && state.job.canRetry) onRetry(state.job.handle, { resume: false });
  };
  const resumeClick = () => {
    const state = states.get(selectedModel);
    if (!destroyed && state?.phase === 'pending' && state.job.paused) onRetry(state.job.handle, { resume: true });
  };
  const revealClick = () => {
    const notification = newestNotification();
    if (destroyed || !notification) return;
    onRevealModel(notification.modelId);
    selectModel(notification.modelId);
    notifications.delete(notification.modelId);
    renderNotification();
    scrollToStage({ focus: true });
  };
  retry.addEventListener('click', retryClick);
  resume.addEventListener('click', resumeClick);
  reveal.addEventListener('click', revealClick);
  render(false);

  return {
    selectModel, begin, update, succeed, fail, pause, resetDraft, getState: snapshot,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      if (interval !== null) clearIntervalImpl(interval);
      interval = null;
      retry.removeEventListener('click', retryClick);
      resume.removeEventListener('click', resumeClick);
      reveal.removeEventListener('click', revealClick);
      notifications.clear();
      reveal.hidden = true;
    },
  };
}
