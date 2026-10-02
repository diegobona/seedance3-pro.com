// Runs in the head before navigation or promotional content is painted.
(function () {
  var key = 'seedance_pose_entries_hidden';
  var hide = false;

  try {
    // Partner links can use noreferrer, so allow an explicit referral marker.
    hide = new URLSearchParams(window.location.search).get('ref') === 'anyposes';
  } catch (_) {}

  try {
    var hostname = new URL(document.referrer).hostname.toLowerCase();
    hide = hide || hostname === 'anyposes.com' || hostname.endsWith('.anyposes.com');
  } catch (_) {
    // An absent or invalid referrer cannot identify the visitor's source.
  }

  try {
    hide = hide || document.cookie.split(';').some(function (cookie) {
      return cookie.trim() === key + '=1';
    });
  } catch (_) {}

  try {
    hide = hide || window.sessionStorage.getItem(key) === '1';
  } catch (_) {}

  if (!hide) return;
  document.documentElement.classList.add('pose-entries-hidden');

  try {
    // A session cookie also carries the choice into newly opened site tabs.
    var cookie = key + '=1; Path=/; SameSite=Lax';
    var siteHost = window.location.hostname;
    if (siteHost === 'seedance3-pro.com' || siteHost.endsWith('.seedance3-pro.com')) {
      cookie += '; Domain=seedance3-pro.com';
    }
    if (window.location.protocol === 'https:') cookie += '; Secure';
    document.cookie = cookie;
  } catch (_) {}

  try {
    window.sessionStorage.setItem(key, '1');
  } catch (_) {}
})();

// Share one anonymous visitor and visit across Pages, the workspace and site tabs.
(function () {
  try {
    if (!window.fetch || !window.crypto || !window.crypto.randomUUID) return;
    var incoming = new URLSearchParams(window.location.search).get('ref') === 'anyposes';
    try {
      var host = new URL(document.referrer).hostname.toLowerCase();
      incoming = incoming || host === 'anyposes.com' || host.endsWith('.anyposes.com');
    } catch (_) {}
    var entryPath = window.location.pathname.replace(/^\/zh(?=\/|$)/, '').replace(/\/$/, '') || '/';
    incoming = incoming && entryPath === '/app/image/gpt-image-2';

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
    var visitKey = 'seedance_anyposes_visit';
    var visitorKey = 'seedance_referral_visitor';
    var recordedKey = 'seedance_anyposes_recorded';
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
    window.fetch('/api/referrals/anyposes', {
      method: 'POST', credentials: 'same-origin', keepalive: true,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ visitorId: visitorId, visitId: visit.id, entryPath: visit.path })
    }).then(function (response) {
      if (response.ok) writeCookie(recordedKey, visit.id, 1800);
    }).catch(function () {
      // Retry the same visit on the next page; analytics never block the workspace.
    });
  } catch (_) {}
})();
