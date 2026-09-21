CREATE TABLE "launch_waitlist" (
	"user_id" text PRIMARY KEY NOT NULL,
	"bonus_credits" integer DEFAULT 5 NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notified_at" timestamp with time zone,
	"bonus_granted_at" timestamp with time zone,
	CONSTRAINT "launch_waitlist_bonus_credits_check" CHECK ("launch_waitlist"."bonus_credits" > 0)
);
--> statement-breakpoint
ALTER TABLE "launch_waitlist" ADD CONSTRAINT "launch_waitlist_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;