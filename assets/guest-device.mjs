// Public asset shared by static account menus and bundled workspaces.
// First-party, best-effort trial abuse signal. This is not a hardware ID.
// No raw device characteristics or rendered canvas pixels leave the browser.
const HEADER = 'x-seedance-device';
const FONT_CANDIDATES = ['Arial', 'Arial Black', 'Calibri', 'Cambria', 'Candara', 'Consolas',
  'Courier New', 'Georgia', 'Helvetica Neue', 'Menlo', 'Microsoft YaHei', 'Noto Sans CJK SC',
  'Noto Sans', 'PingFang SC', 'Segoe UI', 'SimSun', 'Tahoma', 'Times New Roman', 'Ubuntu', 'Verdana'];

function normalizeRenderer(value) {
  let renderer = String(value || '').toLowerCase().trim();
  if (/swiftshader|llvmpipe|software|microsoft basic|unknown/.test(renderer)) return '';
  // ANGLE exposes a vendor wrapper and backend/driver suffix that vary by browser.
  if (renderer.startsWith('angle (')) renderer = renderer.slice(7).split(',')[1]?.trim() || '';
  renderer = renderer.replace(/^angle metal renderer:\s*/, '');
  renderer = renderer.replace(/\(0x[0-9a-f]+\)/g, '').replace(/\b(?:direct3d|opengl|metal|vulkan).*$/, '')
    .replace(/\/pcie.*$/, '').replace(/\((?:r|tm)\)/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  return renderer.length >= 7 && /\d|radeon|intel.*(?:uhd|iris|hd graphics)/.test(renderer) ? renderer : '';
}

export function collectGuestDeviceSignals(scope = globalThis) {
  let gl;
  try {
    if (!scope.document?.createElement || !scope.screen || !scope.navigator) return null;
    const canvas = scope.document.createElement('canvas');
    gl = canvas.getContext('webgl');
    const debug = gl?.getExtension('WEBGL_debug_renderer_info');
    if (!debug) return null;
    const renderer = gl.getParameter(debug.UNMASKED_RENDERER_WEBGL);
    const context = scope.document.createElement('canvas').getContext('2d');
    if (!context) return null;
    const sample = 'mmmmmmmmmmlliWW0123456789';
    const bases = ['monospace', 'sans-serif', 'serif'];
    const measure = font => { context.font = `72px ${font}`; return context.measureText(sample).width; };
    const baseline = bases.map(measure);
    const fonts = FONT_CANDIDATES.filter(font => bases.some((base, i) => measure(`"${font}",${base}`) !== baseline[i]));
    const ua = scope.navigator.userAgent || '';
    const platform = /android/i.test(ua) ? 'android' : /iphone|ipad|ipod/i.test(ua) ? 'ios'
      : /windows/i.test(ua) ? 'windows' : /mac/i.test(ua) ? 'mac' : /linux|cros/i.test(ua) ? 'linux' : '';
    return { platform, renderer, fonts, screen: [scope.screen.width, scope.screen.height, scope.screen.colorDepth],
      cores: scope.navigator.hardwareConcurrency, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone };
  } catch { return null; }
  finally { try { gl?.getExtension('WEBGL_lose_context')?.loseContext(); } catch { /* optional */ } }
}

export async function fingerprintFromSignals(signals, cryptoImpl = globalThis.crypto) {
  try {
    if (!signals || !cryptoImpl?.subtle) return null;
    const renderer = normalizeRenderer(signals.renderer);
    const [width, height, depth] = signals.screen || [];
    const fonts = [...new Set(signals.fonts || [])].sort();
    // Generic/missing signals are insufficient; keep the IP and cookie checks instead.
    if (!renderer || !['windows','mac','linux','android','ios'].includes(signals.platform)
      || ![width,height,depth,signals.cores].every(n => Number.isSafeInteger(n) && n > 0)
      || fonts.length < 3 || !signals.timezone) return null;
    const value = ['v1', signals.platform, renderer, [width,height].sort((a,b) => a-b), depth,
      signals.cores, signals.timezone, fonts];
    const bytes = await cryptoImpl.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(value)));
    return `v1:${Array.from(new Uint8Array(bytes), n => n.toString(16).padStart(2, '0')).join('')}`;
  } catch { return null; }
}

let pending;
/** @returns {Promise<Record<string, string>>} */
export async function guestDeviceHeaders() {
  if (!globalThis.document) return {};
  pending ??= fingerprintFromSignals(collectGuestDeviceSignals());
  const fingerprint = await pending;
  return fingerprint ? { [HEADER]: fingerprint } : {};
}
