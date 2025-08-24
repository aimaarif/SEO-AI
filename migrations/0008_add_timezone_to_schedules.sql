ALTER TABLE "automation_schedules"
    ADD COLUMN "timezone" text NOT NULL DEFAULT 'UTC',
    ALTER COLUMN "last_run_at" TYPE timestamptz USING "last_run_at" AT TIME ZONE 'UTC',
    ALTER COLUMN "next_run_at" TYPE timestamptz USING "next_run_at" AT TIME ZONE 'UTC';