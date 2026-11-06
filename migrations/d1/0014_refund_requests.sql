CREATE TABLE refund_request (
  id TEXT PRIMARY KEY NOT NULL,
  order_id TEXT NOT NULL UNIQUE REFERENCES stripe_order(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  reason TEXT NOT NULL CHECK(length(reason) BETWEEN 5 AND 2000),
  locale TEXT NOT NULL DEFAULT 'en' CHECK(locale IN ('en','zh')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
  note TEXT NOT NULL DEFAULT '',
  reviewed_by TEXT,
  version INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)),
  updated_at INTEGER NOT NULL DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)),
  notification_sent_at INTEGER,
  notification_attempts INTEGER NOT NULL DEFAULT 0,
  notification_next_at INTEGER NOT NULL DEFAULT 0,
  notification_claim TEXT
);
--> statement-breakpoint
CREATE INDEX refund_request_review_date ON refund_request(created_at DESC,id DESC);
--> statement-breakpoint
CREATE INDEX refund_request_delivery ON refund_request(notification_sent_at,notification_next_at);
--> statement-breakpoint
CREATE TABLE stripe_payment_refund (
  id TEXT PRIMARY KEY NOT NULL,
  order_id TEXT NOT NULL REFERENCES stripe_order(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK(amount>0),
  currency TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending','requires_action','succeeded','failed','canceled')),
  updated_at INTEGER NOT NULL DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER))
);
--> statement-breakpoint
CREATE INDEX stripe_payment_refund_order ON stripe_payment_refund(order_id);
