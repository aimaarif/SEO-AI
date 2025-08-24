# Timezone Fix for Automation Schedules

## Problem Description
The automation schedules were experiencing timezone issues where:
- Start times were being saved without timezone information
- Next run times and last run times were showing incorrect times (typically +5 hours offset)
- This caused confusion when schedules didn't run at the expected local time

## Root Cause
1. Database columns used `timestamp` without timezone (`timestamptz`)
2. Scheduler was creating Date objects in local timezone but storing them without timezone context
3. Frontend was displaying times without proper timezone conversion

## Solution Implemented

### 1. Database Schema Changes
- Updated `automation_schedules` table columns to use `timestamp with timezone`:
  - `last_run_at`
  - `next_run_at` 
  - `created_at`
  - `updated_at`

### 2. Scheduler Service Updates
- Modified `calculateNextRunTime()` method to work entirely in UTC
- All time calculations now use `Date.UTC()` to ensure consistent timezone handling
- Timestamps are stored in UTC in the database

### 3. Frontend Updates
- Added utility functions to convert between local time and UTC:
  - `convertLocalTimeToUTC()`: Converts local time input to UTC for storage
  - `convertUTCToLocalTime()`: Converts stored UTC time back to local for display
- Updated time display to show local timezone information
- Added helpful notes about timezone handling

### 4. Migration Script
- Created `add_timezone_to_automation_schedules.sql` to update existing database
- Converts existing timestamp data to UTC timezone
- Adds performance indexes for time-based queries

## How It Works Now

1. **User Input**: User sets start time in their local timezone (e.g., "01:47")
2. **Conversion**: Frontend converts local time to UTC before sending to backend
3. **Storage**: Backend stores all timestamps in UTC with timezone information
4. **Calculation**: Scheduler calculates next run times in UTC
5. **Display**: Frontend converts UTC times back to local timezone for display

## Benefits

- ✅ Consistent timezone handling across all components
- ✅ No more 5-hour offset issues
- ✅ Schedules run at the exact local time specified
- ✅ Proper timezone information in database
- ✅ Better performance with indexed timestamp columns

## Migration Steps

1. **Backup your database** before running the migration
2. **Run the migration script**:
   ```bash
   psql -d your_database -f server/migrations/add_timezone_to_automation_schedules.sql
   ```
3. **Restart your application** to pick up the new schema
4. **Verify** that existing schedules show correct times

## Testing

After migration, verify that:
- Existing schedules display correct local times
- New schedules run at the specified local time
- No timezone offset issues in the UI
- Database timestamps include timezone information

## Notes

- All times are now stored in UTC internally
- Frontend automatically converts to user's local timezone
- The 5-hour offset issue should be completely resolved
- Existing schedules will continue to work with corrected timing
