import { NextRequest, NextResponse } from 'next/server'

import { supabaseAdmin } from '@/lib/supabase'
import {
  resendStudentInvite,
  resetStudentPassword
} from '@/lib/educator/student-service'

type ManageAction = 'reset_password' | 'resend_invite' | 'remove'

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

    const { action, studentId, classId } = await req.json()

    if (!action || !studentId) {
      return NextResponse.json(
        { error: 'Action and studentId are required.' },
        { status: 400 }
      )
    }

    const normalizedAction = (action as string).toLowerCase() as ManageAction
    if (
      normalizedAction !== 'reset_password' &&
      normalizedAction !== 'resend_invite' &&
      normalizedAction !== 'remove'
    ) {
      return NextResponse.json(
        { error: `Unsupported action: ${action}` },
        { status: 400 }
      )
    }

    const { data: educatorProfile, error: educatorProfileError } =
      await supabaseAdmin
        .from('user_profiles')
        .select('role, org_id')
        .eq('user_id', user.id)
        .single()

    if (educatorProfileError || !educatorProfile?.org_id) {
      return NextResponse.json(
        { error: 'Educator profile or organization not found.' },
        { status: 404 }
      )
    }

    if (
      educatorProfile.role !== 'Educator' &&
      educatorProfile.role !== 'SuperAdmin'
    ) {
      return NextResponse.json(
        { error: 'Only educators can manage students.' },
        { status: 403 }
      )
    }

    const { data: studentProfile, error: studentProfileError } =
      await supabaseAdmin
        .from('user_profiles')
        .select('user_id, org_id, email, full_name')
        .eq('user_id', studentId)
        .eq('role', 'Student')
        .single()

    if (studentProfileError || !studentProfile) {
      return NextResponse.json(
        { error: 'Student not found.' },
        { status: 404 }
      )
    }

    if (studentProfile.org_id !== educatorProfile.org_id) {
      return NextResponse.json(
        { error: 'Student does not belong to your organization.' },
        { status: 403 }
      )
    }

    if (normalizedAction === 'reset_password') {
      const { temporaryPassword } = await resetStudentPassword(studentId)
      return NextResponse.json({
        success: true,
        temporaryPassword
      })
    }

    if (normalizedAction === 'resend_invite') {
      if (!studentProfile.email) {
        return NextResponse.json(
          { error: 'Student does not have an email to resend invite.' },
          { status: 400 }
        )
      }

      const info = await resendStudentInvite(studentId)
      return NextResponse.json({
        success: true,
        email: info.email,
        fullName: info.fullName
      })
    }

    if (normalizedAction === 'remove') {
      if (!classId) {
        return NextResponse.json(
          { error: 'Class ID is required to remove a student.' },
          { status: 400 }
        )
      }

      const { data: classData, error: classError } = await supabaseAdmin
        .from('classes')
        .select('id, org_id')
        .eq('id', classId)
        .single()

      if (classError || !classData) {
        return NextResponse.json(
          { error: 'Class not found.' },
          { status: 404 }
        )
      }

      if (classData.org_id !== educatorProfile.org_id) {
        return NextResponse.json(
          { error: 'You do not have access to this class.' },
          { status: 403 }
        )
      }

      await supabaseAdmin
        .from('enrollments')
        .delete()
        .eq('user_id', studentId)
        .eq('class_id', classId)

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: false }, { status: 400 })
  } catch (error: any) {
    console.error('Error managing student:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}





















