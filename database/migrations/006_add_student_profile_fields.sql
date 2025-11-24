-- Migration: Add student profile fields
-- Description: Adds optional student metadata columns for educator-managed accounts
-- Date: 2025-02-??

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS student_id TEXT,
ADD COLUMN IF NOT EXISTS parent_email TEXT,
ADD COLUMN IF NOT EXISTS student_metadata JSONB DEFAULT '{}'::jsonb;

-- Track student last seen (can be updated from auth webhooks)
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;














