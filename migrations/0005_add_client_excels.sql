-- Create client_excels table to store per-row JSON extracted from uploaded Excel files
CREATE TABLE IF NOT EXISTS "client_excels" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "client_id" varchar NOT NULL REFERENCES "clients"("id"),
  "batch_id" text NOT NULL,
  "original_file_name" text,
  "row_index" integer NOT NULL,
  "data" jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Helpful index for grouping by batch
CREATE INDEX IF NOT EXISTS idx_client_excels_batch ON "client_excels" ("batch_id");
CREATE INDEX IF NOT EXISTS idx_client_excels_client ON "client_excels" ("client_id");
