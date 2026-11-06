// Optional local reference-only bridge. A temporary HTTPS tunnel may target this
// port for SeeAPI tests, without exposing login, billing or generation endpoints.
// No tunnel is created by this script; the app remains local.
import { createServer } from 'node:http';

const appOrigin = process.env.LOCAL_VIDEO_APP_ORIGIN || 'http://127.0.0.1:4310';
const port = Number(process.env.LOCAL_VIDEO_REFERENCE_PORT || 4313);
const origin = new URL(appOrigin);
if (!['127.0.0.1','localhost','[::1]'].includes(origin.hostname) || origin.protocol !== 'http:') throw Error('Bridge target must be a local HTTP app.');
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
createServer(async (request, response) => {
  const url = new URL(request.url, 'http://localhost');
  if (!['GET','HEAD'].includes(request.method) || url.pathname !== '/api/videos/references' || !idPattern.test(url.searchParams.get('id') || '')) {
    response.writeHead(404).end(); return;
  }
  try {
    const result = await fetch(new URL(url.pathname + url.search, appOrigin), { method: request.method, redirect: 'manual', signal: AbortSignal.timeout(15_000) });
    if (!result.ok || !/^image\/(png|jpeg|webp)$/.test(result.headers.get('content-type') || '')) { response.writeHead(404).end(); return; }
    // Finish the fast local read before sending over the slower public tunnel.
    // A streaming pipe allowed the fetch timeout to crash the bridge midway
    // through a download with an unhandled Readable error.
    if (Number(result.headers.get('content-length')) > 10 * 1024 * 1024) {
      await result.body?.cancel(); response.writeHead(404).end(); return;
    }
    const bytes = request.method === 'HEAD' ? null : Buffer.from(await result.arrayBuffer());
    if (bytes && bytes.length > 10 * 1024 * 1024) { response.writeHead(404).end(); return; }
    response.writeHead(200, { 'content-type': result.headers.get('content-type'), 'cache-control': 'no-store', 'x-content-type-options': 'nosniff',
      ...(bytes ? { 'content-length': String(bytes.length) } : {}) });
    response.end(bytes);
  } catch { response.writeHead(502).end(); }
}).listen(port, '127.0.0.1', () => console.log(`Reference-only bridge listening on 127.0.0.1:${port}`));
