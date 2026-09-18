import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (file) => readFileSync(resolve(root, file), "utf8");

test("Better Auth persists sessions in Neon and reserves product account fields", () => {
  for (const file of [
    "src/db/schema.ts",
    "src/db/index.ts",
    "src/lib/auth.ts",
    "src/lib/auth-client.ts",
    "src/routes/api/auth/$.ts",
    "drizzle.config.ts",
  ]) {
    assert.equal(existsSync(resolve(root, file)), true, `${file} should exist`);
  }

  const schema = read("src/db/schema.ts");
  for (const table of ["user", "session", "account", "verification"]) {
    assert.match(schema, new RegExp(`pgTable\\(['\"]${table}['\"]`));
  }
  for (const field of [
    "role",
    "plan",
    "generationCount",
    "monthlyGenerationCount",
    "generationLimit",
    "creditBalance",
    "paymentCustomerId",
    "subscriptionStatus",
    "subscriptionExpiresAt",
  ]) {
    assert.match(schema, new RegExp(`${field}:`), `${field} should be reserved on user`);
  }

  const auth = read("src/lib/auth.ts");
  assert.match(auth, /drizzleAdapter/);
  assert.match(auth, /emailAndPassword:\s*\{[\s\S]*?enabled:\s*true/);
  assert.match(auth, /socialProviders/);
  assert.match(auth, /google/);
  assert.match(auth, /additionalFields/);
  assert.match(auth, /tanstackStartCookies\(\)/);
  assert.match(auth, /new URL\(request\.url\)\.origin/);

  const handler = read("src/routes/api/auth/$.ts");
  assert.match(handler, /createFileRoute\(['\"]\/api\/auth\/\$['\"]\)/);
  assert.match(handler, /createAuth\(request, env\)\.handler\(request\)/);
});
