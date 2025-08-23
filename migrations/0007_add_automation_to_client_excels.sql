-- Add automation column to client_excels for tracking automation state per row
ALTER TABLE "client_excels"
  ADD COLUMN IF NOT EXISTS "automation" text NOT NULL DEFAULT 'pending';

-- Optional: backfill existing rows explicitly to 'pending' (no-op due to default)
UPDATE "client_excels" SET "automation" = COALESCE("automation", 'pending');

-- Helpful index if querying by automation state becomes common (optional)
-- CREATE INDEX IF NOT EXISTS idx_client_excels_automation ON "client_excels" ("automation");


