-- Migration: Educator Dashboard Tables
-- Description: Creates tables, functions, and RLS policies for educator dashboard features
-- Date: 2025-01-XX
-- 
-- IMPORTANT: Run this entire migration in one transaction in Supabase SQL Editor
-- If you encounter errors, check which tables already exist and run only the missing parts

-- Diagnostic: Check existing tables (uncomment to run)
-- SELECT table_name 
-- FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('organizations', 'classes', 'join_codes', 'enrollments', 'bulk_student_jobs', 'bulk_student_rows')
-- ORDER BY table_name;

-- ============================================
-- Step 1: Create organizations table
-- ============================================
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_organizations_created_by ON organizations(created_by);

-- ============================================
-- Step 2: Update user_profiles table
-- Note: Assuming user_profiles exists and serves as the users table
-- ============================================
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'Student' 
  CHECK (role IN ('SuperAdmin', 'Educator', 'Student')),
ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id),
ADD COLUMN IF NOT EXISTS onboarding_state TEXT DEFAULT 'pending' 
  CHECK (onboarding_state IN ('pending', 'active'));

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_org_id ON user_profiles(org_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- ============================================
-- Step 3: Create classes table
-- ============================================
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT,
  grade TEXT,
  section TEXT,
  timezone TEXT DEFAULT 'UTC',
  archived BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_classes_org_id ON classes(org_id);
CREATE INDEX IF NOT EXISTS idx_classes_created_by ON classes(created_by);
CREATE INDEX IF NOT EXISTS idx_classes_archived ON classes(archived);

-- ============================================
-- Step 4: Create join_codes table
-- ============================================
CREATE TABLE IF NOT EXISTS join_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('org', 'class')),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  label TEXT,
  max_uses INTEGER DEFAULT 0, -- 0 = unlimited
  used_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  revoked BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_join_codes_code ON join_codes(code);
CREATE INDEX IF NOT EXISTS idx_join_codes_org_id ON join_codes(org_id);
CREATE INDEX IF NOT EXISTS idx_join_codes_class_id ON join_codes(class_id);
CREATE INDEX IF NOT EXISTS idx_join_codes_type ON join_codes(type);

-- ============================================
-- Step 5: Create enrollments table
-- ============================================
CREATE TABLE IF NOT EXISTS enrollments (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'Student',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'removed')),
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, class_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_class_id ON enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON enrollments(status);

-- ============================================
-- Step 6: Create bulk_student_jobs table (for audit)
-- ============================================
CREATE TABLE IF NOT EXISTS bulk_student_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  total INTEGER DEFAULT 0,
  succeeded INTEGER DEFAULT 0,
  failed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bulk_student_jobs_org_id ON bulk_student_jobs(org_id);
CREATE INDEX IF NOT EXISTS idx_bulk_student_jobs_class_id ON bulk_student_jobs(class_id);
CREATE INDEX IF NOT EXISTS idx_bulk_student_jobs_created_by ON bulk_student_jobs(created_by);

-- ============================================
-- Step 7: Create bulk_student_rows table
-- ============================================
CREATE TABLE IF NOT EXISTS bulk_student_rows (
  job_id UUID REFERENCES bulk_student_jobs(id) ON DELETE CASCADE,
  row_no INTEGER,
  payload_json JSONB,
  status TEXT CHECK (status IN ('pending', 'success', 'failed')),
  error_text TEXT,
  PRIMARY KEY (job_id, row_no)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bulk_student_rows_job_id ON bulk_student_rows(job_id);
CREATE INDEX IF NOT EXISTS idx_bulk_student_rows_status ON bulk_student_rows(status);

-- ============================================
-- Step 8: Helper Function to Generate Join Codes
-- ============================================
CREATE OR REPLACE FUNCTION generate_class_code()
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
BEGIN
  LOOP
    new_code := 'CLS-' || upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM join_codes WHERE code = new_code);
  END LOOP;
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Step 9: Stored Procedure - Redeem Join Code
-- ============================================
CREATE OR REPLACE FUNCTION redeem_join_code(p_code TEXT)
RETURNS JSON AS $$
DECLARE
  v join_codes%rowtype;
  v_user_id UUID;
  v_result JSON;
BEGIN
  -- Get current user ID from JWT
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('status', 'error', 'message', 'User must be authenticated');
  END IF;
  
  -- Lock and validate code
  SELECT * INTO v 
  FROM join_codes
  WHERE code = p_code 
    AND NOT revoked
    AND (expires_at IS NULL OR expires_at > NOW())
  FOR UPDATE; -- Lock row for used_count update
  
  IF NOT FOUND THEN
    RETURN json_build_object('status', 'error', 'message', 'Invalid, expired, or revoked code');
  END IF;
  
  -- Check usage limits
  IF v.max_uses > 0 AND v.used_count >= v.max_uses THEN
    RETURN json_build_object('status', 'error', 'message', 'Code usage limit reached');
  END IF;
  
  -- Enroll user
  IF v.type = 'class' THEN
    INSERT INTO enrollments(user_id, class_id, role, status)
    VALUES (v_user_id, v.class_id, 'Student', 'active')
    ON CONFLICT (user_id, class_id) DO NOTHING;
  END IF;
  
  -- Update used count
  UPDATE join_codes 
  SET used_count = used_count + 1 
  WHERE id = v.id;
  
  -- Return result
  SELECT json_build_object(
    'status', 'ok',
    'type', v.type,
    'class_id', v.class_id
  ) INTO v_result;
  
  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('status', 'error', 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Step 10: Stored Procedure - Provision Student
-- ============================================
CREATE OR REPLACE FUNCTION provision_student(p JSONB)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
  v_auth_user_id UUID;
  v_result JSON;
BEGIN
  -- Get org_id and user role from JWT
  v_org_id := (auth.jwt() ->> 'org_id')::UUID;
  v_auth_user_id := auth.uid();
  
  IF v_org_id IS NULL THEN
    RETURN json_build_object('status', 'error', 'message', 'User must belong to an organization');
  END IF;
  
  -- Validate: email or phone required
  IF (p->>'email') IS NULL AND (p->>'phone') IS NULL THEN
    RETURN json_build_object('status', 'error', 'message', 'Email or phone is required');
  END IF;
  
  -- Create auth user first (if email provided)
  IF (p->>'email') IS NOT NULL THEN
    -- Note: This requires admin API call from backend, not directly from function
    -- For now, we'll just create the user_profiles entry
    -- The actual auth user should be created via Supabase Admin API
    v_user_id := gen_random_uuid();
  ELSE
    -- For phone-only users, generate UUID
    v_user_id := gen_random_uuid();
  END IF;
  
  -- Create user profile in same org
  INSERT INTO user_profiles (
    id,
    user_id,
    org_id,
    role,
    email,
    phone,
    full_name,
    onboarding_state
  )
  VALUES (
    gen_random_uuid(),
    v_user_id,
    v_org_id,
    'Student',
    p->>'email',
    p->>'phone',
    COALESCE(p->>'full_name', p->>'name'),
    'pending'
  )
  ON CONFLICT (user_id) DO UPDATE
  SET org_id = EXCLUDED.org_id,
      role = EXCLUDED.role,
      email = COALESCE(EXCLUDED.email, user_profiles.email),
      phone = COALESCE(EXCLUDED.phone, user_profiles.phone),
      full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name)
  RETURNING user_id INTO v_user_id;
  
  -- Enroll to class if provided
  IF p ? 'class_id' AND (p->>'class_id') IS NOT NULL THEN
    INSERT INTO enrollments(user_id, class_id, role, status)
    VALUES (v_user_id, (p->>'class_id')::UUID, 'Student', 'active')
    ON CONFLICT (user_id, class_id) DO NOTHING;
  END IF;
  
  SELECT json_build_object(
    'status', 'ok',
    'user_id', v_user_id
  ) INTO v_result;
  
  RETURN v_result;
EXCEPTION
  WHEN unique_violation THEN
    RETURN json_build_object('status', 'error', 'message', 'Email or phone already exists');
  WHEN OTHERS THEN
    RETURN json_build_object('status', 'error', 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Step 11: Enable Row Level Security (RLS)
-- ============================================
-- Only enable RLS if tables exist (check first)
DO $$
BEGIN
  -- Check and enable RLS on organizations
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'public' AND table_name = 'organizations') THEN
    ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
  END IF;
  
  -- Check and enable RLS on classes
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'public' AND table_name = 'classes') THEN
    ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
  END IF;
  
  -- Check and enable RLS on join_codes
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'public' AND table_name = 'join_codes') THEN
    ALTER TABLE join_codes ENABLE ROW LEVEL SECURITY;
  END IF;
  
  -- Check and enable RLS on enrollments
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'public' AND table_name = 'enrollments') THEN
    ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
  END IF;
  
  -- Check and enable RLS on bulk_student_jobs
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'public' AND table_name = 'bulk_student_jobs') THEN
    ALTER TABLE bulk_student_jobs ENABLE ROW LEVEL SECURITY;
  END IF;
  
  -- Check and enable RLS on bulk_student_rows
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'public' AND table_name = 'bulk_student_rows') THEN
    ALTER TABLE bulk_student_rows ENABLE ROW LEVEL SECURITY;
  END IF;
  
  -- Check and enable RLS on user_profiles (if not already enabled)
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'public' AND table_name = 'user_profiles') THEN
    ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- ============================================
-- Step 12: SuperAdmin Policies (Full Access)
-- ============================================
-- Drop policies if they exist, then create them (idempotent)
DROP POLICY IF EXISTS "superadmin_all_access_organizations" ON organizations;
CREATE POLICY "superadmin_all_access_organizations" ON organizations
  FOR ALL
  USING ((SELECT role FROM user_profiles WHERE user_id = auth.uid()) = 'SuperAdmin')
  WITH CHECK ((SELECT role FROM user_profiles WHERE user_id = auth.uid()) = 'SuperAdmin');

DROP POLICY IF EXISTS "superadmin_all_access_classes" ON classes;
CREATE POLICY "superadmin_all_access_classes" ON classes
  FOR ALL
  USING ((SELECT role FROM user_profiles WHERE user_id = auth.uid()) = 'SuperAdmin')
  WITH CHECK ((SELECT role FROM user_profiles WHERE user_id = auth.uid()) = 'SuperAdmin');

DROP POLICY IF EXISTS "superadmin_all_access_join_codes" ON join_codes;
CREATE POLICY "superadmin_all_access_join_codes" ON join_codes
  FOR ALL
  USING ((SELECT role FROM user_profiles WHERE user_id = auth.uid()) = 'SuperAdmin')
  WITH CHECK ((SELECT role FROM user_profiles WHERE user_id = auth.uid()) = 'SuperAdmin');

DROP POLICY IF EXISTS "superadmin_all_access_enrollments" ON enrollments;
CREATE POLICY "superadmin_all_access_enrollments" ON enrollments
  FOR ALL
  USING ((SELECT role FROM user_profiles WHERE user_id = auth.uid()) = 'SuperAdmin')
  WITH CHECK ((SELECT role FROM user_profiles WHERE user_id = auth.uid()) = 'SuperAdmin');

DROP POLICY IF EXISTS "superadmin_all_access_bulk_jobs" ON bulk_student_jobs;
CREATE POLICY "superadmin_all_access_bulk_jobs" ON bulk_student_jobs
  FOR ALL
  USING ((SELECT role FROM user_profiles WHERE user_id = auth.uid()) = 'SuperAdmin')
  WITH CHECK ((SELECT role FROM user_profiles WHERE user_id = auth.uid()) = 'SuperAdmin');

DROP POLICY IF EXISTS "superadmin_all_access_bulk_rows" ON bulk_student_rows;
CREATE POLICY "superadmin_all_access_bulk_rows" ON bulk_student_rows
  FOR ALL
  USING ((SELECT role FROM user_profiles WHERE user_id = auth.uid()) = 'SuperAdmin')
  WITH CHECK ((SELECT role FROM user_profiles WHERE user_id = auth.uid()) = 'SuperAdmin');

-- ============================================
-- Step 13: Educator Policies
-- ============================================
-- Drop policies if they exist, then create them (idempotent)
-- Educators can view and manage organizations they belong to
DROP POLICY IF EXISTS "educator_view_org" ON organizations;
CREATE POLICY "educator_view_org" ON organizations
  FOR SELECT
  USING (
    (SELECT role FROM user_profiles WHERE user_id = auth.uid()) = 'Educator'
    AND id = (SELECT org_id FROM user_profiles WHERE user_id = auth.uid())
  );

-- Educators can create students only in their org
DROP POLICY IF EXISTS "educator_create_students_in_org" ON user_profiles;
CREATE POLICY "educator_create_students_in_org" ON user_profiles
  FOR INSERT
  WITH CHECK (
    (SELECT role FROM user_profiles WHERE user_id = auth.uid()) = 'Educator'
    AND role = 'Student'
    AND org_id = (SELECT org_id FROM user_profiles WHERE user_id = auth.uid())
  );

-- Educators can view users in their org
DROP POLICY IF EXISTS "educator_view_org_users" ON user_profiles;
CREATE POLICY "educator_view_org_users" ON user_profiles
  FOR SELECT
  USING (
    org_id = (SELECT org_id FROM user_profiles WHERE user_id = auth.uid())
    AND (SELECT role FROM user_profiles WHERE user_id = auth.uid()) IN ('Educator', 'SuperAdmin')
  );

-- Educators can create and manage classes in their org
DROP POLICY IF EXISTS "educator_manage_org_classes" ON classes;
CREATE POLICY "educator_manage_org_classes" ON classes
  FOR ALL
  USING (
    (SELECT role FROM user_profiles WHERE user_id = auth.uid()) = 'Educator'
    AND org_id = (SELECT org_id FROM user_profiles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    (SELECT role FROM user_profiles WHERE user_id = auth.uid()) = 'Educator'
    AND org_id = (SELECT org_id FROM user_profiles WHERE user_id = auth.uid())
  );

-- Educators can manage join codes for their org's classes
DROP POLICY IF EXISTS "educator_manage_org_join_codes" ON join_codes;
CREATE POLICY "educator_manage_org_join_codes" ON join_codes
  FOR ALL
  USING (
    (SELECT role FROM user_profiles WHERE user_id = auth.uid()) = 'Educator'
    AND org_id = (SELECT org_id FROM user_profiles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    (SELECT role FROM user_profiles WHERE user_id = auth.uid()) = 'Educator'
    AND org_id = (SELECT org_id FROM user_profiles WHERE user_id = auth.uid())
  );

-- Educators can enroll students into their org's classes
DROP POLICY IF EXISTS "educator_enroll_in_org_classes" ON enrollments;
CREATE POLICY "educator_enroll_in_org_classes" ON enrollments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = enrollments.class_id
        AND c.org_id = (SELECT org_id FROM user_profiles WHERE user_id = auth.uid())
    )
    AND (SELECT role FROM user_profiles WHERE user_id = auth.uid()) = 'Educator'
  );

-- Educators can view enrollments for their org's classes
DROP POLICY IF EXISTS "educator_view_org_enrollments" ON enrollments;
CREATE POLICY "educator_view_org_enrollments" ON enrollments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = enrollments.class_id
        AND c.org_id = (SELECT org_id FROM user_profiles WHERE user_id = auth.uid())
    )
  );

-- Educators can manage bulk jobs in their org
DROP POLICY IF EXISTS "educator_manage_bulk_jobs" ON bulk_student_jobs;
CREATE POLICY "educator_manage_bulk_jobs" ON bulk_student_jobs
  FOR ALL
  USING (
    (SELECT role FROM user_profiles WHERE user_id = auth.uid()) = 'Educator'
    AND org_id = (SELECT org_id FROM user_profiles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    (SELECT role FROM user_profiles WHERE user_id = auth.uid()) = 'Educator'
    AND org_id = (SELECT org_id FROM user_profiles WHERE user_id = auth.uid())
  );

-- Educators can view bulk rows for their org's jobs
DROP POLICY IF EXISTS "educator_view_bulk_rows" ON bulk_student_rows;
CREATE POLICY "educator_view_bulk_rows" ON bulk_student_rows
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bulk_student_jobs bsj
      WHERE bsj.id = bulk_student_rows.job_id
        AND bsj.org_id = (SELECT org_id FROM user_profiles WHERE user_id = auth.uid())
    )
  );

-- ============================================
-- Step 14: Student Policies
-- ============================================
-- Drop policies if they exist, then create them (idempotent)
-- Students can view their own data
DROP POLICY IF EXISTS "student_view_self" ON user_profiles;
CREATE POLICY "student_view_self" ON user_profiles
  FOR SELECT
  USING (user_id = auth.uid());

-- Students can view their enrollments
DROP POLICY IF EXISTS "student_view_enrollments" ON enrollments;
CREATE POLICY "student_view_enrollments" ON enrollments
  FOR SELECT
  USING (user_id = auth.uid());

-- Students can view classes they're enrolled in
DROP POLICY IF EXISTS "student_view_enrolled_classes" ON classes;
CREATE POLICY "student_view_enrolled_classes" ON classes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM enrollments e
      WHERE e.class_id = classes.id
        AND e.user_id = auth.uid()
    )
  );

-- Students can use join codes (public function handles auth)
-- Note: The redeem_join_code function uses SECURITY DEFINER, so students can call it
-- Additional RLS policies are not needed for the join_codes table for student access
-- since they only interact through the function

-- ============================================
-- Step 15: Public Policies (for join code redemption)
-- ============================================
-- Drop policy if it exists, then create it (idempotent)
-- Allow authenticated users to read join codes for validation
-- (The actual redemption is handled by the function)
DROP POLICY IF EXISTS "public_read_join_codes" ON join_codes;
CREATE POLICY "public_read_join_codes" ON join_codes
  FOR SELECT
  USING (true);

-- ============================================
-- Notes:
-- 1. The provision_student function creates user_profiles entries
--    Actual auth.users entries must be created via Supabase Admin API in your backend
-- 2. JWT claims should include 'role' and 'org_id' - you may need to set up
--    a custom JWT claims function or handle this in your application layer
-- 3. For phone-only accounts, magic links via SMS should be handled in your backend
-- 4. Test all policies after running this migration
-- ============================================

