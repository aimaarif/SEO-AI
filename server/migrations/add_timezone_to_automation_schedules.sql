-- Migration: Add timezone support to automation_schedules table
-- This migration converts timestamp columns to timestamptz (timestamp with timezone)

-- First, create new columns with timezone support
ALTER TABLE automation_schedules 
ADD COLUMN last_run_at_tz timestamptz,
ADD COLUMN next_run_at_tz timestamptz,
ADD COLUMN created_at_tz timestamptz,
ADD COLUMN updated_at_tz timestamptz;

-- Copy existing data, converting to UTC timezone
UPDATE automation_schedules 
SET 
  last_run_at_tz = last_run_at AT TIME ZONE 'UTC',
  next_run_at_tz = next_run_at AT TIME ZONE 'UTC',
  created_at_tz = created_at AT TIME ZONE 'UTC',
  updated_at_tz = updated_at AT TIME ZONE 'UTC';

-- Drop old columns
ALTER TABLE automation_schedules 
DROP COLUMN last_run_at,
DROP COLUMN next_run_at,
DROP COLUMN created_at,
DROP COLUMN updated_at;

-- Rename new columns to original names
ALTER TABLE automation_schedules 
RENAME COLUMN last_run_at_tz TO last_run_at;
ALTER TABLE automation_schedules 
RENAME COLUMN next_run_at_tz TO next_run_at;
ALTER TABLE automation_schedules 
RENAME COLUMN created_at_tz TO created_at;
ALTER TABLE automation_schedules 
RENAME COLUMN updated_at_tz TO updated_at;

-- Add NOT NULL constraint to created_at and updated_at
ALTER TABLE automation_schedules 
ALTER COLUMN created_at SET NOT NULL,
ALTER COLUMN updated_at SET NOT NULL;

-- Add default values for created_at and updated_at
ALTER TABLE automation_schedules 
ALTER COLUMN created_at SET DEFAULT NOW(),
ALTER COLUMN updated_at SET DEFAULT NOW();

-- Add indexes for better performance on time-based queries
CREATE INDEX IF NOT EXISTS idx_automation_schedules_next_run_at ON automation_schedules(next_run_at);
CREATE INDEX IF NOT EXISTS idx_automation_schedules_last_run_at ON automation_schedules(last_run_at);
CREATE INDEX IF NOT EXISTS idx_automation_schedules_created_at ON automation_schedules(created_at);
