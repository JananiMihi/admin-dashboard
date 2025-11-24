# Create Educator Function - Complete Location Guide

## 📍 Where Everything Is Located

### 1. **UI Component (Modal/Form)**
**Location:** `components/admin/CreateEducatorModal.tsx`

**What it does:**
- Displays the form modal
- Handles form submission
- Shows success screen with magic link
- Auto-creates organizations if none exist
- Manages the create educator flow

**Key Functions:**
- `handleSubmit()` - Submits form to API
- `fetchOrganizations()` - Loads organizations for dropdown
- `createDummyOrganizations()` - Auto-creates organizations
- `copyMagicLink()` - Copies magic link to clipboard

### 2. **API Endpoint (Backend)**
**Location:** `app/api/educators/create/route.ts`

**What it does:**
- Validates input (email, name, orgId)
- Checks if user already exists
- Creates auth user in Supabase Auth
- Creates user profile in `user_profiles` table
- Generates magic link for password setup
- Returns success with magic link

**Endpoint:** `POST /api/educators/create`

**Request Body:**
```json
{
  "email": "educator@example.com",
  "name": "John Doe",
  "orgId": "uuid-of-organization"
}
```

**Response:**
```json
{
  "success": true,
  "userId": "user-uuid",
  "email": "educator@example.com",
  "magicLink": "https://...",
  "message": "Educator created successfully. Magic link generated."
}
```

### 3. **Users Page (Where Button Is)**
**Location:** `app/dashboard/users/page.tsx`

**What it does:**
- Displays "Create Educator" button (only for SuperAdmin)
- Shows users table with role filter
- Opens CreateEducatorModal when clicked
- Refreshes users list after creation

**Button Location:**
- Top right of Users page
- Only visible if `currentUserRole === 'SuperAdmin'`

### 4. **Dashboard Route**
**Location:** `app/dashboard/users/page.tsx`

**URL:** `/dashboard/users`

**How to access:**
1. Login as SuperAdmin
2. Click "Users" in sidebar
3. See "Create Educator" button in top right

---

## 🔄 Complete Flow Diagram

```
┌─────────────────────────────────┐
│ 1. User Page (/dashboard/users) │
│    - Click "Create Educator"    │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│ 2. CreateEducatorModal.tsx      │
│    - Shows form                 │
│    - Loads organizations        │
│    - Auto-creates if none       │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│ 3. handleSubmit()               │
│    - Validates form             │
│    - Calls API endpoint         │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│ 4. POST /api/educators/create   │
│    - Creates auth user          │
│    - Creates user profile       │
│    - Generates magic link       │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│ 5. Success Screen               │
│    - Shows magic link           │
│    - Copy button               │
│    - Done button               │
└─────────────────────────────────┘
```

---

## 📂 File Structure

```
project/
├── app/
│   ├── dashboard/
│   │   └── users/
│   │       └── page.tsx              ← Users page with button
│   ├── api/
│   │   └── educators/
│   │       └── create/
│   │           └── route.ts          ← API endpoint
│   └── api/
│       └── organizations/
│           └── create-dummy/
│               └── route.ts          ← Auto-create orgs API
│
└── components/
    └── admin/
        └── CreateEducatorModal.tsx   ← UI Modal Component
```

---

## 🎯 How to Use

### Step 1: Navigate to Users Page

**URL:** `http://localhost:3000/dashboard/users`

**Or:**
1. Click "Users" in sidebar
2. See Users page

### Step 2: Click "Create Educator" Button

**Location:** Top right of Users page

**Only visible if:**
- User is logged in
- User has role = 'SuperAdmin'
- Button appears in header

### Step 3: Fill Form

**Modal opens with:**
- Full Name field
- Email field
- Organization dropdown (auto-populated)

**If no organizations:**
- System auto-creates 3 dummy organizations
- They appear in dropdown

### Step 4: Submit

**Click "Create Educator"** in modal

**What happens:**
1. Form validated
2. API called: `POST /api/educators/create`
3. Auth user created
4. Profile created
5. Magic link generated
6. Success screen shown

### Step 5: Get Magic Link

**Success screen shows:**
- Educator email
- Magic link (copyable)
- Copy button
- Done button

---

## 🔍 Code Reference

### Open CreateEducatorModal

**File:** `app/dashboard/users/page.tsx`

```typescript
// Line 163-171
{currentUserRole === 'SuperAdmin' && (
  <button
    onClick={() => setCreateEducatorOpen(true)}
    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg"
  >
    <Plus className="w-5 h-5" />
    Create Educator
  </button>
)}

// Line 323-330
<CreateEducatorModal
  open={createEducatorOpen}
  onClose={() => setCreateEducatorOpen(false)}
  onSuccess={() => {
    setCreateEducatorOpen(false)
    fetchUsers()
  }}
/>
```

### Modal Component

**File:** `components/admin/CreateEducatorModal.tsx`

**Main function:** `handleSubmit()` (line 83-112)

**API call:**
```typescript
// Line 88-92
const response = await fetch('/api/educators/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(formData)
})
```

### API Endpoint

**File:** `app/api/educators/create/route.ts`

**Main function:** `POST()` (line 4-110)

**Key operations:**
- Line 31-38: Create auth user
- Line 49-58: Create user profile
- Line 70-76: Generate magic link
- Line 95-102: Return response

---

## 🧪 Testing the Function

### Test 1: Access the Button

1. Login as SuperAdmin (`admin@neo` / `Admin@1234`)
2. Go to `/dashboard/users`
3. ✅ Should see "Create Educator" button

### Test 2: Open Modal

1. Click "Create Educator" button
2. ✅ Modal should open
3. ✅ Should show form with 3 fields
4. ✅ Organization dropdown should have options

### Test 3: Create Educator

1. Fill in:
   - Name: "Test Educator"
   - Email: "test@example.com"
   - Organization: Select one
2. Click "Create Educator"
3. ✅ Should show success screen
4. ✅ Should show magic link

### Test 4: Check Database

**In Supabase:**
1. Check `auth.users` - new user should exist
2. Check `user_profiles` - profile with role='Educator' should exist
3. Check `organizations` - should have organizations

---

## 🐛 Troubleshooting

### "Create Educator" button not showing

**Check:**
1. User logged in? → Check session
2. Role is SuperAdmin? → Check `user_profiles.role`
3. Button code present? → Check `app/dashboard/users/page.tsx` line 163

**Fix:**
```typescript
// In app/dashboard/users/page.tsx
// Check line 27-89 for fetchCurrentUser()
// Verify currentUserRole === 'SuperAdmin'
```

### Modal not opening

**Check:**
1. Button click works? → Check browser console
2. State updated? → Check `createEducatorOpen` state
3. Modal component loaded? → Check import

**Fix:**
- Check import: `import CreateEducatorModal from '@/components/admin/CreateEducatorModal'`
- Verify modal is rendered: Line 323-330

### API call fails

**Check:**
1. API route exists? → Check `app/api/educators/create/route.ts`
2. Supabase connection? → Check `.env.local`
3. Error message? → Check browser Network tab

**Fix:**
- Check API endpoint: `http://localhost:3000/api/educators/create`
- Verify Supabase credentials
- Check browser console for errors

### Organizations not loading

**Check:**
1. Organizations exist? → Check Supabase Table Editor
2. Auto-create works? → Check browser console
3. API endpoint works? → Check `/api/organizations/create-dummy`

**Fix:**
- Visit `/dashboard/organizations`
- Click "Create Dummy Organizations"
- Or run SQL migration `005_create_dummy_organizations.sql`

---

## 📝 Summary

**Create Educator is located in:**

1. **UI Button:** `app/dashboard/users/page.tsx` (line 163-171)
2. **Modal Component:** `components/admin/CreateEducatorModal.tsx`
3. **API Endpoint:** `app/api/educators/create/route.ts`

**How to access:**
- Login as SuperAdmin
- Go to `/dashboard/users`
- Click "Create Educator" button

**Complete flow:**
1. Button click → Opens modal
2. Form submit → Calls API
3. API creates → Auth user + Profile + Magic link
4. Success screen → Shows magic link

---

**Everything is ready! Just go to `/dashboard/users` and click "Create Educator"! 🚀**



















