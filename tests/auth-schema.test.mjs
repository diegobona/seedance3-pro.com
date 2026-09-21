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
  for (const table of ["user", "session", "account", "verification", "generation_credit_reservation", "launch_waitlist"]) {
    assert.match(schema, new RegExp(`pgTable\\(['\"]${table}['\"]`));
  }
  for (const field of [
    "role",
    "plan",
    "generationCount",
    "monthlyGenerationCount",
    "generationLimit",
    "creditBalance",
    "trialCreditsGrantedAt",
    "paymentCustomerId",
    "subscriptionStatus",
    "subscriptionExpiresAt",
  ]) {
    assert.match(schema, new RegExp(`${field}:`), `${field} should be reserved on user`);
  }
  assert.match(schema, /creditBalance:\s*integer\(['"]credit_balance['"]\)\.default\(15\)/);
  assert.match(schema, /generationCreditReservation/);
  assert.match(schema, /status:\s*text\(['"]status['"]\)\.default\(['"]reserved['"]\)/);
  assert.match(schema, /userId:\s*text\(['"]user_id['"]\)[\s\S]*?references\(\(\)\s*=>\s*user\.id/);
  assert.match(schema, /launchWaitlist/);
  assert.match(schema, /bonusCredits:\s*integer\(['"]bonus_credits['"]\)\.default\(5\)/);
  assert.match(schema, /notifiedAt:\s*timestamp\(['"]notified_at['"]/);
  assert.match(schema, /bonusGrantedAt:\s*timestamp\(['"]bonus_granted_at['"]/);

  const auth = read("src/lib/auth.ts");
  assert.match(auth, /drizzleAdapter/);
  assert.match(auth, /emailAndPassword:\s*\{[\s\S]*?enabled:\s*true/);
  assert.match(auth, /socialProviders/);
  assert.match(auth, /google/);
  assert.match(auth, /additionalFields/);
  assert.match(auth, /creditBalance:\s*\{[^}]*defaultValue:\s*15/);
  assert.match(auth, /trialCreditsGrantedAt:\s*\{[^}]*defaultValue:/);
  assert.match(auth, /tanstackStartCookies\(\)/);
  assert.match(auth, /new URL\(request\.url\)\.origin/);

  const handler = read("src/routes/api/auth/$.ts");
  assert.match(handler, /createFileRoute\(['\"]\/api\/auth\/\$['\"]\)/);
  assert.match(handler, /createAuth\(request, env\)\.handler\(request\)/);
});
