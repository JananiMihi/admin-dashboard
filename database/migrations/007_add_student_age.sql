-- Migration: Add student age column
-- Description: Adds optional age field for student profiles
-- Date: 2025-02-??

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS age INTEGER CHECK (age >= 0);





















