import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (file) => readFileSync(resolve(root, file), "utf8");

test("TanStack Start owns the studio and API routes without replacing the homepage", () => {
  for (const file of [
    "vite.config.ts",
    "tsconfig.json",
    "tsr.config.json",
    "wrangler.jsonc",
    "src/router.tsx",
    "src/server.ts",
    "src/routes/__root.tsx",
    "src/routes/index.tsx",
  ]) {
    assert.equal(existsSync(resolve(root, file)), true, `${file} should exist`);
  }

  const packageJson = JSON.parse(read("package.json"));
  assert.match(packageJson.scripts.dev, /scripts[\\/]dev\.mjs|vite dev/);
  assert.match(packageJson.scripts.build, /vite build/);

  const vite = read("vite.config.ts");
  assert.match(vite, /cloudflare\(/);
  assert.match(vite, /tanstackStart\(/);
  assert.match(vite, /appType:\s*["']custom["']/);
  assert.match(vite, /base:\s*["']\/["']/);
  assert.match(vite, /assetsDir:\s*["']app-assets["']/);

  const server = read("src/server.ts");
  assert.match(server, /@tanstack\/react-start\/server-entry/);
  assert.match(server, /legacyWorker/);
  assert.match(server, /scheduled/);

  const wrangler = read("wrangler.jsonc");
  const wranglerConfig = JSON.parse(wrangler);
  assert.match(wrangler, /"main"\s*:\s*"\.\/src\/server\.ts"/);
  assert.match(wrangler, /"nodejs_compat"/);
  assert.match(wrangler, /seedance3-pro\.com\/app\*/);
  assert.match(wrangler, /seedance3-pro\.com\/app-assets\/\*/);
  assert.match(wrangler, /seedance3-pro\.com\/api\/\*/);
  assert.doesNotMatch(wrangler, /REPLACE_WITH_KV_NAMESPACE_ID/);
  assert.match(wrangler, /"traces"\s*:\s*\{\s*"enabled"\s*:\s*true\s*\}/);
  assert.equal(wranglerConfig.assets?.binding, "ASSETS");
  assert.deepEqual(
    wranglerConfig.assets?.run_worker_first,
    ["/api/*", "/app", "/app/", "/app/video/*", "/app/image/*", "/minimax-h3-ai-video-generator.html", "/gpt-image-2.html", "/prompt-guide", "/prompts/*"],
    "API, model pages, legacy redirects, and Coming Soon resources must reach the Worker",
  );
  assert.equal(wranglerConfig.routes.some(({ pattern }) => pattern === "seedance3-pro.com/app"), false);
  assert.equal(wranglerConfig.routes.some(({ pattern }) => pattern === "seedance3-pro.com/app*"), true);

  assert.match(server, /pathname\.startsWith\(['"]\/app-assets\/['"]\)/);
  assert.match(server, /env\.ASSETS\.fetch\(request\)/);

  const homepage = read("index.html");
  assert.match(homepage, /Seedance 3/i);
});

test("TanStack image routes use authenticated Neon credit accounting", () => {
  const balanceRoutePath = resolve(root, "src/routes/api/credits/balance.ts");
  assert.equal(existsSync(balanceRoutePath), true, "credit balance route should exist");

  const generationRoute = read("src/routes/api/images/generate.ts");
  assert.match(generationRoute, /createGenerationCreditStore/);
  assert.match(generationRoute, /creditStore/);

  const balanceRoute = read("src/routes/api/credits/balance.ts");
  assert.match(balanceRoute, /createFileRoute\(['"]\/api\/credits\/balance['"]\)/);
  assert.match(balanceRoute, /getCreditBalanceResponse/);
  assert.match(balanceRoute, /createGenerationCreditStore/);
});

test("TanStack video routes enforce the trial boundary and protected lifecycle wiring", () => {
  const generationRoutePath = resolve(root, "src/routes/api/videos/generate.ts");
  const statusRoutePath = resolve(root, "src/routes/api/videos/status.ts");
  assert.equal(existsSync(generationRoutePath), true, "video generation route should exist");
  assert.equal(existsSync(statusRoutePath), true, "video status route should exist");

  const generationRoute = read("src/routes/api/videos/generate.ts");
  assert.match(generationRoute, /createFileRoute\(['"]\/api\/videos\/generate['"]\)/);
  assert.match(generationRoute, /protectVideoGenerationStart/);
  assert.match(generationRoute, /preflightVideoGenerationRequest/);
  assert.match(generationRoute, /resolution\s*!==\s*['"]480p['"]/);
  assert.match(generationRoute, /IMAGE_RATE_LIMITER\.limit/);
  assert.match(generationRoute, /AUTODL_TOKEN/);
  assert.match(generationRoute, /DATABASE_URL/);
  assert.match(generationRoute, /request\.headers\.get\(['"]origin['"]\)/);
  assert.match(generationRoute, /new URL\(request\.url\)\.origin/);

  const statusRoute = read("src/routes/api/videos/status.ts");
  assert.match(statusRoute, /createFileRoute\(['"]\/api\/videos\/status['"]\)/);
  assert.match(statusRoute, /protectVideoGenerationPoll/);
  assert.match(statusRoute, /queryAutodlVideoTask/);
  assert.match(statusRoute, /searchParams\.getAll\(['"]task['"]\)/);
  assert.match(statusRoute, /searchParams\.size\s*!==\s*1/);
  assert.match(statusRoute, /UUID/i);
  assert.match(statusRoute, /request\.headers\.get\(['"]origin['"]\)/);
  assert.match(statusRoute, /DATABASE_URL/);
  assert.match(statusRoute, /AUTODL_TOKEN/);
});

test("TanStack launch waitlist route persists authenticated one-click enrollment", () => {
  const routePath = resolve(root, "src/routes/api/launch-waitlist.ts");
  assert.equal(existsSync(routePath), true, "launch waitlist route should exist");

  const route = read("src/routes/api/launch-waitlist.ts");
  assert.match(route, /createFileRoute\(['"]\/api\/launch-waitlist['"]\)/);
  assert.match(route, /createLaunchWaitlistStore/);
  assert.match(route, /getLaunchWaitlistStatusResponse/);
  assert.match(route, /joinLaunchWaitlistResponse/);
  assert.match(route, /GET:/);
  assert.match(route, /POST:/);
  assert.match(route, /request\.headers\.get\(['"]origin['"]\)/);
  assert.match(route, /new URL\(request\.url\)\.origin/);
  assert.match(route, /DATABASE_URL/);
});

test("scheduled work keeps the legacy worker and registers video reconciliation", () => {
  const server = read("src/server.ts");
  assert.match(server, /legacyWorker\.scheduled\(controller, env, ctx\)/);
  assert.match(server, /ctx\.waitUntil\(reconcileVideoGenerationTasks\(env\)\)/);
});
