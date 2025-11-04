# Educator Dashboard - Quick Start Checklist

## Overview
This is a quick reference checklist for implementing the Educator dashboard feature. For detailed documentation, see `EDUCATOR_DASHBOARD_IMPLEMENTATION.md`.

---

## 🚀 Quick Implementation Steps

### Step 1: Database Setup (30 minutes)

1. **Create new tables** - Run SQL scripts:
   ```bash
   # Execute these in Supabase SQL Editor:
   - organizations table
   - classes table
   - join_codes table
   - enrollments table
   - bulk_student_jobs & bulk_student_rows (optional)
   ```

2. **Update existing `users` table**:
   ```sql
   ALTER TABLE users 
   ADD COLUMN role TEXT DEFAULT 'Student',
   ADD COLUMN org_id UUID,
   ADD COLUMN onboarding_state TEXT DEFAULT 'pending';
   ```

3. **Create functions**:
   - `generate_class_code()` - Generates unique class codes
   - `redeem_join_code()` - Handles code redemption
   - `provision_student()` - Creates student accounts

4. **Set up RLS policies** - Enable Row Level Security on all new tables

### Step 2: SuperAdmin - Manage Educators (1 hour)

**Files to create/modify:**
- `app/dashboard/users/page.tsx` - Add role filter and "Add Educator" button
- `app/api/educators/create/route.ts` - Create educator API
- `app/dashboard/organizations/page.tsx` - Organizations management page (optional)

**Features:**
- [ ] SuperAdmin can create organizations
- [ ] SuperAdmin can create educator accounts
- [ ] SuperAdmin can assign educators to organizations

### Step 3: Educator Dashboard Layout (1 hour)

**Files to create:**
- `app/dashboard/educator/layout.tsx` - Educator layout wrapper
- `components/educator/EducatorSidebar.tsx` - Sidebar navigation
- `components/educator/EducatorHeader.tsx` - Header component

**Routes structure:**
```
/dashboard/educator/classes       - Main classes page
/dashboard/educator/classes/[id]  - Class details & roster
```

### Step 4: Classes Management (2-3 hours)

**API Routes:**
- `app/api/educator/classes/route.ts` - Create & list classes
- `app/api/educator/classes/[id]/route.ts` - Update & delete classes

**UI Components:**
- `app/dashboard/educator/classes/page.tsx` - Classes list
- `components/educator/CreateClassModal.tsx` - Create class form
- `components/educator/ClassCard.tsx` - Class card component

**Features:**
- [ ] Create class (name, subject, grade, section, timezone)
- [ ] System generates join code (CLS-XXXXXX)
- [ ] System generates join link (`/join/CLS-XXXXXX`)
- [ ] Display code and link with copy buttons
- [ ] QR code generation for join link

### Step 5: Join Code Management (2 hours)

**API Routes:**
- `app/api/educator/join-codes/route.ts` - Manage join codes

**UI Components:**
- `components/educator/JoinCodeBadge.tsx` - Code display with copy
- `components/educator/JoinCodeSettings.tsx` - Code settings panel
- `components/educator/QRCodeGenerator.tsx` - QR code component

**Features:**
- [ ] Set expiry date for code
- [ ] Set max uses limit
- [ ] Revoke code
- [ ] Regenerate code
- [ ] View usage analytics (used_count, last redeemed)

### Step 6: Student Management - Single (2 hours)

**API Routes:**
- `app/api/educator/students/route.ts` - Create single student

**UI Components:**
- `components/educator/AddStudentDrawer.tsx` - Add student form
- `components/educator/RosterTable.tsx` - Student roster table

**Fields:**
- Name* (required)
- Email OR Phone* (one required)
- Student ID (optional)
- Parent Email (optional)
- Credential Method: Magic Link / Temp Password / None
- Auto-enroll to class (checkbox)

**Features:**
- [ ] Create student account
- [ ] Auto-enroll to selected class
- [ ] Send magic link invite (if selected)
- [ ] Generate temp password (if selected)

### Step 7: Student Management - Bulk CSV (3-4 hours)

**API Routes:**
- `app/api/educator/students/bulk/route.ts` - Bulk import

**UI Components:**
- `components/educator/BulkStudentUpload.tsx` - CSV upload component

**CSV Template:**
```csv
name,email,phone,student_id,parent_email
John Doe,john@example.com,,STU001,parent@example.com
Jane Smith,,+1234567890,STU002,
```

**Features:**
- [ ] Download CSV template
- [ ] Upload CSV file
- [ ] Column mapping preview
- [ ] Validation (duplicate emails, invalid phones)
- [ ] Preview before import
- [ ] Bulk create with progress
- [ ] Success/failure summary

### Step 8: Roster Management (2 hours)

**File:**
- `app/dashboard/educator/classes/[id]/page.tsx` - Class roster page

**Features:**
- [ ] View all students in class
- [ ] Filter/search students
- [ ] Student status (Pending/Active)
- [ ] Last seen timestamp
- [ ] Actions: Reset password, Resend invite, Remove from class
- [ ] Export roster to CSV

### Step 9: Public Join Flow (2-3 hours)

**File:**
- `app/join/[code]/page.tsx` - Public join page

**Flow:**
1. Student visits `/join/CLS-XXXXXX` or enters code on `/join`
2. If not logged in → redirect to signup/login
3. After auth → auto-redeem code
4. If logged in → redeem code immediately
5. Success → enroll in class → redirect to class home
6. Error (expired/revoked/maxed) → show friendly message

**API:**
- `app/api/auth/redeem-code/route.ts` - Redeem code endpoint

### Step 10: Authentication & Authorization (1-2 hours)

**Files:**
- `middleware.ts` - Route protection based on role
- Update JWT claims to include `role` and `org_id`

**Logic:**
- SuperAdmin → `/dashboard/*` (admin routes)
- Educator → `/dashboard/educator/*` (educator routes)
- Student → `/dashboard/student/*` (student routes - future)
- Redirect if trying to access wrong dashboard

---

## 📁 File Structure Summary

### New Directories
```
app/
  dashboard/
    educator/          # NEW - Educator routes
      classes/
        page.tsx
        [id]/
          page.tsx
    organizations/     # NEW - Org management (SuperAdmin)
      page.tsx

components/
  educator/            # NEW - Educator components
    EducatorSidebar.tsx
    EducatorHeader.tsx
    ClassCard.tsx
    CreateClassModal.tsx
    JoinCodeBadge.tsx
    QRCodeGenerator.tsx
    RosterTable.tsx
    AddStudentDrawer.tsx
    BulkStudentUpload.tsx
    JoinCodeSettings.tsx

app/api/
  educator/           # NEW - Educator APIs
    classes/
      route.ts
    join-codes/
      route.ts
    students/
      route.ts
      bulk/
        route.ts
  educators/          # NEW - Educator management (SuperAdmin)
    create/
      route.ts
  auth/
    redeem-code/      # NEW - Public join code redemption
      route.ts

app/join/             # NEW - Public join page
  [code]/
    page.tsx
```

### Modified Files
```
components/Sidebar.tsx              # Add "Organizations" link for SuperAdmin
app/dashboard/users/page.tsx        # Add role filter, "Add Educator" button
lib/supabase.ts                     # Update User interface to include role, org_id
middleware.ts                       # Add role-based routing
```

---

## 🔑 Key Implementation Details

### 1. Join Code Format
- Format: `CLS-XXXXXX` (6 random alphanumeric)
- Unique constraint on `code` column
- Generated by `generate_class_code()` function

### 2. Join Link Format
- Pattern: `${APP_URL}/join/${code}`
- Example: `https://app.example.com/join/CLS-7Q8Z6X`
- Public route (no auth required to view)

### 3. Code Redemption Flow
```
Student enters code
  ↓
Check: Not revoked?
  ↓
Check: Not expired?
  ↓
Check: Not maxed out?
  ↓
Create enrollment
  ↓
Increment used_count
  ↓
Success → Enroll in class
```

### 4. Student Account Creation
```
Educator creates student
  ↓
Create user record (role='Student', org_id=educator's org)
  ↓
If class_id provided → Create enrollment
  ↓
If credentialMethod = 'magic_link' → Send email/SMS
  ↓
If credentialMethod = 'temp_password' → Generate & send password
  ↓
If credentialMethod = 'none' → Student completes signup via join link
```

### 5. RLS Policies Summary
- **SuperAdmin**: Can see all data (bypass RLS)
- **Educator**: Can only access data in their `org_id`
- **Student**: Can only see their own data and enrolled classes

---

## 🧪 Testing Checklist

### Phase 1: Database
- [ ] All tables created successfully
- [ ] RLS policies applied
- [ ] Functions work correctly
- [ ] Test data can be inserted

### Phase 2: SuperAdmin
- [ ] Can create organization
- [ ] Can create educator
- [ ] Educator assigned to org
- [ ] Existing admin features still work

### Phase 3: Educator
- [ ] Can login
- [ ] Redirected to educator dashboard
- [ ] Cannot access admin routes
- [ ] Can create class
- [ ] Receives join code and link
- [ ] Can copy code/link
- [ ] Can generate QR code

### Phase 4: Students
- [ ] Can join with valid code
- [ ] Cannot join with invalid/expired/revoked code
- [ ] Auto-enrolled in class
- [ ] Can see enrolled classes

### Phase 5: Student Management
- [ ] Can add single student
- [ ] Can bulk import students
- [ ] Students auto-enrolled to class
- [ ] Roster shows all students
- [ ] Can export roster

---

## ⚠️ Important Notes

1. **No Breaking Changes**: All existing admin routes remain unchanged
2. **Separate Namespace**: Educator routes use `/dashboard/educator/*`
3. **RLS Protection**: All queries respect Row Level Security
4. **JWT Claims**: Must include `role` and `org_id`
5. **Testing**: Test each phase before moving to next

---

## 🐛 Common Issues & Solutions

### Issue: RLS blocking all queries
**Solution**: Check JWT claims include `org_id` and `role`

### Issue: Code generation fails
**Solution**: Ensure `generate_class_code()` function exists and returns text

### Issue: Educator can't see classes
**Solution**: Verify `org_id` in user record matches JWT claims

### Issue: Bulk import fails silently
**Solution**: Check CSV format, validate headers, check error logs

### Issue: Join code doesn't redeem
**Solution**: Check code exists, not revoked, not expired, not maxed out

---

## 📚 Additional Resources

- **Full Documentation**: See `EDUCATOR_DASHBOARD_IMPLEMENTATION.md`
- **Database Schema**: See SQL scripts in documentation
- **API Reference**: See implementation guide
- **Component Examples**: See documentation for code snippets

---

**Quick Start Time Estimate**: 20-25 hours total

**Recommended Approach**: Implement phase by phase, test thoroughly before proceeding.

