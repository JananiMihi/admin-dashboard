-- Test Script: Verify RLS Policies and Database Setup
-- Run this in Supabase SQL Editor to verify everything is working

-- ============================================
-- Step 1: Check if all tables exist
-- ============================================
SELECT 
  'Tables Check' as test_type,
  table_name,
  CASE 
    WHEN table_name IN ('organizations', 'classes', 'join_codes', 'enrollments', 'bulk_student_jobs', 'bulk_student_rows') 
    THEN '✓ EXISTS'
    ELSE '⚠ CHECK MANUALLY'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('organizations', 'classes', 'join_codes', 'enrollments', 'bulk_student_jobs', 'bulk_student_rows')
ORDER BY table_name;

-- ============================================
-- Step 2: Check if user_profiles has new columns
-- ============================================
SELECT 
  'Columns Check' as test_type,
  column_name,
  data_type,
  CASE 
    WHEN column_name IN ('role', 'org_id', 'onboarding_state') 
    THEN '✓ EXISTS'
    ELSE '⚠ MISSING'
  END as status
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'user_profiles'
AND column_name IN ('role', 'org_id', 'onboarding_state')
ORDER BY column_name;

-- ============================================
-- Step 3: Check if RLS is enabled
-- ============================================
SELECT 
  'RLS Check' as test_type,
  tablename,
  CASE 
    WHEN rowsecurity = true 
    THEN '✓ ENABLED'
    ELSE '✗ DISABLED'
  END as status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('organizations', 'classes', 'join_codes', 'enrollments', 'bulk_student_jobs', 'bulk_student_rows', 'user_profiles')
ORDER BY tablename;

-- ============================================
-- Step 4: Check if policies exist
-- ============================================
SELECT 
  'Policies Check' as test_type,
  schemaname,
  tablename,
  policyname,
  CASE 
    WHEN policyname IS NOT NULL 
    THEN '✓ EXISTS'
    ELSE '✗ MISSING'
  END as status
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('organizations', 'classes', 'join_codes', 'enrollments', 'bulk_student_jobs', 'bulk_student_rows', 'user_profiles')
ORDER BY tablename, policyname;

-- ============================================
-- Step 5: Check if functions exist
-- ============================================
SELECT 
  'Functions Check' as test_type,
  routine_name,
  CASE 
    WHEN routine_name IN ('generate_class_code', 'redeem_join_code', 'provision_student') 
    THEN '✓ EXISTS'
    ELSE '✗ MISSING'
  END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('generate_class_code', 'redeem_join_code', 'provision_student')
ORDER BY routine_name;

-- ============================================
-- Step 6: Test generate_class_code function
-- ============================================
SELECT 
  'Function Test' as test_type,
  'generate_class_code' as function_name,
  generate_class_code() as result,
  CASE 
    WHEN generate_class_code() LIKE 'CLS-%' 
    THEN '✓ WORKING'
    ELSE '✗ FAILED'
  END as status;

-- ============================================
-- Step 7: Count existing data
-- ============================================
SELECT 
  'Data Count' as test_type,
  'organizations' as table_name,
  COUNT(*) as row_count
FROM organizations
UNION ALL
SELECT 
  'Data Count',
  'classes',
  COUNT(*)
FROM classes
UNION ALL
SELECT 
  'Data Count',
  'join_codes',
  COUNT(*)
FROM join_codes
UNION ALL
SELECT 
  'Data Count',
  'enrollments',
  COUNT(*)
FROM enrollments
UNION ALL
SELECT 
  'Data Count',
  'user_profiles with role',
  COUNT(*)
FROM user_profiles
WHERE role IS NOT NULL;


