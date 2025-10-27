# Troubleshooting: User Management Not Showing Data

## Why you're not seeing user details:

### 1. **Database Tables Not Created**
You need to create the database tables first. Run these SQL commands in your Supabase SQL Editor:

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  age INTEGER,
  avatar TEXT,
  phone TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  verified BOOLEAN DEFAULT false,
  provider TEXT
);
```

### 2. **No Test Data**
The table exists but is empty. Add some test users:

```sql
INSERT INTO users (email, name, age, provider, verified) VALUES
('test@example.com', 'Test User', 25, 'email', true),
('john@example.com', 'John Doe', 30, 'google', true),
('jane@example.com', 'Jane Smith', 28, 'email', false);
```

### 3. **Supabase Credentials Not Set**
Check your browser console for errors. The credentials in `lib/supabase.ts` might be incorrect.

### 4. **Browser Console Errors**
Open your browser's Developer Tools (F12) and check the Console tab for errors. Look for:
- "Failed to fetch" - Connection issue
- "JWT expired" - Authentication issue
- "relation does not exist" - Table doesn't exist

## Quick Fix Steps:

1. **Check Browser Console**
   - Open Developer Tools (F12)
   - Go to Console tab
   - Look for error messages

2. **Update Supabase Credentials**
   - Open `lib/supabase.ts`
   - Lines 4-6 should have your actual Supabase values

3. **Create Database Tables**
   - Go to Supabase Dashboard
   - Open SQL Editor
   - Paste and run the SQL from `SETUP.md`

4. **Add Test Data**
   - Use the SQL INSERT statements above
   - Or manually add users in Supabase Dashboard

## The Page Structure is Correct

The users page is working correctly. It will show:
- Loading spinner while fetching
- Empty state if no users exist
- User table with data if users exist

## Check These:

✅ Is the `users` table created in Supabase?
✅ Are there any users in the `users` table?
✅ Are the Supabase credentials correct in `lib/supabase.ts`?
✅ Check browser console for errors
✅ Check Network tab in Developer Tools for failed requests

Once you have data in your database, the page will display it correctly!
