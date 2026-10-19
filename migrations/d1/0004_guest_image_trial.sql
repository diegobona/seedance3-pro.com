CREATE TABLE "guest_image_trial" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "user_id" TEXT NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
  "network_hash" TEXT NOT NULL,
  "created_at" INTEGER NOT NULL DEFAULT (CAST(unixepoch('subsecond') * 1000 AS INTEGER))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "guest_image_trial_user_idx" ON "guest_image_trial" ("user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "guest_image_trial_network_idx" ON "guest_image_trial" ("network_hash");
