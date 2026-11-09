import { build } from 'vite';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
await build({ configFile: false, publicDir: false, logLevel: 'warn', build: {
  outDir: fileURLToPath(new URL('../assets', import.meta.url)), emptyOutDir: false,
  lib: { entry: fileURLToPath(new URL('../app/home-video.mjs', import.meta.url)), formats: ['es'], fileName: () => 'home-video.js' },
  minify: true,
} });
// A new URL is needed when a browser already cached the previous immutable bundle.
const bundle = await readFile(new URL('../assets/home-video.js', import.meta.url));
const version = createHash('sha256').update(bundle).digest('hex').slice(0, 12);
const styles = await readFile(new URL('../assets/home-video.css', import.meta.url));
const styleVersion = createHash('sha256').update(styles).digest('hex').slice(0, 12);
for (const path of ['../index.html', '../zh/index.html']) {
  const file = new URL(path, import.meta.url);
  const before = await readFile(file, 'utf8');
  const after = before.replace(/\/assets\/home-video\.js(?:\?v=[^"\s]*)?/g, `/assets/home-video.js?v=${version}`)
    .replace(/\/assets\/home-video\.css(?:\?v=[^"\s]*)?/g, `/assets/home-video.css?v=${styleVersion}`);
  if (after !== before) await writeFile(file, after);
}
