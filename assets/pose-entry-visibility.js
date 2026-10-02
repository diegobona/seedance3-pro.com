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
