# Quick Reference: Create Educator Function

## 🎯 Location

**Main Entry Point:**
- **URL:** `/dashboard/users`
- **Button:** "Create Educator" (top right, SuperAdmin only)

**Files:**
- UI: `components/admin/CreateEducatorModal.tsx`
- API: `app/api/educators/create/route.ts`
- Page: `app/dashboard/users/page.tsx`

---

## 🚀 Quick Start

### 1. Login
```
Email: admin@neo
Password: Admin@1234
```

### 2. Go to Users Page
```
http://localhost:3000/dashboard/users
```

### 3. Click Button
Click **"Create Educator"** button (top right)

### 4. Fill Form
- Name: Educator's full name
- Email: Their email address
- Organization: Select from dropdown

### 5. Create
Click **"Create Educator"** → Get magic link → Share with educator

---

## 📋 Function Details

### API Endpoint
```
POST /api/educators/create
```

### Request
```json
{
  "email": "educator@example.com",
  "name": "John Doe",
  "orgId": "organization-uuid"
}
```

### Response
```json
{
  "success": true,
  "userId": "uuid",
  "email": "educator@example.com",
  "magicLink": "https://...",
  "message": "Educator created successfully"
}
```

---

## ✅ What It Does

1. ✅ Creates Supabase Auth user
2. ✅ Creates user profile (role='Educator')
3. ✅ Assigns to organization
4. ✅ Generates magic link
5. ✅ Returns link for sharing

---

**That's it! Super simple! 🎉**





















