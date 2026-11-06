const examples = [...document.querySelectorAll('[data-release-example]')];

if (examples.length) {
  const chinese = document.documentElement.lang.startsWith('zh');
  const dialog = document.createElement('dialog');
  dialog.className = 'release-video-dialog';
  dialog.setAttribute('aria-labelledby', 'release-video-dialog-title');
  dialog.innerHTML = `
    <div class="release-video-dialog-header">
      <p class="release-video-dialog-title" id="release-video-dialog-title"></p>
      <button class="release-video-close" type="button" aria-label="${chinese ? '关闭视频' : 'Close video'}" autofocus>×</button>
    </div>
    <video class="release-video-player" controls playsinline preload="metadata"></video>`;
  document.body.append(dialog);
  const player = dialog.querySelector('video');
  const title = dialog.querySelector('.release-video-dialog-title');
  let activeVideo;
  let activeButton;
  let previousOverflow;
  let resumeInline = false;

  function open(video, button, label) {
    activeVideo = video;
    activeButton = button;
    resumeInline = !video.paused;
    const position = video.currentTime;
    video.pause();
    player.src = video.currentSrc || video.src;
    player.poster = video.poster;
    player.muted = video.muted;
    player.loop = video.loop;
    player.volume = video.volume;
    player.currentTime = position;
    title.textContent = label;
    player.setAttribute('aria-label', label);
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    player.play().catch(() => { /* Native playback controls remain available. */ });
  }

  examples.forEach((example) => {
    const video = example.querySelector('video');
    if (!video) return;
    const media = document.createElement('div');
    media.className = 'release-example-media';
    video.before(media);
    media.append(video);
    const button = document.createElement('button');
    const label = video.getAttribute('aria-label') || example.querySelector('figcaption strong').textContent;
    button.type = 'button';
    button.className = 'release-video-expand';
    button.setAttribute('aria-label', chinese ? `放大播放：${label}` : `Enlarge video: ${label}`);
    button.title = chinese ? '放大播放' : 'Enlarge video';
    button.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/></svg>';
    media.append(button);
    button.addEventListener('click', () => open(video, button, label));
    video.addEventListener('dblclick', () => { if (!dialog.open) open(video, button, label); });
  });

  dialog.querySelector('.release-video-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    player.pause();
    if (activeVideo) {
      activeVideo.currentTime = player.currentTime;
      activeVideo.muted = player.muted;
      activeVideo.volume = player.volume;
      if (resumeInline) activeVideo.play().catch(() => {});
    }
    player.removeAttribute('src');
    player.load();
    document.body.style.overflow = previousOverflow;
    activeButton?.focus({ preventScroll: true });
    activeVideo = null;
    activeButton = null;
  });
}
