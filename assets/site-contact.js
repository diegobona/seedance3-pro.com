(function () {
  if (window.__siteContactInstalled) return;
  window.__siteContactInstalled = true;
  document.addEventListener('click', async function (event) {
    var button = event.target.closest && event.target.closest('[data-copy-contact]');
    if (!button) return;
    var status = button.closest('.footer-contact-popover').querySelector('[role="status"]');
    button.disabled = true;
    try {
      await navigator.clipboard.writeText(button.dataset.copyContact);
      status.textContent = button.dataset.copied;
    } catch (_) {
      status.textContent = button.dataset.copyFailed;
    } finally {
      button.disabled = false;
    }
  });
})();
