import { createVideoCompletionNotification } from './video-completion-notification.mjs';
export const VIDEO_WAIT_NOTICE_DELAY = 60_000;
export const VIDEO_WAIT_START_KEY = 'seedance:video:wait-start';

// Shared by the homepage and studio so continuing a task keeps its original wait time.
export function createVideoWaitNotice({
  host, before = null, isAuthenticated, zh = false, onElapsed = () => {},
  documentImpl = host.ownerDocument, storage,
  now = Date.now, setIntervalImpl = setInterval, clearIntervalImpl = clearInterval,
}) {
  try { storage ??= globalThis.sessionStorage; } catch { /* Storage can be blocked by browser policy. */ }
  const notice = documentImpl.createElement('aside');
  notice.className = 'video-wait-notice';
  notice.hidden = true;
  notice.setAttribute('role', 'status');
  notice.setAttribute('aria-live', 'polite');
  const heading = documentImpl.createElement('strong');
  heading.textContent = zh ? '高峰期稍慢' : 'Taking a little longer during peak hours';
  const timing = documentImpl.createElement('p');
  timing.textContent = zh
    ? '5秒视频约需1分钟多、10秒视频3分多、15秒视频5分多。'
    : 'A 5-second video takes about 1+ minute, 10 seconds about 3+ minutes, and 15 seconds about 5+ minutes.';
  const reassurance = documentImpl.createElement('p');
  reassurance.textContent = zh ? '可以切换到其他标签页，允许浏览器通知后，完成时会自动提醒您。' : 'You can use another tab. Once browser notifications are allowed, we’ll automatically notify you when your video is ready.';
  const hint = documentImpl.createElement('small');
  hint.textContent = zh ? '请保持此页面打开，视频也会保存到“我的作品”。' : 'Keep this page open. Your video will also be saved to My creations.';
  notice.append(heading, timing, reassurance, hint);
  if (before) host.insertBefore(notice, before); else host.append(notice);
  const completionReminder = createVideoCompletionNotification({ host, before, zh, documentImpl });
  if (documentImpl.head && !documentImpl.querySelector('[data-video-wait-styles]')) {
    const link = documentImpl.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/assets/video-wait-notice.css?v=20261101-notifications';
    link.setAttribute('data-video-wait-styles', '');
    documentImpl.head.append(link);
  }
  let timer = null, startedAt = 0, taskId = '', visible = true, originalTitle = '', reminderTitle = '';
  const render = () => {
    const active = timer !== null && visible && isAuthenticated();
    completionReminder.setActive(active);
    notice.hidden = !active || now() - startedAt < VIDEO_WAIT_NOTICE_DELAY;
    onElapsed(active ? Math.max(0, now() - startedAt) : null);
  };
  const restoreTitle = () => {
    if (reminderTitle && documentImpl.title === reminderTitle) documentImpl.title = originalTitle;
    reminderTitle = '';
  };
  const onVisibility = () => { if (documentImpl.visibilityState !== 'hidden') restoreTitle(); };
  documentImpl.addEventListener?.('visibilitychange', onVisibility);
  function stop({ clearSaved = false, completed = false, onReadyClick } = {}) {
    if (timer !== null) clearIntervalImpl(timer);
    timer = null;
    notice.hidden = true;
    completionReminder.setActive(false);
    if (completed && isAuthenticated()) completionReminder.complete(taskId, onReadyClick);
    onElapsed(null);
    if (clearSaved) {
      try {
        const saved = JSON.parse(storage?.getItem(VIDEO_WAIT_START_KEY) || 'null');
        if (taskId && saved?.taskId === taskId) storage?.removeItem(VIDEO_WAIT_START_KEY);
      } catch { /* The current page works without storage. */ }
    }
    if (completed && isAuthenticated() && documentImpl.visibilityState === 'hidden') {
      originalTitle = documentImpl.title;
      reminderTitle = (zh ? '✓ 视频已生成 — ' : '✓ Video ready — ') + originalTitle;
      documentImpl.title = reminderTitle;
    }
  }
  return {
    // Call synchronously from the user's Generate/Resume gesture, never on page load.
    prepareNotifications() { if (isAuthenticated()) void completionReminder.requestPermission(); },
    start(resumeTaskId = '') {
      stop(); restoreTitle(); completionReminder.reset(); taskId = resumeTaskId; startedAt = now();
      try {
        const saved = JSON.parse(storage?.getItem(VIDEO_WAIT_START_KEY) || 'null');
        if (resumeTaskId && saved?.taskId === resumeTaskId && Number.isFinite(saved.startedAt)
          && saved.startedAt <= startedAt && startedAt - saved.startedAt < 86_400_000) startedAt = saved.startedAt;
      } catch { /* Ignore invalid or unavailable storage. */ }
      timer = setIntervalImpl(render, 1000);
      render();
    },
    bindTask(id) {
      taskId = id;
      try { storage?.setItem(VIDEO_WAIT_START_KEY, JSON.stringify({ taskId, startedAt })); } catch { /* Optional recovery metadata. */ }
    },
    setVisible(value) { visible = value; render(); },
    stop,
    destroy() { stop(); restoreTitle(); completionReminder.destroy(); documentImpl.removeEventListener?.('visibilitychange', onVisibility); notice.remove(); },
  };
}
