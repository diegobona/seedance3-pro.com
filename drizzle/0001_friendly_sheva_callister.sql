CREATE TABLE "generation_credit_reservation" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"credits" integer NOT NULL,
	"status" text DEFAULT 'reserved' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "credit_balance" SET DEFAULT 15;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "trial_credits_granted_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
UPDATE "user"
SET "credit_balance" = 15,
	"trial_credits_granted_at" = now(),
	"updated_at" = now()
WHERE "credit_balance" = 0
	AND "generation_count" = 0
	AND "plan" = 'free'
	AND "subscription_status" = 'inactive';--> statement-breakpoint
ALTER TABLE "generation_credit_reservation" ADD CONSTRAINT "generation_credit_reservation_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "generation_credit_reservation_user_idx" ON "generation_credit_reservation" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "generation_credit_reservation_status_idx" ON "generation_credit_reservation" USING btree ("status");
