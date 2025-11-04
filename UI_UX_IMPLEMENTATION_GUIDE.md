# Educator Dashboard UI/UX Implementation Guide

This guide provides step-by-step instructions to build the complete educator dashboard UI/UX.

## 📋 Implementation Overview

### What We're Building

1. **Educator Dashboard Layout** - Dedicated layout for educators
2. **Classes Management** - Create, view, and manage classes
3. **Join Code Management** - Generate, copy, QR codes, lifecycle management
4. **Student Roster** - View, add, manage students
5. **Bulk Student Import** - CSV upload and processing
6. **Public Join Page** - Students join via code/link

### Design Principles

- **Clean & Minimal** - Simple, intuitive interface
- **Mobile-Friendly** - Works on all screen sizes
- **Fast Actions** - Quick copy buttons, QR generation
- **Clear Feedback** - Toast notifications, loading states
- **Consistent** - Matches existing admin dashboard style

---

## 🎨 Step-by-Step Implementation

### Phase 1: Foundation (Layout & Navigation)

#### 1.1 Create Educator Layout

**File:** `app/dashboard/educator/layout.tsx`

This layout wraps all educator routes with custom sidebar and header.

#### 1.2 Create Educator Sidebar

**File:** `components/educator/EducatorSidebar.tsx`

Navigation menu with:
- Classes
- Students (optional)
- Settings

#### 1.3 Create Educator Header

**File:** `components/educator/EducatorHeader.tsx`

Simple header with user info and notifications.

---

### Phase 2: Classes Management

#### 2.1 Classes List Page

**File:** `app/dashboard/educator/classes/page.tsx`

Features:
- List of all classes (cards or table)
- "Create Class" button (primary CTA)
- Each class shows:
  - Name, subject, grade
  - Student count
  - Join code badge
  - Join link (copy button)
  - Quick actions menu (⋯)

#### 2.2 Create Class Modal/Drawer

**File:** `components/educator/CreateClassModal.tsx`

Form fields:
- Name* (required)
- Subject
- Grade
- Section
- Timezone

On success:
- Show success modal with:
  - Large join code badge
  - Copy button
  - Join link + copy/QR
  - "Go to Roster" button

#### 2.3 Class Details Page

**File:** `app/dashboard/educator/classes/[id]/page.tsx`

Tabs/Sections:
1. **Overview** - Class info, join code management
2. **Roster** - Student list with actions
3. **Settings** - Archive, delete, etc.

---

### Phase 3: Join Code Management

#### 3.1 Join Code Badge Component

**File:** `components/educator/JoinCodeBadge.tsx`

- Large, monospace font
- Copy button with toast feedback
- Optional QR code button

#### 3.2 Join Code Settings Panel

**File:** `components/educator/JoinCodeSettings.tsx`

Features:
- Set expiry date
- Set max uses
- Revoke/regenerate code
- Usage analytics:
  - Used: X / Max
  - Last redeemed: date
  - Created: date

#### 3.3 QR Code Generator

**File:** `components/educator/QRCodeGenerator.tsx`

- Uses `qrcode.react` or similar library
- Displays QR code
- Download button (PNG/SVG)

---

### Phase 4: Student Roster

#### 4.1 Roster Table Component

**File:** `components/educator/RosterTable.tsx`

Columns:
- Name
- Email/Username
- Status (Pending/Active)
- Last Seen
- Actions (Reset pwd, Resend invite, Remove)

Features:
- Search/filter
- Export CSV button
- Bulk actions

#### 4.2 Add Student Drawer

**File:** `components/educator/AddStudentDrawer.tsx`

Form fields:
- Name* (required)
- Email OR Phone (one required)
- Student ID (optional)
- Parent Email (optional)
- Credentialing method:
  - Magic link (email/SMS)
  - Temporary password
  - None (code-only)

#### 4.3 Bulk Student Upload

**File:** `components/educator/BulkStudentUpload.tsx`

Flow:
1. Download CSV template button
2. Upload CSV file
3. Preview with validation
4. Column mapping (if needed)
5. Show summary:
   - Total rows
   - Valid rows
   - Errors (highlighted)
6. "Create N students" button
7. Progress indicator
8. Results summary

---

### Phase 5: Public Join Page

#### 5.1 Join Page

**File:** `app/join/[code]/page.tsx`

Features:
- Auto-redeem if code in URL
- Input field for manual code entry
- "Join Class" button
- Friendly error messages
- Success → Redirect to class/home

---

### Phase 6: API Routes

#### 6.1 Create Class API

**File:** `app/api/educator/classes/route.ts`

- POST: Create class + generate join code
- GET: List classes for educator

#### 6.2 Join Code Management API

**File:** `app/api/educator/join-codes/route.ts`

- PATCH: Update code (expiry, max uses, revoke)
- GET: Get code details

#### 6.3 Student Management API

**File:** `app/api/educator/students/route.ts`

- POST: Create single student
- GET: List students in class

**File:** `app/api/educator/students/bulk/route.ts`

- POST: Bulk create students from CSV

#### 6.4 Redeem Code API

**File:** `app/api/auth/redeem-code/route.ts`

- POST: Redeem join code
- Public endpoint (with auth check)

---

## 🎯 UI Component Specifications

### Color Scheme
- Primary: Blue (#2563eb)
- Success: Green (#10b981)
- Error: Red (#ef4444)
- Warning: Yellow (#f59e0b)
- Neutral: Gray (#6b7280)

### Typography
- Headings: Bold, larger sizes
- Body: Regular, readable
- Code: Monospace for join codes

### Spacing
- Consistent padding: 16px, 24px, 32px
- Card spacing: 16px gap
- Form fields: 12px vertical gap

### Components Style

#### Buttons
```css
Primary: bg-blue-600 hover:bg-blue-700
Secondary: bg-gray-200 hover:bg-gray-300
Danger: bg-red-600 hover:bg-red-700
```

#### Cards
```css
bg-white rounded-lg shadow-sm border border-gray-200
padding: 24px
```

#### Inputs
```css
border border-gray-300 rounded-lg px-4 py-2
focus: border-blue-500 ring-2 ring-blue-200
```

---

## 📱 Responsive Design

### Breakpoints
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

### Mobile Optimizations
- Drawer instead of modal for forms
- Stack cards vertically
- Touch-friendly button sizes (min 44px)
- Simplified navigation

---

## ✅ Implementation Checklist

### Foundation
- [ ] Educator layout created
- [ ] Educator sidebar created
- [ ] Educator header created
- [ ] Role-based routing implemented

### Classes
- [ ] Classes list page
- [ ] Create class modal
- [ ] Class details page
- [ ] Join code display
- [ ] Copy join code functionality
- [ ] Join link generation

### Join Codes
- [ ] Join code badge component
- [ ] QR code generator
- [ ] Code settings panel
- [ ] Expiry management
- [ ] Max uses management
- [ ] Revoke/regenerate

### Students
- [ ] Roster table
- [ ] Add student drawer
- [ ] Bulk upload component
- [ ] CSV template download
- [ ] Student status indicators
- [ ] Student actions (reset, remove, etc.)

### Public Pages
- [ ] Join page with code input
- [ ] Join page with code in URL
- [ ] Error handling
- [ ] Success flow

### API Routes
- [ ] Create class API
- [ ] List classes API
- [ ] Update join code API
- [ ] Create student API
- [ ] Bulk create students API
- [ ] Redeem code API

### Polish
- [ ] Loading states
- [ ] Error messages
- [ ] Toast notifications
- [ ] Mobile responsive
- [ ] Accessibility (ARIA labels)
- [ ] Keyboard navigation

---

## 🚀 Getting Started

1. **Start with Layout** - Create educator layout and navigation
2. **Build Classes Page** - Start with list, then create
3. **Add Join Code Features** - Badge, copy, QR
4. **Implement Roster** - Table first, then add/edit
5. **Add Bulk Import** - CSV upload and processing
6. **Build Join Page** - Public page for students
7. **Test & Polish** - Test all flows, fix issues

---

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Lucide Icons](https://lucide.dev)
- [QR Code Libraries](https://www.npmjs.com/package/qrcode.react)

---

## 🐛 Common Issues & Solutions

**Issue:** Join code not generating
- Check `generate_class_code()` function exists
- Verify API has correct permissions

**Issue:** RLS blocking queries
- Check user has correct role
- Verify org_id matches in JWT
- Check RLS policies are correct

**Issue:** CSV upload failing
- Check file format matches template
- Verify file size limits
- Check validation errors in preview

---

**Ready to start? Begin with Phase 1: Foundation!**


