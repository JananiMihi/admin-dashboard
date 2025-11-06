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
        { error: 'Only educators can view students' },
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
      .select('id, org_id')
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

    // Fetch enrollments using service role (bypasses RLS)
    // Note: enrollments table has composite primary key (user_id, class_id), not an id column
    const { data: enrollments, error: enrollmentsError } = await supabaseAdmin
      .from('enrollments')
      .select('user_id, class_id, status, enrolled_at')
      .eq('class_id', classId)
      .order('enrolled_at', { ascending: false })

    if (enrollmentsError) {
      console.error('Error fetching enrollments:', enrollmentsError)
      return NextResponse.json(
        { error: enrollmentsError.message || 'Failed to fetch enrollments' },
        { status: 500 }
      )
    }

    if (!enrollments || enrollments.length === 0) {
      return NextResponse.json({
        success: true,
        students: []
      })
    }

    // Get user_ids from enrollments
    const userIds = enrollments.map(e => e.user_id)

    // Fetch user profiles for these users using service role (bypasses RLS)
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('user_profiles')
      .select('user_id, full_name, email, phone')
      .in('user_id', userIds)

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      return NextResponse.json(
        { error: profilesError.message || 'Failed to fetch student profiles' },
        { status: 500 }
      )
    }

    // Create a map of user_id to profile
    const profileMap = new Map(
      (profiles || []).map(p => [p.user_id, p])
    )

    // Combine enrollments with profiles
    // Use composite key (user_id + class_id) as id since enrollments has no id column
    const studentsData = enrollments.map((enrollment: any) => {
      const profile = profileMap.get(enrollment.user_id)
      return {
        id: `${enrollment.user_id}-${enrollment.class_id}`, // Composite key as id
        user_id: enrollment.user_id,
        class_id: enrollment.class_id,
        full_name: profile?.full_name || null,
        email: profile?.email || null,
        phone: profile?.phone || null,
        status: enrollment.status || 'active',
        enrolled_at: enrollment.enrolled_at || null
      }
    })

    return NextResponse.json({
      success: true,
      students: studentsData
    })
  } catch (error: any) {
    console.error('Error in GET /api/educator/classes/[id]/students:', error)
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
    const { userId } = await req.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

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
        { error: 'Only educators can remove students' },
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
      .select('id, org_id')
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

    // Delete enrollment (enrollments table has composite primary key)
    const { error: deleteError } = await supabaseAdmin
      .from('enrollments')
      .delete()
      .eq('user_id', userId)
      .eq('class_id', classId)

    if (deleteError) {
      console.error('Error removing student:', deleteError)
      return NextResponse.json(
        { error: deleteError.message || 'Failed to remove student' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Student removed from class successfully'
    })
  } catch (error: any) {
    console.error('Error in DELETE /api/educator/classes/[id]/students:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
