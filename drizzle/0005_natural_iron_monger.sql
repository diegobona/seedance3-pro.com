ALTER TABLE "generation_credit_reservation" ADD COLUMN "daily_free_credits" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "generation_credit_reservation" ADD COLUMN "daily_credit_date" date;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "daily_free_credits" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "daily_credit_date" date;--> statement-breakpoint
ALTER TABLE "generation_credit_reservation" ADD CONSTRAINT "reservation_daily_free_credits_check" CHECK ("generation_credit_reservation"."daily_free_credits" >= 0 AND "generation_credit_reservation"."daily_free_credits" <= "generation_credit_reservation"."credits");--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_daily_free_credits_check" CHECK ("user"."daily_free_credits" >= 0 AND "user"."daily_free_credits" <= "user"."credit_balance");