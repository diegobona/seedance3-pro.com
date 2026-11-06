CREATE TABLE creation_asset (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK(kind IN ('image','video')),
  source_url TEXT,
  storage_key TEXT,
  mime_type TEXT,
  prompt TEXT,
  model TEXT,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  archive_attempts INTEGER NOT NULL DEFAULT 0,
  next_archive_at INTEGER NOT NULL DEFAULT 0,
  deleted_at INTEGER
);
--> statement-breakpoint
CREATE INDEX creation_asset_owner_date ON creation_asset(user_id,created_at DESC,id DESC);
--> statement-breakpoint
CREATE INDEX creation_asset_archive ON creation_asset(next_archive_at) WHERE storage_key IS NULL AND deleted_at IS NULL;
--> statement-breakpoint
CREATE TABLE creation_maintenance (key TEXT PRIMARY KEY NOT NULL,value TEXT NOT NULL);
