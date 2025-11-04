# Testing Guide: Database Migration & RLS Policies

This guide helps you verify that your database migration and RLS policies are working correctly.

## Quick Testing Steps

### 1. Run SQL Test Script (Supabase SQL Editor)

First, run the comprehensive test script:

1. Open **Supabase Dashboard** → **SQL Editor**
2. Open or create a new query
3. Copy and paste the contents of `database/migrations/003_test_rls_policies.sql`
4. Click **Run** (Ctrl+Enter)
5. Review all test results

**What it checks:**
- ✅ All 6 tables exist
- ✅ `user_profiles` has new columns (role, org_id, onboarding_state)
- ✅ RLS is enabled on all tables
- ✅ All policies exist
- ✅ All functions exist and work
- ✅ Data counts

### 2. Test via UI (Admin Dashboard)

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to: `http://localhost:3000/dashboard/database-test`

3. Click **"Run All Tests"** button

4. Review test results:
   - ✅ Green = Test passed
   - ❌ Red = Test failed (check error message)

**What it checks:**
- ✅ Table accessibility
- ✅ Column existence
- ✅ Function execution
- ✅ CRUD operations (Create/Read/Update/Delete)
- ✅ RLS policy enforcement

### 3. Manual Testing Checklist

#### Test 1: Create Organization

**Via Supabase SQL Editor:**
```sql
-- Create a test organization
INSERT INTO organizations (name)
VALUES ('Test School')
RETURNING *;
```

**Expected:** Should create successfully if you're using service role key

**Via UI (if you have a create page):**
- Navigate to organizations management
- Create a new organization
- Verify it appears in the list

#### Test 2: Create Class

**Via SQL:**
```sql
-- First get an org_id
SELECT id FROM organizations LIMIT 1;

-- Then create a class (replace <org_id> with actual ID)
INSERT INTO classes (org_id, name, subject, grade)
VALUES ('<org_id>', 'Math 101', 'Mathematics', 'Grade 9')
RETURNING *;
```

**Expected:** Should create successfully

#### Test 3: Generate Join Code

**Via SQL:**
```sql
-- Test the function
SELECT generate_class_code();
```

**Expected:** Should return a code like `CLS-XXXXXX`

**Via UI:**
- Create a class
- Verify a join code is automatically generated
- Check that the code format matches `CLS-XXXXXX`

#### Test 4: Test RLS Policies

**As SuperAdmin:**
```sql
-- Should be able to see all organizations
SELECT * FROM organizations;

-- Should be able to see all classes
SELECT * FROM classes;
```

**As Educator (if you have educator account):**
```sql
-- Should only see organizations they belong to
SELECT * FROM organizations;

-- Should only see classes in their org
SELECT * FROM classes;
```

**Expected:**
- SuperAdmin: Can see everything
- Educator: Only sees data in their org
- Student: Only sees their own data

#### Test 5: Test Join Code Redemption

**Via SQL (requires auth context):**
```sql
-- First create a join code
INSERT INTO join_codes (org_id, type, class_id, code, max_uses)
VALUES (
  '<org_id>',
  'class',
  '<class_id>',
  'CLS-TEST01',
  10
);

-- Then test redemption (requires authenticated user)
SELECT redeem_join_code('CLS-TEST01');
```

**Via API (in your application):**
```typescript
// Test the redeem-code endpoint
const response = await fetch('/api/auth/redeem-code', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ code: 'CLS-TEST01' })
});

const result = await response.json();
console.log(result);
```

**Expected:**
- Valid code: Returns success and enrolls user
- Expired code: Returns error message
- Revoked code: Returns error message
- Max uses reached: Returns error message

#### Test 6: Create Student Account

**Via SQL:**
```sql
-- Test provision_student function
SELECT provision_student('{
  "name": "Test Student",
  "email": "test@example.com",
  "class_id": "<class_id>"
}'::jsonb);
```

**Expected:**
- Returns JSON with `status: 'ok'` and `user_id`
- Creates entry in `user_profiles`
- Auto-enrolls in class if `class_id` provided

**Via UI (when implemented):**
- Navigate to class roster
- Click "Add Student"
- Fill in student details
- Verify student appears in roster
- Verify student is enrolled in class

### 4. Verify Data in Supabase Dashboard

#### Check Tables Exist

1. Go to **Supabase Dashboard** → **Table Editor**
2. Verify you see these tables:
   - ✅ `organizations`
   - ✅ `classes`
   - ✅ `join_codes`
   - ✅ `enrollments`
   - ✅ `bulk_student_jobs`
   - ✅ `bulk_student_rows`

#### Check RLS Policies

1. Go to **Supabase Dashboard** → **Authentication** → **Policies**
2. Or use **SQL Editor**:
   ```sql
   SELECT * FROM pg_policies
   WHERE schemaname = 'public'
   AND tablename IN ('organizations', 'classes', 'join_codes', 'enrollments')
   ORDER BY tablename, policyname;
   ```
3. Verify policies exist for each table:
   - SuperAdmin policies
   - Educator policies
   - Student policies

#### Check Functions

1. Go to **Supabase Dashboard** → **Database** → **Functions**
2. Verify these functions exist:
   - ✅ `generate_class_code()`
   - ✅ `redeem_join_code(p_code text)`
   - ✅ `provision_student(p jsonb)`

### 5. Test Common Scenarios

#### Scenario 1: Educator Creates Class

**Steps:**
1. Educator logs in
2. Navigates to "Classes"
3. Clicks "Create Class"
4. Fills in class details
5. Submits form

**Expected Results:**
- ✅ Class created successfully
- ✅ Join code generated automatically
- ✅ Join link displayed
- ✅ Class appears in classes list

#### Scenario 2: Student Joins with Code

**Steps:**
1. Student visits `/join` or `/join/CLS-XXXXXX`
2. Enters or uses join code
3. If not logged in: Signs up/Signs in
4. Code is redeemed

**Expected Results:**
- ✅ Code validation works
- ✅ Enrollment created
- ✅ Student redirected to class
- ✅ Join code usage count increments

#### Scenario 3: Educator Creates Student

**Steps:**
1. Educator navigates to class roster
2. Clicks "Add Student"
3. Enters student details (name, email, etc.)
4. Selects credentialing method
5. Submits

**Expected Results:**
- ✅ Student account created
- ✅ Student auto-enrolled in class
- ✅ Student appears in roster
- ✅ Invite sent (if magic link selected)

#### Scenario 4: Bulk Import Students

**Steps:**
1. Educator navigates to class roster
2. Clicks "Bulk Import"
3. Downloads CSV template
4. Fills template with student data
5. Uploads CSV
6. Reviews preview
7. Confirms import

**Expected Results:**
- ✅ CSV parsed correctly
- ✅ Validation errors shown (if any)
- ✅ Students created successfully
- ✅ Job tracking shows success/failed counts
- ✅ Students appear in roster

### 6. Error Scenarios to Test

#### Invalid Join Code
- Enter non-existent code → Should show error
- Enter expired code → Should show friendly error
- Enter revoked code → Should show friendly error
- Enter code that exceeded max uses → Should show error

#### Cross-Org Access (RLS)
- Educator from Org A tries to access Org B data → Should be blocked
- Student tries to access other students' data → Should be blocked
- Student tries to access classes they're not enrolled in → Should be blocked

#### Missing Required Fields
- Create class without name → Should show validation error
- Create student without email/phone → Should show error
- Redeem code without authentication → Should show error

## Troubleshooting

### If Tests Fail

1. **Check Supabase Connection:**
   - Verify `.env.local` has correct credentials
   - Test connection in Supabase Dashboard

2. **Check Migration Status:**
   - Run the test SQL script to see what's missing
   - Re-run migration for any missing pieces

3. **Check RLS Policies:**
   - Verify policies exist: `SELECT * FROM pg_policies WHERE tablename = 'your_table';`
   - Check if RLS is enabled: `SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'your_table';`

4. **Check Functions:**
   - Verify functions exist in Supabase Dashboard
   - Test functions directly in SQL Editor

5. **Check User Roles:**
   - Verify user_profiles has correct `role` and `org_id`
   - Ensure JWT includes role and org_id claims

### Common Issues

**Issue:** "relation does not exist"
- **Solution:** Run table creation statements from migration

**Issue:** "policy already exists"
- **Solution:** Migration now uses `DROP POLICY IF EXISTS` - should be resolved

**Issue:** "permission denied"
- **Solution:** Check RLS policies and user role/org_id

**Issue:** "function does not exist"
- **Solution:** Run function creation statements from migration

## Next Steps

After all tests pass:

1. ✅ Create test organizations
2. ✅ Create test educators
3. ✅ Create test classes
4. ✅ Generate join codes
5. ✅ Test student enrollment flow
6. ✅ Test bulk student import
7. ✅ Verify RLS is working correctly
8. ✅ Build out UI components
9. ✅ Implement API routes
10. ✅ Test end-to-end user flows

## Need Help?

If tests are failing:
1. Check the error messages in the test results
2. Review the migration file for any issues
3. Check Supabase logs for detailed errors
4. Verify your Supabase credentials are correct
5. Ensure you're using the service role key for admin operations


