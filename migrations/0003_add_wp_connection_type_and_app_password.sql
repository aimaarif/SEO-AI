-- Add WordPress connection type and application password fields to clients table
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "connection_type" text DEFAULT 'oauth';
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "wp_username" text;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "wp_app_password" text;
