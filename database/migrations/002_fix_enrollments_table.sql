-- Quick Fix: Create enrollments table if it doesn't exist
-- Run this if you get "relation enrollments does not exist" error

-- First, verify dependencies exist
DO $$
BEGIN
  -- Check if classes table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'classes'
  ) THEN
    RAISE EXCEPTION 'Classes table does not exist. Please run Step 3 of the main migration first.';
  END IF;
END $$;

-- Create enrollments table
CREATE TABLE IF NOT EXISTS enrollments (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'Student',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'removed')),
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, class_id)
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_class_id ON enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON enrollments(status);

-- Enable RLS if table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'enrollments'
  ) THEN
    ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Enrollments table created successfully!';
END $$;


