// Ask for browser permission during the Generate click; never block generation.
export function createVideoCompletionNotification({
  host, before = null, zh = false, documentImpl = host.ownerDocument,
  windowImpl = documentImpl.defaultView, NotificationImpl = windowImpl?.Notification,
}) {
  const row = documentImpl.createElement('div');
  row.className = 'video-completion-reminder'; row.hidden = true;
  const hint = documentImpl.createElement('span');
  row.append(hint);
  if (before) host.insertBefore(row, before); else host.append(row);
  let active = false, disposed = false, attempted = false, failed = false, notified = false, notification;
  const supported = () => typeof NotificationImpl === 'function' && windowImpl?.isSecureContext !== false;
  const permission = () => supported() ? NotificationImpl.permission : 'unsupported';
  function render() {
    if (disposed) return;
    row.hidden = !active;
    const state = permission();
    const message = state === 'granted'
      ? zh ? '桌面提醒已开启，可切换标签页，请保持此页面打开。' : 'Desktop reminders enabled. You can switch tabs; keep this page open.'
      : state === 'denied'
        ? zh ? '通知已被禁用。请在地址栏的网站设置中允许通知；视频也会保存到“我的作品”。' : 'Notifications are blocked. Allow them in your browser’s site settings, or check My creations.'
        : state === 'unsupported'
          ? zh ? '此浏览器暂不支持桌面提醒，完成后请在“我的作品”查看。' : 'Desktop reminders are unavailable in this browser. Check My creations for your video.'
          : failed
            ? zh ? '未能开启通知，请检查浏览器的网站权限。' : 'Could not enable notifications. Check your browser’s site permissions.'
            : zh ? '允许浏览器通知后，切换标签页也能收到提醒。' : 'Allow browser notifications to get a reminder while using another tab.';
    if (hint.textContent !== message) hint.textContent = message;
  }
  async function enable() {
    if (disposed || attempted || permission() !== 'default') return;
    attempted = true; failed = false; render();
    try { await NotificationImpl.requestPermission(); }
    catch { failed = true; }
    finally { render(); }
  }
  function close() { try { notification?.close(); } catch { /* Already dismissed. */ } notification = null; }
  windowImpl?.addEventListener?.('focus', render);
  return {
    requestPermission: enable,
    setActive(value) { active = value; render(); },
    reset() { close(); notified = false; failed = false; },
    complete(taskId, onReadyClick = () => {}) {
      if (disposed || notified) return;
      notified = true;
      if (permission() !== 'granted' || (documentImpl.visibilityState !== 'hidden' && documentImpl.hasFocus?.() !== false)) return;
      try {
        notification = new NotificationImpl(zh ? '视频已生成 · SEEDANCE 3.0' : 'Your video is ready · SEEDANCE 3.0', {
          body: zh ? '点击返回查看和下载视频。' : 'Click to view and download your video.',
          tag: 'seedance-video-ready-' + (taskId || 'current'),
        });
        notification.onclick = () => {
          try { windowImpl?.focus?.(); } catch { /* Default notification click also focuses the tab. */ }
          close();
          if (!disposed) onReadyClick();
        };
      } catch { /* Retain the page-title and saved-result fallback on unsupported platforms. */ }
    },
    destroy() { disposed = true; close(); windowImpl?.removeEventListener?.('focus', render); row.remove(); },
  };
}
