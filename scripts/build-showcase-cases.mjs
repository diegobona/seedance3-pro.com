import { readFile, writeFile } from 'node:fs/promises';
import { build } from 'vite';
import { SEEDANCE_VIDEO_EXAMPLES } from '../app/seedance-video-examples.mjs';
import { h3VideoCases } from '../src/data/h3-video-cases.ts';
import { renderRelatedVideoCases } from '../app/showcase-related.mjs';
const translations = JSON.parse(await readFile(new URL('../src/data/ui-zh.json', import.meta.url), 'utf8'));
const escape = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
for (const prefix of ['', 'zh/']) {
  const zh = Boolean(prefix), file = prefix + 'showcase.html';
  let html = await readFile(file, 'utf8');
  const cards = SEEDANCE_VIDEO_EXAMPLES.map(item => `<article class="community-video-card community-video-card--original" data-sample-id="${item.id}">
  <div class="community-video-player"><video class="community-video-preview" muted loop playsinline preload="none" poster="${item.poster}" data-preview-src="${item.src}" aria-hidden="true"></video></div>
  <div class="community-video-body"><h3>${escape(item.title[zh ? 1 : 0])}</h3></div>
  <span class="community-video-case-link" aria-hidden="true">${zh ? '查看案例' : 'View case'} ↗</span>
</article>`).join('\n');
  const featured = `<!-- seedance-showcase:start -->\n<div class="community-video-grid community-video-grid--featured">${cards}</div>\n<!-- seedance-showcase:end -->`;
  if (html.includes('<!-- seedance-showcase:start -->')) html = html.replace(/<!-- seedance-showcase:start -->[\s\S]*?<!-- seedance-showcase:end -->/, featured);
  else html = html.replace('<div class="community-video-grid community-video-grid--original">', featured + '\n<div class="community-video-grid community-video-grid--original">');
  const t = (en, cn) => zh ? cn : en;
  const related = renderRelatedVideoCases(h3VideoCases, {locale:zh ? 'zh' : 'en', translate:value => zh ? translations[value] || value : value});
  const modal = `<dialog class="showcase-case-dialog" id="showcase-case" aria-labelledby="showcase-case-title">
  <div class="showcase-case-shell">
    <button class="showcase-case-close" type="button" data-case-close aria-label="${t('Close case','关闭案例')}">×</button>
    <header><p class="eyebrow">${t('Video case','视频案例')}</p><h2 id="showcase-case-title"></h2></header>
    <div class="showcase-case-top">
      <div><div class="showcase-case-media" data-case-media></div><p class="showcase-case-unavailable" data-case-unavailable hidden>${t('Preview unavailable. Please try again.','预览暂时无法播放，请稍后重试。')}</p></div>
      <aside class="showcase-case-overview" aria-label="${t('About this video','视频介绍')}">
        <p class="showcase-case-summary" data-case-summary></p>
        <dl data-case-facts></dl><p class="showcase-case-credit" data-case-credit></p>
        <a class="showcase-case-source" data-case-source target="_blank" rel="noopener noreferrer">${t('View source ↗','查看来源 ↗')}</a>
        <div class="showcase-case-try"><a data-case-try>${t('Try it ↗','试一试 ↗')}</a><p>${t('AI results vary and won’t exactly match the example.','AI 生成结果会有差异，无法与示例完全一致。')}</p></div>
        <div class="showcase-case-share"><button type="button" data-case-share>${t('Share link ↗','分享链接 ↗')}</button><span data-case-share-status role="status"></span><input data-case-share-url readonly hidden aria-label="${t('Share link','分享链接')}"></div>
      </aside>
    </div>
    <section class="showcase-case-prompt"><div class="showcase-case-prompt-heading"><div><h3>${t('Prompt','提示词')}</h3><p data-case-prompt-label></p></div><button type="button" data-case-copy>${t('Copy prompt','复制提示词')}</button></div><p data-case-prompt></p></section>
    <section class="showcase-case-creative" data-case-creative hidden><h3>${t('Creative direction','创作思路')}</h3><p></p></section>
    <div data-case-related>${related}</div>
  </div>
</dialog>`;
  html = html.replace(/<dialog class="showcase-(?:info|case)-dialog"[\s\S]*?<\/dialog>/, modal);
  html = html.replace(/(<link rel="preload" as="image" href=")[^"]+/, '$1/assets/seedance25-samples/front-row-confidence.webp');
  html = html.replace(/showcase\.css\?v=[^"\s]+/g, 'showcase.css?v=20261107-unified-cases');
  html = html.replace(/<script src="(?:\.\/main\.js|\/assets\/main\.zh\.js)"><\/script>/, '<script type="module" src="/assets/showcase-cases.js?v=20261107-unified-cases"></script>');
  await writeFile(file, html);
}
await build({configFile:false,envDir:false,publicDir:false,logLevel:'warn',build:{outDir:'assets',emptyOutDir:false,lib:{entry:'app/showcase-cases.mjs',formats:['es'],fileName:()=> 'showcase-cases.js'},minify:true}});
