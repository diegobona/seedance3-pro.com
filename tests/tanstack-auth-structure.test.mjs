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
  assert.match(wrangler, /"main"\s*:\s*"\.\/src\/server\.ts"/);
  assert.match(wrangler, /"nodejs_compat"/);
  assert.match(wrangler, /seedance3-pro\.com\/app\/\*/);
  assert.match(wrangler, /seedance3-pro\.com\/app-assets\/\*/);
  assert.match(wrangler, /seedance3-pro\.com\/api\/\*/);

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
