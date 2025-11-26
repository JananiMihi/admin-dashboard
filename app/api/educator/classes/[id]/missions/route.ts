import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Assign mission to class
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const classId = params.id
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
        { error: 'Only educators can assign missions' },
        { status: 403 }
      )
    }

    const { mission_id } = await req.json()

    if (!mission_id) {
      return NextResponse.json(
        { error: 'Mission ID is required' },
        { status: 400 }
      )
    }

    // Verify class belongs to educator's organization
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

    if (classData.org_id !== profile.org_id && profile.role !== 'SuperAdmin') {
      return NextResponse.json(
        { error: 'Class does not belong to your organization' },
        { status: 403 }
      )
    }

    // Verify mission exists
    const { data: missionData, error: missionError } = await supabaseAdmin
      .from('missions')
      .select('id')
      .eq('id', mission_id)
      .single()

    if (missionError || !missionData) {
      return NextResponse.json(
        { error: 'Mission not found' },
        { status: 404 }
      )
    }

    // Check if class_missions table exists, if not create relationship in a simple way
    // For now, we'll use a JSONB column on classes or create a join table
    // Let's try to insert into a class_missions table, with fallback
    
    // Try to create/update a class_missions relationship
    // First, check if relationship already exists
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('class_missions')
      .select('id')
      .eq('class_id', classId)
      .eq('mission_id', mission_id)
      .maybeSingle()

    if (checkError && !checkError.message.includes('does not exist')) {
      // If table doesn't exist, we'll use a different approach
      // Store in a JSONB column on classes table
      const { data: currentClass, error: fetchError } = await supabaseAdmin
        .from('classes')
        .select('assigned_missions')
        .eq('id', classId)
        .single()

      if (!fetchError) {
        // Try adding the mission to a JSONB array
        const missions: string[] = Array.isArray(currentClass?.assigned_missions)
          ? currentClass.assigned_missions
          : []
        if (!missions.includes(mission_id)) {
          missions.push(mission_id)

          const { error: updateError } = await supabaseAdmin
            .from('classes')
            .update({ assigned_missions: missions })
            .eq('id', classId)

          if (updateError) {
            console.error('Error updating class missions:', updateError)
            return NextResponse.json(
              { error: 'Failed to assign mission to class' },
              { status: 500 }
            )
          }
        }
      }
    } else {
      // Use class_missions table if it exists
      if (!existing) {
        const { error: insertError } = await supabaseAdmin
          .from('class_missions')
          .insert({
            class_id: classId,
            mission_id: mission_id,
            assigned_by: user.id,
            assigned_at: new Date().toISOString()
          })

        if (insertError) {
          console.error('Error inserting class mission:', insertError)
          return NextResponse.json(
            { error: 'Failed to assign mission to class' },
            { status: 500 }
          )
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Mission assigned to class successfully'
    })
  } catch (error: any) {
    console.error('Error in POST /api/educator/classes/[id]/missions:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// Get missions assigned to a class
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const classId = params.id
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

    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('role, org_id')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Try class_missions table first
    const { data: classMissions, error: classMissionsError } = await supabaseAdmin
      .from('class_missions')
      .select('mission_id')
      .eq('class_id', classId)

    let missionIds: string[] = []

    if (!classMissionsError && classMissions) {
      missionIds = classMissions.map((cm: any) => cm.mission_id)
    } else {
      // Fallback: check JSONB column
      const { data: classData } = await supabaseAdmin
        .from('classes')
        .select('assigned_missions')
        .eq('id', classId)
        .single()

      if (classData?.assigned_missions) {
        missionIds = Array.isArray(classData.assigned_missions) 
          ? classData.assigned_missions 
          : []
      }
    }

    if (missionIds.length === 0) {
      return NextResponse.json({
        success: true,
        missions: []
      })
    }

    // Fetch mission details
    const { data: missions, error: missionsError } = await supabaseAdmin
      .from('missions')
      .select('*')
      .in('id', missionIds)

    if (missionsError) {
      return NextResponse.json(
        { error: missionsError.message || 'Failed to fetch missions' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      missions: missions || []
    })
  } catch (error: any) {
    console.error('Error in GET /api/educator/classes/[id]/missions:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// Remove mission from class
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const classId = params.id
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

    const { mission_id } = await req.json()

    if (!mission_id) {
      return NextResponse.json(
        { error: 'Mission ID is required' },
        { status: 400 }
      )
    }

    // Try class_missions table first
    const { error: deleteError } = await supabaseAdmin
      .from('class_missions')
      .delete()
      .eq('class_id', classId)
      .eq('mission_id', mission_id)

    if (deleteError && deleteError.message.includes('does not exist')) {
      // Fallback: update JSONB column
      const { data: classData } = await supabaseAdmin
        .from('classes')
        .select('assigned_missions')
        .eq('id', classId)
        .single()

      if (classData?.assigned_missions) {
        const missions = Array.isArray(classData.assigned_missions)
          ? classData.assigned_missions.filter((id: string) => id !== mission_id)
          : []

        await supabaseAdmin
          .from('classes')
          .update({ assigned_missions: missions })
          .eq('id', classId)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Mission removed from class successfully'
    })
  } catch (error: any) {
    console.error('Error in DELETE /api/educator/classes/[id]/missions:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}










