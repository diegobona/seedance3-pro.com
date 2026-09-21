CREATE TABLE "video_generation_task" (
	"id" text PRIMARY KEY NOT NULL,
	"provider_task_id" text,
	"user_id" text NOT NULL,
	"reservation_id" text NOT NULL,
	"workflow_id" text NOT NULL,
	"duration" integer NOT NULL,
	"resolution" text NOT NULL,
	"aspect_ratio" text NOT NULL,
	"status" text DEFAULT 'submitting' NOT NULL,
	"result_url" text,
	"provider_error" text,
	"poll_attempts" integer DEFAULT 0 NOT NULL,
	"next_poll_at" timestamp with time zone,
	"lease_until" timestamp with time zone,
	"last_polled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "video_generation_task_status_check" CHECK ("video_generation_task"."status" IN ('submitting', 'submission_unknown', 'queued', 'running', 'succeeded', 'failed', 'expired')),
	CONSTRAINT "video_generation_task_duration_check" CHECK ("video_generation_task"."duration" > 0),
	CONSTRAINT "video_generation_task_poll_attempts_check" CHECK ("video_generation_task"."poll_attempts" >= 0)
);
--> statement-breakpoint
ALTER TABLE "video_generation_task" ADD CONSTRAINT "video_generation_task_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_generation_task" ADD CONSTRAINT "video_generation_task_reservation_id_generation_credit_reservation_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."generation_credit_reservation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "video_generation_task_provider_task_idx" ON "video_generation_task" USING btree ("provider_task_id");--> statement-breakpoint
CREATE UNIQUE INDEX "video_generation_task_reservation_idx" ON "video_generation_task" USING btree ("reservation_id");--> statement-breakpoint
CREATE INDEX "video_generation_task_user_status_idx" ON "video_generation_task" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "video_generation_task_poll_due_idx" ON "video_generation_task" USING btree ("status","next_poll_at");