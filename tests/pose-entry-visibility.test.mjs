import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import vm from 'node:vm';

const sourcePath = new URL('../assets/pose-entry-visibility.js', import.meta.url);
const script = existsSync(sourcePath) ? readFileSync(sourcePath, 'utf8') : '';

function visit({ referrer = '', search = '', cookie = '', storage = new Map(), blockedStorage = false, hostname = 'seedance3-pro.com' } = {}) {
  const classes = new Set();
  const writes = [];
  const document = {
    referrer,
    documentElement: { classList: { add: value => classes.add(value) } },
    get cookie() {
      if (blockedStorage) throw new Error('Cookies unavailable');
      return cookie;
    },
    set cookie(value) {
      if (blockedStorage) throw new Error('Cookies unavailable');
      writes.push(value);
    },
  };
  const window = {
    location: { hostname, protocol: 'https:', search },
    sessionStorage: {
      getItem(key) {
        if (blockedStorage) throw new Error('Storage unavailable');
        return storage.get(key) ?? null;
      },
      setItem(key, value) {
        if (blockedStorage) throw new Error('Storage unavailable');
        storage.set(key, value);
      },
    },
  };
  vm.runInNewContext(script, { document, window, URL, URLSearchParams });
  return { hidden: classes.has('pose-entries-hidden'), writes, storage };
}

test('AnyPoses referrals, including subdomains, hide Pose entrances', () => {
  for (const referrer of ['https://anyposes.com/', 'https://www.anyposes.com/editor', 'https://ANYPOSES.COM/?link=studio']) {
    assert.equal(visit({ referrer }).hidden, true, referrer);
  }
});

test('an explicit AnyPoses referral marker works even when noreferrer hides the referrer', () => {
  const initial = visit({ search: '?ref=anyposes' });
  assert.equal(initial.hidden, true);
  assert.equal(visit({ search: '?model=minimax-h3&ref=anyposes' }).hidden, true);
  const home = visit({ referrer: 'https://seedance3-pro.com/app/video/minimax-h3?ref=anyposes', cookie: initial.writes[0]?.split(';')[0], storage: initial.storage });
  assert.equal(home.hidden, true);
});

test('unrelated referral markers do not hide Pose entrances', () => {
  for (const search of ['?ref=showcase', '?ref=notanyposes', '?ref=anyposes.com.evil.example']) {
    assert.equal(visit({ search }).hidden, false, search);
  }
});

test('other referrals, lookalike hosts and missing referrers retain Pose entrances', () => {
  for (const referrer of ['', 'https://google.com/', 'https://anyposes.com.evil.example/', 'https://notanyposes.com/', 'https://example.com/?source=anyposes.com', 'invalid']) {
    const result = visit({ referrer });
    assert.equal(result.hidden, false, referrer);
    assert.equal(result.writes.length, 0);
  }
});

test('the referral choice survives internal navigation and a new tab through a session cookie', () => {
  const initial = visit({ referrer: 'https://anyposes.com/' });
  assert.match(initial.writes[0] ?? '', /seedance_pose_entries_hidden=1;.*Path=\/;.*SameSite=Lax/);
  assert.match(initial.writes[0], /Secure/);
  assert.match(initial.writes[0], /Domain=seedance3-pro\.com/);
  assert.equal(visit({ referrer: 'https://seedance3-pro.com/', cookie: initial.writes[0].split(';')[0] }).hidden, true);
  assert.equal(visit({ cookie: initial.writes[0].split(';')[0], hostname: 'www.seedance3-pro.com' }).hidden, true);
  assert.equal(visit({ cookie: 'other_seedance_pose_entries_hidden=1' }).hidden, false);
});

test('session storage keeps the choice during internal navigation if a cookie is absent', () => {
  const initial = visit({ referrer: 'https://anyposes.com/' });
  assert.equal(visit({ referrer: 'https://seedance3-pro.com/app', storage: initial.storage }).hidden, true);
});

test('a storage restriction does not prevent hiding a recognizable referral', () => {
  assert.equal(visit({ referrer: 'https://anyposes.com/', blockedStorage: true }).hidden, true);
  assert.equal(visit({ blockedStorage: true }).hidden, false);
});

test('development hosts do not receive the production cookie domain', () => {
  const result = visit({ referrer: 'https://anyposes.com/', hostname: 'localhost' });
  assert.equal(result.hidden, true);
  assert.doesNotMatch(result.writes[0], /Domain=/);
});

test('public static pages load the guard in the head before any entrance is rendered', () => {
  const root = new URL('../', import.meta.url);
  for (const file of readdirSync(root).filter(file => file.endsWith('.html'))) {
    const html = readFileSync(new URL(file, root), 'utf8');
    const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? '';
    assert.match(head, /<script src="\/assets\/pose-entry-visibility\.js"><\/script>/, file);
    assert.match(head, /<link rel="stylesheet" href="\/assets\/pose-entry-visibility\.css">/, file);
  }
});

test('new and updated CMS articles retain the shared visibility guard', async () => {
  const { renderArticleDocument, ensurePoseEntryVisibilityAssets } = await import('../scripts/article-html.mjs');
  const html = ensurePoseEntryVisibilityAssets('<html><head><meta charset="UTF-8"></head><body></body></html>');
  assert.equal(ensurePoseEntryVisibilityAssets(html), html);
  assert.match(html, /<head>[\s\S]*pose-entry-visibility\.js[\s\S]*<\/head>/);
  const article = renderArticleDocument({ title: 'Sample', content: '<p>Sample.</p>', canonical: 'https://seedance3-pro.com/sample' });
  assert.match(article, /pose-entry-visibility\.js/);
});
