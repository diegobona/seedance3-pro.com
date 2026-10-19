import { build } from 'vite';
import { fileURLToPath } from 'node:url';
await build({ configFile: false, publicDir: false, logLevel: 'warn', build: {
  outDir: fileURLToPath(new URL('../assets', import.meta.url)), emptyOutDir: false,
  lib: { entry: fileURLToPath(new URL('../app/home-video.mjs', import.meta.url)), formats: ['es'], fileName: () => 'home-video.js' },
  minify: true,
} });
