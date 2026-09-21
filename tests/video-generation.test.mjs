import assert from "node:assert/strict";
import test from "node:test";

const LOCAL_TASK_ID = "123e4567-e89b-42d3-a456-426614174000";

function jsonResponse(payload, { status = 200, headers = {} } = {}) {
  return Response.json(payload, { status, headers });
}

test("video generation submits a fixed 480p payload and polls only the local task id", async () => {
  const { requestVideoGeneration } = await import("../app/video-generation.mjs");
  const calls = [];
  const updates = [];
  const responses = [
    jsonResponse({
      success: true,
      task: { id: LOCAL_TASK_ID, status: "queued" }
    }, {
      status: 202,
      headers: {
        "x-seedance-credit-cost": "5",
        "x-seedance-credit-remaining": "10"
      }
    }),
    jsonResponse({
      success: true,
      task: { id: LOCAL_TASK_ID, status: "running" }
    }, { status: 202 }),
    jsonResponse({
      success: true,
      task: {
        id: LOCAL_TASK_ID,
        status: "succeeded",
        resultUrl: "https://media.example/video.mp4"
      }
    }, {
      headers: {
        "x-seedance-credit-cost": "5",
        "x-seedance-credit-remaining": "10"
      }
    })
  ];

  const result = await requestVideoGeneration({
    prompt: "  A paper bird takes flight  ",
    duration: 5,
    resolution: "768p",
    aspectRatio: "9:16",
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return responses.shift();
    },
    waitImpl: async () => {},
    onStatus: (update) => updates.push(update)
  });

  assert.equal(calls[0].url, "/api/videos/generate");
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].init.credentials, "same-origin");
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    prompt: "A paper bird takes flight",
    duration: 5,
    resolution: "480p",
    aspectRatio: "9:16"
  });
  assert.equal(calls[1].url, `/api/videos/status?task=${encodeURIComponent(LOCAL_TASK_ID)}`);
  assert.equal(calls[2].url, calls[1].url);
  assert.ok(calls.slice(1).every(({ init }) => init.method === "GET" && init.credentials === "same-origin"));
  assert.deepEqual(updates.map(({ status }) => status), ["queued", "running"]);
  assert.deepEqual(result, {
    taskId: LOCAL_TASK_ID,
    status: "succeeded",
    videoUrl: "https://media.example/video.mp4",
    credits: { cost: 5, remaining: 10 }
  });
});

test("video generation rejects provider-like task ids before polling", async () => {
  const { requestVideoGeneration } = await import("../app/video-generation.mjs");
  let fetchCount = 0;

  await assert.rejects(requestVideoGeneration({
    prompt: "A landscape",
    fetchImpl: async () => {
      fetchCount += 1;
      return jsonResponse({ success: true, task: { id: "provider-task-123", status: "queued" } }, { status: 202 });
    }
  }), (error) => error?.code === "INVALID_VIDEO_TASK");

  assert.equal(fetchCount, 1, "an untrusted provider id must never reach the status URL");
});

test("video polling uses bounded exponential backoff", async () => {
  const { pollVideoGenerationTask } = await import("../app/video-generation.mjs");
  const delays = [];
  const responses = [
    jsonResponse({ success: true, task: { id: LOCAL_TASK_ID, status: "queued" } }, { status: 202 }),
    jsonResponse({ success: true, task: { id: LOCAL_TASK_ID, status: "running" } }, { status: 202 }),
    jsonResponse({ success: true, task: { id: LOCAL_TASK_ID, status: "running" } }, { status: 202 }),
    jsonResponse({ success: true, task: { id: LOCAL_TASK_ID, status: "running" } }, { status: 202 }),
    jsonResponse({
      success: true,
      task: { id: LOCAL_TASK_ID, status: "succeeded", resultUrl: "https://media.example/final.mp4" }
    })
  ];

  await pollVideoGenerationTask({
    taskId: LOCAL_TASK_ID,
    fetchImpl: async () => responses.shift(),
    waitImpl: async (delay) => delays.push(delay),
    initialDelayMs: 1000,
    maxDelayMs: 4000
  });

  assert.deepEqual(delays, [1000, 2000, 4000, 4000]);
});

test("video polling honors safe Retry-After on retriable responses", async () => {
  const { pollVideoGenerationTask } = await import("../app/video-generation.mjs");
  const delays = [];
  const updates = [];
  const responses = [
    jsonResponse({ success: false, code: "VIDEO_SERVICE_UNAVAILABLE", message: "Try later." }, {
      status: 503,
      headers: { "retry-after": "3" }
    }),
    jsonResponse({ success: true, retriable: true, task: { id: LOCAL_TASK_ID, status: "running" } }, {
      status: 202,
      headers: { "retry-after": "999999" }
    }),
    jsonResponse({
      success: true,
      task: { id: LOCAL_TASK_ID, status: "succeeded", resultUrl: "https://media.example/final.mp4" }
    })
  ];

  await pollVideoGenerationTask({
    taskId: LOCAL_TASK_ID,
    fetchImpl: async () => responses.shift(),
    waitImpl: async (delay) => delays.push(delay),
    initialDelayMs: 1000,
    maxDelayMs: 8000,
    maxRetryAfterMs: 30_000,
    onStatus: (update) => updates.push(update)
  });

  assert.deepEqual(delays, [3000, 2000], "unsafe Retry-After values should fall back to bounded backoff");
  assert.ok(updates.some(({ status }) => status === "retrying"));
});

test("video polling supports abort without issuing another request", async () => {
  const { pollVideoGenerationTask } = await import("../app/video-generation.mjs");
  const controller = new AbortController();
  let fetchCount = 0;

  await assert.rejects(pollVideoGenerationTask({
    taskId: LOCAL_TASK_ID,
    signal: controller.signal,
    fetchImpl: async () => {
      fetchCount += 1;
      return jsonResponse({ success: true, task: { id: LOCAL_TASK_ID, status: "queued" } }, { status: 202 });
    },
    waitImpl: async () => controller.abort()
  }), (error) => error?.name === "AbortError");

  assert.equal(fetchCount, 1);
});

test("video polling times out client-side without canceling the server task", async () => {
  const { pollVideoGenerationTask } = await import("../app/video-generation.mjs");
  let now = 0;
  let fetchCount = 0;

  await assert.rejects(pollVideoGenerationTask({
    taskId: LOCAL_TASK_ID,
    fetchImpl: async () => {
      fetchCount += 1;
      return jsonResponse({ success: true, task: { id: LOCAL_TASK_ID, status: "running" } }, { status: 202 });
    },
    waitImpl: async (delay) => { now += delay; },
    nowImpl: () => now,
    maxDurationMs: 1500,
    initialDelayMs: 1000
  }), (error) => error?.code === "VIDEO_CLIENT_TIMEOUT" && error?.terminal === false);

  assert.equal(fetchCount, 2);
});

test("video polling rejects unsafe terminal URLs", async () => {
  const { pollVideoGenerationTask } = await import("../app/video-generation.mjs");

  await assert.rejects(pollVideoGenerationTask({
    taskId: LOCAL_TASK_ID,
    fetchImpl: async () => jsonResponse({
      success: true,
      task: { id: LOCAL_TASK_ID, status: "succeeded", resultUrl: "http://media.example/final.mp4" }
    })
  }), (error) => error?.code === "INVALID_VIDEO_RESULT" && error?.terminal === true);
});

test("video errors consistently expose valid credit headers", async () => {
  const { pollVideoGenerationTask } = await import("../app/video-generation.mjs");

  await assert.rejects(pollVideoGenerationTask({
    taskId: LOCAL_TASK_ID,
    fetchImpl: async () => jsonResponse({
      success: false,
      code: "VIDEO_GENERATION_FAILED",
      message: "Video generation failed. Your credits were refunded.",
      task: { id: LOCAL_TASK_ID, status: "failed" }
    }, {
      status: 502,
      headers: {
        "x-seedance-credit-cost": "15",
        "x-seedance-credit-remaining": "15"
      }
    })
  }), (error) => {
    assert.equal(error.code, "VIDEO_GENERATION_FAILED");
    assert.equal(error.taskStatus, "failed");
    assert.equal(error.terminal, true);
    assert.deepEqual(error.credits, { cost: 15, remaining: 15 });
    return true;
  });
});
