-- Apply this migration only after importing existing PostgreSQL reservations.
-- Existing rows already had their credits deducted in PostgreSQL.
CREATE TRIGGER IF NOT EXISTS credit_reservation_debit
AFTER INSERT ON generation_credit_reservation
WHEN NEW.status = 'reserved'
BEGIN
  SELECT CASE WHEN NEW.credits <= 0 OR NEW.credits > 9007199254740991
    THEN RAISE(ABORT, 'Credit reservation amount must be a positive integer.') END;
  UPDATE "user" SET
    credit_balance = (CASE WHEN daily_credit_date IS NOT date('now', '+8 hours') THEN
      credit_balance - CASE WHEN daily_credit_date IS NULL THEN
        CASE WHEN plan = 'free' THEN min(credit_balance, 15) ELSE 0 END
        ELSE daily_free_credits END
      + CASE WHEN plan = 'free' THEN 15 ELSE 0 END
      ELSE credit_balance END) - NEW.credits,
    daily_free_credits = (CASE WHEN daily_credit_date = date('now', '+8 hours') THEN daily_free_credits
      WHEN plan = 'free' THEN 15 ELSE 0 END) - NEW.daily_free_credits,
    daily_credit_date = date('now', '+8 hours'),
    updated_at = NEW.updated_at
  WHERE id = NEW.user_id
    AND (CASE WHEN daily_credit_date IS NOT date('now', '+8 hours') THEN
      credit_balance - CASE WHEN daily_credit_date IS NULL THEN
        CASE WHEN plan = 'free' THEN min(credit_balance, 15) ELSE 0 END
        ELSE daily_free_credits END
      + CASE WHEN plan = 'free' THEN 15 ELSE 0 END
      ELSE credit_balance END) >= NEW.credits
    AND (CASE WHEN daily_credit_date = date('now', '+8 hours') THEN daily_free_credits
      WHEN plan = 'free' THEN 15 ELSE 0 END) >= NEW.daily_free_credits;
  SELECT CASE WHEN changes() <> 1 THEN RAISE(ABORT, 'Insufficient credit balance.') END;
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS credit_reservation_settle
AFTER UPDATE OF status ON generation_credit_reservation
WHEN OLD.status = 'reserved' AND NEW.status = 'settled'
BEGIN
  UPDATE "user" SET
    generation_count = generation_count + 1,
    monthly_generation_count = monthly_generation_count + 1,
    updated_at = NEW.updated_at
  WHERE id = NEW.user_id;
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS credit_reservation_refund
AFTER UPDATE OF status ON generation_credit_reservation
WHEN OLD.status = 'reserved' AND NEW.status = 'refunded'
BEGIN
  UPDATE "user" SET
    credit_balance = (
      CASE WHEN daily_credit_date IS NOT date('now', '+8 hours') THEN
        credit_balance - CASE WHEN daily_credit_date IS NULL THEN
          CASE WHEN plan = 'free' THEN min(credit_balance, 15) ELSE 0 END
          ELSE daily_free_credits END
        + CASE WHEN plan = 'free' THEN 15 ELSE 0 END
        ELSE credit_balance END
    ) + NEW.credits - NEW.daily_free_credits
      + min(15 - (CASE WHEN daily_credit_date = date('now', '+8 hours') THEN daily_free_credits
        WHEN plan = 'free' THEN 15 ELSE 0 END),
        CASE WHEN NEW.daily_credit_date = date('now', '+8 hours') THEN NEW.daily_free_credits ELSE 0 END),
    daily_free_credits = min(15,
      (CASE WHEN daily_credit_date = date('now', '+8 hours') THEN daily_free_credits
        WHEN plan = 'free' THEN 15 ELSE 0 END)
      + CASE WHEN NEW.daily_credit_date = date('now', '+8 hours') THEN NEW.daily_free_credits ELSE 0 END),
    daily_credit_date = date('now', '+8 hours'),
    updated_at = NEW.updated_at
  WHERE id = NEW.user_id;
END;
