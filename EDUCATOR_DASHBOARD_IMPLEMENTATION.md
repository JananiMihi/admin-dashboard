# Educator Dashboard Implementation Guide

## Overview

This document provides step-by-step instructions for adding an Educator dashboard to your existing SuperAdmin dashboard **without modifying existing admin functionality**. The implementation follows a role-based architecture where SuperAdmin manages educators, and educators manage classes, students, and assignments.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Schema Changes](#database-schema-changes)
3. [Role-Based Access Control (RLS) Setup](#role-based-access-control-rls-setup)
4. [SuperAdmin Features: Managing Educators](#superadmin-features-managing-educators)
5. [Educator Dashboard Routes](#educator-dashboard-routes)
6. [API Routes Implementation](#api-routes-implementation)
7. [UI Components Structure](#ui-components-structure)
8. [Authentication & Authorization](#authentication--authorization)
9. [Implementation Phases](#implementation-phases)
10. [Testing Checklist](#testing-checklist)

---

## Architecture Overview

### Roles Hierarchy
```
SuperAdmin (existing)
  └─ Creates Organizations
  └─ Creates/Invites Educators
  └─ Global Settings
  └─ View All Data (existing features unchanged)

Educator (new)
  └─ Creates Classes
  └─ Generates Join Codes/Links
  └─ Creates Student Accounts (single/bulk)
  └─ Manages Class Rosters
  └─ Assigns Content

Student (new)
  └─ Joins via Code/Link
  └─ Completes Assignments
  └─ Views Progress
```

### Key Principles
- **No existing admin features are modified** - All admin routes remain unchanged
- **Role-based routing** - Different dashboards based on user role
- **Isolated data access** - RLS ensures educators only access their org's data
- **New routes structure** - `/dashboard/educator/*` for educator features

---

## Database Schema Changes

### Step 1: Update `users` Table

Add new columns to your existing `users` table:

```sql
-- Add role and org_id columns
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'Student' 
  CHECK (role IN ('SuperAdmin', 'Educator', 'Student')),
ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id),
ADD COLUMN IF NOT EXISTS onboarding_state TEXT DEFAULT 'pending' 
  CHECK (onboarding_state IN ('pending', 'active'));

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_org_id ON users(org_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
```

**Note:** If your `users` table doesn't have an `organizations` table yet, create it first (see Step 2).

### Step 2: Create `organizations` Table

```sql
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_organizations_created_by ON organizations(created_by);
```

### Step 3: Create `classes` Table

```sql
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT,
  grade TEXT,
  section TEXT,
  timezone TEXT DEFAULT 'UTC',
  archived BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_classes_org_id ON classes(org_id);
CREATE INDEX IF NOT EXISTS idx_classes_created_by ON classes(created_by);
CREATE INDEX IF NOT EXISTS idx_classes_archived ON classes(archived);
```

### Step 4: Create `join_codes` Table

```sql
CREATE TABLE IF NOT EXISTS join_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('org', 'class')),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  label TEXT,
  max_uses INTEGER DEFAULT 0, -- 0 = unlimited
  used_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  revoked BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_join_codes_code ON join_codes(code);
CREATE INDEX IF NOT EXISTS idx_join_codes_org_id ON join_codes(org_id);
CREATE INDEX IF NOT EXISTS idx_join_codes_class_id ON join_codes(class_id);
CREATE INDEX IF NOT EXISTS idx_join_codes_type ON join_codes(type);
```

### Step 5: Create `enrollments` Table

```sql
CREATE TABLE IF NOT EXISTS enrollments (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'Student',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'removed')),
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, class_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_class_id ON enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON enrollments(status);
```

### Step 6: Create `bulk_student_jobs` Table (Optional - for audit)

```sql
CREATE TABLE IF NOT EXISTS bulk_student_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id),
  total INTEGER DEFAULT 0,
  succeeded INTEGER DEFAULT 0,
  failed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bulk_student_rows (
  job_id UUID REFERENCES bulk_student_jobs(id) ON DELETE CASCADE,
  row_no INTEGER,
  payload_json JSONB,
  status TEXT CHECK (status IN ('pending', 'success', 'failed')),
  error_text TEXT,
  PRIMARY KEY (job_id, row_no)
);
```

### Step 7: Add Helper Function to Generate Join Codes

```sql
CREATE OR REPLACE FUNCTION generate_class_code()
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
BEGIN
  LOOP
    new_code := 'CLS-' || upper(substring(md5(random()::text) || clock_timestamp()::text from 1 for 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM join_codes WHERE code = new_code);
  END LOOP;
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;
```

### Step 8: Create Stored Procedures

#### Redeem Join Code Function

```sql
CREATE OR REPLACE FUNCTION redeem_join_code(p_code TEXT)
RETURNS JSON AS $$
DECLARE
  v join_codes%rowtype;
  v_user_id UUID;
  v_result JSON;
BEGIN
  -- Get current user ID from JWT
  v_user_id := (auth.jwt() ->> 'sub')::UUID;
  
  -- Lock and validate code
  SELECT * INTO v 
  FROM join_codes
  WHERE code = p_code 
    AND NOT revoked
    AND (expires_at IS NULL OR expires_at > NOW())
  FOR UPDATE; -- Lock row for used_count update
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid, expired, or revoked code';
  END IF;
  
  -- Check usage limits
  IF v.max_uses > 0 AND v.used_count >= v.max_uses THEN
    RAISE EXCEPTION 'Code usage limit reached';
  END IF;
  
  -- Enroll user
  IF v.type = 'class' THEN
    INSERT INTO enrollments(user_id, class_id, role, status)
    VALUES (v_user_id, v.class_id, 'Student', 'active')
    ON CONFLICT (user_id, class_id) DO NOTHING;
  END IF;
  
  -- Update used count
  UPDATE join_codes 
  SET used_count = used_count + 1 
  WHERE id = v.id;
  
  -- Return result
  SELECT json_build_object(
    'status', 'ok',
    'type', v.type,
    'class_id', v.class_id
  ) INTO v_result;
  
  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('status', 'error', 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Provision Student Function

```sql
CREATE OR REPLACE FUNCTION provision_student(p JSONB)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
  v_result JSON;
BEGIN
  -- Get org_id from JWT (educator must be in an org)
  v_org_id := (auth.jwt() ->> 'org_id')::UUID;
  
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'User must belong to an organization';
  END IF;
  
  -- Create user in same org
  INSERT INTO users (
    id, 
    org_id, 
    role, 
    email, 
    phone, 
    name,
    onboarding_state
  )
  VALUES (
    gen_random_uuid(),
    v_org_id,
    'Student',
    p->>'email',
    p->>'phone',
    p->>'name',
    'pending'
  )
  RETURNING id INTO v_user_id;
  
  -- Enroll to class if provided
  IF p ? 'class_id' THEN
    INSERT INTO enrollments(user_id, class_id, role, status)
    VALUES (v_user_id, (p->>'class_id')::UUID, 'Student', 'active')
    ON CONFLICT (user_id, class_id) DO NOTHING;
  END IF;
  
  SELECT json_build_object(
    'status', 'ok',
    'user_id', v_user_id
  ) INTO v_result;
  
  RETURN v_result;
EXCEPTION
  WHEN unique_violation THEN
    RETURN json_build_object('status', 'error', 'message', 'Email or phone already exists');
  WHEN OTHERS THEN
    RETURN json_build_object('status', 'error', 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Role-Based Access Control (RLS) Setup

### Enable RLS on All Tables

```sql
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE join_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;

-- SuperAdmin can see everything (bypass RLS)
CREATE POLICY "superadmin_all_access" ON users
  FOR ALL
  USING ((auth.jwt() ->> 'role') = 'SuperAdmin')
  WITH CHECK ((auth.jwt() ->> 'role') = 'SuperAdmin');

CREATE POLICY "superadmin_all_access" ON organizations
  FOR ALL
  USING ((auth.jwt() ->> 'role') = 'SuperAdmin');

CREATE POLICY "superadmin_all_access" ON classes
  FOR ALL
  USING ((auth.jwt() ->> 'role') = 'SuperAdmin');

CREATE POLICY "superadmin_all_access" ON join_codes
  FOR ALL
  USING ((auth.jwt() ->> 'role') = 'SuperAdmin');

CREATE POLICY "superadmin_all_access" ON enrollments
  FOR ALL
  USING ((auth.jwt() ->> 'role') = 'SuperAdmin');
```

### Educator Policies

```sql
-- Educators can create students only in their org
CREATE POLICY "educator_create_students_in_org" ON users
  FOR INSERT
  WITH CHECK (
    (auth.jwt() ->> 'role') = 'Educator'
    AND role = 'Student'
    AND org_id = (auth.jwt() ->> 'org_id')::UUID
  );

-- Educators can view users in their org
CREATE POLICY "educator_view_org_users" ON users
  FOR SELECT
  USING (
    org_id = (auth.jwt() ->> 'org_id')::UUID
    AND (auth.jwt() ->> 'role') IN ('Educator', 'SuperAdmin')
  );

-- Educators can create and manage classes in their org
CREATE POLICY "educator_manage_org_classes" ON classes
  FOR ALL
  USING (org_id = (auth.jwt() ->> 'org_id')::UUID)
  WITH CHECK (
    (auth.jwt() ->> 'role') = 'Educator'
    AND org_id = (auth.jwt() ->> 'org_id')::UUID
  );

-- Educators can manage join codes for their org's classes
CREATE POLICY "educator_manage_org_join_codes" ON join_codes
  FOR ALL
  USING (org_id = (auth.jwt() ->> 'org_id')::UUID)
  WITH CHECK (
    (auth.jwt() ->> 'role') = 'Educator'
    AND org_id = (auth.jwt() ->> 'org_id')::UUID
  );

-- Educators can enroll students into their org's classes
CREATE POLICY "educator_enroll_in_org_classes" ON enrollments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = enrollments.class_id
        AND c.org_id = (auth.jwt() ->> 'org_id')::UUID
    )
    AND (auth.jwt() ->> 'role') = 'Educator'
  );

-- Educators can view enrollments for their org's classes
CREATE POLICY "educator_view_org_enrollments" ON enrollments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = enrollments.class_id
        AND c.org_id = (auth.jwt() ->> 'org_id')::UUID
    )
  );
```

### Student Policies

```sql
-- Students can view their own data
CREATE POLICY "student_view_self" ON users
  FOR SELECT
  USING (id = (auth.jwt() ->> 'sub')::UUID);

-- Students can view their enrollments
CREATE POLICY "student_view_enrollments" ON enrollments
  FOR SELECT
  USING (user_id = (auth.jwt() ->> 'sub')::UUID);

-- Students can view classes they're enrolled in
CREATE POLICY "student_view_enrolled_classes" ON classes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM enrollments e
      WHERE e.class_id = classes.id
        AND e.user_id = (auth.jwt() ->> 'sub')::UUID
    )
  );
```

---

## SuperAdmin Features: Managing Educators

### Step 1: Add "Educators" Section to Admin Users Page

**File:** `app/dashboard/users/page.tsx`

Add a filter for roles and an "Add Educator" button (only visible to SuperAdmin):

```typescript
// Add to existing component
const [roleFilter, setRoleFilter] = useState<'all' | 'SuperAdmin' | 'Educator' | 'Student'>('all')

// In filterUsers function, add role filter
if (roleFilter !== 'all') {
  filtered = filtered.filter((user) => user.role === roleFilter)
}
```

### Step 2: Create API Route for Creating Educators

**File:** `app/api/educators/create/route.ts` (NEW FILE)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { email, name, orgId, password } = await req.json()
    
    // Verify requester is SuperAdmin
    // Add your auth check here
    
    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: password || undefined,
      email_confirm: true,
      user_metadata: { name, role: 'Educator' }
    })
    
    if (authError) throw authError
    
    // Update users table
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        role: 'Educator',
        org_id: orgId,
        name,
        onboarding_state: 'pending'
      })
      .eq('id', authData.user.id)
    
    if (updateError) throw updateError
    
    return NextResponse.json({ 
      success: true, 
      userId: authData.user.id 
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
```

### Step 3: Create Organizations Management Page (SuperAdmin)

**File:** `app/dashboard/organizations/page.tsx` (NEW FILE)

This page allows SuperAdmin to:
- Create organizations
- Assign educators to organizations
- View all organizations

---

## Educator Dashboard Routes

### Route Structure

All educator routes will be under `/dashboard/educator/*` to avoid conflicts with existing admin routes:

```
/dashboard/educator/classes          - Classes list
/dashboard/educator/classes/create    - Create class
/dashboard/educator/classes/[id]      - Class details & roster
/dashboard/educator/students           - All students (optional)
```

### Step 1: Create Educator Layout

**File:** `app/dashboard/educator/layout.tsx` (NEW FILE)

```typescript
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import EducatorSidebar from '@/components/educator/EducatorSidebar'
import EducatorHeader from '@/components/educator/EducatorHeader'

export default function EducatorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  
  useEffect(() => {
    // Check role - redirect if not educator
    // Add your role check logic here
  }, [])
  
  return (
    <div className="min-h-screen bg-gray-50">
      <EducatorSidebar />
      <div className="lg:pl-64">
        <EducatorHeader />
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
```

### Step 2: Create Educator Sidebar

**File:** `components/educator/EducatorSidebar.tsx` (NEW FILE)

This sidebar only shows educator-specific navigation items:
- Classes
- Students
- Assignments (future)

---

## API Routes Implementation

### 1. Create Class API

**File:** `app/api/educator/classes/route.ts` (NEW FILE)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { generate_class_code } from '@/lib/db-functions' // You'll need to create this

export async function POST(req: NextRequest) {
  try {
    const { name, subject, grade, section, timezone } = await req.json()
    
    // Get user's org_id from JWT (implement JWT parsing)
    const orgId = 'org-id-from-jwt' // Replace with actual JWT parsing
    
    // Create class
    const { data: classData, error: classError } = await supabaseAdmin
      .from('classes')
      .insert({
        org_id: orgId,
        name,
        subject,
        grade,
        section,
        timezone: timezone || 'UTC'
      })
      .select()
      .single()
    
    if (classError) throw classError
    
    // Generate join code
    const code = await generate_class_code()
    
    // Create join code record
    const { data: codeData, error: codeError } = await supabaseAdmin
      .from('join_codes')
      .insert({
        org_id: orgId,
        type: 'class',
        class_id: classData.id,
        code,
        max_uses: 0, // Unlimited by default
        label: `Join code for ${name}`
      })
      .select()
      .single()
    
    if (codeError) throw codeError
    
    const joinLink = `${process.env.NEXT_PUBLIC_APP_URL}/join/${code}`
    
    return NextResponse.json({
      id: classData.id,
      code,
      joinLink
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const orgId = 'org-id-from-jwt' // Replace with actual
    
    const { data, error } = await supabaseAdmin
      .from('classes')
      .select('*, join_codes(code, used_count)')
      .eq('org_id', orgId)
      .eq('archived', false)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
```

### 2. Join Code Management API

**File:** `app/api/educator/join-codes/route.ts` (NEW FILE)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { classId, maxUses, expiresAt, label } = await req.json()
    
    // Create or update join code logic
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { codeId, revoked, maxUses, expiresAt } = await req.json()
    
    // Update join code
    const { error } = await supabaseAdmin
      .from('join_codes')
      .update({ revoked, max_uses: maxUses, expires_at: expiresAt })
      .eq('id', codeId)
    
    if (error) throw error
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
```

### 3. Create Student API (Single)

**File:** `app/api/educator/students/route.ts` (NEW FILE)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { 
      name, 
      email, 
      phone, 
      studentId, 
      parentEmail, 
      classId,
      credentialMethod // 'magic_link', 'temp_password', 'none'
    } = await req.json()
    
    // Validate: email or phone required
    if (!email && !phone) {
      return NextResponse.json(
        { error: 'Email or phone is required' },
        { status: 400 }
      )
    }
    
    // Use stored procedure to create student
    const { data, error } = await supabaseAdmin.rpc('provision_student', {
      p: {
        name,
        email: email || null,
        phone: phone || null,
        student_id: studentId || null,
        parent_email: parentEmail || null,
        class_id: classId || null
      }
    })
    
    if (error) throw error
    
    // If credential method is magic_link or temp_password, send invite
    if (credentialMethod !== 'none') {
      // Implement invite sending logic
      // This might require a separate service/function
    }
    
    return NextResponse.json({ 
      success: true, 
      userId: data.user_id 
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
```

### 4. Bulk Create Students API

**File:** `app/api/educator/students/bulk/route.ts` (NEW FILE)

This endpoint handles CSV file upload, parsing, validation, and bulk creation.

### 5. Redeem Code API (Public)

**File:** `app/api/auth/redeem-code/route.ts` (NEW FILE)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json()
    
    // Call stored procedure
    const { data, error } = await supabaseAdmin.rpc('redeem_join_code', {
      p_code: code
    })
    
    if (error) throw error
    
    if (data.status === 'error') {
      return NextResponse.json(
        { error: data.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json({ 
      success: true, 
      classId: data.class_id 
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
```

---

## UI Components Structure

### Educator Components Directory Structure

```
components/
  educator/
    EducatorSidebar.tsx          - Sidebar with educator nav
    EducatorHeader.tsx            - Header for educator dashboard
    ClassCard.tsx                - Class card component
    CreateClassModal.tsx         - Create class modal
    JoinCodeBadge.tsx            - Code badge with copy
    QRCodeGenerator.tsx          - QR code component
    RosterTable.tsx              - Student roster table
    AddStudentDrawer.tsx         - Single student form
    BulkStudentUpload.tsx        - CSV upload component
    JoinCodeSettings.tsx         - Code management panel
```

### Key Components Examples

#### Join Code Badge Component

**File:** `components/educator/JoinCodeBadge.tsx` (NEW FILE)

```typescript
'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

interface JoinCodeBadgeProps {
  code: string
  size?: 'sm' | 'md' | 'lg'
}

export default function JoinCodeBadge({ code, size = 'md' }: JoinCodeBadgeProps) {
  const [copied, setCopied] = useState(false)
  
  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  const sizeClasses = {
    sm: 'text-sm px-3 py-1',
    md: 'text-base px-4 py-2',
    lg: 'text-xl px-6 py-3'
  }
  
  return (
    <div className={`inline-flex items-center gap-2 bg-gray-100 rounded-lg font-mono ${sizeClasses[size]}`}>
      <span className="font-bold">{code}</span>
      <button
        onClick={copyToClipboard}
        className="p-1 hover:bg-gray-200 rounded transition-colors"
        title="Copy code"
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-600" />
        ) : (
          <Copy className="h-4 w-4 text-gray-600" />
        )}
      </button>
    </div>
  )
}
```

---

## Authentication & Authorization

### Step 1: Update Auth Middleware

Create or update middleware to check roles and redirect accordingly:

**File:** `middleware.ts` (NEW FILE OR UPDATE EXISTING)

```typescript
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  
  const {
    data: { session },
  } = await supabase.auth.getSession()
  
  // If accessing dashboard routes, check role
  if (req.nextUrl.pathname.startsWith('/dashboard')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    
    // Get user role from JWT or database
    const userRole = session.user.user_metadata?.role || 'Student'
    
    // Redirect educators away from admin routes
    if (userRole === 'Educator' && !req.nextUrl.pathname.startsWith('/dashboard/educator')) {
      return NextResponse.redirect(new URL('/dashboard/educator/classes', req.url))
    }
    
    // Redirect admins away from educator routes
    if (userRole === 'SuperAdmin' && req.nextUrl.pathname.startsWith('/dashboard/educator')) {
      return NextResponse.redirect(new URL('/dashboard/overview', req.url))
    }
  }
  
  return res
}

export const config = {
  matcher: ['/dashboard/:path*']
}
```

### Step 2: Update JWT Claims

Ensure your Supabase JWT includes role and org_id:

```sql
-- Custom function to add claims to JWT
CREATE OR REPLACE FUNCTION custom_claims()
RETURNS jsonb AS $$
BEGIN
  RETURN jsonb_build_object(
    'role', (SELECT role FROM users WHERE id = auth.uid()),
    'org_id', (SELECT org_id FROM users WHERE id = auth.uid())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
- ✅ Database schema creation
- ✅ RLS policies setup
- ✅ SuperAdmin: Create organizations
- ✅ SuperAdmin: Create educators UI

### Phase 2: Core Educator Features (Week 2)
- ✅ Educator dashboard layout
- ✅ Create classes API & UI
- ✅ Join code generation
- ✅ Join code management UI

### Phase 3: Student Management (Week 3)
- ✅ Single student creation
- ✅ Bulk CSV import
- ✅ Roster management UI
- ✅ Student account provisioning

### Phase 4: Join Flow (Week 4)
- ✅ Public join page (`/join/[code]`)
- ✅ Code redemption API
- ✅ Student enrollment flow
- ✅ Error handling & edge cases

### Phase 5: Polish & Testing (Week 5)
- ✅ QR code generation
- ✅ Usage analytics
- ✅ Code lifecycle management
- ✅ Mobile responsiveness
- ✅ Comprehensive testing

---

## Testing Checklist

### SuperAdmin Tests
- [ ] Can create organization
- [ ] Can create educator account
- [ ] Can assign educator to organization
- [ ] Can view all organizations
- [ ] Existing admin features still work

### Educator Tests
- [ ] Can login and see educator dashboard
- [ ] Cannot access admin routes
- [ ] Can create class
- [ ] Receives join code and link on class creation
- [ ] Can copy join code and link
- [ ] Can generate QR code
- [ ] Can set code expiry and max uses
- [ ] Can revoke code
- [ ] Can regenerate code
- [ ] Can add single student
- [ ] Can bulk import students from CSV
- [ ] Students auto-enroll in class
- [ ] Can view class roster
- [ ] Can remove student from class
- [ ] Can archive/restore class

### Student Tests
- [ ] Can redeem valid code (not logged in)
- [ ] Can redeem valid code (logged in)
- [ ] Cannot redeem expired code
- [ ] Cannot redeem revoked code
- [ ] Cannot redeem code that exceeded max uses
- [ ] Gets friendly error message
- [ ] Auto-enrolled in class after redemption
- [ ] Can view enrolled classes

### Security Tests
- [ ] Educator cannot access other org's data
- [ ] Student cannot access other classes
- [ ] RLS policies work correctly
- [ ] API routes validate permissions
- [ ] JWT includes correct claims

---

## Migration Script

If you have existing users, run this migration:

```sql
-- Set existing users to SuperAdmin role (adjust as needed)
UPDATE users 
SET role = 'SuperAdmin'
WHERE role IS NULL;

-- Create default organization for existing admins
INSERT INTO organizations (id, name)
VALUES (gen_random_uuid(), 'Default Organization')
ON CONFLICT DO NOTHING;

-- Assign existing users to default org (adjust org_id)
UPDATE users
SET org_id = (SELECT id FROM organizations LIMIT 1)
WHERE org_id IS NULL;
```

---

## Important Notes

1. **No Breaking Changes**: All existing admin routes and features remain untouched
2. **Separate Routes**: Educator features use `/dashboard/educator/*` to avoid conflicts
3. **RLS Protection**: All data is protected by Row Level Security
4. **JWT Claims**: Ensure JWT includes `role` and `org_id` for proper authorization
5. **Incremental Rollout**: Implement phase by phase, test each phase before moving on

---

## Troubleshooting

### Common Issues

1. **RLS blocking queries**: Check if JWT claims are set correctly
2. **Code generation fails**: Ensure `generate_class_code()` function exists
3. **Educator can't see classes**: Verify `org_id` matches in JWT
4. **Bulk import fails**: Check CSV format and validation logic

---

## Next Steps

1. Review this documentation with your team
2. Create a feature branch: `git checkout -b feature/educator-dashboard`
3. Start with Phase 1 (Database Schema)
4. Test each phase before proceeding
5. Document any deviations or customizations

---

**Last Updated**: [Date]
**Version**: 1.0
