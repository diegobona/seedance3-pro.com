import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const retiredCopy = /\b(?:no[\s-]+watermarks?|watermark[\s-]+free)\b|无水印|\+100 bonus credits included|\b(?:4\.99|11\.90|24\.90|49\.90|1,100|480p)\b/i;

test('public English and Chinese pages have no retired sales claims', async () => {
  for (const directory of ['', 'zh/']) {
    for (const name of await readdir(new URL(directory, root))) {
      if (!name.endsWith('.html')) continue;
      const file = directory + name;
      assert.equal((await readFile(new URL(file, root), 'utf8')).match(retiredCopy)?.[0] ?? null, null, file);
    }
  }
});

test('public copy sources and translation catalogs cannot restore retired claims', async () => {
  for (const file of [
    'app/site-promo.mjs', 'app/refund-policy-content.mjs', 'app/i18n.mjs',
    'src/components/credit-pack-offer.tsx', 'src/components/billing-page.tsx', 'src/routes/app.tsx',
    'src/data/ui-zh.json', 'src/data/gpt-image-cases.json', 'src/data/christmas-photo-prompts.ts',
    'scripts/i18n/zh-Hans.json', 'scripts/i18n/sources.json',
  ]) {
    assert.equal((await readFile(new URL(file, root), 'utf8')).match(retiredCopy)?.[0] ?? null, null, file);
  }
});
