import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Get missions available to educator
// Returns: Global missions (is_global=true) + Educator's org missions
export async function GET(req: NextRequest) {
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

    // Get user's profile
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

    let missionsQuery = supabaseAdmin
      .from('missions')
      .select('*')
      .order('created_at', { ascending: true })

    // SuperAdmin sees all missions
    if (profile.role === 'SuperAdmin') {
      // No filter needed - SuperAdmin sees everything
    } else if (profile.role === 'Educator') {
      // Educators see: global missions OR missions from their org
      missionsQuery = missionsQuery.or(
        `is_global.eq.true,org_id.eq.${profile.org_id}`
      )
    } else {
      return NextResponse.json(
        { error: 'Unauthorized. Only educators and SuperAdmin can access missions.' },
        { status: 403 }
      )
    }

    const { data: missions, error: missionsError } = await missionsQuery

    if (missionsError) {
      console.error('Error fetching missions:', missionsError)
      return NextResponse.json(
        { error: missionsError.message || 'Failed to fetch missions' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      missions: missions || [],
      count: missions?.length || 0
    })
  } catch (error: any) {
    console.error('Error in GET /api/educator/missions/available:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}





