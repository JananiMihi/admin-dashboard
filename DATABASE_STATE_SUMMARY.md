# Database State Summary

## Current State (Based on Supabase Screenshot)

### ✅ Existing Tables in `public` Schema

1. **`user_profiles`** - User data table
   - Columns: `id`, `uuid`, `user_id`, `email`, `phone`, `full_name`, `age`, `avatar`, `created_at`, `updated_at`
   - Status: ✅ Exists
   - **Note**: This appears to serve as the main users table

2. **`missions`** - Mission/assignment content
   - Status: ✅ Exists

3. **`badges`** - Badge definitions
   - Status: ✅ Exists

4. **`user_badges`** - User-badge relationships
   - Status: ✅ Exists

5. **`user_data`** - Additional user data
   - Status: ✅ Exists

6. **`user_mission_completions`** - Mission completion tracking
   - Status: ✅ Exists

7. **`daily_time_usage`** - Usage tracking
   - Status: ✅ Exists

8. **`signup`** - Signup records
   - Status: ✅ Exists

9. **`v_user_badges`** - View (not a table)
   - Status: ✅ Exists

### ❌ Missing Tables (Required for Educator Dashboard)

1. **`organizations`** - Organizations/tenants
   - Purpose: Groups educators and students into organizations
   - Status: ❌ **MISSING**

2. **`classes`** - Classes created by educators
   - Purpose: Represents classrooms/classes within organizations
   - Status: ❌ **MISSING**

3. **`join_codes`** - Join codes and links for classes/orgs
   - Purpose: Handles class join codes (e.g., CLS-7Q8Z6X) with expiry, usage limits
   - Status: ❌ **MISSING**

4. **`enrollments`** - Student-class enrollment relationships
   - Purpose: Links students to classes
   - Status: ❌ **MISSING**

5. **`bulk_student_jobs`** - Bulk import job tracking
   - Purpose: Tracks bulk student import operations
   - Status: ❌ **MISSING**

6. **`bulk_student_rows`** - Individual row results from bulk imports
   - Purpose: Stores per-row results from CSV imports
   - Status: ❌ **MISSING**

### ⚠️ Missing Columns on `user_profiles`

The `user_profiles` table needs these additional columns:

1. **`role`** - User role (`SuperAdmin`, `Educator`, `Student`)
   - Type: `TEXT` with CHECK constraint
   - Default: `'Student'`
   - Status: ❌ **MISSING**

2. **`org_id`** - Organization ID (foreign key to `organizations`)
   - Type: `UUID`
   - References: `organizations(id)`
   - Status: ❌ **MISSING**

3. **`onboarding_state`** - User onboarding status
   - Type: `TEXT` with CHECK constraint
   - Values: `'pending'`, `'active'`
   - Default: `'pending'`
   - Status: ❌ **MISSING**

## Migration Summary

### Files Created

1. **`database/migrations/001_educator_dashboard_tables.sql`**
   - Complete migration script
   - Creates all missing tables
   - Adds missing columns to `user_profiles`
   - Creates stored procedures
   - Sets up RLS policies

### What the Migration Does

1. ✅ Creates `organizations` table
2. ✅ Adds `role`, `org_id`, `onboarding_state` to `user_profiles`
3. ✅ Creates `classes` table
4. ✅ Creates `join_codes` table
5. ✅ Creates `enrollments` table
6. ✅ Creates `bulk_student_jobs` table
7. ✅ Creates `bulk_student_rows` table
8. ✅ Creates `generate_class_code()` function
9. ✅ Creates `redeem_join_code()` stored procedure
10. ✅ Creates `provision_student()` stored procedure
11. ✅ Enables RLS on all new tables
12. ✅ Creates RLS policies for SuperAdmin, Educator, and Student roles

## Next Steps

### 1. Run the Migration

Execute the migration SQL file in your Supabase SQL Editor:

```sql
-- Copy and paste contents of database/migrations/001_educator_dashboard_tables.sql
-- into Supabase SQL Editor and run
```

### 2. Update Existing Users (If Needed)

After migration, update existing users:

```sql
-- Set existing users to SuperAdmin (adjust as needed)
UPDATE user_profiles 
SET role = 'SuperAdmin',
    onboarding_state = 'active'
WHERE role IS NULL;

-- Create default organization for existing admins
INSERT INTO organizations (id, name, created_by)
VALUES (gen_random_uuid(), 'Default Organization', NULL)
ON CONFLICT DO NOTHING;

-- Assign existing users to default org (adjust org_id as needed)
UPDATE user_profiles
SET org_id = (SELECT id FROM organizations WHERE name = 'Default Organization' LIMIT 1)
WHERE org_id IS NULL;
```

### 3. Verify Tables Created

Check in Supabase Table Editor:
- ✅ `organizations` should appear
- ✅ `classes` should appear
- ✅ `join_codes` should appear
- ✅ `enrollments` should appear
- ✅ `bulk_student_jobs` should appear
- ✅ `bulk_student_rows` should appear
- ✅ `user_profiles` should have new columns: `role`, `org_id`, `onboarding_state`

### 4. Test Functions

```sql
-- Test join code generation
SELECT generate_class_code();

-- Test join code redemption (requires auth context)
-- This should be tested via API, not directly in SQL
```

## Important Notes

1. **User ID Mapping**: The migration assumes `user_profiles.user_id` maps to `auth.users(id)`. If your structure differs, adjust the foreign key references.

2. **JWT Claims**: The stored procedures expect JWT to include `org_id` claim. You may need to set up custom JWT claims or handle this in your application layer.

3. **Auth User Creation**: The `provision_student()` function creates `user_profiles` entries, but actual `auth.users` entries must be created via Supabase Admin API in your backend code.

4. **RLS Policies**: All policies use role checks from `user_profiles` table. Ensure users have correct roles assigned.

5. **Phone-Only Accounts**: For users with only phone (no email), magic links via SMS should be handled in your backend service layer.

## Schema Diagram

```
organizations (1) ──┐
                    │
                    ├── user_profiles (many)
                    ├── classes (many)
                    ├── join_codes (many)
                    └── bulk_student_jobs (many)

classes (1) ──┬── join_codes (many)
              ├── enrollments (many)
              └── bulk_student_jobs (many)

auth.users (1) ──┬── user_profiles (1)
                 └── enrollments (many)

bulk_student_jobs (1) ── bulk_student_rows (many)
```

## Testing Checklist

After running migration:

- [ ] All 6 new tables appear in Supabase Table Editor
- [ ] `user_profiles` has new columns: `role`, `org_id`, `onboarding_state`
- [ ] `generate_class_code()` function exists and works
- [ ] `redeem_join_code()` function exists
- [ ] `provision_student()` function exists
- [ ] RLS is enabled on all new tables
- [ ] SuperAdmin can access all tables
- [ ] Educator policies work (test with educator account)
- [ ] Student policies work (test with student account)


