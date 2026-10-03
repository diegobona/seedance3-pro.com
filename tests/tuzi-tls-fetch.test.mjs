import test from "node:test";
import assert from "node:assert/strict";
import { createTuziTlsFetch } from "../scripts/tuzi-tls-fetch.mjs";

const endpoint = "https://api.tu-zi.com/v1/images/generations";
const validInit = { method: "POST", body: "{}" };

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

function splitBytes(input, sizes = [1, 7, 2, 19, 3, 41]) {
  const bytes = Buffer.isBuffer(input) ? input : Buffer.from(input);
  const chunks = [];
  for (let offset = 0, index = 0; offset < bytes.length; index += 1) {
    const end = Math.min(offset + sizes[index % sizes.length], bytes.length);
    chunks.push(bytes.subarray(offset, end));
    offset = end;
  }
  return chunks;
}

function contentLengthResponse(body, status = 200, headers = "") {
  const bytes = Buffer.isBuffer(body) ? body : Buffer.from(body);
  return Buffer.concat([
    Buffer.from(`HTTP/1.1 ${status} Test\r\nContent-Type: application/json\r\nContent-Length: ${bytes.length}\r\n${headers}\r\n`),
    bytes,
  ]);
}

function chunkedResponse(parts, { status = 200, interim = false } = {}) {
  const chunks = [Buffer.from(
    (interim ? "HTTP/1.1 100 Continue\r\n\r\n" : "") +
    `HTTP/1.1 ${status} Test\r\nContent-Type: application/json\r\nTransfer-Encoding: chunked\r\n\r\n`,
  )];
  for (const part of parts) {
    const bytes = Buffer.isBuffer(part) ? part : Buffer.from(part);
    chunks.push(Buffer.from(`${bytes.length.toString(16)};probe=yes\r\n`), bytes, Buffer.from("\r\n"));
  }
  chunks.push(Buffer.from("0\r\nX-Probe-Trailer: done\r\n\r\n"));
  return Buffer.concat(chunks);
}

function socketFixture(chunks, { holdOpen = false } = {}) {
  const firstWrite = deferred();
  const closed = deferred();
  const state = { calls: [], writes: [], closes: 0, cancelled: false, closed: false };
  let nextChunk = 0;
  const readable = new ReadableStream({
    async pull(controller) {
      await firstWrite.promise;
      if (holdOpen) await closed.promise;
      if (state.cancelled) return;
      if (state.closed || nextChunk === chunks.length) {
        controller.close();
      } else {
        controller.enqueue(chunks[nextChunk++]);
      }
    },
    cancel() { state.cancelled = true; },
  });
  const socket = {
    opened: Promise.resolve({}),
    closed: closed.promise,
    readable,
    writable: new WritableStream({
      write(chunk) {
        state.writes.push(Buffer.from(chunk));
        firstWrite.resolve();
      },
    }),
    async close() {
      state.closes += 1;
      state.closed = true;
      closed.resolve();
      firstWrite.resolve();
    },
  };
  return {
    state,
    firstWrite: firstWrite.promise,
    connect(address, options) {
      state.calls.push({ address, options });
      return socket;
    },
  };
}

async function readResponse(fetchImpl, url = endpoint, init = validInit) {
  const response = await fetchImpl(url, init);
  const body = await response.text();
  return { response, body };
}

test("TLS transport preserves UTF-8 JSON references and authorization across fragmented responses", async () => {
  const result = { data: [{ url: "https://cdn.example/兔子.png" }] };
  const fixture = socketFixture(splitBytes(contentLengthResponse(JSON.stringify(result))));
  const fetchImpl = createTuziTlsFetch(fixture.connect);
  const payload = JSON.stringify({
    model: "gpt-image-2",
    prompt: "保留两张参考图的角色与构图 🐇",
    image: ["data:image/png;base64,Zmlyc3Q=", "data:image/jpeg;base64,c2Vjb25k"],
    n: 1,
  });
  const { response, body } = await readResponse(fetchImpl, endpoint, {
    method: "POST",
    headers: new Headers({ Authorization: "Bearer test-only-key", "Content-Type": "application/json" }),
    body: payload,
  });

  assert.ok(response instanceof Response);
  assert.equal(response.status, 200);
  assert.deepEqual(JSON.parse(body), result);
  assert.equal(fixture.state.calls.length, 1);
  assert.deepEqual(fixture.state.calls[0].address, { hostname: "api.tu-zi.com", port: 443 });
  assert.equal(fixture.state.calls[0].options.secureTransport, "on");

  const outgoing = Buffer.concat(fixture.state.writes);
  const separator = outgoing.indexOf("\r\n\r\n");
  assert.notEqual(separator, -1);
  const headers = outgoing.subarray(0, separator).toString("utf8");
  const sentBody = outgoing.subarray(separator + 4);
  assert.match(headers, /^POST \/v1\/images\/generations HTTP\/1\.1\r\n/);
  assert.match(headers, /(?:^|\r\n)host: api\.tu-zi\.com(?:\r\n|$)/i);
  assert.match(headers, /(?:^|\r\n)authorization: Bearer test-only-key(?:\r\n|$)/i);
  assert.equal(Number(headers.match(/(?:^|\r\n)content-length: (\d+)(?:\r\n|$)/i)?.[1]), Buffer.byteLength(payload));
  assert.equal(sentBody.toString("utf8"), payload);
  assert.equal(fixture.state.closes, 1);
});

test("TLS transport decodes split chunk frames after 100 Continue", async () => {
  const payload = JSON.stringify({ data: [{ b64_json: "Zmlyc3Q=" }], message: "成功" });
  const bytes = Buffer.from(payload);
  const wire = chunkedResponse([bytes.subarray(0, 9), bytes.subarray(9, 25), bytes.subarray(25)], { interim: true });
  const fixture = socketFixture(splitBytes(wire, [1, 2, 3, 5]));
  const { response, body } = await readResponse(createTuziTlsFetch(fixture.connect));
  assert.equal(response.status, 200);
  assert.equal(body, payload);
  assert.equal(fixture.state.closes, 1);
});

test("TLS transport rejects truncated Content-Length and incomplete chunked responses", async () => {
  const responses = [
    "HTTP/1.1 200 OK\r\nContent-Length: 20\r\n\r\nshort",
    "HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n5\r\nshort\r\n",
  ];
  for (const wire of responses) {
    const fixture = socketFixture(splitBytes(wire));
    await assert.rejects(() => readResponse(createTuziTlsFetch(fixture.connect)));
    assert.equal(fixture.state.calls.length, 1);
    assert.equal(fixture.state.closes, 1);
  }
});

test("TLS transport aborts pending reads and closes its socket without a retry", { timeout: 5000 }, async () => {
  const fixture = socketFixture([], { holdOpen: true });
  const controller = new AbortController();
  const pending = readResponse(createTuziTlsFetch(fixture.connect), endpoint, {
    ...validInit,
    signal: controller.signal,
  });
  const rejection = assert.rejects(pending);
  await fixture.firstWrite;
  controller.abort();
  await rejection;
  assert.equal(fixture.state.calls.length, 1);
  assert.ok(fixture.state.closes >= 1);
  assert.equal(fixture.state.closed, true);
});

test("TLS transport restricts requests to POST generation on its configured HTTPS origin", async () => {
  const forbidden = [
    ["https://foreign.example/v1/images/generations", validInit],
    ["http://api.tu-zi.com/v1/images/generations", validInit],
    ["https://api.tu-zi.com:8443/v1/images/generations", validInit],
    ["https://api.tu-zi.com/v1/models", validInit],
    [endpoint, { method: "GET" }],
    [endpoint, { method: "DELETE", body: "{}" }],
    [endpoint, { method: "POST", body: new Uint8Array([123, 125]) }],
  ];
  for (const [url, init] of forbidden) {
    const fixture = socketFixture([contentLengthResponse("{}")]);
    await assert.rejects(() => readResponse(createTuziTlsFetch(fixture.connect), url, init));
    assert.equal(fixture.state.calls.length, 0, `must reject before connecting: ${url} ${init.method}`);
  }

  const fixture = socketFixture([contentLengthResponse("{}")]);
  const fetchImpl = createTuziTlsFetch(fixture.connect, "https://configured.example");
  const { response } = await readResponse(fetchImpl, "https://configured.example/v1/images/generations");
  assert.equal(response.status, 200);
  assert.equal(fixture.state.calls[0].address.hostname, "configured.example");
  assert.equal(fixture.state.closes, 1);
});

test("TLS transport rejects CRLF header injection before opening a connection", async () => {
  for (const headers of [
    { Authorization: "Bearer test\r\nX-Injected: yes" },
    { "X-Probe": "hello\nX-Injected: yes" },
    { "X-Probe\r\nX-Injected": "yes" },
  ]) {
    const fixture = socketFixture([contentLengthResponse("{}")]);
    await assert.rejects(() => readResponse(createTuziTlsFetch(fixture.connect), endpoint, {
      ...validInit,
      headers,
    }));
    assert.equal(fixture.state.calls.length, 0);
  }
});

test("TLS transport enforces 16 MiB success and 64 KiB error response limits", { timeout: 10000 }, async () => {
  const successLimit = 16 * 1024 * 1024;
  const errorLimit = 64 * 1024;
  for (const [status, size] of [[200, successLimit], [500, errorLimit]]) {
    const fixture = socketFixture(splitBytes(contentLengthResponse(Buffer.alloc(size, 97), status), [64 * 1024]));
    const response = await createTuziTlsFetch(fixture.connect)(endpoint, validInit);
    assert.equal(response.status, status);
    assert.equal((await response.arrayBuffer()).byteLength, size);
    assert.equal(fixture.state.closes, 1);
  }

  const oversized = [
    Buffer.from(`HTTP/1.1 200 OK\r\nContent-Length: ${successLimit + 1}\r\n\r\n`),
    chunkedResponse([Buffer.alloc(errorLimit + 1, 97)], { status: 500 }),
  ];
  for (const wire of oversized) {
    const fixture = socketFixture(splitBytes(wire, [4096]));
    await assert.rejects(() => readResponse(createTuziTlsFetch(fixture.connect)));
    assert.equal(fixture.state.calls.length, 1);
    assert.equal(fixture.state.closes, 1);
  }
});

test("TLS transport returns redirects and upstream errors without following or retrying", async () => {
  for (const status of [302, 503, 525]) {
    const fixture = socketFixture(splitBytes(contentLengthResponse(
      "upstream response",
      status,
      status === 302 ? "Location: https://foreign.example/leak\r\n" : "",
    )));
    const { response, body } = await readResponse(createTuziTlsFetch(fixture.connect));
    assert.equal(response.status, status);
    assert.equal(body, "upstream response");
    if (status === 302) assert.equal(response.headers.get("location"), "https://foreign.example/leak");
    assert.equal(fixture.state.calls.length, 1);
    assert.equal(fixture.state.closes, 1);
  }
});
