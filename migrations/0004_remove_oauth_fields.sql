-- Remove WordPress OAuth fields from clients table
ALTER TABLE "clients" DROP COLUMN IF EXISTS "connection_type";
ALTER TABLE "clients" DROP COLUMN IF EXISTS "wp_client_id";
ALTER TABLE "clients" DROP COLUMN IF EXISTS "wp_client_secret";
ALTER TABLE "clients" DROP COLUMN IF EXISTS "wp_redirect_uri";
ALTER TABLE "clients" DROP COLUMN IF EXISTS "wp_access_token";
ALTER TABLE "clients" DROP COLUMN IF EXISTS "wp_refresh_token";
ALTER TABLE "clients" DROP COLUMN IF EXISTS "token_expiry";
