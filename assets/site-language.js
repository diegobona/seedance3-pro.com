(function () {
  'use strict';
  function currentLocale() { return /^\/zh(?:\/|$)/.test(location.pathname) ? 'zh' : 'en'; }
  function pathForLocale(locale, value) {
    var url = new URL(value || location.href, location.origin);
    var englishPath = url.pathname.replace(/^\/zh(?=\/|$)/, '') || '/';
    url.pathname = locale === 'zh' ? '/zh' + (englishPath === '/' ? '/' : englishPath) : englishPath;
    // Match SSR links and persist either manual choice when scripts are disabled.
    url.searchParams.set('lang', locale);
    return url.pathname + url.search + url.hash;
  }
  function rememberLocale(locale) {
    var domain = /(^|\.)seedance3-pro\.com$/.test(location.hostname) ? '; Domain=seedance3-pro.com' : '';
    document.cookie = 'seedance_locale=' + locale + '; Max-Age=31536000; Path=/; SameSite=Lax' + domain + (location.protocol === 'https:' ? '; Secure' : '');
  }
  function updateSwitches() {
    document.querySelectorAll('[data-site-language-switch]').forEach(function (control) {
      control.querySelectorAll('[data-language]').forEach(function (link) {
        var locale = link.dataset.language;
        if (locale !== 'zh' && locale !== 'en') return;
        var target = pathForLocale(locale);
        if (link.getAttribute('href') !== target) link.setAttribute('href', target);
        if (locale === currentLocale()) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      });
    });
  }
  document.addEventListener('click', function (event) {
    var link = event.target.closest?.('[data-site-language-switch] [data-language]');
    if (!link) return;
    var locale = link.dataset.language;
    if (locale !== 'zh' && locale !== 'en') return;
    rememberLocale(locale);
    link.href = pathForLocale(locale);
    // Native link navigation preserves keyboard activation, new tabs and history.
  });
  window.SeedanceLanguage = { currentLocale: currentLocale, pathForLocale: pathForLocale, rememberLocale: rememberLocale, updateSwitches: updateSwitches };
  function start() {
    updateSwitches();
    var queued = false;
    new MutationObserver(function (changes) {
      if (queued || !changes.some(function (change) { return change.addedNodes.length; })) return;
      queued = true;
      queueMicrotask(function () { queued = false; updateSwitches(); });
    }).observe(document.body, { childList: true, subtree: true });
    window.addEventListener('popstate', updateSwitches);
    window.addEventListener('hashchange', updateSwitches);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
