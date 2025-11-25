import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Customize mission for a specific class
export async function PUT(
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
        { error: 'Only educators can customize missions' },
        { status: 403 }
      )
    }

    // Verify class belongs to educator's organization (unless SuperAdmin)
    if (profile.role !== 'SuperAdmin') {
      const { data: classData, error: classError } = await supabaseAdmin
        .from('classes')
        .select('org_id')
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
          { error: 'Class does not belong to your organization' },
          { status: 403 }
        )
      }
    }

    // Verify mission is assigned to class
    const { data: classMission } = await supabaseAdmin
      .from('class_missions')
      .select('id')
      .eq('class_id', classId)
      .eq('mission_id', missionId)
      .maybeSingle()

    if (!classMission) {
      return NextResponse.json(
        { error: 'Mission is not assigned to this class. Assign it first.' },
        { status: 400 }
      )
    }

    // Get customization data from request body
    const {
      custom_title,
      custom_description,
      custom_order,
      custom_xp_reward,
      custom_unlocked,
      custom_difficulty,
      custom_estimated_time,
      custom_mission_data
    } = await req.json()

    // Build customization object (only include non-undefined fields)
    const customization: any = {
      class_id: classId,
      mission_id: missionId,
      customized_by: user.id,
      updated_at: new Date().toISOString()
    }

    if (custom_title !== undefined) customization.custom_title = custom_title
    if (custom_description !== undefined) customization.custom_description = custom_description
    if (custom_order !== undefined) customization.custom_order = custom_order
    if (custom_xp_reward !== undefined) customization.custom_xp_reward = custom_xp_reward
    if (custom_unlocked !== undefined) customization.custom_unlocked = custom_unlocked
    if (custom_difficulty !== undefined) customization.custom_difficulty = custom_difficulty
    if (custom_estimated_time !== undefined) customization.custom_estimated_time = custom_estimated_time
    if (custom_mission_data !== undefined) customization.custom_mission_data = custom_mission_data

    // Upsert customization
    const { data: existing } = await supabaseAdmin
      .from('class_mission_customizations')
      .select('id')
      .eq('class_id', classId)
      .eq('mission_id', missionId)
      .maybeSingle()

    let result
    if (existing) {
      // Update existing customization
      const { data, error } = await supabaseAdmin
        .from('class_mission_customizations')
        .update(customization)
        .eq('id', existing.id)
        .select()
        .single()

      result = data
      if (error) {
        console.error('Error updating customization:', error)
        return NextResponse.json(
          { error: 'Failed to update customization', details: error.message },
          { status: 500 }
        )
      }
    } else {
      // Create new customization
      customization.customized_at = new Date().toISOString()
      const { data, error } = await supabaseAdmin
        .from('class_mission_customizations')
        .insert(customization)
        .select()
        .single()

      result = data
      if (error) {
        console.error('Error creating customization:', error)
        return NextResponse.json(
          { error: 'Failed to create customization', details: error.message },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      customization: result,
      message: 'Mission customized successfully'
    })
  } catch (error: any) {
    console.error('Error in PUT /api/educator/classes/[id]/missions/[missionId]/customize:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// Get customization for a mission in a class
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
    const { data: { user } } = await supabaseAdmin.auth.getUser(token)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      )
    }

    // Get customization
    const { data: customization, error } = await supabaseAdmin
      .from('class_mission_customizations')
      .select('*')
      .eq('class_id', classId)
      .eq('mission_id', missionId)
      .maybeSingle()

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Failed to fetch customization' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      customization: customization || null
    })
  } catch (error: any) {
    console.error('Error in GET /api/educator/classes/[id]/missions/[missionId]/customize:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// Remove customization (revert to base mission)
export async function DELETE(
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

    // Get user's profile
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('role, org_id')
      .eq('user_id', user.id)
      .single()

    if (!profile || (profile.role !== 'Educator' && profile.role !== 'SuperAdmin')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Verify class ownership (unless SuperAdmin)
    if (profile.role !== 'SuperAdmin') {
      const { data: classData } = await supabaseAdmin
        .from('classes')
        .select('org_id')
        .eq('id', classId)
        .single()

      if (!classData || classData.org_id !== profile.org_id) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        )
      }
    }

    // Get query parameter to optionally remove specific field
    const { searchParams } = new URL(req.url)
    const field = searchParams.get('field')

    if (field) {
      // Remove specific field customization (set to NULL)
      const updateField = `custom_${field}`
      const { error } = await supabaseAdmin
        .from('class_mission_customizations')
        .update({ [updateField]: null })
        .eq('class_id', classId)
        .eq('mission_id', missionId)

      if (error) {
        return NextResponse.json(
          { error: error.message || 'Failed to remove field customization' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: `Removed customization for ${field}`
      })
    } else {
      // Remove entire customization
      const { error } = await supabaseAdmin
        .from('class_mission_customizations')
        .delete()
        .eq('class_id', classId)
        .eq('mission_id', missionId)

      if (error) {
        return NextResponse.json(
          { error: error.message || 'Failed to remove customization' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Customization removed. Mission will use base values.'
      })
    }
  } catch (error: any) {
    console.error('Error in DELETE /api/educator/classes/[id]/missions/[missionId]/customize:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}







