document.querySelectorAll('[data-site-header]').forEach((header) => {
  const button = header.querySelector('.menu-button');
  const menu = header.querySelector('.mobile-nav');
  if (!button || !menu) return;
  const zh = document.documentElement.lang.startsWith('zh');
  function setOpen(open) {
    menu.classList.toggle('is-open', open);
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', zh ? (open ? '关闭导航' : '打开导航') : (open ? 'Close navigation' : 'Open navigation'));
  }
  button.addEventListener('click', () => setOpen(button.getAttribute('aria-expanded') !== 'true'));
  menu.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setOpen(false)));
  header.addEventListener('keydown', (event) => { if (event.key === 'Escape') { setOpen(false); button.focus(); } });
});
