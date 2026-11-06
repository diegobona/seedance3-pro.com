-- Pause the database signup default; auth and ORM defaults use the shared switch.
ALTER TABLE "user" ALTER COLUMN "credit_balance" SET DEFAULT 0;
--> statement-breakpoint
-- Keep the established legacy trial classification and preserve permanent credits.
UPDATE "user" SET
 "credit_balance"="credit_balance"-CASE
   WHEN "daily_credit_date" IS NULL AND "plan"='free' THEN LEAST("credit_balance",15)
   ELSE "daily_free_credits" END,
 "daily_free_credits"=0,
 "daily_credit_date"=(now() AT TIME ZONE 'Asia/Shanghai')::date
 WHERE "plan"<>'guest';
