import { NextRequest, NextResponse } from 'next/server'
import Papa from 'papaparse'

import { supabaseAdmin } from '@/lib/supabase'
import {
  createStudentAccount,
  CredentialMethod
} from '@/lib/educator/student-service'

interface ParsedRow {
  name?: string
  email?: string
  phone?: string
  student_id?: string
  parent_email?: string
}

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

    const formData = await req.formData()
    const file = formData.get('file')
    const classId = formData.get('classId') as string | null
    const credentialMethod = formData.get('credentialMethod') as string | null

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: 'CSV file is required.' },
        { status: 400 }
      )
    }

    if (!classId) {
      return NextResponse.json(
        { error: 'Class ID is required.' },
        { status: 400 }
      )
    }

    const method = normalizeCredentialMethod(credentialMethod)

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('role, org_id')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile?.org_id) {
      return NextResponse.json(
        { error: 'Educator profile or organization not found.' },
        { status: 404 }
      )
    }

    if (profile.role !== 'Educator' && profile.role !== 'SuperAdmin') {
      return NextResponse.json(
        { error: 'Only educators can import students.' },
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

    const csvText = await (file as File).text()
    const parsed = Papa.parse<ParsedRow>(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase()
    })

    if (parsed.errors.length > 0) {
      return NextResponse.json(
        { error: parsed.errors.map((err) => err.message).join(', ') },
        { status: 400 }
      )
    }

    const rows = parsed.data.filter((row) => row && row.name?.trim())

    const results: Array<{
      name: string
      email?: string
      phone?: string
      success: boolean
      error?: string
      temporaryPassword?: string
      joinLink?: string
      joinCode?: string
    }> = []

    for (const row of rows) {
      const safeName = row.name?.trim() || ''
      try {
        if (!row.email && !row.phone) {
          throw new Error('Email or phone is required.')
        }

        if (method === 'magic_link' && !row.email) {
          throw new Error('Magic link requires an email address.')
        }

        const result = await createStudentAccount({
          name: safeName,
          email: row.email?.trim() || null,
          phone: row.phone?.trim() || null,
          studentId: row.student_id?.trim() || null,
          parentEmail: row.parent_email?.trim() || null,
          classId,
          className: classData.name,
          orgId: profile.org_id,
          createdByUserId: user.id,
          credentialMethod: method
        })

        results.push({
          name: safeName,
          email: row.email?.trim() || undefined,
          phone: row.phone?.trim() || undefined,
          success: true,
          temporaryPassword: result.temporaryPassword,
          joinLink: result.joinLink,
          joinCode: result.joinCode
        })
      } catch (error: any) {
        results.push({
          name: safeName,
          email: row.email?.trim() || undefined,
          phone: row.phone?.trim() || undefined,
          success: false,
          error: error?.message || 'Failed to create student'
        })
      }
    }

    const successCount = results.filter((item) => item.success).length
    const failureCount = results.length - successCount

    return NextResponse.json({
      success: true,
      summary: {
        total: results.length,
        success: successCount,
        failed: failureCount
      },
      results
    })
  } catch (error: any) {
    console.error('Error importing students via CSV:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}




