import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { resolveImagePaths } from '@/lib/utils/mission-image-resolver'

// Get customized mission for a class (for students)
// Returns base mission merged with class customizations
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; missionId: string } }
) {
  try {
    const classId = params.id
    const missionId = params.missionId
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

    // Verify student is enrolled in this class
    const { data: enrollment } = await supabaseAdmin
      .from('enrollments')
      .select('class_id')
      .eq('class_id', classId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()

    if (!enrollment) {
      return NextResponse.json(
        { error: 'You are not enrolled in this class' },
        { status: 403 }
      )
    }

    // Verify mission is assigned to class
    const { data: classMission } = await supabaseAdmin
      .from('class_missions')
      .select('mission_id')
      .eq('class_id', classId)
      .eq('mission_id', missionId)
      .eq('is_active', true)
      .maybeSingle()

    if (!classMission) {
      return NextResponse.json(
        { error: 'Mission is not available for this class' },
        { status: 404 }
      )
    }

    // Fetch base mission
    const { data: mission, error: missionError } = await supabaseAdmin
      .from('missions')
      .select('*')
      .eq('id', missionId)
      .single()

    if (missionError || !mission) {
      return NextResponse.json(
        { error: 'Mission not found' },
        { status: 404 }
      )
    }

    // Fetch customization if exists
    const { data: customization } = await supabaseAdmin
      .from('class_mission_customizations')
      .select('*')
      .eq('class_id', classId)
      .eq('mission_id', missionId)
      .maybeSingle()

    // Merge base mission with customization
    let mergedMissionData = customization?.custom_mission_data ?? mission.mission_data

    // Resolve image paths in mission_data
    if (mergedMissionData) {
      mergedMissionData = resolveImagePaths(
        mergedMissionData,
        mission.assets_bucket,
        mission.assets_prefix
      )
    }

    const mergedMission = {
      ...mission,
      title: customization?.custom_title ?? mission.title,
      description: customization?.custom_description ?? mission.description,
      order: customization?.custom_order ?? mission.order,
      xp_reward: customization?.custom_xp_reward ?? mission.xp_reward,
      unlocked: customization?.custom_unlocked ?? mission.unlocked,
      difficulty: customization?.custom_difficulty ?? mission.difficulty,
      estimated_time: customization?.custom_estimated_time ?? mission.estimated_time,
      mission_data: mergedMissionData,
      has_customization: customization !== null
    }

    return NextResponse.json({
      success: true,
      mission: mergedMission
    })
  } catch (error: any) {
    console.error('Error in GET /api/classes/[id]/missions/[missionId]:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}












