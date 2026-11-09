-- Add Creator and Studio bonus credits while retaining every historical order pair.
-- Retain all order/refund data; credit triggers are reinstalled only after copying.
CREATE TABLE credit_pack_refund_backup AS SELECT * FROM refund_request;
--> statement-breakpoint
CREATE TABLE credit_pack_payment_refund_backup AS SELECT * FROM stripe_payment_refund;
--> statement-breakpoint
DROP TABLE stripe_payment_refund;
--> statement-breakpoint
DROP TABLE refund_request;
--> statement-breakpoint
DROP TRIGGER stripe_order_credit;
--> statement-breakpoint
DROP TRIGGER stripe_order_revoke;
--> statement-breakpoint
DROP TRIGGER stripe_reversal_apply;
--> statement-breakpoint
DROP TRIGGER stripe_reversal_review;
--> statement-breakpoint
CREATE TABLE stripe_order_next (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  price_id TEXT NOT NULL,
  live_mode INTEGER NOT NULL CHECK (live_mode IN (0, 1)),
  session_id TEXT UNIQUE,
  payment_intent_id TEXT UNIQUE,
  amount INTEGER NOT NULL DEFAULT 1999 CHECK (amount IN (499,999,1190,1999,2490,4990,4999)),
  currency TEXT NOT NULL DEFAULT 'usd' CHECK (currency = 'usd'),
  credits INTEGER NOT NULL DEFAULT 1600 CHECK ((amount=1999 AND credits=1600) OR (amount=4999 AND credits=4500) OR (amount=999 AND credits=700) OR (amount=1999 AND credits=1450) OR (amount=4999 AND credits=3650) OR (amount=499 AND credits=500) OR (amount=999 AND credits=1100) OR (amount=1190 AND credits=1100) OR (amount=2490 AND credits=3000) OR (amount=4990 AND credits=6500)),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'reversed')),
  credited_credits INTEGER NOT NULL DEFAULT 0,
  revoked_credits INTEGER NOT NULL DEFAULT 0,
  removed_credits INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)),
  updated_at INTEGER NOT NULL DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER))
);

--> statement-breakpoint
INSERT INTO stripe_order_next SELECT * FROM stripe_order;
--> statement-breakpoint
DROP TABLE stripe_order;
--> statement-breakpoint
ALTER TABLE stripe_order_next RENAME TO stripe_order;
--> statement-breakpoint
CREATE INDEX stripe_order_owner_date ON stripe_order(user_id, created_at DESC);
--> statement-breakpoint
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
--> statement-breakpoint
INSERT INTO refund_request SELECT * FROM credit_pack_refund_backup;
--> statement-breakpoint
INSERT INTO stripe_payment_refund SELECT * FROM credit_pack_payment_refund_backup;
--> statement-breakpoint
DROP TABLE credit_pack_refund_backup;
--> statement-breakpoint
DROP TABLE credit_pack_payment_refund_backup;
--> statement-breakpoint
CREATE TRIGGER stripe_order_credit AFTER UPDATE OF status ON stripe_order
WHEN OLD.status = 'pending' AND NEW.status = 'paid'
BEGIN
  UPDATE "user" SET credit_balance = credit_balance + NEW.credits WHERE id = NEW.user_id;
  UPDATE stripe_order SET credited_credits = NEW.credits WHERE id = NEW.id;
END;
--> statement-breakpoint
CREATE TRIGGER stripe_reversal_apply AFTER INSERT ON stripe_reversal
BEGIN
  UPDATE stripe_order SET status = 'reversed', updated_at = CAST(unixepoch('subsec') * 1000 AS INTEGER)
    WHERE payment_intent_id = NEW.payment_intent_id AND status != 'reversed';
END;
--> statement-breakpoint
CREATE TRIGGER stripe_order_revoke AFTER UPDATE OF status ON stripe_order
WHEN OLD.status != 'reversed' AND NEW.status = 'reversed'
BEGIN
  UPDATE stripe_order SET revoked_credits = NEW.credits,
    removed_credits = CASE WHEN OLD.status = 'paid' THEN
      min(NEW.credits, max(0, (SELECT credit_balance - daily_free_credits FROM "user" WHERE id = NEW.user_id)))
      ELSE 0 END WHERE id = NEW.id;
  UPDATE "user" SET billing_hold = CASE WHEN EXISTS (
      SELECT 1 FROM stripe_reversal WHERE payment_intent_id = NEW.payment_intent_id
        AND reason NOT IN ('charge.refunded','refund.created','refund.updated','payment-refunded')
    ) THEN 1 ELSE billing_hold END,
    credit_balance = credit_balance - (SELECT removed_credits FROM stripe_order WHERE id = NEW.id)
    WHERE id = NEW.user_id;
END;
--> statement-breakpoint
-- A dispute may arrive after an ordinary refund already reversed the order.
-- Escalate the account review without revoking the same credits a second time.
CREATE TRIGGER stripe_reversal_review AFTER UPDATE OF reason ON stripe_reversal
WHEN NEW.reason NOT IN ('charge.refunded','refund.created','refund.updated','payment-refunded')
BEGIN
  UPDATE "user" SET billing_hold = 1 WHERE id IN (
    SELECT user_id FROM stripe_order WHERE payment_intent_id = NEW.payment_intent_id
  );
END;
