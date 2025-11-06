# Create SuperAdmin User Guide

## Quick Setup

The SuperAdmin user is automatically created when you log in with:
- **Email:** `admin@neo`
- **Password:** `Admin@1234`

The login page will automatically:
1. Check if user exists
2. Create user if doesn't exist
3. Set role to SuperAdmin
4. Create default organization
5. Create user profile

---

## Manual Setup (Alternative)

If automatic creation doesn't work, you can manually create the admin:

### Option 1: Via API Endpoint

1. Start your dev server:
   ```bash
   npm run dev
   ```

2. Call the setup endpoint:
   ```bash
   curl -X POST http://localhost:3000/api/setup/create-admin
   ```

Or visit in browser:
```
http://localhost:3000/api/setup/create-admin
```

### Option 2: Via Supabase Dashboard

1. Go to **Supabase Dashboard** → **Authentication** → **Users**
2. Click **"Add user"** → **"Create new user"**
3. Fill in:
   - **Email:** `admin@neo`
   - **Password:** `Admin@1234`
   - **Auto Confirm User:** ✅ Check this
4. Click **"Create user"**
5. Note the User ID (UUID)

6. Go to **SQL Editor** and run:
   ```sql
   -- Create default organization if doesn't exist
   INSERT INTO organizations (id, name)
   VALUES (gen_random_uuid(), 'Default Organization')
   ON CONFLICT DO NOTHING;

   -- Update user profile (replace <USER_ID> with actual UUID from step 5)
   INSERT INTO user_profiles (
     user_id,
     email,
     full_name,
     role,
     org_id,
     onboarding_state
   )
   VALUES (
     '<USER_ID>',  -- Replace with UUID from auth.users
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
       onboarding_state = 'active';
   ```

---

## Verify Setup

### Check User Exists

1. Go to **Supabase Dashboard** → **Authentication** → **Users**
2. Look for `admin@neo`
3. Should see email confirmed ✅

### Check Profile Exists

1. Go to **Supabase Dashboard** → **Table Editor** → `user_profiles`
2. Find user with email `admin@neo`
3. Verify:
   - `role = 'SuperAdmin'`
   - `email = 'admin@neo'`
   - `org_id` is set

### Check Organization Exists

1. Go to **Supabase Dashboard** → **Table Editor** → `organizations`
2. Should see at least one organization

---

## Test Login

1. Go to `/login`
2. Enter:
   - Email: `admin@neo`
   - Password: `Admin@1234`
3. Click "Sign in"
4. Should redirect to `/dashboard/overview`

### Verify "Create Educator" Button

1. Go to `/dashboard/users`
2. Should see **"Create Educator"** button in top right
3. If not visible:
   - Check browser console for errors
   - Verify `user_profiles.role = 'SuperAdmin'`
   - Refresh the page

---

## Troubleshooting

### Can't Login

**Problem:** "Invalid login credentials"

**Solutions:**
1. User doesn't exist → Call `/api/setup/create-admin`
2. Wrong password → Reset via Supabase Dashboard
3. Email not confirmed → Confirm in Supabase Dashboard

### "Create Educator" Button Not Showing

**Problem:** Button not visible even after login

**Check:**
1. User profile has `role = 'SuperAdmin'`:
   ```sql
   SELECT role FROM user_profiles WHERE email = 'admin@neo';
   ```

2. Current user role is being fetched:
   - Open browser console
   - Check for errors in Network tab
   - Verify API calls to `user_profiles` table

3. Hard refresh:
   - Press `Ctrl+Shift+R` (Windows/Linux)
   - Press `Cmd+Shift+R` (Mac)

4. Check user_profiles table:
   ```sql
   SELECT * FROM user_profiles WHERE email = 'admin@neo';
   ```

### Role Not Set to SuperAdmin

**Fix:**
```sql
UPDATE user_profiles
SET role = 'SuperAdmin'
WHERE email = 'admin@neo';
```

### No Organization Assigned

**Fix:**
```sql
-- Create organization
INSERT INTO organizations (id, name)
VALUES (gen_random_uuid(), 'Default Organization')
ON CONFLICT DO NOTHING;

-- Assign to admin
UPDATE user_profiles
SET org_id = (SELECT id FROM organizations LIMIT 1)
WHERE email = 'admin@neo' AND org_id IS NULL;
```

---

## Testing Checklist

- [ ] Can login with `admin@neo` / `Admin@1234`
- [ ] User exists in Supabase Auth
- [ ] User profile exists with `role = 'SuperAdmin'`
- [ ] Organization exists and is assigned
- [ ] Can see "Create Educator" button
- [ ] Can access all dashboard pages
- [ ] Can filter users by role
- [ ] Can create educator accounts

---

## Security Note

⚠️ **Important:** This hardcoded admin is for development/testing only!

For production:
- Remove hardcoded credentials
- Use proper authentication flow
- Set strong, unique passwords
- Enable 2FA for admin accounts
- Use environment variables for sensitive data

---

## Quick Test Script

Run this in browser console after logging in:

```javascript
// Check current user
const { data: { session } } = await supabase.auth.getSession()
console.log('Session:', session)

// Check user profile
const { data: profile } = await supabase
  .from('user_profiles')
  .select('*')
  .eq('user_id', session.user.id)
  .single()
console.log('Profile:', profile)

// Should show role: 'SuperAdmin'
```

---

**All set! SuperAdmin should now work correctly! 🚀**





