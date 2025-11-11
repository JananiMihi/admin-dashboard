import { NextRequest, NextResponse } from 'next/server'

import { supabaseAdmin } from '@/lib/supabase'
import {
  createStudentAccount,
  CredentialMethod
} from '@/lib/educator/student-service'

const DEFAULT_METHOD: CredentialMethod = 'magic_link'

function normalizeCredentialMethod(method?: string | null): CredentialMethod {
  const value = (method || '').toLowerCase()
  if (value === 'magic_link' || value === 'temp_password' || value === 'code_only') {
    return value
  }
  return DEFAULT_METHOD
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const {
      data: { user },
      error: userError
    } = await supabaseAdmin.auth.getUser(token)

    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    const {
      name,
      email,
      phone,
      studentId,
      parentEmail,
      classId,
      credentialMethod,
      age,
      passwordMode,
      manualPassword
    } = await req.json()

    if (!name) {
      return NextResponse.json(
        { error: 'Student name is required' },
        { status: 400 }
      )
    }

    if (!classId) {
      return NextResponse.json(
        { error: 'Class ID is required' },
        { status: 400 }
      )
    }

    const method = normalizeCredentialMethod(credentialMethod)

    if (method === 'magic_link' && !email) {
      return NextResponse.json(
        { error: 'Magic link requires an email address.' },
        { status: 400 }
      )
    }

    let passwordToUse: string | null = null
    if (method === 'temp_password') {
      const mode = (passwordMode || 'auto').toLowerCase()
      if (mode === 'manual') {
        if (!manualPassword || manualPassword.length < 8) {
          return NextResponse.json(
            { error: 'Manual password must be at least 8 characters.' },
            { status: 400 }
          )
        }
        passwordToUse = manualPassword
      } else if (mode !== 'auto') {
        return NextResponse.json(
          { error: 'Invalid password mode. Use "auto" or "manual".' },
          { status: 400 }
        )
      }
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('role, org_id')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile?.org_id) {
      return NextResponse.json(
        { error: 'Educator profile or organization not found' },
        { status: 404 }
      )
    }

    if (profile.role !== 'Educator' && profile.role !== 'SuperAdmin') {
      return NextResponse.json(
        { error: 'Only educators can create students.' },
        { status: 403 }
      )
    }

    const { data: classData, error: classError } = await supabaseAdmin
      .from('classes')
      .select('id, name, org_id')
      .eq('id', classId)
      .single()

    if (classError || !classData) {
      return NextResponse.json(
        { error: 'Class not found.' },
        { status: 404 }
      )
    }

    if (classData.org_id !== profile.org_id) {
      return NextResponse.json(
        { error: 'You do not have access to this class.' },
        { status: 403 }
      )
    }

    const result = await createStudentAccount({
      name,
      email: email || null,
      phone: phone || null,
      studentId: studentId || null,
      parentEmail: parentEmail || null,
      age: typeof age === 'number' ? age : age ? Number(age) || null : null,
      classId,
      className: classData.name,
      orgId: profile.org_id,
      createdByUserId: user.id,
      credentialMethod: method,
      manualPassword: passwordToUse
    })

    return NextResponse.json({
      success: true,
      student: result.profile,
      userId: result.userId,
      enrollmentStatus: result.enrollmentStatus,
      credentialMethod: result.credentialMethod,
      temporaryPassword: result.temporaryPassword,
      invitationSent: result.invitationSent,
      joinCode: result.joinCode,
      joinLink: result.joinLink
    })
  } catch (error: any) {
    console.error('Error creating student account:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

