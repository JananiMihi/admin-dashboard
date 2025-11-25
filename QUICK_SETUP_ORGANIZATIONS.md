# Quick Setup: Dummy Organizations

## 🎯 Overview

This guide shows you how to quickly create dummy organizations so you can select them when creating educators.

## 🚀 Method 1: Automatic (Recommended)

**The easiest way!** When you open the "Create Educator" modal:

1. Go to `/dashboard/users`
2. Click **"Create Educator"**
3. If no organizations exist, they will be **automatically created**!

The system will create:
- Neo Academy
- Tech Learning Institute
- Future Skills School

## 🛠️ Method 2: Via Organizations Page

1. Go to `/dashboard/organizations`
2. Click **"Create Dummy Organizations"** button
3. You'll see 3 organizations created:
   - ✅ Neo Academy
   - ✅ Tech Learning Institute
   - ✅ Future Skills School

## 📝 Method 3: Via SQL (Supabase)

Run this in **Supabase SQL Editor**:

```sql
-- Create 3 dummy organizations
INSERT INTO organizations (id, name, created_at)
VALUES 
  (gen_random_uuid(), 'Neo Academy', NOW()),
  (gen_random_uuid(), 'Tech Learning Institute', NOW()),
  (gen_random_uuid(), 'Future Skills School', NOW())
ON CONFLICT DO NOTHING;

-- Verify they were created
SELECT id, name, created_at 
FROM organizations 
ORDER BY name;
```

## 🔌 Method 4: Via API Endpoint

Call the API endpoint:

```bash
# Using curl
curl -X POST http://localhost:3000/api/organizations/create-dummy

# Or visit in browser
http://localhost:3000/api/organizations/create-dummy
```

## ✅ Verify Organizations Exist

### Check in Dashboard

1. Go to `/dashboard/organizations`
2. You should see 3 organizations listed

### Check in Supabase

1. Go to **Supabase Dashboard** → **Table Editor**
2. Open `organizations` table
3. You should see 3 rows

## 🎯 Use Organizations

After creating organizations:

1. Go to `/dashboard/users`
2. Click **"Create Educator"**
3. In the **"Organization"** dropdown, you'll see:
   - Neo Academy
   - Tech Learning Institute
   - Future Skills School
4. Select one and create the educator!

## 📋 Dummy Organizations Created

| Name | Description |
|------|-------------|
| **Neo Academy** | Main educational institution |
| **Tech Learning Institute** | Technology-focused learning |
| **Future Skills School** | Modern skills development |

## 🔄 Add More Organizations

### Via Dashboard

1. Go to `/dashboard/organizations`
2. Click **"Create Dummy Organizations"** again
3. It will skip duplicates (won't create duplicates)

### Via SQL

```sql
-- Add more organizations
INSERT INTO organizations (name)
VALUES 
  ('Digital Learning Center'),
  ('Innovation Academy')
ON CONFLICT DO NOTHING;
```

## 🐛 Troubleshooting

### No organizations in dropdown

**Check:**
1. Organizations exist in database:
   ```sql
   SELECT * FROM organizations;
   ```

2. Refresh the "Create Educator" modal
3. Check browser console for errors

### "Create Dummy Organizations" button doesn't work

**Solutions:**
1. Check browser console for errors
2. Verify API endpoint is accessible
3. Check Supabase connection
4. Try Method 3 (SQL) instead

## 📍 Files Created

- `database/migrations/005_create_dummy_organizations.sql` - SQL migration
- `app/api/organizations/create-dummy/route.ts` - API endpoint
- `app/dashboard/organizations/page.tsx` - Organizations management page

## ✨ Features

- **Auto-creation:** Organizations auto-create when opening Create Educator modal
- **No duplicates:** System checks before creating
- **Easy management:** View all organizations in one place
- **Quick setup:** One-click dummy organization creation

---

**All set! Organizations are ready to use! 🚀**




















