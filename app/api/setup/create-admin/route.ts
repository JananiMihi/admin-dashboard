import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// API endpoint to create SuperAdmin user
// Call this once to set up the admin user
// Or use the hardcoded login which auto-creates it

export async function POST(req: NextRequest) {
  try {
    const HARDCODED_EMAIL = 'admin@neo'
    const HARDCODED_PASSWORD = 'Admin@1234'

    // Check if user already exists
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = users?.find(u => u.email === HARDCODED_EMAIL)

    let userId: string

    if (existingUser) {
      userId = existingUser.id
      // Update password
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: HARDCODED_PASSWORD
      })
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: HARDCODED_EMAIL,
        password: HARDCODED_PASSWORD,
        email_confirm: true,
        user_metadata: {
          name: 'Super Admin',
          role: 'SuperAdmin'
        }
      })

      if (createError) throw createError
      userId = newUser.user.id
    }

    // Create default organization if doesn't exist
    const { data: orgs } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .limit(1)

    let orgId: string

    if (orgs && orgs.length > 0) {
      orgId = orgs[0].id
    } else {
      const { data: newOrg, error: orgError } = await supabaseAdmin
        .from('organizations')
        .insert({ name: 'Default Organization' })
        .select()
        .single()

      if (orgError) throw orgError
      orgId = newOrg.id
    }

    // Create or update user profile
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .upsert({
        user_id: userId,
        email: HARDCODED_EMAIL,
        full_name: 'Super Admin',
        role: 'SuperAdmin',
        org_id: orgId,
        onboarding_state: 'active'
      }, {
        onConflict: 'user_id'
      })

    if (profileError) {
      console.error('Profile error:', profileError)
      // Continue - might be a constraint issue
    }

    return NextResponse.json({
      success: true,
      message: 'SuperAdmin user created/updated successfully',
      email: HARDCODED_EMAIL,
      userId
    })
  } catch (error: any) {
    console.error('Error creating admin:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create admin user' },
      { status: 500 }
    )
  }
}

// GET endpoint to check if admin exists
export async function GET() {
  try {
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
    const adminUser = users?.find(u => u.email === 'admin@neo')

    if (!adminUser) {
      return NextResponse.json({
        exists: false,
        message: 'Admin user does not exist. Call POST to create it.'
      })
    }

    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('role, org_id')
      .eq('user_id', adminUser.id)
      .single()

    return NextResponse.json({
      exists: true,
      userId: adminUser.id,
      role: profile?.role || null,
      hasProfile: !!profile
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}





















