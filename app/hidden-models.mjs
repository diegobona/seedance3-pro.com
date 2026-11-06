// Keep the original implementations available while these products are hidden.
export function hiddenModelDestination(url) {
  const path = url.pathname.replace(/^\/zh(?=\/|$)/, '').replace(/\/$/, '');
  const model = /^\/app$/.test(path) ? url.searchParams.get('model') : '';
  const image = /^\/(?:app\/image\/muse-image|muse-image-prompts)(?:\/|$)/.test(path) || model === 'muse-image';
  const video = /^\/(?:app\/video\/(?:muse-video|flux-3)|muse-video-prompts)(?:\/|$)/.test(path)
    || /^\/flux-3(?:-video-generator)?(?:\.html)?$/.test(path) || model === 'muse-video';
  if (!image && !video) return null;
  const prefix = /^\/zh(?:\/|$)/.test(url.pathname) ? '/zh' : '';
  return prefix + (image ? '/app/image/gpt-image-2-5-1k' : '/app/video/seedance-2-5');
}
