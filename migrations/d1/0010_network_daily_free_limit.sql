-- Snapshot the trusted request network on each reservation, never on the mutable account.
-- Existing reservations have no reliable request IP and are intentionally not backfilled.
ALTER TABLE generation_credit_reservation ADD COLUMN free_network_hash TEXT;
--> statement-breakpoint
ALTER TABLE generation_credit_reservation ADD COLUMN network_free_credits INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
CREATE INDEX credit_reservation_network_day ON generation_credit_reservation(free_network_hash,daily_credit_date,status);
--> statement-breakpoint
-- Runs inside the same transaction as the account debit and video task insertion.
CREATE TRIGGER credit_reservation_network_limit BEFORE INSERT ON generation_credit_reservation
WHEN NEW.network_free_credits > 0
BEGIN
 SELECT CASE WHEN NEW.free_network_hash IS NULL OR length(NEW.free_network_hash) <> 64
   OR NEW.network_free_credits > NEW.credits OR NEW.guest_source_id IS NOT NULL
   THEN RAISE(ABORT,'INVALID_FREE_NETWORK') END;
 SELECT CASE WHEN NEW.network_free_credits +
   (SELECT coalesce(sum(min(network_free_credits,credits)),0) FROM generation_credit_reservation
     WHERE free_network_hash=NEW.free_network_hash AND daily_credit_date=NEW.daily_credit_date
       AND status IN ('reserved','settled')) > 10
   THEN RAISE(ABORT,'NETWORK_FREE_BUDGET_EXCEEDED') END;
END;
