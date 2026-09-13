import http from "node:http";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const port = Number(process.env.CMS_EDIT_PREVIEW_PORT || 4311);
const root = resolve(import.meta.dirname, "../..");
const adminHtml = readFileSync(resolve(root, "admin/index.html"), "utf8");
const publishedPost = {
  id: "0-fixture-guide.html",
  fileName: "fixture-guide.html",
  title: "Fixture guide title",
  excerpt: "Fixture guide excerpt.",
  category: "Tutorial",
  content: "<h2>Fixture section</h2><p>Fixture body for browser verification.</p>",
};
const submittedPayloads = [];

function json(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  let body = "";
  for await (const chunk of request) body += chunk;
  return JSON.parse(body || "{}");
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || `127.0.0.1:${port}`}`);

  if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/admin/" || url.pathname === "/admin/index.html")) {
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
    response.end(adminHtml);
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/posts") {
    json(response, 200, { success: true, posts: [publishedPost] });
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/post") {
    if (url.searchParams.get("fileName") !== publishedPost.fileName) {
      json(response, 404, { success: false, message: "Article not found." });
      return;
    }
    json(response, 200, { success: true, post: publishedPost });
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/publish") {
    const payload = await readJson(request);
    submittedPayloads.push(payload);
    if (String(payload.title || "").includes("[FAIL]")) {
      json(response, 500, { success: false, message: "Fixture publish failure." });
      return;
    }
    json(response, 202, { success: true, jobId: String(payload.title || "").includes("[LOST]") ? "lost-job" : "fixture-job" });
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/job/fixture-job") {
    json(response, 200, {
      success: true,
      job: {
        status: "success",
        attempts: 1,
        output: { articleUrl: "http://127.0.0.1/fixture-guide.html" },
      },
    });
    return;
  }
  if (request.method === "GET" && url.pathname === "/test/state") {
    json(response, 200, { submittedPayloads });
    return;
  }

  response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  response.end("Not found");
});

server.listen(port, "127.0.0.1", () => {
  console.log(`CMS edit preview available at http://127.0.0.1:${port}/admin/`);
});
