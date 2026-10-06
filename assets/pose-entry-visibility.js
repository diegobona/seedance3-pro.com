// Runs in the head before navigation or promotional content is painted.
(function () {
  var key = 'seedance_pose_entries_hidden_v2';
  var marker = '';
  var referrerHost = '';
  var siteHost = window.location.hostname.toLowerCase();
  var internal = false;

  try {
    // Partner links can use noreferrer, so allow an explicit referral marker.
    marker = new URLSearchParams(window.location.search).get('ref') || '';
  } catch (_) {}

  try {
    referrerHost = new URL(document.referrer).hostname.toLowerCase();
    internal = referrerHost === siteHost ||
      ((siteHost === 'seedance3-pro.com' || siteHost === 'www.seedance3-pro.com') &&
       (referrerHost === 'seedance3-pro.com' || referrerHost === 'www.seedance3-pro.com'));
  } catch (_) {
    // An absent or invalid referrer cannot identify the visitor's source.
  }

  function savedFlag(name) {
    var saved = false;
    try {
      saved = document.cookie.split(';').some(function (cookie) {
        return cookie.trim() === name + '=1';
      });
    } catch (_) {}
    try { saved = saved || window.sessionStorage.getItem(name) === '1'; } catch (_) {}
    return saved;
  }
  function flagCookie(name, value, expires) {
    var cookie = name + '=' + value + '; Path=/; SameSite=Lax' + (expires ? '; Max-Age=0' : '');
    if (siteHost === 'seedance3-pro.com' || siteHost.endsWith('.seedance3-pro.com')) {
      cookie += '; Domain=seedance3-pro.com';
    }
    if (window.location.protocol === 'https:') cookie += '; Secure';
    try { document.cookie = cookie; } catch (_) {}
    // Remove host-only flags left by older versions as well as the shared cookie.
    if (expires) {
      try { document.cookie = cookie.replace('; Domain=seedance3-pro.com', ''); } catch (_) {}
    }
  }
  function clearFlag(name) {
    if (!savedFlag(name)) return;
    flagCookie(name, '', true);
    try { window.sessionStorage.removeItem(name); } catch (_) {}
  }

  // Old flags did not distinguish an AnyPoses journey from a fresh direct visit.
  clearFlag('seedance_pose_entries_hidden');
  var navigationType = '';
  try { navigationType = window.performance.getEntriesByType('navigation')[0].type; } catch (_) {}
  var restoringPage = !referrerHost && (navigationType === 'reload' || navigationType === 'back_forward');
  var anyposesReferrer = referrerHost === 'anyposes.com' || referrerHost.endsWith('.anyposes.com');
  var hide = marker === 'anyposes' || (marker !== 'pixal3d' &&
    (anyposesReferrer || ((internal || restoringPage) && savedFlag(key))));

  if (hide) {
    document.documentElement.classList.add('pose-entries-hidden');
    flagCookie(key, '1', false);
    try { window.sessionStorage.setItem(key, '1'); } catch (_) {}
  } else {
    document.documentElement.classList.remove('pose-entries-hidden');
    clearFlag(key);
  }
})();

// Share one anonymous visitor and visit across Pages, the workspace and site tabs.
(function () {
  try {
    if (!window.fetch || !window.crypto || !window.crypto.randomUUID) return;
    var marker = new URLSearchParams(window.location.search).get('ref');
    var incomingSource = marker === 'anyposes' || marker === 'pixal3d' ? marker : '';
    try {
      var host = new URL(document.referrer).hostname.toLowerCase();
      if (!incomingSource && (host === 'anyposes.com' || host.endsWith('.anyposes.com'))) incomingSource = 'anyposes';
      if (!incomingSource && (host === 'pixal3d.net' || host.endsWith('.pixal3d.net'))) incomingSource = 'pixal3d';
    } catch (_) {}
    var entryPath = window.location.pathname.replace(/^\/zh(?=\/|$)/, '').replace(/\/$/, '') || '/';
    if (entryPath !== '/app/image/gpt-image-2') incomingSource = '';

    function readCookie(name) {
      var prefix = name + '=';
      var found = document.cookie.split(';').map(function (part) { return part.trim(); })
        .find(function (part) { return part.indexOf(prefix) === 0; });
      return found ? decodeURIComponent(found.slice(prefix.length)) : '';
    }
    function writeCookie(name, value, maxAge) {
      var cookie = name + '=' + encodeURIComponent(value) + '; Path=/; SameSite=Lax; Max-Age=' + maxAge;
      var siteHost = window.location.hostname;
      if (siteHost === 'seedance3-pro.com' || siteHost.endsWith('.seedance3-pro.com')) {
        cookie += '; Domain=seedance3-pro.com';
      }
      if (window.location.protocol === 'https:') cookie += '; Secure';
      document.cookie = cookie;
    }
    function trackSource(source) {
    var incoming = incomingSource === source;
    var visitKey = 'seedance_' + source + '_visit';
    var visitorKey = 'seedance_referral_visitor';
    var recordedKey = 'seedance_' + source + '_recorded';
    var visit = null;
    try { visit = JSON.parse(readCookie(visitKey)); } catch (_) {}
    if (!incoming && !visit) return;

    var uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    var visitorId = readCookie(visitorKey);
    if (!uuid.test(visitorId)) {
      visitorId = window.crypto.randomUUID();
      writeCookie(visitorKey, visitorId, 31536000);
    }
    // Cookie-blocking browsers are excluded so navigation cannot inflate visitors.
    if (readCookie(visitorKey) !== visitorId) return;
    if (!visit || !uuid.test(visit.id) || visit.path !== '/app/image/gpt-image-2') {
      if (!incoming) return;
      visit = { id: window.crypto.randomUUID(), path: entryPath };
    }
    writeCookie(visitKey, JSON.stringify(visit), 1800);
    if (!readCookie(visitKey)) return;
    if (readCookie(recordedKey) === visit.id) {
      writeCookie(recordedKey, visit.id, 1800);
      return;
    }
    window.fetch('/api/referrals/' + source, {
      method: 'POST', credentials: 'same-origin', keepalive: true,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ visitorId: visitorId, visitId: visit.id, entryPath: visit.path })
    }).then(function (response) {
      if (response.ok) writeCookie(recordedKey, visit.id, 1800);
    }).catch(function () {
      // Retry the same visit on the next page; analytics never block the workspace.
    });
    }
    trackSource('anyposes');
    trackSource('pixal3d');
  } catch (_) {}
})();
