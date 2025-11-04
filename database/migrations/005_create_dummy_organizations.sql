-- Create Dummy Organizations for Testing
-- Run this in Supabase SQL Editor to add sample organizations

-- Insert 2-3 dummy organizations
INSERT INTO organizations (id, name, created_at)
VALUES 
  (gen_random_uuid(), 'Neo Academy', NOW()),
  (gen_random_uuid(), 'Tech Learning Institute', NOW()),
  (gen_random_uuid(), 'Future Skills School', NOW())
ON CONFLICT DO NOTHING;

-- Verify organizations were created
SELECT id, name, created_at 
FROM organizations 
ORDER BY created_at DESC;


