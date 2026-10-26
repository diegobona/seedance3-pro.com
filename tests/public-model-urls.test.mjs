import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { canonicalModelPath, legacyModelRedirect, modelIdFromPath } from '../app/seo-routes.mjs';
import { localizedPath, languageSwitchPath } from '../app/site-locale.mjs';
import { buildModelUrl } from '../app/model-routing.mjs';
import { withSiteNavigation } from '../app/site-navigation.mjs';
import { partnerImageRedirect } from '../app/partner-image-redirect.mjs';
import { localizedUrl } from '../scripts/generate-zh-site.mjs';

const origin = 'https://seedance3-pro.com';

test('renamed tool routes retain working generation model IDs', () => {
  for (const prefix of ['', '/zh']) {
    assert.equal(modelIdFromPath(prefix + '/app/video/seedance-2-5'), 'minimax-h3');
    assert.equal(modelIdFromPath(prefix + '/app/image/gpt-image-2-5'), 'gpt-image-2');
    assert.equal(modelIdFromPath(prefix + '/app/image/gpt-image-2-5-1k'), 'gpt-image-2-5-1k');
    assert.equal(canonicalModelPath('minimax-h3', prefix ? 'zh' : 'en'), prefix + '/app/video/seedance-2-5');
    assert.equal(canonicalModelPath('gpt-image-2', prefix ? 'zh' : 'en'), prefix + '/app/image/gpt-image-2-5');
  }
});

test('legacy tools and both prompt libraries redirect once with handoff and attribution intact', () => {
  for (const prefix of ['', '/zh']) {
    for (const [from, to] of [
      ['/app/video/minimax-h3', '/app/video/seedance-2-5'],
      ['/app/image/gpt-image-2', '/app/image/gpt-image-2-5'],
      ['/minimax-h3-prompts', '/seedance-2-5-prompts'],
      ['/minimax-h3-prompts/corgi-sprint', '/seedance-2-5-prompts/corgi-sprint'],
      ['/gpt-image-2-prompts', '/gpt-image-2-5-prompts'],
      ['/gpt-image-2-prompts/foldable-pocket-universe', '/gpt-image-2-5-prompts/foldable-pocket-universe'],
      ['/prompts/minimax-h3/videos/corgi-sprint', '/seedance-2-5-prompts/corgi-sprint'],
      ['/prompts/gpt-image-2/images/foldable-pocket-universe', '/gpt-image-2-5-prompts/foldable-pocket-universe'],
    ]) {
      const suffix = '?ref=pixal3d&prompt=hello%20world&reference=example&tag=one&tag=two#editor';
      assert.equal(legacyModelRedirect(new URL(prefix + from + suffix, origin)), prefix + to + suffix);
      assert.equal(legacyModelRedirect(new URL(prefix + to, origin)), null, 'canonical addresses must not loop');
    }
  }
});

test('model selection and locale switches use public names without losing query state', () => {
  assert.equal(localizedPath('/minimax-h3-prompts/corgi-sprint?ref=home#prompt', 'zh'), '/zh/seedance-2-5-prompts/corgi-sprint?ref=home#prompt');
  assert.equal(languageSwitchPath('/zh/app/video/minimax-h3?prompt=fox#editor', 'en'), '/app/video/seedance-2-5?prompt=fox&lang=en#editor');
  const selection = new URL(buildModelUrl(origin + '/zh/app/?model=pose-to-image&ref=anyposes#editor', 'minimax-h3'), origin);
  assert.equal(selection.pathname, '/zh/app/video/seedance-2-5');
  assert.equal(selection.searchParams.get('ref'), 'anyposes');
  assert.equal(selection.searchParams.has('model'), false);
  assert.equal(selection.hash, '#editor');
  const poseSelection = new URL(buildModelUrl(selection.href, 'pose-to-image'), origin);
  assert.equal(poseSelection.pathname, '/zh/app/');
  assert.equal(poseSelection.searchParams.get('model'), 'pose-to-image');
  assert.equal(poseSelection.searchParams.get('ref'), 'anyposes');
  assert.equal(poseSelection.hash, '#editor');
  const redirect = new URL(legacyModelRedirect(new URL('/app/?model=gpt-image-2&prompt=fox&ref=pixal3d#editor', origin)), origin);
  assert.equal(redirect.pathname, '/app/image/gpt-image-2-5');
  assert.equal(redirect.searchParams.get('prompt'), 'fox');
  assert.equal(redirect.searchParams.get('ref'), 'pixal3d');
  assert.equal(redirect.hash, '#editor');
});

test('static page links and metadata use public URLs while media and provider values stay intact', () => {
  const input = '<html><head><link rel="canonical" href="https://seedance3-pro.com/zh/minimax-h3-prompts"><script type="application/ld+json">{"url":"https://seedance3-pro.com/gpt-image-2-prompts/example"}</script></head><body><a href="./app/video/minimax-h3?from=home">Video</a><a href="/zh/gpt-image-2-prompts/example">Prompt</a><img src="/media/showcase-h3/example.jpg"><script>const model="minimax-h3";</script></body></html>';
  const output = withSiteNavigation(input, '/zh/showcase');
  assert.ok(output.includes('href="./app/video/seedance-2-5?from=home"'));
  assert.ok(output.includes('href="/zh/gpt-image-2-5-prompts/example"'));
  assert.ok(output.includes('https://seedance3-pro.com/zh/seedance-2-5-prompts'));
  assert.ok(output.includes('https://seedance3-pro.com/gpt-image-2-5-prompts/example'));
  assert.ok(output.includes('src="/media/showcase-h3/example.jpg"'));
  assert.ok(output.includes('const model="minimax-h3";'));
  assert.equal(withSiteNavigation(output, '/zh/showcase'), output);
});

test('canonical video route renders the working studio instead of the old preview', () => {
  for (const prefix of ['', 'zh.']) {
    const source = readFileSync(new URL('../src/routes/' + prefix + 'app_.video.seedance-2-5.tsx', import.meta.url), 'utf8');
    assert.match(source, /initialModel="minimax-h3"/);
    assert.doesNotMatch(source, /noindex,follow/);
  }
});

test('the renamed image route retains AnyPoses attribution and its existing image model handoff', () => {
  const response = partnerImageRedirect(new Request(origin + '/zh/app/image/gpt-image-2-5?ref=anyposes&prompt=fox&aspect_ratio=1%3A1'));
  const destination = new URL(response.headers.get('location'));
  assert.equal(destination.pathname, '/zh/app/image/gpt-image-2-5-1k');
  assert.equal(destination.searchParams.get('prompt'), 'fox');
  assert.equal(destination.searchParams.get('ref'), 'anyposes');
  assert.equal(destination.searchParams.get('aspect_ratio'), '1:1');
});

test('Chinese static regeneration localizes renamed prompt libraries and existing library aliases', () => {
  for (const [from, to] of [
    ['/seedance-2-5-prompts/corgi-sprint', '/zh/seedance-2-5-prompts/corgi-sprint'],
    ['/gpt-image-2-5-prompts/foldable-pocket-universe', '/zh/gpt-image-2-5-prompts/foldable-pocket-universe'],
    ['/minimax-h3-prompts/corgi-sprint', '/zh/seedance-2-5-prompts/corgi-sprint'],
    ['/gpt-image-2-prompts/foldable-pocket-universe', '/zh/gpt-image-2-5-prompts/foldable-pocket-universe'],
  ]) assert.equal(localizedUrl(from + '?ref=home#prompt', '/showcase', new Set()), to + '?ref=home#prompt');
});
