CREATE TABLE "referral_visit" (
	"visit_id" text PRIMARY KEY NOT NULL,
	"visitor_id" text NOT NULL,
	"source" text DEFAULT 'anyposes' NOT NULL,
	"entry_path" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "referral_visit_source_created_at_idx" ON "referral_visit" USING btree ("source","created_at");--> statement-breakpoint
CREATE INDEX "referral_visit_visitor_idx" ON "referral_visit" USING btree ("visitor_id");