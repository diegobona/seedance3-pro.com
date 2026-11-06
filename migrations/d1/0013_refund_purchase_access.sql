-- Refunds revoke the purchased pack, but do not suspend the customer account.
-- Existing holds are preserved; legacy false positives are reviewed separately.
DROP TRIGGER stripe_order_revoke;
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
