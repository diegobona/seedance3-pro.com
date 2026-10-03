import { Buffer } from 'node:buffer';
import { HTTPParser } from 'http-parser-js';

const SUCCESS_LIMIT = 16 * 1024 * 1024;
const ERROR_LIMIT = 64 * 1024;

// Worker's fetch path fails the Tuzi TLS handshake; use a verified TLS socket.
// Keep this transport restricted to the configured provider and generation path.
export function createTuziTlsFetch(connect, apiBase = 'https://api.tu-zi.com') {
  const origin = new URL(apiBase || 'https://api.tu-zi.com');
  if (origin.protocol !== 'https:' || origin.port || origin.username || origin.password || origin.pathname !== '/') {
    throw new Error('Invalid Tuzi HTTPS origin.');
  }
  return async (input, init = {}) => {
    const url = new URL(input);
    if (url.origin !== origin.origin || url.pathname !== '/v1/images/generations'
      || url.search || url.hash || url.username || url.password
      || init.method !== 'POST' || typeof init.body !== 'string') {
      throw new Error('Unsupported Tuzi transport request.');
    }
    const headers = new Headers(init.headers);
    const signal = init.signal || AbortSignal.timeout(120_000);
    signal.throwIfAborted();
    const socket = connect({ hostname: url.hostname, port: 443 }, { secureTransport: 'on' });
    socket.closed.catch(() => {});
    let reader;
    let rejectAbort;
    const aborted = new Promise((_, reject) => { rejectAbort = reject; });
    const onAbort = () => {
      rejectAbort(signal.reason || new DOMException('Aborted', 'AbortError'));
      void socket.close().catch(() => {});
    };
    signal.addEventListener('abort', onAbort, { once: true });
    const operation = async () => {
      await socket.opened;
      signal.throwIfAborted();
      const requestHeaders = [
        `POST ${url.pathname} HTTP/1.1`,
        `Host: ${url.host}`,
        'Content-Type: application/json',
        'Accept: application/json',
        'Accept-Encoding: identity',
        'Connection: close',
        `Content-Length: ${Buffer.byteLength(init.body, 'utf8')}`,
      ];
      if (headers.has('authorization')) requestHeaders.push(`Authorization: ${headers.get('authorization')}`);
      const writer = socket.writable.getWriter();
      try {
        await writer.write(Buffer.from(requestHeaders.join('\r\n') + '\r\n\r\n'));
        await writer.write(Buffer.from(init.body, 'utf8'));
      } finally {
        writer.releaseLock();
      }

      const parser = new HTTPParser(HTTPParser.RESPONSE);
      parser.maxHeaderSize = 32 * 1024;
      let status = 0;
      let responseHeaders;
      let complete = false;
      let total = 0;
      let limit = SUCCESS_LIMIT;
      const chunks = [];
      parser[HTTPParser.kOnHeadersComplete] = (info) => {
        if (info.statusCode === 101 || info.upgrade) throw new Error('Unexpected HTTP upgrade.');
        if (info.statusCode < 200) return;
        if (status) throw new Error('Unexpected extra HTTP response.');
        status = info.statusCode;
        responseHeaders = new Headers();
        for (let i = 0; i < info.headers.length; i += 2) responseHeaders.append(info.headers[i], info.headers[i + 1]);
        limit = status < 300 ? SUCCESS_LIMIT : ERROR_LIMIT;
        const length = responseHeaders.get('content-length');
        const transfer = responseHeaders.get('transfer-encoding');
        if (length !== null && (!/^\d+$/.test(length) || Number(length) > limit)) throw new Error('Provider response is too large or invalid.');
        if (transfer && (transfer.toLowerCase() !== 'chunked' || length !== null)) throw new Error('Invalid provider transfer encoding.');
        if (responseHeaders.has('content-encoding') && responseHeaders.get('content-encoding') !== 'identity') throw new Error('Unexpected provider compression.');
      };
      parser[HTTPParser.kOnBody] = (chunk, offset, length) => {
        if (!status || complete) throw new Error('Unexpected HTTP response body.');
        total += length;
        if (total > limit) throw new Error('Provider response is too large.');
        chunks.push(Buffer.from(chunk.subarray(offset, offset + length)));
      };
      parser[HTTPParser.kOnMessageComplete] = () => { if (status >= 200) complete = true; };
      reader = socket.readable.getReader();
      while (!complete) {
        signal.throwIfAborted();
        const { value, done } = await reader.read();
        if (done) {
          const error = parser.finish();
          if (error instanceof Error) throw error;
          break;
        }
        const parsed = parser.execute(Buffer.from(value));
        if (parsed instanceof Error) throw parsed;
      }
      if (!complete || !status) throw new Error('Provider response ended prematurely.');
      responseHeaders.delete('transfer-encoding');
      return new Response(status === 204 || status === 205 || status === 304 ? null : Buffer.concat(chunks, total), {
        status, headers: responseHeaders,
      });
    };
    try {
      return await Promise.race([operation(), aborted]);
    } finally {
      signal.removeEventListener('abort', onAbort);
      if (reader) {
        await reader.cancel().catch(() => {});
        reader.releaseLock();
      }
      await socket.close().catch(() => {});
    }
  };
}
