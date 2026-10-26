CREATE TABLE guest_device_claim (
  kind TEXT NOT NULL CHECK (kind IN ('image','video')),
  device_hash TEXT NOT NULL CHECK (length(device_hash)=64),
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)),
  PRIMARY KEY (kind,device_hash)
);
--> statement-breakpoint
CREATE INDEX guest_device_claim_user_idx ON guest_device_claim(user_id);
