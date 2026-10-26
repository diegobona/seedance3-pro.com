// Public labels only; URLs, provider IDs and generation prompts keep their values.
function longNames(text) {
  return String(text)
    .replace(/\bMiniMax\s+H3\b/gi, 'Seedance 2.5')
    .replace(/\bGPT[\s-]*Image\s*2(?![.\d])/gi, 'GPT Image 2.5');
}

export function modelDisplayNames(text) {
  return longNames(text).replace(/\bH3\b/g, 'Seedance 2.5').replace(/\bG2\b(?!\.)/g, 'G2.5');
}

export function withModelDisplayNames(html) {
  return html.replace(/<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>|<[^>]*>|[^<]+/gi, part => {
    if (/^<style\b/i.test(part)) return part;
    if (/^<script\b/i.test(part) && !/\btype=["']application\/ld\+json["']/i.test(part)) return part;
    return part.startsWith('<') ? longNames(part) : modelDisplayNames(part);
  });
}
