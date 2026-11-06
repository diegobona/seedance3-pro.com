const DISMISS_KEY = 'seedance:site-promo:dismissed:v1';

export function initializeSitePromo(root) {
  const win = root.ownerDocument.defaultView;
  const doc = root.ownerDocument;
  const slides = [...root.querySelectorAll('[data-promo-slide]')];
  const dots = [...root.querySelectorAll('[data-promo-dot]')];
  const reduced = win.matchMedia('(prefers-reduced-motion: reduce)');
  let active = 0;
  let hovering = false;
  let focused = false;
  let timer;
  let dismissed = false;
  try { dismissed = win.sessionStorage.getItem(DISMISS_KEY) === '1'; } catch { /* Storage is optional. */ }
  root.hidden = dismissed;
  const updateHeight = () => doc.documentElement.style.setProperty('--site-promo-height', `${root.hidden ? 0 : root.getBoundingClientRect().height}px`);
  updateHeight();
  const resize = new win.ResizeObserver(updateHeight);
  resize.observe(root);

  function show(index) {
    active = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => { slide.hidden = i !== active; });
    dots.forEach((dot, i) => dot.setAttribute('aria-pressed', String(i === active)));
  }
  function restart() {
    win.clearInterval(timer);
    if (!dismissed && !reduced.matches && !hovering && !focused && !doc.hidden) {
      timer = win.setInterval(() => {
        if (!reduced.matches && !hovering && !focused && !doc.hidden) show(active + 1);
      }, 6000);
    }
  }
  const enter = () => { hovering = true; restart(); };
  const leave = () => { hovering = false; restart(); };
  const focusIn = () => { focused = true; restart(); };
  const focusOut = (event) => { focused = root.contains(event.relatedTarget); restart(); };
  const click = (event) => {
    const dot = event.target.closest('[data-promo-dot]');
    if (dot && root.contains(dot)) { show(Number(dot.dataset.promoDot)); restart(); }
    if (event.target.closest('[data-promo-close]')) {
      dismissed = true;
      root.hidden = true;
      try { win.sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* Keep dismissal local when storage is blocked. */ }
      restart();
      updateHeight();
      doc.querySelector('[data-site-header] .brand, .studio-brand, main a, main button')?.focus();
    }
  };
  const keydown = (event) => {
    if (!event.target.closest('[data-promo-dot]')) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      show(active + (event.key === 'ArrowRight' ? 1 : -1));
      dots[active].focus();
      restart();
    }
  };
  root.addEventListener('pointerenter', enter);
  root.addEventListener('pointerleave', leave);
  root.addEventListener('focusin', focusIn);
  root.addEventListener('focusout', focusOut);
  root.addEventListener('click', click);
  root.addEventListener('keydown', keydown);
  doc.addEventListener('visibilitychange', restart);
  reduced.addEventListener('change', restart);
  restart();

  return () => {
    win.clearInterval(timer);
    resize.disconnect();
    root.removeEventListener('pointerenter', enter);
    root.removeEventListener('pointerleave', leave);
    root.removeEventListener('focusin', focusIn);
    root.removeEventListener('focusout', focusOut);
    root.removeEventListener('click', click);
    root.removeEventListener('keydown', keydown);
    doc.removeEventListener('visibilitychange', restart);
    reduced.removeEventListener('change', restart);
  };
}
