-- Migration: Fix Infinite Recursion in Classes RLS Policy
-- Description: Creates a SECURITY DEFINER function to safely get user role/org_id
--              and updates classes RLS policies to use it, preventing infinite recursion
-- Date: 2025-01-XX

-- ============================================
-- Step 1: Create helper function to get user profile (bypasses RLS)
-- ============================================
CREATE OR REPLACE FUNCTION get_user_profile_info()
RETURNS TABLE(role TEXT, org_id UUID) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.role::TEXT,
    up.org_id
  FROM user_profiles up
  WHERE up.user_id = auth.uid()
  LIMIT 1;
END;
$$;

-- ============================================
-- Step 2: Update educator_manage_org_classes policy to use the function
-- ============================================
DROP POLICY IF EXISTS "educator_manage_org_classes" ON classes;

CREATE POLICY "educator_manage_org_classes" ON classes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM get_user_profile_info() AS profile
      WHERE profile.role = 'Educator'
      AND classes.org_id = profile.org_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM get_user_profile_info() AS profile
      WHERE profile.role = 'Educator'
      AND classes.org_id = profile.org_id
    )
  );

-- ============================================
-- Step 3: Update superadmin_all_access_classes policy to use the function
-- ============================================
DROP POLICY IF EXISTS "superadmin_all_access_classes" ON classes;

CREATE POLICY "superadmin_all_access_classes" ON classes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM get_user_profile_info() AS profile
      WHERE profile.role = 'SuperAdmin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM get_user_profile_info() AS profile
      WHERE profile.role = 'SuperAdmin'
    )
  );

-- ============================================
-- Step 4: Update educator_manage_org_join_codes policy
-- ============================================
DROP POLICY IF EXISTS "educator_manage_org_join_codes" ON join_codes;

CREATE POLICY "educator_manage_org_join_codes" ON join_codes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM get_user_profile_info() AS profile
      WHERE profile.role = 'Educator'
      AND join_codes.org_id = profile.org_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM get_user_profile_info() AS profile
      WHERE profile.role = 'Educator'
      AND join_codes.org_id = profile.org_id
    )
  );

-- ============================================
-- Step 5: Update educator_enroll_in_org_classes policy
-- ============================================
DROP POLICY IF EXISTS "educator_enroll_in_org_classes" ON enrollments;

CREATE POLICY "educator_enroll_in_org_classes" ON enrollments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM get_user_profile_info() AS profile
      WHERE profile.role = 'Educator'
      AND EXISTS (
        SELECT 1 FROM classes c
        WHERE c.id = enrollments.class_id
        AND c.org_id = profile.org_id
      )
    )
  );

-- ============================================
-- Step 6: Update educator_view_org_enrollments policy
-- ============================================
DROP POLICY IF EXISTS "educator_view_org_enrollments" ON enrollments;

CREATE POLICY "educator_view_org_enrollments" ON enrollments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM get_user_profile_info() AS profile
      WHERE profile.role = 'Educator'
      AND EXISTS (
        SELECT 1 FROM classes c
        WHERE c.id = enrollments.class_id
        AND c.org_id = profile.org_id
      )
    )
  );

-- ============================================
-- Notes:
-- 1. The get_user_profile_info() function uses SECURITY DEFINER, which means
--    it runs with the privileges of the function creator (usually postgres),
--    bypassing RLS on user_profiles table
-- 2. This prevents infinite recursion because the function doesn't trigger
--    RLS policies when querying user_profiles
-- 3. The function is marked as STABLE, which allows PostgreSQL to optimize
--    repeated calls within the same query
-- ============================================

