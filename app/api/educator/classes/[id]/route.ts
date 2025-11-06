import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      )
    }

    const classId = params.id

    // Get user's profile to verify role and get org_id
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('role, org_id')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    if (profile.role !== 'Educator' && profile.role !== 'SuperAdmin') {
      return NextResponse.json(
        { error: 'Only educators can view classes' },
        { status: 403 }
      )
    }

    if (!profile.org_id) {
      return NextResponse.json(
        { error: 'No organization assigned' },
        { status: 400 }
      )
    }

    // Fetch class using service role (bypasses RLS)
    const { data: classData, error: classError } = await supabaseAdmin
      .from('classes')
      .select('*')
      .eq('id', classId)
      .eq('org_id', profile.org_id)
      .single()

    if (classError || !classData) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      )
    }

    // Fetch join codes separately
    const { data: joinCodes, error: joinCodesError } = await supabaseAdmin
      .from('join_codes')
      .select('code, used_count, max_uses, label')
      .eq('class_id', classId)
      .eq('type', 'class')
      .eq('revoked', false)

    return NextResponse.json({
      success: true,
      class: {
        ...classData,
        join_codes: joinCodes || []
      }
    })
  } catch (error: any) {
    console.error('Error in GET /api/educator/classes/[id]:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      )
    }

    const classId = params.id

    // Get user's profile to verify role and get org_id
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('role, org_id')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    if (profile.role !== 'Educator' && profile.role !== 'SuperAdmin') {
      return NextResponse.json(
        { error: 'Only educators can delete classes' },
        { status: 403 }
      )
    }

    if (!profile.org_id) {
      return NextResponse.json(
        { error: 'No organization assigned' },
        { status: 400 }
      )
    }

    // Verify class belongs to educator's org
    const { data: classData, error: classError } = await supabaseAdmin
      .from('classes')
      .select('id, org_id, name')
      .eq('id', classId)
      .single()

    if (classError || !classData) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      )
    }

    if (classData.org_id !== profile.org_id) {
      return NextResponse.json(
        { error: 'You do not have access to this class' },
        { status: 403 }
      )
    }

    // Soft delete: Set archived to true
    const { error: deleteError } = await supabaseAdmin
      .from('classes')
      .update({ archived: true, updated_at: new Date().toISOString() })
      .eq('id', classId)

    if (deleteError) {
      console.error('Error archiving class:', deleteError)
      return NextResponse.json(
        { error: deleteError.message || 'Failed to delete class' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Class deleted successfully'
    })
  } catch (error: any) {
    console.error('Error in DELETE /api/educator/classes/[id]:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

