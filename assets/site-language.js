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
  function updateDropdown(control) {
    // Keep footer links, and leave React's existing details tree in place.
    if (typeof control.querySelector !== 'function' || control.hasAttribute('data-language-footer') || control.closest('.site-footer')) return;
    var dropdown = control.querySelector('details.site-language-dropdown');
    if (!dropdown) {
      var links = control.querySelectorAll('a[data-language]');
      if (links.length !== 2) return;
      dropdown = document.createElement('details');
      dropdown.className = 'site-language-dropdown';
      var summary = document.createElement('summary');
      var label = document.createElement('span');
      label.setAttribute('data-language-label', '');
      summary.appendChild(label);
      var options = document.createElement('div');
      options.className = 'site-language-options';
      links.forEach(function (link) {
        link.textContent = link.dataset.language === 'zh' ? '中文' : 'English';
        options.appendChild(link);
      });
      dropdown.appendChild(summary);
      dropdown.appendChild(options);
      control.replaceChildren(dropdown);
      control.setAttribute('data-language-dropdown', '');
    }
    var locale = currentLocale();
    var label = dropdown.querySelector('[data-language-label]');
    var text = locale === 'zh' ? '中文' : 'EN';
    if (label && label.textContent !== text) label.textContent = text;
    dropdown.querySelector('summary').setAttribute('aria-label', locale === 'zh' ? '切换语言，中文' : 'Change language, English');
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
      updateDropdown(control);
    });
  }
  function closeDropdowns(target) {
    document.querySelectorAll('[data-site-language-switch] details.site-language-dropdown[open]').forEach(function (dropdown) {
      if (!target || !dropdown.contains(target)) dropdown.open = false;
    });
  }
  document.addEventListener('click', function (event) {
    var link = event.target.closest?.('[data-site-language-switch] [data-language]');
    if (link) {
      var locale = link.dataset.language;
      if (locale !== 'zh' && locale !== 'en') return;
      rememberLocale(locale);
      link.href = pathForLocale(locale);
      var dropdown = link.closest?.('details.site-language-dropdown');
      if (dropdown) dropdown.open = false;
      // Native link navigation preserves keyboard activation, new tabs and history.
      return;
    }
    closeDropdowns(event.target);
  });
  document.addEventListener('focusin', function (event) { closeDropdowns(event.target); });
  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    var dropdown = event.target.closest?.('[data-site-language-switch] details.site-language-dropdown');
    if (!dropdown || !dropdown.open) return;
    event.preventDefault();
    dropdown.open = false;
    dropdown.querySelector('summary').focus();
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
