import { readdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { withSiteNavigation } from '../app/site-navigation.mjs';

const root = new URL('../', import.meta.url);
let changed = 0;
for (const directory of ['', 'zh/']) {
  for (const file of await readdir(new URL(directory, root))) {
    if (!file.endsWith('.html')) continue;
    const target = new URL(directory + file, root);
    const html = await readFile(target, 'utf8');
    const pathname = '/' + directory + (file === 'index.html' ? '' : file.slice(0, -5));
    const output = withSiteNavigation(html, pathname);
    if (output !== html) { await writeFile(fileURLToPath(target), output); changed++; }
  }
}
console.log(`Updated shared navigation on ${changed} pages.`);
