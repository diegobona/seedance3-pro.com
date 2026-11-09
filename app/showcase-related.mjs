const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export function renderRelatedVideoCases(cases, {locale = 'en', currentId = '', translate = value => value, randomize = false, previousIds = []} = {}) {
  const prefix = locale === 'zh' ? '/zh' : '';
  let candidates = cases.filter(item => item.slug !== currentId);
  if (randomize) {
    const fresh = candidates.filter(item => !previousIds.includes(item.slug));
    if (fresh.length >= 3) candidates = fresh;
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
  }
  const related = candidates.slice(0, 3);
  return `<section class="showcase-related" aria-label="${locale === 'zh' ? '相关视频案例' : 'Related video cases'}">
    <div class="showcase-related-heading"><h3>${locale === 'zh' ? '更多视频案例' : 'More video cases'}</h3>
      <a href="${prefix}/seedance-2-5-prompts" target="_blank" rel="noopener noreferrer">${escape(translate('Seedance 2.5 Prompt Library'))} ↗</a></div>
    <div class="showcase-related-grid">${related.map(item => `<a class="showcase-related-card" href="${escape(item.caseUrl || `${prefix}/seedance-2-5-prompts/${encodeURIComponent(item.slug)}`)}" data-related-case="${escape(item.slug)}" aria-haspopup="dialog">
      <div class="showcase-related-image"><img src="${escape(item.posterUrl)}" alt="" loading="lazy" width="480" height="300"><span>${locale === 'zh' ? '查看案例' : 'View case'} ↗</span></div>
      <div class="showcase-related-copy"><h4>${escape(translate(item.title))}</h4><p>${escape(translate(item.summary))}</p></div>
    </a>`).join('')}</div>
  </section>`;
}
