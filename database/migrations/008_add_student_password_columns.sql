ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS last_temporary_password TEXT,
  ADD COLUMN IF NOT EXISTS last_password_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_password_reset_at TIMESTAMPTZ;



