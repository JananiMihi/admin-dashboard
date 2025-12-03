# Fix: "Create Educator" Button Not Showing

## 🐛 Problem

The "Create Educator" button is not visible on `/dashboard/users` page.

## ✅ Quick Fixes

### Fix 1: Check Browser Console

1. Open browser console (F12)
2. Go to `/dashboard/users`
3. Look for console logs:
   - Should see: "Session found: admin@neo"
   - Should see: "Admin email detected, setting as SuperAdmin"
   - Check "Debug: Role = SuperAdmin" text on page

### Fix 2: Fix Admin Profile (API Endpoint)

**Option A: Via Browser**
Visit this URL:
```
http://localhost:3000/api/debug/user-role
```

Click "POST" or run:
```bash
curl -X POST http://localhost:3000/api/debug/user-role
```

**Option B: Check Current Status**
Visit:
```
http://localhost:3000/api/debug/user-role
```

This shows:
- If admin user exists
- If profile exists
- Current role
- What needs to be fixed

### Fix 3: Manual SQL Fix (Supabase)

Run this in **Supabase SQL Editor**:

```sql
-- Find admin user ID
SELECT id, email FROM auth.users WHERE email = 'admin@neo';

-- Create default organization if needed
INSERT INTO organizations (id, name)
VALUES (gen_random_uuid(), 'Default Organization')
ON CONFLICT DO NOTHING;

-- Update or create admin profile
-- Replace <USER_ID> with actual UUID from first query
INSERT INTO user_profiles (
  user_id,
  email,
  full_name,
  role,
  org_id,
  onboarding_state
)
VALUES (
  '<USER_ID>',  -- Replace with actual user ID
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
```

### Fix 4: Force Show Button (Temporary)

If you need the button immediately, I can make it always visible temporarily for testing.

---

## 🔍 Debug Steps

### Step 1: Check Login

1. Go to `/login`
2. Login with: `admin@neo` / `Admin@1234`
3. Should redirect to dashboard

### Step 2: Check Session

Open browser console and run:
```javascript
// Check if logged in
const { data } = await supabase.auth.getSession()
console.log('Session:', data.session)
console.log('Email:', data.session?.user?.email)
```

### Step 3: Check Profile

```javascript
// Check profile
const { data: profile } = await supabase
  .from('user_profiles')
  .select('*')
  .eq('email', 'admin@neo')
  .single()
console.log('Profile:', profile)
console.log('Role:', profile?.role)
```

### Step 4: Check Button Visibility

On `/dashboard/users` page:
- Look for "Debug: Role = ..." text (development only)
- Check browser console for errors
- Check Network tab for failed API calls

---

## 🎯 What I've Fixed

1. ✅ **Improved role detection** - Checks email first
2. ✅ **Added localStorage backup** - Stores role as fallback
3. ✅ **Added debug info** - Shows role on page (dev only)
4. ✅ **Better error handling** - More console logs
5. ✅ **Auto-profile creation** - Creates profile if missing

---

## 🚀 Quick Test

After fixes, test:

1. **Refresh page:** `Ctrl+Shift+R` or `Cmd+Shift+R`
2. **Check console:** Should see "Admin email detected"
3. **Check page:** Should see "Debug: Role = SuperAdmin"
4. **Check button:** "Create Educator" should appear

---

## 📝 Current Code Behavior

The button shows if:
- `currentUserRole === 'SuperAdmin'` **OR**
- `localStorage.getItem('isSuperAdmin') === 'true'`

The role is set by:
1. Checking if email === 'admin@neo' → Always SuperAdmin
2. Checking `user_profiles.role`
3. Using localStorage as backup

---

**Try the fixes above and the button should appear! 🚀**


























