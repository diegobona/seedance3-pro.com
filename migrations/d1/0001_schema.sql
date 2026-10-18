-- All absolute timestamps are INTEGER Unix milliseconds; daily_credit_date is YYYY-MM-DD TEXT.
-- Import existing rows before installing the credit accounting triggers in 0002.
CREATE TABLE "user" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "email_verified" INTEGER DEFAULT 0 NOT NULL,
  "image" TEXT,
  "created_at" INTEGER DEFAULT (CAST(unixepoch('subsecond') * 1000 AS INTEGER)) NOT NULL,
  "updated_at" INTEGER DEFAULT (CAST(unixepoch('subsecond') * 1000 AS INTEGER)) NOT NULL,
  "role" TEXT DEFAULT 'user' NOT NULL,
  "plan" TEXT DEFAULT 'free' NOT NULL,
  "generation_count" INTEGER DEFAULT 0 NOT NULL,
  "monthly_generation_count" INTEGER DEFAULT 0 NOT NULL,
  "generation_limit" INTEGER DEFAULT 0 NOT NULL,
  "credit_balance" INTEGER DEFAULT 15 NOT NULL,
  "daily_free_credits" INTEGER DEFAULT 0 NOT NULL,
  "daily_credit_date" TEXT,
  "trial_credits_granted_at" INTEGER DEFAULT (CAST(unixepoch('subsecond') * 1000 AS INTEGER)) NOT NULL,
  "payment_customer_id" TEXT,
  "subscription_status" TEXT DEFAULT 'inactive' NOT NULL,
  "subscription_expires_at" INTEGER,
  CONSTRAINT "user_daily_free_credits_check" CHECK ("daily_free_credits" >= 0 AND "daily_free_credits" <= "credit_balance")
);
--> statement-breakpoint
CREATE TABLE "generation_credit_reservation" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "user_id" TEXT NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
  "credits" INTEGER NOT NULL,
  "daily_free_credits" INTEGER DEFAULT 0 NOT NULL,
  "daily_credit_date" TEXT,
  "status" TEXT DEFAULT 'reserved' NOT NULL,
  "created_at" INTEGER DEFAULT (CAST(unixepoch('subsecond') * 1000 AS INTEGER)) NOT NULL,
  "updated_at" INTEGER DEFAULT (CAST(unixepoch('subsecond') * 1000 AS INTEGER)) NOT NULL,
  CONSTRAINT "reservation_daily_free_credits_check" CHECK ("daily_free_credits" >= 0 AND "daily_free_credits" <= "credits")
);
--> statement-breakpoint
CREATE INDEX "generation_credit_reservation_user_idx" ON "generation_credit_reservation" ("user_id");
--> statement-breakpoint
CREATE INDEX "generation_credit_reservation_status_idx" ON "generation_credit_reservation" ("status");
--> statement-breakpoint
CREATE TABLE "video_generation_task" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "provider_task_id" TEXT,
  "user_id" TEXT NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
  "reservation_id" TEXT NOT NULL REFERENCES "generation_credit_reservation" ("id") ON DELETE CASCADE,
  "workflow_id" TEXT NOT NULL,
  "duration" INTEGER NOT NULL,
  "resolution" TEXT NOT NULL,
  "aspect_ratio" TEXT NOT NULL,
  "status" TEXT DEFAULT 'submitting' NOT NULL,
  "result_url" TEXT,
  "provider_error" TEXT,
  "poll_attempts" INTEGER DEFAULT 0 NOT NULL,
  "next_poll_at" INTEGER,
  "lease_until" INTEGER,
  "last_polled_at" INTEGER,
  "created_at" INTEGER DEFAULT (CAST(unixepoch('subsecond') * 1000 AS INTEGER)) NOT NULL,
  "updated_at" INTEGER DEFAULT (CAST(unixepoch('subsecond') * 1000 AS INTEGER)) NOT NULL,
  "completed_at" INTEGER,
  CONSTRAINT "video_generation_task_status_check" CHECK ("status" IN ('submitting', 'submission_unknown', 'queued', 'running', 'succeeded', 'failed', 'expired')),
  CONSTRAINT "video_generation_task_duration_check" CHECK ("duration" > 0),
  CONSTRAINT "video_generation_task_poll_attempts_check" CHECK ("poll_attempts" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "video_generation_task_provider_task_idx" ON "video_generation_task" ("provider_task_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "video_generation_task_reservation_idx" ON "video_generation_task" ("reservation_id");
--> statement-breakpoint
CREATE INDEX "video_generation_task_user_status_idx" ON "video_generation_task" ("user_id", "status");
--> statement-breakpoint
CREATE INDEX "video_generation_task_poll_due_idx" ON "video_generation_task" ("status", "next_poll_at");
--> statement-breakpoint
CREATE TABLE "launch_waitlist" (
  "user_id" TEXT PRIMARY KEY NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
  "bonus_credits" INTEGER DEFAULT 5 NOT NULL,
  "joined_at" INTEGER DEFAULT (CAST(unixepoch('subsecond') * 1000 AS INTEGER)) NOT NULL,
  "notified_at" INTEGER,
  "bonus_granted_at" INTEGER,
  CONSTRAINT "launch_waitlist_bonus_credits_check" CHECK ("bonus_credits" > 0)
);
--> statement-breakpoint
CREATE TABLE "referral_visit" (
  "visit_id" TEXT PRIMARY KEY NOT NULL,
  "visitor_id" TEXT NOT NULL,
  "source" TEXT DEFAULT 'anyposes' NOT NULL,
  "entry_path" TEXT NOT NULL,
  "created_at" INTEGER DEFAULT (CAST(unixepoch('subsecond') * 1000 AS INTEGER)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX "referral_visit_source_created_at_idx" ON "referral_visit" ("source", "created_at");
--> statement-breakpoint
CREATE INDEX "referral_visit_visitor_idx" ON "referral_visit" ("visitor_id");
--> statement-breakpoint
CREATE TABLE "session" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "expires_at" INTEGER NOT NULL,
  "token" TEXT NOT NULL UNIQUE,
  "created_at" INTEGER DEFAULT (CAST(unixepoch('subsecond') * 1000 AS INTEGER)) NOT NULL,
  "updated_at" INTEGER DEFAULT (CAST(unixepoch('subsecond') * 1000 AS INTEGER)) NOT NULL,
  "ip_address" TEXT,
  "user_agent" TEXT,
  "user_id" TEXT NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX "session_token_idx" ON "session" ("token");
--> statement-breakpoint
CREATE TABLE "account" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "account_id" TEXT NOT NULL,
  "provider_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
  "access_token" TEXT,
  "refresh_token" TEXT,
  "id_token" TEXT,
  "access_token_expires_at" INTEGER,
  "refresh_token_expires_at" INTEGER,
  "scope" TEXT,
  "password" TEXT,
  "created_at" INTEGER DEFAULT (CAST(unixepoch('subsecond') * 1000 AS INTEGER)) NOT NULL,
  "updated_at" INTEGER DEFAULT (CAST(unixepoch('subsecond') * 1000 AS INTEGER)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "account_provider_idx" ON "account" ("provider_id", "account_id");
--> statement-breakpoint
CREATE TABLE "verification" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "identifier" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "expires_at" INTEGER NOT NULL,
  "created_at" INTEGER DEFAULT (CAST(unixepoch('subsecond') * 1000 AS INTEGER)),
  "updated_at" INTEGER DEFAULT (CAST(unixepoch('subsecond') * 1000 AS INTEGER))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "verification_identifier_idx" ON "verification" ("identifier");
