-- Migration: Mission Customization System
-- Description: Allows educators to customize missions per class without affecting the main platform
-- Date: 2025-01-XX
-- 
-- IMPORTANT: Run this entire migration in one transaction in Supabase SQL Editor
-- 
-- This migration enables:
-- 1. SuperAdmin can create global missions (marked with created_by = NULL or SuperAdmin user_id)
-- 2. Educators can create their own missions (marked with their user_id and org_id)
-- 3. Educators can customize any mission (SuperAdmin or their own) per class
-- 4. Customizations don't affect the original mission data

-- ============================================
-- Step 1: Update missions table to track creator
-- ============================================
-- Add created_by to track who created the mission (NULL = SuperAdmin/Platform)
ALTER TABLE missions
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT true; -- true = SuperAdmin mission, false = Educator mission

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_missions_created_by ON missions(created_by);
CREATE INDEX IF NOT EXISTS idx_missions_org_id ON missions(org_id);
CREATE INDEX IF NOT EXISTS idx_missions_is_global ON missions(is_global);

-- Update existing missions to be global (SuperAdmin missions)
UPDATE missions
SET is_global = true, created_by = NULL, org_id = NULL
WHERE created_by IS NULL AND org_id IS NULL;

-- ============================================
-- Step 2: Create class_missions table (if not exists)
-- ============================================
-- This table links missions to classes (which missions are assigned to which classes)
CREATE TABLE IF NOT EXISTS class_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  display_order INTEGER DEFAULT 0, -- Order of mission in this class
  is_active BOOLEAN DEFAULT true,
  UNIQUE(class_id, mission_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_class_missions_class_id ON class_missions(class_id);
CREATE INDEX IF NOT EXISTS idx_class_missions_mission_id ON class_missions(mission_id);
CREATE INDEX IF NOT EXISTS idx_class_missions_display_order ON class_missions(class_id, display_order);

-- ============================================
-- Step 3: Create class_mission_customizations table
-- ============================================
-- This table stores class-specific customizations for missions
-- Only fields that differ from the base mission are stored here
CREATE TABLE IF NOT EXISTS class_mission_customizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  
  -- Customizable fields (NULL means use base mission value)
  custom_title TEXT,
  custom_description TEXT,
  custom_order INTEGER,
  custom_xp_reward INTEGER,
  custom_unlocked BOOLEAN,
  custom_difficulty TEXT,
  custom_estimated_time INTEGER,
  
  -- Full JSON customization (for mission_data override)
  custom_mission_data JSONB,
  
  -- Metadata
  customized_by UUID REFERENCES auth.users(id),
  customized_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(class_id, mission_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_class_mission_customizations_class_id ON class_mission_customizations(class_id);
CREATE INDEX IF NOT EXISTS idx_class_mission_customizations_mission_id ON class_mission_customizations(mission_id);
CREATE INDEX IF NOT EXISTS idx_class_mission_customizations_class_mission ON class_mission_customizations(class_id, mission_id);

-- ============================================
-- Step 4: Create function to get customized mission
-- ============================================
-- This function merges base mission data with class-specific customizations
CREATE OR REPLACE FUNCTION get_customized_mission(
  p_class_id UUID,
  p_mission_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_base_mission missions%rowtype;
  v_customization class_mission_customizations%rowtype;
  v_result JSON;
BEGIN
  -- Get base mission
  SELECT * INTO v_base_mission
  FROM missions
  WHERE id = p_mission_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Mission not found');
  END IF;
  
  -- Get customization if exists
  SELECT * INTO v_customization
  FROM class_mission_customizations
  WHERE class_id = p_class_id AND mission_id = p_mission_id;
  
  -- Build result by merging base mission with customizations
  -- Use custom value if exists, otherwise use base value
  SELECT json_build_object(
    'id', v_base_mission.id,
    'title', COALESCE(v_customization.custom_title, v_base_mission.title),
    'description', COALESCE(v_customization.custom_description, v_base_mission.description),
    'order', COALESCE(v_customization.custom_order, v_base_mission.order),
    'xp_reward', COALESCE(v_customization.custom_xp_reward, v_base_mission.xp_reward),
    'unlocked', COALESCE(v_customization.custom_unlocked, v_base_mission.unlocked),
    'difficulty', COALESCE(v_customization.custom_difficulty, v_base_mission.difficulty),
    'estimated_time', COALESCE(v_customization.custom_estimated_time, v_base_mission.estimated_time),
    'mission_data', COALESCE(v_customization.custom_mission_data, v_base_mission.mission_data),
    'created_by', v_base_mission.created_by,
    'org_id', v_base_mission.org_id,
    'is_global', v_base_mission.is_global,
    'created_at', v_base_mission.created_at,
    'has_customization', (v_customization.id IS NOT NULL),
    'customized_at', v_customization.customized_at
  ) INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Step 5: Enable Row Level Security (RLS)
-- ============================================
ALTER TABLE class_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_mission_customizations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Step 6: RLS Policies for class_missions
-- ============================================
-- SuperAdmin: Full access
DROP POLICY IF EXISTS "superadmin_all_access_class_missions" ON class_missions;
CREATE POLICY "superadmin_all_access_class_missions" ON class_missions
  FOR ALL
  USING ((SELECT role FROM user_profiles WHERE user_id = auth.uid()) = 'SuperAdmin')
  WITH CHECK ((SELECT role FROM user_profiles WHERE user_id = auth.uid()) = 'SuperAdmin');

-- Educators: Can manage missions for their org's classes
DROP POLICY IF EXISTS "educator_manage_class_missions" ON class_missions;
CREATE POLICY "educator_manage_class_missions" ON class_missions
  FOR ALL
  USING (
    (SELECT role FROM user_profiles WHERE user_id = auth.uid()) = 'Educator'
    AND EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = class_missions.class_id
        AND c.org_id = (SELECT org_id FROM user_profiles WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    (SELECT role FROM user_profiles WHERE user_id = auth.uid()) = 'Educator'
    AND EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = class_missions.class_id
        AND c.org_id = (SELECT org_id FROM user_profiles WHERE user_id = auth.uid())
    )
  );

-- Students: Can view missions for classes they're enrolled in
DROP POLICY IF EXISTS "student_view_class_missions" ON class_missions;
CREATE POLICY "student_view_class_missions" ON class_missions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM enrollments e
      WHERE e.class_id = class_missions.class_id
        AND e.user_id = auth.uid()
    )
  );

-- ============================================
-- Step 7: RLS Policies for class_mission_customizations
-- ============================================
-- SuperAdmin: Full access
DROP POLICY IF EXISTS "superadmin_all_access_mission_customizations" ON class_mission_customizations;
CREATE POLICY "superadmin_all_access_mission_customizations" ON class_mission_customizations
  FOR ALL
  USING ((SELECT role FROM user_profiles WHERE user_id = auth.uid()) = 'SuperAdmin')
  WITH CHECK ((SELECT role FROM user_profiles WHERE user_id = auth.uid()) = 'SuperAdmin');

-- Educators: Can customize missions for their org's classes
DROP POLICY IF EXISTS "educator_customize_class_missions" ON class_mission_customizations;
CREATE POLICY "educator_customize_class_missions" ON class_mission_customizations
  FOR ALL
  USING (
    (SELECT role FROM user_profiles WHERE user_id = auth.uid()) = 'Educator'
    AND EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = class_mission_customizations.class_id
        AND c.org_id = (SELECT org_id FROM user_profiles WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    (SELECT role FROM user_profiles WHERE user_id = auth.uid()) = 'Educator'
    AND EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = class_mission_customizations.class_id
        AND c.org_id = (SELECT org_id FROM user_profiles WHERE user_id = auth.uid())
    )
  );

-- Students: Can view customizations for classes they're enrolled in
DROP POLICY IF EXISTS "student_view_mission_customizations" ON class_mission_customizations;
CREATE POLICY "student_view_mission_customizations" ON class_mission_customizations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM enrollments e
      WHERE e.class_id = class_mission_customizations.class_id
        AND e.user_id = auth.uid()
    )
  );

-- ============================================
-- Step 8: Update missions table RLS policies
-- ============================================
-- Ensure SuperAdmin can see all missions
-- Educators can see global missions AND missions from their org
-- Students can see missions assigned to their classes

-- Drop existing policies if any
DROP POLICY IF EXISTS "superadmin_all_access_missions" ON missions;
DROP POLICY IF EXISTS "educator_view_missions" ON missions;
DROP POLICY IF EXISTS "student_view_missions" ON missions;

-- SuperAdmin: Full access
CREATE POLICY "superadmin_all_access_missions" ON missions
  FOR ALL
  USING ((SELECT role FROM user_profiles WHERE user_id = auth.uid()) = 'SuperAdmin')
  WITH CHECK ((SELECT role FROM user_profiles WHERE user_id = auth.uid()) = 'SuperAdmin');

-- Educators: Can view global missions + their org's missions + create their own
CREATE POLICY "educator_view_missions" ON missions
  FOR SELECT
  USING (
    (SELECT role FROM user_profiles WHERE user_id = auth.uid()) = 'Educator'
    AND (
      is_global = true -- Global missions
      OR org_id = (SELECT org_id FROM user_profiles WHERE user_id = auth.uid()) -- Their org's missions
    )
  );

CREATE POLICY "educator_create_missions" ON missions
  FOR INSERT
  WITH CHECK (
    (SELECT role FROM user_profiles WHERE user_id = auth.uid()) = 'Educator'
    AND org_id = (SELECT org_id FROM user_profiles WHERE user_id = auth.uid())
    AND created_by = auth.uid()
    AND is_global = false
  );

CREATE POLICY "educator_update_own_missions" ON missions
  FOR UPDATE
  USING (
    (SELECT role FROM user_profiles WHERE user_id = auth.uid()) = 'Educator'
    AND created_by = auth.uid()
    AND org_id = (SELECT org_id FROM user_profiles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    (SELECT role FROM user_profiles WHERE user_id = auth.uid()) = 'Educator'
    AND created_by = auth.uid()
    AND org_id = (SELECT org_id FROM user_profiles WHERE user_id = auth.uid())
  );

-- Students: Can view missions assigned to their classes
CREATE POLICY "student_view_missions" ON missions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM class_missions cm
      JOIN enrollments e ON e.class_id = cm.class_id
      WHERE cm.mission_id = missions.id
        AND e.user_id = auth.uid()
    )
  );

-- ============================================
-- Notes:
-- 1. SuperAdmin creates missions with is_global = true, created_by = NULL
-- 2. Educators create missions with is_global = false, created_by = their user_id, org_id = their org
-- 3. When assigning a mission to a class, insert into class_missions
-- 4. To customize a mission for a class, insert/update class_mission_customizations
-- 5. Use get_customized_mission() function to retrieve merged mission data
-- 6. Original missions are never modified - only customizations are stored separately
-- ============================================






