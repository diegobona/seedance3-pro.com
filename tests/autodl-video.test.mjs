import assert from "node:assert/strict";
import test from "node:test";

import * as autodlVideo from "../scripts/autodl-video.mjs";

const { mapAutodlVideoResolution } = autodlVideo;

test("maps product resolution and aspect ratio to the exact AutoDL input", () => {
  assert.deepEqual(
    [
      ["480p", "9:16"],
      ["480p", "16:9"],
      ["480p", "1:1"],
      ["768p", "9:16"],
      ["768p", "16:9"],
      ["768p", "1:1"]
    ].map(([resolution, aspectRatio]) => mapAutodlVideoResolution(resolution, aspectRatio)),
    ["480p竖", "480p横", "480p(1:1)", "768p竖", "768p横", "768p(1:1)"]
  );
});

test("exposes a JSON preflight that can return a parsed route payload", () => {
  assert.equal(typeof autodlVideo.preflightVideoGenerationRequest, "function");
});

function videoRequest(body, headers = {}) {
  return new Request("https://seedance3-pro.com/api/video/generate", {
    method: "POST",
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...headers
    },
    body
  });
}

async function assertPreflightRejected(request, status, messagePattern) {
  const result = await autodlVideo.preflightVideoGenerationRequest(request);
  assert.equal(result.ok, false);
  assert.equal(result.response.status, status);
  assert.match((await result.response.json()).message, messagePattern);
}

test("preflight trims and returns a validated payload after consuming the body once", async () => {
  const request = videoRequest(JSON.stringify({
    prompt: "  sunrise over mountains  ",
    duration: 10,
    resolution: "768p",
    aspectRatio: "16:9"
  }));

  const result = await autodlVideo.preflightVideoGenerationRequest(request);

  assert.deepEqual(result, {
    ok: true,
    payload: {
      prompt: "sunrise over mountains",
      duration: 10,
      resolution: "768p",
      aspectRatio: "16:9"
    }
  });
  assert.equal(request.bodyUsed, true);
});

test("preflight requires JSON and enforces declared and actual body bounds", async () => {
  const valid = JSON.stringify({ prompt: "x", duration: 5, resolution: "480p", aspectRatio: "9:16" });
  await assertPreflightRejected(
    videoRequest(valid, { "content-type": "text/plain" }),
    415,
    /application\/json/i
  );
  await assertPreflightRejected(
    videoRequest(valid, { "content-length": "999999" }),
    413,
    /too large/i
  );
  await assertPreflightRejected(
    videoRequest(`{"prompt":"${"x".repeat(20_000)}","duration":5,"resolution":"480p","aspectRatio":"9:16"}`),
    413,
    /too large/i
  );
});

test("preflight rejects malformed JSON, duplicate keys, and unexpected fields", async () => {
  await assertPreflightRejected(videoRequest("{"), 400, /invalid json/i);
  await assertPreflightRejected(
    videoRequest('{"prompt":"first","prompt":"second","duration":5,"resolution":"480p","aspectRatio":"9:16"}'),
    400,
    /duplicate/i
  );
  await assertPreflightRejected(
    videoRequest(JSON.stringify({ prompt: "x", duration: 5, resolution: "480p", aspectRatio: "9:16", admin: true })),
    400,
    /unexpected/i
  );
});

test("preflight validates every product input exactly", async () => {
  const cases = [
    [{ prompt: " ", duration: 5, resolution: "480p", aspectRatio: "9:16" }, /prompt is required/i],
    [{ prompt: "x".repeat(10_001), duration: 5, resolution: "480p", aspectRatio: "9:16" }, /10,000/],
    [{ prompt: "x", duration: 6, resolution: "480p", aspectRatio: "9:16" }, /5, 10, or 15/],
    [{ prompt: "x", duration: 5, resolution: "1080p", aspectRatio: "9:16" }, /480p or 768p/],
    [{ prompt: "x", duration: 5, resolution: "480p", aspectRatio: "4:3" }, /9:16, 16:9, or 1:1/],
    [{ prompt: "x", duration: 5, resolution: "480p" }, /aspect ratio/i]
  ];

  for (const [payload, messagePattern] of cases) {
    await assertPreflightRejected(videoRequest(JSON.stringify(payload)), 400, messagePattern);
  }
});

test("exposes an AutoDL video task submitter", () => {
  assert.equal(typeof autodlVideo.submitAutodlVideoTask, "function");
});

async function captureError(action) {
  try {
    await action();
  } catch (error) {
    return error;
  }
  assert.fail("Expected action to reject");
}

test("submit calls the exact workflow endpoint with raw authorization and mapped JSON", async () => {
  let observed;
  let timeoutMs;
  const signal = { test: "signal" };
  const result = await autodlVideo.submitAutodlVideoTask({
    prompt: "animate a paper dragon",
    duration: 15,
    resolution: "768p",
    aspectRatio: "1:1"
  }, {
    token: "autodl-secret",
    signalFactory(value) {
      timeoutMs = value;
      return signal;
    },
    async fetchImpl(url, init) {
      observed = { url, init };
      return Response.json({
        code: "Success",
        data: { task_id: "provider-task-123", status: "QUEUED" },
        msg: ""
      });
    }
  });

  assert.deepEqual(result, { providerTaskId: "provider-task-123" });
  assert.equal(observed.url, "https://autodl.art/api/v1/comfyui/comfyui_workflow/minimax_h3_lightx2v_no_pic");
  assert.equal(observed.init.method, "POST");
  assert.deepEqual(observed.init.headers, {
    Authorization: "autodl-secret",
    "Content-Type": "application/json"
  });
  assert.deepEqual(JSON.parse(observed.init.body), {
    prompt: "animate a paper dragon",
    duration: 15,
    resolution: "768p(1:1)"
  });
  assert.equal(timeoutMs, 15_000);
  assert.equal(observed.init.signal, signal);
});

test("submit validates configuration before calling the provider", async () => {
  let called = false;
  const error = await captureError(() => autodlVideo.submitAutodlVideoTask({
    prompt: "x",
    duration: 5,
    resolution: "480p",
    aspectRatio: "9:16"
  }, {
    token: " ",
    fetchImpl() {
      called = true;
    }
  }));

  assert.equal(called, false);
  assert.equal(error.name, "AutodlProviderError");
  assert.equal(error.code, "AUTODL_CONFIGURATION_ERROR");
  assert.equal(error.retriable, false);
});

test("submit turns definite 4xx failures into bounded, redacted, non-retriable errors", async () => {
  const token = "never-leak-this-token";
  const error = await captureError(() => autodlVideo.submitAutodlVideoTask({
    prompt: "x",
    duration: 5,
    resolution: "480p",
    aspectRatio: "16:9"
  }, {
    token,
    async fetchImpl() {
      return Response.json({ message: `${token} ${"x".repeat(2_000)}` }, { status: 400 });
    }
  }));

  assert.equal(error.name, "AutodlProviderError");
  assert.equal(error.code, "AUTODL_PROVIDER_FAILURE");
  assert.equal(error.retriable, false);
  assert.equal(error.providerStatus, 400);
  assert.equal(error.message.includes(token), false);
  assert.ok(error.message.length <= 500);
});

test("submit rejects malformed success replies as non-retriable provider failures", async () => {
  for (const response of [
    new Response("not json", { status: 200, headers: { "content-type": "application/json" } }),
    Response.json({ code: "Success", data: { id: "wrong-field" } })
  ]) {
    const error = await captureError(() => autodlVideo.submitAutodlVideoTask({
      prompt: "x",
      duration: 5,
      resolution: "480p",
      aspectRatio: "1:1"
    }, {
      token: "secret",
      async fetchImpl() {
        return response;
      }
    }));
    assert.equal(error.name, "AutodlProviderError");
    assert.equal(error.code, "AUTODL_PROVIDER_FAILURE");
    assert.equal(error.retriable, false);
  }
});

function responseWithFailingBody(error) {
  return new Response(new ReadableStream({
    pull(controller) {
      controller.error(error);
    }
  }), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}

test("submit transport failures stay ambiguous and non-retriable before and after response headers", async () => {
  const failures = [
    {
      error: new DOMException("timed out", "TimeoutError"),
      returnResponse: false
    },
    {
      error: new Error("network down"),
      returnResponse: false
    },
    {
      error: new DOMException("timed out while reading", "TimeoutError"),
      returnResponse: true
    },
    {
      error: new Error("connection reset while reading"),
      returnResponse: true
    }
  ];

  for (const { error: transportError, returnResponse } of failures) {
    const error = await captureError(() => autodlVideo.submitAutodlVideoTask({
      prompt: "x",
      duration: 5,
      resolution: "480p",
      aspectRatio: "9:16"
    }, {
      token: "secret",
      async fetchImpl() {
        if (returnResponse) return responseWithFailingBody(transportError);
        throw transportError;
      }
    }));

    assert.equal(error.name, "AutodlProviderError");
    assert.equal(error.code, "AUTODL_SUBMISSION_UNKNOWN");
    assert.equal(error.ambiguous, true);
    assert.equal(error.retriable, false);
  }
});

test("exposes an AutoDL video task query", () => {
  assert.equal(typeof autodlVideo.queryAutodlVideoTask, "function");
});

function queryReply(status, results = []) {
  return Response.json({
    code: "Success",
    data: { task_id: "provider-task", status, results },
    msg: ""
  });
}

test("query calls the exact encoded task endpoint with a 15-second timeout", async () => {
  let observed;
  let timeoutMs;
  const signal = { test: "query-signal" };
  const result = await autodlVideo.queryAutodlVideoTask("task/id ?", {
    token: "autodl-secret",
    signalFactory(value) {
      timeoutMs = value;
      return signal;
    },
    async fetchImpl(url, init) {
      observed = { url, init };
      return queryReply("RUNNING");
    }
  });

  assert.deepEqual(result, { status: "running", terminal: false });
  assert.equal(observed.url, "https://autodl.art/api/v1/comfyui/comfyui_workflow/result/task%2Fid%20%3F");
  assert.equal(observed.init.method, "GET");
  assert.deepEqual(observed.init.headers, { Authorization: "autodl-secret" });
  assert.equal(timeoutMs, 15_000);
  assert.equal(observed.init.signal, signal);
});

test("query normalizes exact QUEUED, RUNNING, and FAILED provider statuses", async () => {
  const expected = [
    ["QUEUED", { status: "queued", terminal: false }],
    ["RUNNING", { status: "running", terminal: false }],
    ["FAILED", { status: "failed", terminal: true }]
  ];
  for (const [providerStatus, normalized] of expected) {
    const result = await autodlVideo.queryAutodlVideoTask("provider-task", {
      token: "secret",
      async fetchImpl() {
        return queryReply(providerStatus);
      }
    });
    assert.deepEqual(result, normalized);
  }
});

test("query accepts SUCCESS and completed only with exactly one usable HTTPS video/mp4 output", async () => {
  for (const providerStatus of ["SUCCESS", "completed"]) {
    const result = await autodlVideo.queryAutodlVideoTask("provider-task", {
      token: "secret",
      async fetchImpl() {
        return queryReply(providerStatus, [{
          url: "https://cdn.example.com/generated/video.mp4",
          type: "video",
          file_type: "mp4",
          output_type: "output"
        }]);
      }
    });
    assert.deepEqual(result, {
      status: "succeeded",
      terminal: true,
      videoUrl: "https://cdn.example.com/generated/video.mp4"
    });
  }
});

test("query leaves every other status casing nonterminal and retriable", async () => {
  const unrecognizedStatuses = [
    "queued",
    "Queued",
    "running",
    "Running",
    "success",
    "Success",
    "failed",
    "Failed",
    "Completed",
    "COMPLETED",
    "SUCCEEDED",
    " RUNNING "
  ];

  for (const providerStatus of unrecognizedStatuses) {
    const result = await autodlVideo.queryAutodlVideoTask("provider-task", {
      token: "secret",
      async fetchImpl() {
        return queryReply(providerStatus, [{
          url: "https://cdn.example.com/generated/video.mp4",
          type: "video",
          file_type: "mp4",
          output_type: "output"
        }]);
      }
    });

    assert.deepEqual(result, {
      status: "unknown",
      providerStatus,
      terminal: false,
      retriable: true
    });
  }
});

test("query rejects unsafe URLs, ambiguous videos, and malformed success result shapes", async () => {
  const video = (url) => ({
    url,
    type: "video",
    file_type: "mp4",
    output_type: "output"
  });
  const invalidResults = [
    [video("javascript:alert(1)")],
    [video("http://cdn.example.com/video.mp4")],
    [video("not a url")],
    [video("https://cdn.example.com/one.mp4"), video("https://cdn.example.com/two.mp4")],
    [{ url: "https://cdn.example.com/video.mp4", type: "image", file_type: "mp4", output_type: "output" }],
    { url: "https://cdn.example.com/video.mp4" }
  ];

  for (const results of invalidResults) {
    const error = await captureError(() => autodlVideo.queryAutodlVideoTask("provider-task", {
      token: "secret",
      async fetchImpl() {
        return queryReply("SUCCESS", results);
      }
    }));
    assert.equal(error.name, "AutodlProviderError");
    assert.equal(error.code, "AUTODL_PROVIDER_FAILURE");
    assert.equal(error.retriable, false);
  }
});

test("query marks network, timeout, 429, and 5xx failures retriable and preserves safe Retry-After", async () => {
  const cases = [
    {
      fetchImpl: async () => { throw new Error("network down"); },
      providerStatus: undefined,
      retryAfterSeconds: undefined
    },
    {
      fetchImpl: async () => { throw new DOMException("timed out", "TimeoutError"); },
      providerStatus: undefined,
      retryAfterSeconds: undefined
    },
    {
      fetchImpl: async () => Response.json({ message: "slow down" }, {
        status: 429,
        headers: { "retry-after": "12" }
      }),
      providerStatus: 429,
      retryAfterSeconds: 12
    },
    {
      fetchImpl: async () => Response.json({ message: "temporary" }, { status: 503 }),
      providerStatus: 503,
      retryAfterSeconds: undefined
    }
  ];

  for (const item of cases) {
    const error = await captureError(() => autodlVideo.queryAutodlVideoTask("provider-task", {
      token: "secret",
      fetchImpl: item.fetchImpl
    }));
    assert.equal(error.name, "AutodlProviderError");
    assert.equal(error.retriable, true);
    assert.equal(error.providerStatus, item.providerStatus);
    assert.equal(error.retryAfterSeconds, item.retryAfterSeconds);
  }
});

test("query treats timeout and network failures while reading a response body as retriable", async () => {
  for (const transportError of [
    new DOMException("timed out while reading", "TimeoutError"),
    new Error("connection reset while reading")
  ]) {
    const error = await captureError(() => autodlVideo.queryAutodlVideoTask("provider-task", {
      token: "secret",
      async fetchImpl() {
        return responseWithFailingBody(transportError);
      }
    }));

    assert.equal(error.name, "AutodlProviderError");
    assert.equal(error.code, "AUTODL_PROVIDER_FAILURE");
    assert.equal(error.ambiguous, false);
    assert.equal(error.retriable, true);
    assert.equal(error.providerStatus, 200);
  }
});

test("query does not retry provider redirects", async () => {
  const error = await captureError(() => autodlVideo.queryAutodlVideoTask("provider-task", {
    token: "secret",
    async fetchImpl() {
      return new Response(null, {
        status: 302,
        headers: {
          location: "https://elsewhere.example.com/",
          "retry-after": "12"
        }
      });
    }
  }));

  assert.equal(error.name, "AutodlProviderError");
  assert.equal(error.providerStatus, 302);
  assert.equal(error.retriable, false);
  assert.equal(error.retryAfterSeconds, undefined);
});

test("query redacts provider failures and keeps unknown statuses nonterminal and retriable", async () => {
  const token = "query-secret-token";
  const providerError = await captureError(() => autodlVideo.queryAutodlVideoTask("provider-task", {
    token,
    async fetchImpl() {
      return Response.json({ message: `${token} unavailable` }, { status: 503 });
    }
  }));
  assert.equal(providerError.message.includes(token), false);

  const unknown = await autodlVideo.queryAutodlVideoTask("provider-task", {
    token,
    async fetchImpl() {
      return queryReply("PAUSED_FOR_REVIEW");
    }
  });
  assert.deepEqual(unknown, {
    status: "unknown",
    providerStatus: "PAUSED_FOR_REVIEW",
    terminal: false,
    retriable: true
  });
});
