// Public page aliases only. Generation IDs, media URLs and storage keys stay stable.
const aliases = Object.freeze({
  '/app/video/minimax-h3': '/app/video/seedance-2-5',
  '/app/image/gpt-image-2': '/app/image/gpt-image-2-5',
  '/minimax-h3-ai-video-generator': '/app/video/seedance-2-5',
  '/minimax-h3-ai-video-generator.html': '/app/video/seedance-2-5',
  '/gpt-image-2': '/app/image/gpt-image-2-5',
  '/gpt-image-2.html': '/app/image/gpt-image-2-5',
});
const libraryAliases = Object.freeze({
  '/minimax-h3-prompts': '/seedance-2-5-prompts',
  '/gpt-image-2-prompts': '/gpt-image-2-5-prompts',
  '/prompts/minimax-h3/videos': '/seedance-2-5-prompts',
  '/prompts/gpt-image-2/images': '/gpt-image-2-5-prompts',
});

export function publicModelPath(value) {
  if (typeof value !== 'string') return value;
  const match = value.match(/^(https?:\/\/(?:www\.)?seedance3-pro\.com|\.)?(\/[^?#]*)([?#].*)?$/i);
  if (!match) return value;
  const [, origin = '', fullPath, suffix = ''] = match;
  const locale = fullPath.startsWith('/zh/') ? '/zh' : '';
  const path = locale ? fullPath.slice(3) : fullPath;
  const destination = aliases[path.replace(/\/$/, '')];
  if (destination) return origin + locale + destination + suffix;
  for (const [from, to] of Object.entries(libraryAliases)) {
    if (path === from || path === from + '.html' || path.startsWith(from + '/')) {
      return origin + locale + to + (path.startsWith(from + '/') ? path.slice(from.length) : '') + suffix;
    }
  }
  return value;
}

export function withPublicModelPaths(html) {
  return html.replace(/<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>|<[^>]*>/gi, part => {
    if (/^<style\b/i.test(part)) return part;
    if (/^<script\b/i.test(part)) {
      if (!/\btype=["']application\/ld\+json["']/i.test(part)) return part;
      return part.replace(/"([^"\n]+)"/g, (match, value) => '"' + publicModelPath(value) + '"');
    }
    return part.replace(/(\b(?:href|action|content)\s*=\s*)(["'])(.*?)\2/gi,
      (_, attribute, quote, value) => attribute + quote + publicModelPath(value) + quote);
  });
}
