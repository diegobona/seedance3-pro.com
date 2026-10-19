import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { renderSiteHeader, withSiteNavigation } from '../app/site-navigation.mjs';

test('shared navigation keeps language, selected destination and homepage handoff', () => {
  const home = renderSiteHeader({ pathname: '/zh/', locale: 'zh' });
  assert.match(home, /href="\/zh\/app\/video\/minimax-h3\?from=home" data-video-workbench/);
  const showcase = renderSiteHeader({ pathname: '/zh/showcase', locale: 'zh' });
  assert.match(showcase, /href="\/zh\/showcase" aria-current="page">作品展示/);
  assert.match(showcase, /href="\/zh\/app\/image\/gpt-image-2-5-1k"/);
  assert.match(showcase, /href="\/showcase\?lang=en"/);
  assert.doesNotMatch(showcase, /data-video-workbench/);
});

test('all static public pages use the shared header and synchronization is idempotent', async () => {
  for (const directory of ['', 'zh/']) {
    for (const file of await readdir(directory || '.')) {
      if (!file.endsWith('.html')) continue;
      const html = await readFile(directory + file, 'utf8');
      if (!html.includes('<header class="site-header"')) continue;
      const pathname = '/' + directory + (file === 'index.html' ? '' : file.slice(0, -5));
      assert.equal(withSiteNavigation(html, pathname), html, directory + file);
      assert.match(html, /src="\/assets\/site-navigation.js" defer/);
    }
  }
});
