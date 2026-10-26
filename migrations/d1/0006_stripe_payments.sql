CREATE TABLE stripe_order (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  price_id TEXT NOT NULL,
  live_mode INTEGER NOT NULL CHECK (live_mode IN (0, 1)),
  session_id TEXT UNIQUE,
  payment_intent_id TEXT UNIQUE,
  amount INTEGER NOT NULL DEFAULT 499 CHECK (amount = 499),
  currency TEXT NOT NULL DEFAULT 'usd' CHECK (currency = 'usd'),
  credits INTEGER NOT NULL DEFAULT 500 CHECK (credits = 500),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'reversed')),
  credited_credits INTEGER NOT NULL DEFAULT 0,
  revoked_credits INTEGER NOT NULL DEFAULT 0,
  removed_credits INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)),
  updated_at INTEGER NOT NULL DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER))
);
--> statement-breakpoint
CREATE INDEX stripe_order_owner_date ON stripe_order(user_id, created_at DESC);
--> statement-breakpoint
CREATE TABLE stripe_event (
  id TEXT PRIMARY KEY NOT NULL,
  object_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER))
);
--> statement-breakpoint
CREATE TABLE stripe_reversal (
  payment_intent_id TEXT PRIMARY KEY NOT NULL,
  reason TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER))
);
--> statement-breakpoint
CREATE TRIGGER stripe_order_credit AFTER UPDATE OF status ON stripe_order
WHEN OLD.status = 'pending' AND NEW.status = 'paid'
BEGIN
  UPDATE "user" SET credit_balance = credit_balance + NEW.credits WHERE id = NEW.user_id;
  UPDATE stripe_order SET credited_credits = NEW.credits WHERE id = NEW.id;
END;
--> statement-breakpoint
CREATE TRIGGER stripe_order_revoke AFTER UPDATE OF status ON stripe_order
WHEN OLD.status != 'reversed' AND NEW.status = 'reversed'
BEGIN
  UPDATE stripe_order SET revoked_credits = NEW.credits,
    removed_credits = CASE WHEN OLD.status = 'paid' THEN
      min(NEW.credits, max(0, (SELECT credit_balance - daily_free_credits FROM "user" WHERE id = NEW.user_id)))
      ELSE 0 END WHERE id = NEW.id;
  UPDATE "user" SET billing_hold = 1,
    credit_balance = credit_balance - (SELECT removed_credits FROM stripe_order WHERE id = NEW.id)
    WHERE id = NEW.user_id;
END;
--> statement-breakpoint
CREATE TRIGGER stripe_reversal_apply AFTER INSERT ON stripe_reversal
BEGIN
  UPDATE stripe_order SET status = 'reversed', updated_at = CAST(unixepoch('subsec') * 1000 AS INTEGER)
    WHERE payment_intent_id = NEW.payment_intent_id AND status != 'reversed';
END;
