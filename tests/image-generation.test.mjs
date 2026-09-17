import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { once } from "node:events";
import { existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import * as workerModule from "../worker.js";

const root = resolve(import.meta.dirname, "..");
const endpoint = "https://seedance3-pro.com/api/images/generate";

function imageRequest({ prompt = "A lime robot in a dark studio", image } = {}) {
  const form = new FormData();
  form.set("prompt", prompt);
  if (image) {
    form.set("image", image, "reference.png");
  }
  return new Request(endpoint, { method: "POST", body: form });
}

function successEnv(overrides = {}) {
  return {
    TUZI_API_KEY: "test-tuzi-key",
    IMAGE_RATE_LIMITER: { limit: async () => ({ success: true }) },
    ...overrides
  };
}

test("Worker exposes the GPT Image 2 generation handler", () => {
  assert.equal(typeof workerModule.handleImageGenerationRequest, "function");
});

test("one ignored env file drives local development and Worker secret sync", () => {
  const content = readFileSync(resolve(root, ".env.local.example"), "utf8");
  assert.match(content, /^TUZI_API_KEY=replace_with_your_key\s*$/);
  assert.equal(existsSync(resolve(root, ".dev.vars.example")), false);

  const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
  assert.equal(packageJson.scripts["sync:worker-secrets"], "wrangler secret bulk .env.local");
  assert.equal(packageJson.scripts["deploy:worker"], "npm run sync:worker-secrets && wrangler deploy");

  const wrangler = readFileSync(resolve(root, "wrangler.toml"), "utf8");
  assert.match(wrangler, /workers_dev\s*=\s*false/);
});

test("text-to-image calls Tuzi generations with the fixed safe contract", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return Response.json({ data: [{ url: "https://cdn.example/generated.png" }] });
  };

  const response = await workerModule.handleImageGenerationRequest(
    imageRequest(),
    successEnv(),
    { fetchImpl }
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://api.tu-zi.com/v1/images/generations");
  assert.equal(calls[0].init.headers.Authorization, "Bearer test-tuzi-key");
  assert.equal(calls[0].init.headers["Content-Type"], "application/json");
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    model: "gpt-image-2",
    prompt: "A lime robot in a dark studio",
    n: 1,
    size: "1024x1024",
    response_format: "b64_json"
  });
  assert.deepEqual(body, {
    success: true,
    mode: "text-to-image",
    image: { url: "https://cdn.example/generated.png" }
  });
});

test("image-to-image calls Tuzi edits with multipart image input", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return Response.json({ data: [{ b64_json: "aW1hZ2U=" }] });
  };
  const reference = new Blob([new Uint8Array([137, 80, 78, 71])], { type: "image/png" });

  const response = await workerModule.handleImageGenerationRequest(
    imageRequest({ prompt: "Keep the subject and add neon rain", image: reference }),
    successEnv(),
    { fetchImpl }
  );
  const body = await response.json();

  assert.equal(calls[0].url, "https://api.tu-zi.com/v1/images/edits");
  assert.equal(calls[0].init.headers.Authorization, "Bearer test-tuzi-key");
  assert.equal(calls[0].init.headers["Content-Type"], undefined);
  assert.ok(calls[0].init.body instanceof FormData);
  assert.equal(calls[0].init.body.get("model"), "gpt-image-2");
  assert.equal(calls[0].init.body.get("prompt"), "Keep the subject and add neon rain");
  assert.equal(calls[0].init.body.get("n"), "1");
  assert.equal(calls[0].init.body.get("size"), "1024x1024");
  assert.equal(calls[0].init.body.get("response_format"), "b64_json");
  assert.equal(calls[0].init.body.get("image").type, "image/png");
  assert.deepEqual(body, {
    success: true,
    mode: "image-to-image",
    image: { dataUrl: "data:image/png;base64,aW1hZ2U=" }
  });
});

test("generation rejects missing configuration, invalid inputs, and exhausted rate limits", async () => {
  let fetchCalls = 0;
  const fetchImpl = async () => {
    fetchCalls += 1;
    return Response.json({});
  };

  const missingKey = await workerModule.handleImageGenerationRequest(imageRequest(), {}, { fetchImpl });
  assert.equal(missingKey.status, 503);

  const missingLimiter = await workerModule.handleImageGenerationRequest(
    imageRequest(),
    successEnv({ IMAGE_RATE_LIMITER: undefined }),
    { fetchImpl }
  );
  assert.equal(missingLimiter.status, 503);

  const blankPrompt = await workerModule.handleImageGenerationRequest(
    imageRequest({ prompt: "   " }),
    successEnv(),
    { fetchImpl }
  );
  assert.equal(blankPrompt.status, 400);

  const wrongType = await workerModule.handleImageGenerationRequest(
    imageRequest({ image: new Blob(["not an image"], { type: "text/plain" }) }),
    successEnv(),
    { fetchImpl }
  );
  assert.equal(wrongType.status, 400);

  const rateLimited = await workerModule.handleImageGenerationRequest(
    imageRequest(),
    successEnv({ IMAGE_RATE_LIMITER: { limit: async () => ({ success: false }) } }),
    { fetchImpl }
  );
  assert.equal(rateLimited.status, 429);
  assert.equal(fetchCalls, 0);
});

test("generation rejects unsafe multipart shapes before provider work", async () => {
  let fetchCalls = 0;
  const fetchImpl = async () => {
    fetchCalls += 1;
    return Response.json({});
  };

  const filePrompt = new FormData();
  filePrompt.set("prompt", new Blob(["not text"], { type: "text/plain" }), "prompt.txt");
  const filePromptResponse = await workerModule.handleImageGenerationRequest(
    new Request(endpoint, { method: "POST", body: filePrompt }),
    successEnv(),
    { fetchImpl }
  );
  assert.equal(filePromptResponse.status, 400);

  const extraField = new FormData();
  extraField.set("prompt", "A safe prompt");
  extraField.set("unexpected", "value");
  const extraFieldResponse = await workerModule.handleImageGenerationRequest(
    new Request(endpoint, { method: "POST", body: extraField }),
    successEnv(),
    { fetchImpl }
  );
  assert.equal(extraFieldResponse.status, 400);

  const oversizedResponse = await workerModule.handleImageGenerationRequest(
    new Request(endpoint, {
      method: "POST",
      body: new FormData(),
      headers: { "content-length": String(13 * 1024 * 1024) }
    }),
    successEnv(),
    { fetchImpl }
  );
  assert.equal(oversizedResponse.status, 413);
  assert.equal(fetchCalls, 0);
});

test("Worker rejects cross-site browser calls to the paid image endpoint", async () => {
  const form = new FormData();
  form.set("prompt", "Spend someone else's quota");
  const response = await workerModule.default.fetch(
    new Request(endpoint, {
      method: "POST",
      body: form,
      headers: { origin: "https://attacker.example" }
    }),
    successEnv(),
    { waitUntil() {} }
  );

  assert.equal(response.status, 403);
  assert.notEqual(response.headers.get("access-control-allow-origin"), "*");
});

test("provider image URLs must be HTTPS", async () => {
  const response = await workerModule.handleImageGenerationRequest(
    imageRequest(),
    successEnv(),
    { fetchImpl: async () => Response.json({ data: [{ url: "javascript:alert(document.domain)" }] }) }
  );

  assert.equal(response.status, 502);
  assert.match((await response.json()).message, /usable image/i);
});

test("provider failures are bounded and never expose the API key", async () => {
  const response = await workerModule.handleImageGenerationRequest(
    imageRequest(),
    successEnv(),
    {
      fetchImpl: async () => new Response(JSON.stringify({ error: { message: "provider rejected prompt; Bearer test-tuzi-key" } }), {
        status: 400,
        headers: { "content-type": "application/json" }
      })
    }
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.match(body.message, /provider rejected prompt/i);
  assert.doesNotMatch(JSON.stringify(body), /test-tuzi-key/);
});

test("local Express route proxies a text-to-image request through the shared adapter", async (t) => {
  const upstream = createServer((request, response) => {
    assert.equal(request.url, "/v1/images/generations");
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ data: [{ url: "https://cdn.example/local.png" }] }));
  });
  upstream.listen(0, "127.0.0.1");
  await once(upstream, "listening");
  const upstreamPort = upstream.address().port;

  const probe = createServer();
  probe.listen(0, "127.0.0.1");
  await once(probe, "listening");
  const localPort = probe.address().port;
  await new Promise((resolveClose) => probe.close(resolveClose));

  const child = spawn(process.execPath, ["server.local.js"], {
    cwd: root,
    env: {
      ...process.env,
      PORT: String(localPort),
      TUZI_API_KEY: "local-test-key",
      TUZI_API_BASE: `http://127.0.0.1:${upstreamPort}`
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  t.after(async () => {
    child.kill();
    upstream.close();
    await Promise.allSettled([once(child, "exit"), once(upstream, "close")]);
  });

  await Promise.race([
    new Promise((resolveReady, rejectReady) => {
      child.stdout.on("data", (chunk) => {
        if (chunk.toString().includes("Local CMS running")) resolveReady();
      });
      child.once("exit", (code) => rejectReady(new Error(`Local server exited early (${code})`)));
    }),
    new Promise((_, rejectTimeout) => setTimeout(() => rejectTimeout(new Error("Local server start timed out")), 5000))
  ]);

  const form = new FormData();
  form.set("prompt", "Local text-to-image test");
  const response = await fetch(`http://127.0.0.1:${localPort}/api/images/generate`, {
    method: "POST",
    body: form
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body.image, { url: "https://cdn.example/local.png" });
});

test("frontend image client posts first-party multipart requests and surfaces errors", async () => {
  const modulePath = resolve(root, "app", "image-generation.mjs");
  assert.ok(existsSync(modulePath), "expected app/image-generation.mjs");
  const { requestImageGeneration } = await import(pathToFileURL(modulePath));
  const calls = [];
  const referenceFile = new Blob([new Uint8Array([137, 80, 78, 71])], { type: "image/png" });

  const result = await requestImageGeneration({
    prompt: "Keep the subject and change the background",
    referenceFile,
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return Response.json({ success: true, image: { url: "https://cdn.example/frontend.png" } });
    }
  });

  assert.equal(calls[0].url, "/api/images/generate");
  assert.equal(calls[0].init.method, "POST");
  assert.ok(calls[0].init.body instanceof FormData);
  assert.equal(calls[0].init.body.get("prompt"), "Keep the subject and change the background");
  assert.equal(calls[0].init.body.get("image").type, "image/png");
  assert.deepEqual(result.image, { url: "https://cdn.example/frontend.png" });

  await assert.rejects(
    () => requestImageGeneration({
      prompt: "Retry me",
      fetchImpl: async () => Response.json({ success: false, message: "Generation limit reached." }, { status: 429 })
    }),
    /Generation limit reached/i
  );

  await assert.rejects(
    () => requestImageGeneration({
      prompt: "Unsafe result",
      fetchImpl: async () => Response.json({ success: true, image: { url: "javascript:alert(1)" } })
    }),
    /invalid image URL/i
  );
});
