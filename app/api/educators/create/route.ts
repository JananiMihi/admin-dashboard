import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { email, name, orgId } = await req.json()

    // Validate required fields
    if (!email || !name || !orgId) {
      return NextResponse.json(
        { error: 'Email, name, and organization are required' },
        { status: 400 }
      )
    }

    // Check if email already exists in auth.users
    const { data: { users: authUsers } } = await supabaseAdmin.auth.admin.listUsers()
    const existingAuthUser = authUsers?.find(u => u.email === email)

    // Check if email exists in user_profiles
    const { data: existingProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('user_id, role')
      .eq('email', email)
      .maybeSingle()

    if (existingAuthUser) {
      // User exists in auth - update them to Educator
      // Check if already educator
      if (existingProfile && existingProfile.role === 'Educator') {
        // Already an educator - just generate a new magic link
        const { data: magicLinkData } = await supabaseAdmin.auth.admin.generateLink({
          type: 'invite',
          email: email,
          options: {
            redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback?type=password-setup`
          }
        })

        return NextResponse.json({
          success: true,
          userId: existingAuthUser.id,
          message: 'Educator already exists. New magic link generated.',
          magicLink: magicLinkData?.properties?.action_link || null,
          email: email,
          existingUser: true,
          alreadyEducator: true
        })
      }

      // User exists but not educator yet - update to Educator
      // Update user metadata
      await supabaseAdmin.auth.admin.updateUserById(existingAuthUser.id, {
        user_metadata: {
          name,
          role: 'Educator'
        }
      })

      // Create or update profile
      const { error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .upsert({
          user_id: existingAuthUser.id,
          email: email,
          full_name: name,
          role: 'Educator',
          org_id: orgId,
          onboarding_state: 'pending'
        }, {
          onConflict: 'user_id'
        })

      if (profileError) {
        return NextResponse.json(
          { error: `Failed to update user profile: ${profileError.message}` },
          { status: 500 }
        )
      }

      // Generate magic link for existing user
      const { data: magicLinkData, error: magicLinkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'invite',
        email: email,
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback?type=password-setup`
        }
      })

      if (magicLinkError) {
        console.error('Magic link error:', magicLinkError)
      }

      return NextResponse.json({
        success: true,
        userId: existingAuthUser.id,
        message: existingProfile 
          ? `User updated from ${existingProfile.role} to Educator. Magic link generated.`
          : 'Existing user updated to Educator role. Magic link generated.',
        magicLink: magicLinkData?.properties?.action_link || null,
        email: email,
        existingUser: true
      })
    }

    // Create auth user with magic link (no password set)
    let authData
    let authError
    
    try {
      const result = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: false, // Will be confirmed via magic link
        user_metadata: {
          name,
          role: 'Educator'
        }
      })
      authData = result.data
      authError = result.error
    } catch (err: any) {
      authError = err
    }

    if (authError) {
      console.error('Auth error:', authError)
      
      // Handle specific error: email already exists
      if (authError.message?.includes('already been registered') || authError.code === 'email_exists') {
        // Try to find existing user and update them
        const { data: { users: allUsers } } = await supabaseAdmin.auth.admin.listUsers()
        const existingUser = allUsers?.find(u => u.email === email)
        
        if (existingUser) {
          // Update existing user's metadata
          await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
            user_metadata: {
              name,
              role: 'Educator'
            }
          })

          // Create or update profile
          await supabaseAdmin
            .from('user_profiles')
            .upsert({
              user_id: existingUser.id,
              email: email,
              full_name: name,
              role: 'Educator',
              org_id: orgId,
              onboarding_state: 'pending'
            }, {
              onConflict: 'user_id'
            })

          // Generate magic link
          const { data: magicLinkData } = await supabaseAdmin.auth.admin.generateLink({
            type: 'invite',
            email: email,
            options: {
              redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback?type=password-setup`
            }
          })

          return NextResponse.json({
            success: true,
            userId: existingUser.id,
            message: 'Existing user updated to Educator. Magic link generated.',
            magicLink: magicLinkData?.properties?.action_link || null,
            email: email,
            existingUser: true
          })
        }

        return NextResponse.json(
          { error: 'A user with this email already exists. Please use a different email or update the existing user.' },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { error: authError.message || 'Failed to create user' },
        { status: 500 }
      )
    }

    // Create user profile
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        user_id: authData.user.id,
        email: email,
        full_name: name,
        role: 'Educator',
        org_id: orgId,
        onboarding_state: 'pending'
      })

    if (profileError) {
      // Rollback: delete auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: profileError.message },
        { status: 500 }
      )
    }

    // Generate magic link for password setup
    const { data: magicLinkData, error: magicLinkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email: email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback?type=password-setup`
      }
    })

    if (magicLinkError) {
      console.error('Magic link error:', magicLinkError)
      // User is created, but magic link generation failed
      // Return success but note the issue
      return NextResponse.json({
        success: true,
        userId: authData.user.id,
        message: 'Educator created successfully, but magic link generation failed. Please resend invite.',
        magicLink: null,
        error: magicLinkError.message
      })
    }

    // Send magic link email via Supabase (if configured)
    // Note: You may need to configure Supabase email templates
    // For now, we return the magic link so SuperAdmin can send it manually

    return NextResponse.json({
      success: true,
      userId: authData.user.id,
      message: 'Educator created successfully. Magic link generated.',
      magicLink: magicLinkData.properties.action_link,
      // Include this in response so SuperAdmin can copy/send it
      email: email
    })
  } catch (error: any) {
    console.error('Error creating educator:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create educator' },
      { status: 500 }
    )
  }
}

