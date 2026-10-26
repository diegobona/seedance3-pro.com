import { build } from 'vite';
import { fileURLToPath } from 'node:url';

await build({
  configFile: false,
  envDir: false,
  publicDir: false,
  logLevel: 'warn',
  // Vite library mode preserves this dependency check unless explicitly defined.
  // Use a public static constant; never copy the build machine's environment.
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    outDir: fileURLToPath(new URL('../assets', import.meta.url)),
    emptyOutDir: false,
    lib: {
      entry: fileURLToPath(new URL('../app/home-auth.mjs', import.meta.url)),
      formats: ['es'],
      fileName: () => 'home-auth.js',
      cssFileName: 'home-auth',
    },
    minify: true,
  },
});
