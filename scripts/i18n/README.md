# Static Chinese site

Run `node scripts/generate-zh-site.mjs` from the repository root. It renders all root public HTML files into `zh/`, localizes internal public links, makes shared resource URLs absolute, writes Chinese titles/metadata/schema, and adds language links and reciprocal hreflang to both versions. It also generates `assets/main.zh.js` from the shared `main.js` interactions and `static-ui.zh-Hans.json`.

`zh-Hans.json` keeps each exact English `source` alongside its reviewed Chinese `translation`. Article paragraphs are translated in full. Original copied prompts, code, model names, prices and creator names remain faithful to the original. Source prompts are marked `lang="en" translate="no"` when appropriate.

After changing English content, run `node scripts/generate-zh-site.mjs --extract` to update `sources.json`, then add or update the corresponding source/translation pairs. Generation is strict by default: missing translations stop the write so incomplete Chinese articles cannot silently replace a complete page. The checked-in `sources.json` is a review aid, not an input to rendering.

For newly published CMS articles, the optional `article-overrides.json` map stores complete Chinese HTML by English filename, for example `{ "my-article.html": "<!doctype html>..." }`. The CMS supplies the translated title, excerpt and full body. Rendering preserves this supplied Chinese content, translates shared English shell text, normalizes links/resources, and derives Chinese canonical and hreflang URLs. The English source file retains its English article. Chinese sentences may contain English model names without requiring an additional catalog entry.

The exported API is:

```js
import { generateChineseSite } from '../scripts/generate-zh-site.mjs';
await generateChineseSite({
  rootDirectory,
  files: ['my-article.html', 'blog.html'], // Omit to render every page.
  injectEnglish: true,
  strict: true,
});
```

It returns `{ pages, missing }`. `collectTranslationSources({ rootDirectory })` inspects Chinese overrides where supplied, rather than the original English article body. `attachLanguageMetadata(html, englishPath, locale)` is idempotent; `localizedUrl(value, englishPath, publicPaths)` preserves queries and fragments and leaves APIs, admin pages and media at root.

The static and React language control share this markup contract:

```html
<nav class="site-language-switch" data-site-language-switch aria-label="Site language">
  <a data-language="zh" href="/zh/blog?lang=zh" lang="zh-Hans">中文</a>
  <span aria-hidden="true">|</span>
  <a data-language="en" href="/blog?lang=en" lang="en">EN</a>
</nav>
```

`assets/site-language.js` preserves the current query and fragment, remembers an explicit choice in `seedance_locale=en|zh` for one year, and updates controls after React navigation. Both language links include `lang=zh` or `lang=en` as a script-free fallback: the edge routing layer sets the preference cookie and removes the parameter. The switch remains a native keyboard-accessible link. `assets/site-language.css` supplies shared dark-theme styling and Chinese typography.

Verify with `node --test tests/chinese-static.test.mjs`.
