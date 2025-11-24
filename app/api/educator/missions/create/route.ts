import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Create a mission as an educator
// This creates an organization-specific mission (is_global=false)
export async function POST(req: NextRequest) {
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

    if (profile.role !== 'Educator' && profile.role !== 'SuperAdmin') {
      return NextResponse.json(
        { error: 'Only educators can create missions' },
        { status: 403 }
      )
    }

    if (profile.role === 'Educator' && !profile.org_id) {
      return NextResponse.json(
        { error: 'Educator must belong to an organization' },
        { status: 400 }
      )
    }

    const body = await req.json()
    const {
      title,
      description,
      mission_data,
      mission_uid,
      order_no,
      xp_reward = 0,
      difficulty = 'medium',
      estimated_time = 0,
      unlocked = true,
      assets_bucket,
      assets_prefix
    } = body

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    // Generate mission_uid if not provided
    const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-')
    let finalMissionUid = mission_uid || `${slugify(title)}-${Date.now()}`

    // Ensure mission_uid uniqueness
    const { count: uidCount } = await supabaseAdmin
      .from('missions')
      .select('mission_uid', { count: 'exact', head: true })
      .eq('mission_uid', finalMissionUid)

    if ((uidCount || 0) > 0) {
      finalMissionUid = `${finalMissionUid}-${Date.now()}`
    }

    // Determine order_no if not provided
    let finalOrderNo = order_no
    if (finalOrderNo === null || finalOrderNo === undefined) {
      const { count } = await supabaseAdmin
        .from('missions')
        .select('order_no', { count: 'exact', head: true })
        .eq('org_id', profile.role === 'SuperAdmin' ? null : profile.org_id)

      finalOrderNo = (count || 0) + 1
    }

    // Build mission data
    const missionData: any = {
      title,
      mission_uid: finalMissionUid,
      order_no: finalOrderNo,
      is_global: profile.role === 'SuperAdmin' ? true : false,
      created_by: profile.role === 'SuperAdmin' ? null : user.id,
      org_id: profile.role === 'SuperAdmin' ? null : profile.org_id,
      xp_reward,
      difficulty,
      estimated_time,
      unlocked,
      object_path: mission_data ? `missions/${finalMissionUid}.json` : null
    }

    if (description) missionData.description = description
    if (mission_data) missionData.mission_data = mission_data
    if (assets_bucket) missionData.assets_bucket = assets_bucket
    if (assets_prefix) missionData.assets_prefix = assets_prefix

    // Insert mission
    const { data: mission, error: insertError } = await supabaseAdmin
      .from('missions')
      .insert(missionData)
      .select()
      .single()

    if (insertError) {
      console.error('Error creating mission:', insertError)
      return NextResponse.json(
        { error: insertError.message || 'Failed to create mission' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      mission,
      message: 'Mission created successfully'
    })
  } catch (error: any) {
    console.error('Error in POST /api/educator/missions/create:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}





