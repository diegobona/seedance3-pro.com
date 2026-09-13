function escapeHtml(input) {
  return String(input || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function normalizeEditorLinkUrl(input) {
  const value = String(input || "").trim();
  if (!value || /[\u0000-\u001f\u007f<>"'`]/.test(value)) {
    throw new Error("Enter a valid website address.");
  }
  if (/^(?:#|\.\.\/|\.\/|\/(?!\/))/.test(value)) return value;

  const candidate = value.startsWith("//")
    ? `https:${value}`
    : (/^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`);
  let parsed;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error("Enter a valid website address.");
  }
  if (!["http:", "https:"].includes(parsed.protocol) || !parsed.hostname) {
    throw new Error("Enter a valid website address.");
  }
  return parsed.href;
}

export function buildEditorLink({ label, url }) {
  const name = String(label || "").trim();
  if (!name) throw new Error("Enter a link name.");
  const href = normalizeEditorLinkUrl(url);
  const externalAttributes = /^https?:\/\//i.test(href)
    ? ' target="_blank" rel="noopener noreferrer"'
    : "";
  return `<a href="${escapeHtml(href)}"${externalAttributes}>${escapeHtml(name)}</a>`;
}
