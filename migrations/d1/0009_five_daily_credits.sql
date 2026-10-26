-- Reduce today's registered allowance from 10 to 5, preserving usage and purchased credits.
UPDATE "user" SET credit_balance=credit_balance-min(5,daily_free_credits),
 daily_free_credits=max(0,daily_free_credits-5)
 WHERE plan<>'guest' AND daily_credit_date=date('now','+8 hours');
--> statement-breakpoint
DROP TRIGGER user_ten_credit_default;
--> statement-breakpoint
-- Normalize the historical SQLite default and clients still inserting the previous grant.
CREATE TRIGGER user_five_credit_default AFTER INSERT ON "user"
WHEN NEW.plan='free' AND NEW.daily_credit_date IS NULL AND NEW.credit_balance IN (10,15)
BEGIN
 UPDATE "user" SET credit_balance=5 WHERE id=NEW.id;
END;
--> statement-breakpoint
DROP TRIGGER credit_reservation_debit;
--> statement-breakpoint
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
      + CASE WHEN plan <> 'guest' THEN 5 ELSE 0 END
      ELSE credit_balance END) - NEW.credits,
    daily_free_credits = (CASE WHEN daily_credit_date = date('now', '+8 hours') THEN daily_free_credits
      WHEN plan <> 'guest' THEN 5 ELSE 0 END) - NEW.daily_free_credits,
    daily_credit_date = date('now', '+8 hours'),
    updated_at = NEW.updated_at
  WHERE id = NEW.user_id
    AND (CASE WHEN daily_credit_date IS NOT date('now', '+8 hours') THEN
      credit_balance - CASE WHEN daily_credit_date IS NULL THEN
        CASE WHEN plan = 'free' THEN min(credit_balance, 15) ELSE 0 END
        ELSE daily_free_credits END
      + CASE WHEN plan <> 'guest' THEN 5 ELSE 0 END
      ELSE credit_balance END) >= NEW.credits
    AND (CASE WHEN daily_credit_date = date('now', '+8 hours') THEN daily_free_credits
      WHEN plan <> 'guest' THEN 5 ELSE 0 END) >= NEW.daily_free_credits;
  SELECT CASE WHEN changes() <> 1 THEN RAISE(ABORT, 'Insufficient credit balance.') END;
END;
--> statement-breakpoint
DROP TRIGGER credit_reservation_refund;
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
        + CASE WHEN plan <> 'guest' THEN 5 ELSE 0 END
        ELSE credit_balance END
    ) + NEW.credits - NEW.daily_free_credits
      + min(5 - (CASE WHEN daily_credit_date = date('now', '+8 hours') THEN daily_free_credits
        WHEN plan <> 'guest' THEN 5 ELSE 0 END),
        CASE WHEN NEW.daily_credit_date = date('now', '+8 hours') THEN NEW.daily_free_credits ELSE 0 END),
    daily_free_credits = min(5,
      (CASE WHEN daily_credit_date = date('now', '+8 hours') THEN daily_free_credits
        WHEN plan <> 'guest' THEN 5 ELSE 0 END)
      + CASE WHEN NEW.daily_credit_date = date('now', '+8 hours') THEN NEW.daily_free_credits ELSE 0 END),
    daily_credit_date = date('now', '+8 hours'),
    updated_at = NEW.updated_at
  WHERE id = NEW.user_id AND NOT EXISTS(SELECT 1 FROM guest_credit_claim WHERE guest_user_id=NEW.user_id);
END;
--> statement-breakpoint
DROP TRIGGER credit_reservation_partial_settle;
--> statement-breakpoint
CREATE TRIGGER credit_reservation_partial_settle
AFTER UPDATE OF status ON generation_credit_reservation
WHEN OLD.status='reserved' AND NEW.status='settled' AND NEW.fulfilled_credits IS NOT NULL
BEGIN
 SELECT CASE WHEN NEW.fulfilled_credits<0 OR NEW.fulfilled_credits>OLD.credits
  THEN RAISE(ABORT,'Invalid fulfilled credits.') END;
 UPDATE "user" SET
  credit_balance=(CASE WHEN daily_credit_date IS NOT date('now','+8 hours') THEN credit_balance-CASE WHEN daily_credit_date IS NULL THEN CASE WHEN plan='free' THEN min(credit_balance, 15) ELSE 0 END ELSE daily_free_credits END +CASE WHEN plan<>'guest' THEN 5 ELSE 0 END ELSE credit_balance END)+min(OLD.credits-NEW.fulfilled_credits,OLD.credits-OLD.daily_free_credits)
   +CASE WHEN OLD.daily_credit_date=date('now','+8 hours') THEN min(5-(CASE WHEN daily_credit_date=date('now','+8 hours') THEN daily_free_credits WHEN plan<>'guest' THEN 5 ELSE 0 END),max(0,OLD.daily_free_credits-NEW.fulfilled_credits)) ELSE 0 END,
  daily_free_credits=(CASE WHEN daily_credit_date=date('now','+8 hours') THEN daily_free_credits WHEN plan<>'guest' THEN 5 ELSE 0 END)+CASE WHEN OLD.daily_credit_date=date('now','+8 hours') THEN min(5-(CASE WHEN daily_credit_date=date('now','+8 hours') THEN daily_free_credits WHEN plan<>'guest' THEN 5 ELSE 0 END),max(0,OLD.daily_free_credits-NEW.fulfilled_credits)) ELSE 0 END,
  daily_credit_date=date('now','+8 hours') WHERE id=NEW.user_id AND NOT EXISTS(SELECT 1 FROM guest_credit_claim WHERE guest_user_id=NEW.user_id);
 UPDATE generation_credit_reservation SET credits=NEW.fulfilled_credits,
  daily_free_credits=min(OLD.daily_free_credits,NEW.fulfilled_credits) WHERE id=NEW.id;
END;
