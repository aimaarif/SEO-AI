-- Add WordPress OAuth fields to clients table
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "wp_site_url" text;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "wp_client_id" text;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "wp_client_secret" text;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "wp_redirect_uri" text;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "wp_access_token" text;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "wp_refresh_token" text;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "token_expiry" timestamp;

