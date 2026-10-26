ALTER TABLE "user" ADD COLUMN billing_hold INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN free_budget_key TEXT;
--> statement-breakpoint
ALTER TABLE generation_credit_reservation ADD COLUMN free_cost_micros INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE generation_credit_reservation ADD COLUMN fulfilled_credits INTEGER;
--> statement-breakpoint
ALTER TABLE generation_credit_reservation ADD COLUMN guest_source_id TEXT;
--> statement-breakpoint
CREATE UNIQUE INDEX credit_guest_source_idx ON generation_credit_reservation(guest_source_id);
--> statement-breakpoint
CREATE TABLE guest_credit_claim (
 guest_user_id TEXT PRIMARY KEY REFERENCES "user"(id),
 user_id TEXT NOT NULL REFERENCES "user"(id),
 created_at INTEGER NOT NULL DEFAULT (CAST(unixepoch('subsec')*1000 AS INTEGER))
);
--> statement-breakpoint
CREATE TABLE guest_network_claim (
 network_hash TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES "user"(id)
);
--> statement-breakpoint
-- Upgrade the old five-credit image allowance and its ledger consistently.
UPDATE "user" SET credit_balance=CAST(credit_balance/5 AS INTEGER)
 WHERE id IN (SELECT user_id FROM guest_image_trial);
--> statement-breakpoint
UPDATE generation_credit_reservation SET credits=max(1,CAST(credits/5 AS INTEGER))
 WHERE user_id IN (SELECT user_id FROM guest_image_trial);
--> statement-breakpoint
UPDATE generation_credit_reservation SET free_cost_micros=
 CASE WHEN user_id IN (SELECT user_id FROM guest_image_trial) THEN credits*30000
      WHEN user_id IN (SELECT id FROM "user" WHERE plan='guest') THEN credits*60000
      ELSE daily_free_credits*60000 END;
--> statement-breakpoint
-- Existing paid plans now receive today's grant, retaining all permanent credits.
UPDATE "user" SET daily_credit_date=NULL
 WHERE plan NOT IN ('free','guest') AND daily_free_credits=0;
--> statement-breakpoint
DROP TRIGGER credit_reservation_debit;
--> statement-breakpoint
DROP TRIGGER credit_reservation_settle;
--> statement-breakpoint
DROP TRIGGER credit_reservation_refund;
--> statement-breakpoint
-- Apply this migration only after importing existing PostgreSQL reservations.
-- Existing rows already had their credits deducted in PostgreSQL.
CREATE TRIGGER credit_reservation_debit
AFTER INSERT ON generation_credit_reservation
WHEN NEW.status = 'reserved'
BEGIN
  SELECT CASE WHEN NEW.credits <= 0 OR NEW.credits > 9007199254740991
    THEN RAISE(ABORT, 'Credit reservation amount must be a positive integer.') END;
  SELECT CASE WHEN EXISTS(SELECT 1 FROM "user" WHERE id=NEW.user_id AND billing_hold=1)
    THEN RAISE(ABORT, 'BILLING_HOLD') END;
  SELECT CASE WHEN EXISTS(SELECT 1 FROM guest_credit_claim WHERE guest_user_id=NEW.user_id)
    THEN RAISE(ABORT, 'GUEST_TRIAL_USED') END;
  SELECT CASE WHEN NEW.free_cost_micros < 0 OR (NEW.free_cost_micros > 0 AND NEW.free_cost_micros +
    (SELECT coalesce(sum(free_cost_micros),0) FROM generation_credit_reservation
      WHERE id<>NEW.id AND daily_credit_date=date('now','+8 hours') AND
       (user_id=NEW.user_id OR user_id IN (SELECT peer.id FROM "user" AS peer JOIN "user" AS owner ON owner.id=NEW.user_id WHERE peer.free_budget_key=owner.free_budget_key AND owner.plan='guest') OR user_id IN (SELECT guest_user_id FROM guest_credit_claim WHERE user_id=NEW.user_id))) > 1000000)
    THEN RAISE(ABORT, 'FREE_BUDGET_EXCEEDED') END;
  UPDATE "user" SET
    credit_balance = (CASE WHEN daily_credit_date IS NOT date('now', '+8 hours') THEN
      credit_balance - CASE WHEN daily_credit_date IS NULL THEN
        CASE WHEN plan = 'free' THEN min(credit_balance, 15) ELSE 0 END
        ELSE daily_free_credits END
      + CASE WHEN plan <> 'guest' THEN 15 ELSE 0 END
      ELSE credit_balance END) - NEW.credits,
    daily_free_credits = (CASE WHEN daily_credit_date = date('now', '+8 hours') THEN daily_free_credits
      WHEN plan <> 'guest' THEN 15 ELSE 0 END) - NEW.daily_free_credits,
    daily_credit_date = date('now', '+8 hours'),
    updated_at = NEW.updated_at
  WHERE id = NEW.user_id
    AND (CASE WHEN daily_credit_date IS NOT date('now', '+8 hours') THEN
      credit_balance - CASE WHEN daily_credit_date IS NULL THEN
        CASE WHEN plan = 'free' THEN min(credit_balance, 15) ELSE 0 END
        ELSE daily_free_credits END
      + CASE WHEN plan <> 'guest' THEN 15 ELSE 0 END
      ELSE credit_balance END) >= NEW.credits
    AND (CASE WHEN daily_credit_date = date('now', '+8 hours') THEN daily_free_credits
      WHEN plan <> 'guest' THEN 15 ELSE 0 END) >= NEW.daily_free_credits;
  SELECT CASE WHEN changes() <> 1 THEN RAISE(ABORT, 'Insufficient credit balance.') END;
END;
--> statement-breakpoint
CREATE TRIGGER credit_reservation_settle
AFTER UPDATE OF status ON generation_credit_reservation
WHEN OLD.status = 'reserved' AND NEW.status = 'settled'
BEGIN
  UPDATE "user" SET
    generation_count = generation_count + 1,
    monthly_generation_count = monthly_generation_count + 1,
    updated_at = NEW.updated_at
  WHERE id = NEW.user_id AND NOT EXISTS(SELECT 1 FROM guest_credit_claim WHERE guest_user_id=NEW.user_id);
END;
--> statement-breakpoint
CREATE TRIGGER credit_reservation_refund
AFTER UPDATE OF status ON generation_credit_reservation
WHEN OLD.status = 'reserved' AND NEW.status = 'refunded'
BEGIN
  UPDATE "user" SET
    credit_balance = (
      CASE WHEN daily_credit_date IS NOT date('now', '+8 hours') THEN
        credit_balance - CASE WHEN daily_credit_date IS NULL THEN
          CASE WHEN plan = 'free' THEN min(credit_balance, 15) ELSE 0 END
          ELSE daily_free_credits END
        + CASE WHEN plan <> 'guest' THEN 15 ELSE 0 END
        ELSE credit_balance END
    ) + NEW.credits - NEW.daily_free_credits
      + min(15 - (CASE WHEN daily_credit_date = date('now', '+8 hours') THEN daily_free_credits
        WHEN plan <> 'guest' THEN 15 ELSE 0 END),
        CASE WHEN NEW.daily_credit_date = date('now', '+8 hours') THEN NEW.daily_free_credits ELSE 0 END),
    daily_free_credits = min(15,
      (CASE WHEN daily_credit_date = date('now', '+8 hours') THEN daily_free_credits
        WHEN plan <> 'guest' THEN 15 ELSE 0 END)
      + CASE WHEN NEW.daily_credit_date = date('now', '+8 hours') THEN NEW.daily_free_credits ELSE 0 END),
    daily_credit_date = date('now', '+8 hours'),
    updated_at = NEW.updated_at
  WHERE id = NEW.user_id AND NOT EXISTS(SELECT 1 FROM guest_credit_claim WHERE guest_user_id=NEW.user_id);
END;

--> statement-breakpoint
CREATE TRIGGER credit_reservation_partial_settle
AFTER UPDATE OF status ON generation_credit_reservation
WHEN OLD.status='reserved' AND NEW.status='settled' AND NEW.fulfilled_credits IS NOT NULL
BEGIN
 SELECT CASE WHEN NEW.fulfilled_credits<0 OR NEW.fulfilled_credits>OLD.credits
  THEN RAISE(ABORT,'Invalid fulfilled credits.') END;
 UPDATE "user" SET
  credit_balance=(CASE WHEN daily_credit_date IS NOT date('now','+8 hours') THEN credit_balance-CASE WHEN daily_credit_date IS NULL THEN CASE WHEN plan='free' THEN min(credit_balance,15) ELSE 0 END ELSE daily_free_credits END +CASE WHEN plan<>'guest' THEN 15 ELSE 0 END ELSE credit_balance END)+min(OLD.credits-NEW.fulfilled_credits,OLD.credits-OLD.daily_free_credits)
   +CASE WHEN OLD.daily_credit_date=date('now','+8 hours') THEN min(15-(CASE WHEN daily_credit_date=date('now','+8 hours') THEN daily_free_credits WHEN plan<>'guest' THEN 15 ELSE 0 END),max(0,OLD.daily_free_credits-NEW.fulfilled_credits)) ELSE 0 END,
  daily_free_credits=(CASE WHEN daily_credit_date=date('now','+8 hours') THEN daily_free_credits WHEN plan<>'guest' THEN 15 ELSE 0 END)+CASE WHEN OLD.daily_credit_date=date('now','+8 hours') THEN min(15-(CASE WHEN daily_credit_date=date('now','+8 hours') THEN daily_free_credits WHEN plan<>'guest' THEN 15 ELSE 0 END),max(0,OLD.daily_free_credits-NEW.fulfilled_credits)) ELSE 0 END,
  daily_credit_date=date('now','+8 hours') WHERE id=NEW.user_id AND NOT EXISTS(SELECT 1 FROM guest_credit_claim WHERE guest_user_id=NEW.user_id);
 UPDATE generation_credit_reservation SET credits=NEW.fulfilled_credits,
  daily_free_credits=min(OLD.daily_free_credits,NEW.fulfilled_credits) WHERE id=NEW.id;
END;

--> statement-breakpoint
CREATE TRIGGER guest_image_network_guard BEFORE INSERT ON guest_image_trial
BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM guest_network_claim WHERE network_hash=NEW.network_hash OR network_hash=
   (SELECT free_budget_key FROM "user" WHERE id=NEW.user_id))
 THEN RAISE(ABORT,'GUEST_TRIAL_USED') END;
END;
--> statement-breakpoint
CREATE TRIGGER guest_video_network_guard BEFORE INSERT ON guest_video_trial
BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM guest_network_claim WHERE network_hash=NEW.network_hash OR network_hash=
   (SELECT free_budget_key FROM "user" WHERE id=NEW.user_id))
 THEN RAISE(ABORT,'GUEST_TRIAL_USED') END;
END;
--> statement-breakpoint
CREATE TRIGGER guest_credit_refund_link AFTER UPDATE OF status ON generation_credit_reservation
WHEN OLD.status='reserved' AND NEW.status='refunded'
BEGIN
 UPDATE generation_credit_reservation SET status='refunded',updated_at=NEW.updated_at
 WHERE guest_source_id=NEW.id AND status='reserved';
 -- A linked guest allowance stays disabled even when a pending task is refunded.
 UPDATE "user" SET credit_balance=0,daily_free_credits=0
 WHERE id=NEW.user_id AND EXISTS(SELECT 1 FROM guest_credit_claim WHERE guest_user_id=NEW.user_id);
END;
--> statement-breakpoint
CREATE TRIGGER guest_credit_settle_link AFTER UPDATE OF status ON generation_credit_reservation
WHEN OLD.status='reserved' AND NEW.status='settled'
BEGIN
 UPDATE generation_credit_reservation SET status='settled',
 fulfilled_credits=min(credits,coalesce(NEW.fulfilled_credits,NEW.credits)),updated_at=NEW.updated_at
 WHERE guest_source_id=NEW.id AND status='reserved';
END;
--> statement-breakpoint
CREATE INDEX credit_cost_day_idx ON generation_credit_reservation(user_id,daily_credit_date);
--> statement-breakpoint
CREATE INDEX guest_credit_claim_owner_idx ON guest_credit_claim(user_id);
--> statement-breakpoint
CREATE INDEX user_free_budget_key_idx ON "user"(free_budget_key);
