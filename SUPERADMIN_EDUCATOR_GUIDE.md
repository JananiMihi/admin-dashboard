# SuperAdmin: Create Educator Accounts Guide

## Overview

This guide shows SuperAdmin how to create educator (admin) accounts with magic link password setup.

## 📍 Where to Create Educators

**Location:** `/dashboard/users`

1. Navigate to **Users** in the sidebar
2. Click **"Create Educator"** button (top right - only visible to SuperAdmin)
3. Fill in the form and create

## 🎯 Step-by-Step Process

### Step 1: Access Users Page

As SuperAdmin, go to:
```
http://localhost:3000/dashboard/users
```

You'll see:
- **"Create Educator"** button in the top right (only for SuperAdmin)
- Users table with role filter
- Search functionality

### Step 2: Click "Create Educator"

The button opens a modal with:
- Full Name field (required)
- Email field (required)
- Organization dropdown (required)

### Step 3: Fill in Details

1. **Full Name:** Enter educator's full name
2. **Email:** Enter their email address
3. **Organization:** Select from existing organizations

**Note:** If no organizations exist, create one first in the organizations table.

### Step 4: Create Account

Click **"Create Educator"** button.

**What happens:**
1. ✅ Auth user created in Supabase Auth
2. ✅ User profile created with role='Educator'
3. ✅ Magic link generated for password setup
4. ✅ Success screen shows magic link

### Step 5: Share Magic Link

On success, you'll see:
- **Educator Email** - Confirmation of email
- **Magic Link** - Copy this link
- **Copy Button** - Click to copy link

**Share the link via:**
- Email to the educator
- Any secure messaging method

### Step 6: Educator Sets Password

When educator clicks the magic link:
1. Opens password setup page
2. Sets their password
3. Account is activated
4. Can log in to educator dashboard

---

## 🔧 Features

### Role Filtering

In the Users page, you can filter by role:
- All Roles
- SuperAdmin
- Educator
- Student

### Role Badges

Each user shows a colored badge:
- 🟣 **SuperAdmin** - Purple badge
- 🔵 **Educator** - Blue badge
- 🟢 **Student** - Green badge

### Search

Search users by:
- User ID
- Name
- Email

---

## 🔐 Magic Link Flow

### How It Works

1. **SuperAdmin creates educator:**
   - No password set
   - `email_confirm: false`
   - Magic link generated

2. **Magic link sent:**
   - Link contains secure token
   - Valid for password setup
   - Expires after use

3. **Educator clicks link:**
   - Redirected to password setup
   - Sets new password
   - Account confirmed

4. **Login:**
   - Can now log in with email + password
   - Access educator dashboard

---

## 📋 API Route

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

---

## 🐛 Troubleshooting

### "Create Educator" button not showing

**Check:**
- You're logged in as SuperAdmin
- Your `user_profiles.role = 'SuperAdmin'`
- Refresh the page

### No organizations in dropdown

**Solution:**
1. Go to Supabase Table Editor
2. Create an organization:
```sql
INSERT INTO organizations (name)
VALUES ('Your Organization Name')
RETURNING *;
```
3. Refresh the create educator modal

### Magic link not generated

**Check:**
- Supabase email settings configured
- Service role key is valid
- Email address is valid format

### Educator can't use magic link

**Check:**
- Link hasn't expired
- Link hasn't been used already
- Email matches exactly
- Check Supabase Auth logs

---

## ✅ Testing Checklist

- [ ] SuperAdmin can see "Create Educator" button
- [ ] Modal opens with form fields
- [ ] Organizations dropdown populated
- [ ] Form validation works
- [ ] Educator account created
- [ ] Magic link generated
- [ ] Can copy magic link
- [ ] Magic link works for password setup
- [ ] Educator can log in after setup
- [ ] Role badge shows "Educator" in users table

---

## 🎯 Next Steps After Creating Educator

1. **Send magic link** to educator via email
2. **Educator sets password** via magic link
3. **Educator logs in** and accesses `/dashboard/educator/classes`
4. **Educator creates classes** and manages students

---

## 📝 Example Magic Link

The generated magic link looks like:
```
https://your-project.supabase.co/auth/v1/verify?token=xxxxx&type=invite&redirect_to=http://localhost:3000/auth/callback?type=password-setup
```

When clicked, it redirects to password setup page where educator can set their password.

---

**All set! SuperAdmin can now create educator accounts easily! 🚀**














