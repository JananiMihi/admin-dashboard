import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    // Get the session from the request
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Extract token from Authorization header
    const token = authHeader.replace('Bearer ', '')
    
    // Verify the user session
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
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

    // Verify user is an educator or superadmin
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

    // Fetch classes using service role (bypasses RLS)
    const { data: classes, error: classesError } = await supabaseAdmin
      .from('classes')
      .select('*')
      .eq('org_id', profile.org_id)
      .eq('archived', false)
      .order('created_at', { ascending: false })

    if (classesError) {
      console.error('Error fetching classes:', classesError)
      return NextResponse.json(
        { error: classesError.message || 'Failed to fetch classes' },
        { status: 500 }
      )
    }

    // Fetch join codes separately for each class
    const classIds = (classes || []).map(cls => cls.id)
    let joinCodesMap = new Map()
    
    if (classIds.length > 0) {
      const { data: joinCodes, error: joinCodesError } = await supabaseAdmin
        .from('join_codes')
        .select('code, used_count, max_uses, label, class_id')
        .in('class_id', classIds)
        .eq('type', 'class')
        .eq('revoked', false)

      if (!joinCodesError && joinCodes) {
        // Create a map of class_id -> join_code
        joinCodes.forEach(jc => {
          if (!joinCodesMap.has(jc.class_id)) {
            joinCodesMap.set(jc.class_id, [])
          }
          joinCodesMap.get(jc.class_id).push(jc)
        })
      }
    }

    // Get student counts and attach join codes for each class
    const classesWithCounts = await Promise.all(
      (classes || []).map(async (cls) => {
        const { count } = await supabaseAdmin
          .from('enrollments')
          .select('*', { count: 'exact', head: true })
          .eq('class_id', cls.id)

        return {
          ...cls,
          student_count: count || 0,
          join_codes: joinCodesMap.get(cls.id) || []
        }
      })
    )

    return NextResponse.json({
      success: true,
      classes: classesWithCounts
    })
  } catch (error: any) {
    console.error('Error in GET /api/educator/classes/list:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

