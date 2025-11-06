import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, subject, grade, section, timezone } = body

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

    // Verify user is an educator
    if (profile.role !== 'Educator' && profile.role !== 'SuperAdmin') {
      return NextResponse.json(
        { error: 'Only educators can create classes' },
        { status: 403 }
      )
    }

    if (!profile.org_id) {
      return NextResponse.json(
        { error: 'No organization assigned' },
        { status: 400 }
      )
    }

    // Create class using service role (bypasses RLS)
    const { data: classData, error: classError } = await supabaseAdmin
      .from('classes')
      .insert({
        org_id: profile.org_id,
        name,
        subject: subject || null,
        grade: grade || null,
        section: section || null,
        timezone: timezone || 'UTC',
        created_by: user.id
      })
      .select()
      .single()

    if (classError) {
      console.error('Error creating class:', classError)
      return NextResponse.json(
        { error: classError.message || 'Failed to create class' },
        { status: 500 }
      )
    }

    // Generate join code
    const { data: codeData, error: codeError } = await supabaseAdmin.rpc('generate_class_code')

    if (codeError) {
      console.error('Error generating code:', codeError)
      // Continue even if code generation fails - class is created
    }

    // Create join code if code was generated
    let joinCodeData = null
    if (codeData) {
      const { data: joinCode, error: joinCodeError } = await supabaseAdmin
        .from('join_codes')
        .insert({
          org_id: profile.org_id,
          type: 'class',
          class_id: classData.id,
          code: codeData,
          max_uses: 0, // Unlimited
          label: `Join code for ${name}`,
          created_by: user.id
        })
        .select()
        .single()

      if (joinCodeError) {
        console.error('Error creating join code:', joinCodeError)
        // Continue even if join code creation fails
      } else {
        joinCodeData = joinCode
      }
    }

    return NextResponse.json({
      success: true,
      class: classData,
      joinCode: joinCodeData,
      code: codeData || null
    })
  } catch (error: any) {
    console.error('Error in POST /api/educator/classes:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

