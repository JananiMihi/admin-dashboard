-- Create SuperAdmin User Setup Script
-- Run this in Supabase SQL Editor to ensure SuperAdmin user exists

-- Step 1: Check if admin@neo exists in auth.users
-- Note: This user should be created via Supabase Auth Admin API or through the login page
-- This script ensures the user_profiles entry has correct role

-- Step 2: Update or insert user profile for admin@neo
-- First, find the user_id from auth.users (you'll need to manually find this)
-- Or use the email to find it via Supabase Admin API

-- For now, we'll create a function that can be called from the app
-- Or manually run these SQL statements after creating the auth user

-- After creating the auth user with email 'admin@neo' and password 'Admin@1234',
-- Update the user_profiles table:

DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Try to find user by email in auth.users (this requires direct table access)
  -- Note: This might not work due to RLS, so better to do via Admin API
  
  -- Alternative: Create/update user profile
  -- Get user_id from auth.users where email = 'admin@neo'
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'admin@neo'
  LIMIT 1;
  
  -- If user found, update their profile
  IF v_user_id IS NOT NULL THEN
    -- Create default organization if doesn't exist
    INSERT INTO organizations (id, name)
    VALUES (gen_random_uuid(), 'Default Organization')
    ON CONFLICT DO NOTHING;
    
    -- Get default org_id
    DECLARE
      v_org_id UUID;
    BEGIN
      SELECT id INTO v_org_id FROM organizations LIMIT 1;
      
      -- Update or insert user profile
      INSERT INTO user_profiles (
        user_id,
        email,
        full_name,
        role,
        org_id,
        onboarding_state
      )
      VALUES (
        v_user_id,
        'admin@neo',
        'Super Admin',
        'SuperAdmin',
        v_org_id,
        'active'
      )
      ON CONFLICT (user_id) DO UPDATE
      SET role = 'SuperAdmin',
          email = 'admin@neo',
          full_name = 'Super Admin',
          onboarding_state = 'active',
          org_id = COALESCE(user_profiles.org_id, v_org_id);
      
      RAISE NOTICE 'SuperAdmin profile updated/created successfully';
    END;
  ELSE
    RAISE NOTICE 'User admin@neo not found in auth.users. Please create the auth user first via Supabase Dashboard or Admin API.';
  END IF;
END $$;

-- Manual alternative if the above doesn't work:
-- 1. Go to Supabase Dashboard → Authentication → Users
-- 2. Find or create user with email: admin@neo
-- 3. Note the user ID (uuid)
-- 4. Run this SQL (replace <USER_ID> with actual UUID):

/*
INSERT INTO organizations (id, name)
VALUES (gen_random_uuid(), 'Default Organization')
ON CONFLICT DO NOTHING;

INSERT INTO user_profiles (
  user_id,
  email,
  full_name,
  role,
  org_id,
  onboarding_state
)
VALUES (
  '<USER_ID>',  -- Replace with actual user ID from auth.users
  'admin@neo',
  'Super Admin',
  'SuperAdmin',
  (SELECT id FROM organizations LIMIT 1),
  'active'
)
ON CONFLICT (user_id) DO UPDATE
SET role = 'SuperAdmin',
    email = 'admin@neo',
    full_name = 'Super Admin',
    onboarding_state = 'active',
    org_id = COALESCE(user_profiles.org_id, (SELECT id FROM organizations LIMIT 1));
*/





