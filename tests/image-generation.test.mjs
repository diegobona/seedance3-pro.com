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

function imageRequest({
  prompt = "A lime robot in a dark studio",
  image,
  quantity = "1",
  resolution = "1K",
  size = "1024x1024"
} = {}) {
  const form = new FormData();
  form.set("prompt", prompt);
  form.set("quantity", quantity);
  form.set("resolution", resolution);
  form.set("size", size);
  if (image) {
    form.set("image", image, "reference.png");
  }
  return new Request(endpoint, {
    method: "POST",
    body: form,
    headers: { "x-seedance-image-quantity": quantity }
  });
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
  assert.deepEqual(content.trim().split(/\r?\n/), [
    "TUZI_API_KEY=replace_with_your_key",
    "AUTODL_TOKEN=replace_with_your_token"
  ]);
  assert.equal(existsSync(resolve(root, ".dev.vars.example")), false);

  const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
  assert.equal(packageJson.scripts["sync:worker-secrets"], "wrangler secret bulk .env.local");
  assert.equal(
    packageJson.scripts["deploy:worker"],
    "npm run build && wrangler deploy --secrets-file .env.local"
  );

  const wrangler = readFileSync(resolve(root, "wrangler.toml"), "utf8");
  assert.match(wrangler, /workers_dev\s*=\s*false/);
});

test("text-to-image maps the trial 1K resolution to a supported Tuzi quality", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return Response.json({ data: [
      { url: "https://cdn.example/generated-1.png" },
      { url: "https://cdn.example/generated-2.png" },
      { url: "https://cdn.example/generated-3.png" }
    ] });
  };

  const response = await workerModule.handleImageGenerationRequest(
    imageRequest({ quantity: "3", resolution: "1K", size: "1536x1024" }),
    successEnv(),
    { fetchImpl }
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("x-seedance-validated-image-count"), "3");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://api.tu-zi.com/v1/images/generations");
  assert.equal(calls[0].init.headers.Authorization, "Bearer test-tuzi-key");
  assert.equal(calls[0].init.headers["Content-Type"], "application/json");
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    model: "gpt-image-2",
    prompt: "A lime robot in a dark studio",
    n: 3,
    quality: "medium",
    size: "1536x1024",
    response_format: "b64_json"
  });
  assert.deepEqual(body, {
    success: true,
    mode: "text-to-image",
    image: { url: "https://cdn.example/generated-1.png" },
    images: [
      { url: "https://cdn.example/generated-1.png" },
      { url: "https://cdn.example/generated-2.png" },
      { url: "https://cdn.example/generated-3.png" }
    ]
  });
});

test("image-to-image calls Tuzi edits with multipart image input", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return Response.json({ data: [
      { b64_json: "iVBORw0KGgo=" },
      { b64_json: "iVBORw0KGgo=" }
    ] });
  };
  const reference = new Blob([new Uint8Array([137, 80, 78, 71])], { type: "image/png" });

  const response = await workerModule.handleImageGenerationRequest(
    imageRequest({
      prompt: "Keep the subject and add neon rain",
      image: reference,
      quantity: "2",
      resolution: "1K",
      size: "1024x1536"
    }),
    successEnv(),
    { fetchImpl }
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://api.tu-zi.com/v1/images/edits");
  assert.equal(calls[0].init.headers.Authorization, "Bearer test-tuzi-key");
  assert.equal(calls[0].init.headers["Content-Type"], undefined);
  assert.ok(calls[0].init.body instanceof FormData);
  assert.equal(calls[0].init.body.get("model"), "gpt-image-2");
  assert.equal(calls[0].init.body.get("prompt"), "Keep the subject and add neon rain");
  assert.equal(calls[0].init.body.get("n"), "2");
  assert.equal(calls[0].init.body.get("quality"), "medium");
  assert.equal(calls[0].init.body.get("size"), "1024x1536");
  assert.equal(calls[0].init.body.get("response_format"), "b64_json");
  assert.equal(calls[0].init.body.get("image").type, "image/png");
  assert.deepEqual(body, {
    success: true,
    mode: "image-to-image",
    image: { dataUrl: "data:image/png;base64,iVBORw0KGgo=" },
    images: [
      { dataUrl: "data:image/png;base64,iVBORw0KGgo=" },
      { dataUrl: "data:image/png;base64,iVBORw0KGgo=" }
    ]
  });
});

test("generation rejects invalid image settings before provider work", async () => {
  let fetchCalls = 0;
  const fetchImpl = async () => {
    fetchCalls += 1;
    return Response.json({});
  };

  for (const fields of [
    { quantity: "4" },
    { resolution: "2K" },
    { resolution: "4K" },
    { size: "2048x2048" }
  ]) {
    const response = await workerModule.handleImageGenerationRequest(
      imageRequest(fields),
      successEnv(),
      { fetchImpl }
    );
    assert.equal(response.status, 400);
  }

  const duplicate = new FormData();
  duplicate.set("prompt", "A safe prompt");
  duplicate.append("quantity", "1");
  duplicate.append("quantity", "2");
  duplicate.set("resolution", "1K");
  duplicate.set("size", "1024x1024");
  const duplicateResponse = await workerModule.handleImageGenerationRequest(
    new Request(endpoint, { method: "POST", body: duplicate }),
    successEnv(),
    { fetchImpl }
  );
  assert.equal(duplicateResponse.status, 400);
  assert.equal(fetchCalls, 0);
});

test("generation rejects a missing or mismatched quantity header before provider work", async () => {
  let fetchCalls = 0;
  const fetchImpl = async () => {
    fetchCalls += 1;
    return Response.json({});
  };
  const form = new FormData();
  form.set("prompt", "Three images for the price of one");
  form.set("quantity", "3");
  form.set("resolution", "1K");
  form.set("size", "1024x1024");

  const missingHeader = await workerModule.handleImageGenerationRequest(
    new Request(endpoint, { method: "POST", body: form }),
    successEnv(),
    { fetchImpl }
  );
  assert.equal(missingHeader.status, 400);

  const mismatchedHeader = await workerModule.handleImageGenerationRequest(
    new Request(endpoint, {
      method: "POST",
      body: form,
      headers: { "x-seedance-image-quantity": "1" }
    }),
    successEnv(),
    { fetchImpl }
  );
  assert.equal(mismatchedHeader.status, 400);
  assert.equal(fetchCalls, 0);
});

test("legacy single-image requests without quantity metadata remain compatible", async () => {
  const form = new FormData();
  form.set("prompt", "A legacy single-image request");
  let providerBody;
  const response = await workerModule.handleImageGenerationRequest(
    new Request(endpoint, { method: "POST", body: form }),
    successEnv(),
    {
      fetchImpl: async (_url, init) => {
        providerBody = JSON.parse(init.body);
        return Response.json({ data: [{ url: "https://cdn.example/legacy.png" }] });
      }
    }
  );

  assert.equal(response.status, 200);
  assert.equal(providerBody.n, 1);
  assert.equal(providerBody.quality, "medium");
  assert.deepEqual((await response.json()).images, [{ url: "https://cdn.example/legacy.png" }]);
});

test("all usable provider images are returned while keeping the first image compatible", async () => {
  const response = await workerModule.handleImageGenerationRequest(
    imageRequest({ quantity: "3" }),
    successEnv(),
    {
      fetchImpl: async () => Response.json({
        data: [
          { url: "https://cdn.example/one.png" },
          { b64_json: "iVBORw0KGgo=" },
          { url: "https://cdn.example/three.png" }
        ]
      })
    }
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body.image, { url: "https://cdn.example/one.png" });
  assert.deepEqual(body.images, [
    { url: "https://cdn.example/one.png" },
    { dataUrl: "data:image/png;base64,iVBORw0KGgo=" },
    { url: "https://cdn.example/three.png" }
  ]);
});

test("provider output count must match the requested quantity", async () => {
  const response = await workerModule.handleImageGenerationRequest(
    imageRequest({ quantity: "3" }),
    successEnv(),
    {
      fetchImpl: async () => Response.json({
        data: [
          { url: "https://cdn.example/one.png" },
          { url: "https://cdn.example/two.png" }
        ]
      })
    }
  );

  assert.equal(response.status, 502);
  assert.match((await response.json()).message, /requested number of images/i);
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
      headers: { "content-length": String(27 * 1024 * 1024) }
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

test("malformed provider base64 is rejected instead of becoming a billable image", async () => {
  const response = await workerModule.handleImageGenerationRequest(
    imageRequest(),
    successEnv(),
    { fetchImpl: async () => Response.json({ data: [{ b64_json: "abcde" }] }) }
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
  assert.deepEqual(body.images, [{ url: "https://cdn.example/local.png" }]);
});

test("local Express route rejects an explicitly empty resolution before provider work", async (t) => {
  let upstreamCalls = 0;
  const upstream = createServer((_request, response) => {
    upstreamCalls += 1;
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ data: [{ url: "https://cdn.example/unexpected.png" }] }));
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
  form.set("prompt", "Reject an explicitly empty resolution");
  form.set("quantity", "1");
  form.set("resolution", "");
  form.set("size", "1024x1024");
  const response = await fetch(`http://127.0.0.1:${localPort}/api/images/generate`, {
    method: "POST",
    headers: { "x-seedance-image-quantity": "1" },
    body: form
  });

  assert.equal(response.status, 400);
  assert.equal(upstreamCalls, 0);
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
    quantity: 3,
    resolution: "4K",
    size: "1536x1024",
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return Response.json({
        success: true,
        image: { url: "https://cdn.example/frontend.png" },
        images: [
          { url: "https://cdn.example/frontend.png" },
          { dataUrl: "data:image/png;base64,c2Vjb25k" }
        ]
      }, {
        headers: {
          "x-seedance-credit-cost": "15",
          "x-seedance-credit-remaining": "10"
        }
      });
    }
  });

  assert.equal(calls[0].url, "/api/images/generate");
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].init.headers["x-seedance-image-quantity"], "3");
  assert.ok(calls[0].init.body instanceof FormData);
  assert.equal(calls[0].init.body.get("prompt"), "Keep the subject and change the background");
  assert.equal(calls[0].init.body.get("image").type, "image/png");
  assert.equal(calls[0].init.body.get("quantity"), "3");
  assert.equal(calls[0].init.body.get("resolution"), "1K");
  assert.equal(calls[0].init.body.get("size"), "1536x1024");
  assert.deepEqual(result.image, { url: "https://cdn.example/frontend.png" });
  assert.deepEqual(result.images, [
    { url: "https://cdn.example/frontend.png" },
    { dataUrl: "data:image/png;base64,c2Vjb25k" }
  ]);
  assert.deepEqual(result.credits, { cost: 15, remaining: 10 });

  await assert.rejects(
    () => requestImageGeneration({
      prompt: "Retry me",
      fetchImpl: async () => Response.json({
        success: false,
        code: "INSUFFICIENT_CREDITS",
        message: "You need 5 credits to generate this image."
      }, {
        status: 402,
        headers: {
          "x-seedance-credit-cost": "5",
          "x-seedance-credit-remaining": "15"
        }
      })
    }),
    (error) => {
      assert.match(error.message, /need 5 credits/i);
      assert.equal(error.code, "INSUFFICIENT_CREDITS");
      assert.deepEqual(error.credits, { cost: 5, remaining: 15 });
      return true;
    }
  );

  await assert.rejects(
    () => requestImageGeneration({
      prompt: "Unsafe result",
      fetchImpl: async () => Response.json({ success: true, image: { url: "javascript:alert(1)" } })
    }),
    /invalid image URL/i
  );
});
