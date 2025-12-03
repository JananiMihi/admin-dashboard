import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Debug endpoint to check current user role
export async function GET(req: NextRequest) {
  try {
    // Get auth header or use admin client
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
    
    // Find admin@neo user
    const adminUser = users?.find(u => u.email === 'admin@neo')
    
    if (!adminUser) {
      return NextResponse.json({
        error: 'Admin user not found',
        suggestion: 'Login first with admin@neo / Admin@1234'
      })
    }

    // Get profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('user_id', adminUser.id)
      .single()

    return NextResponse.json({
      authUser: {
        id: adminUser.id,
        email: adminUser.email,
        confirmed: adminUser.email_confirmed_at ? true : false
      },
      profile: profile || null,
      profileError: profileError?.message || null,
      hasProfile: !!profile,
      role: profile?.role || null,
      needsFix: !profile || profile.role !== 'SuperAdmin'
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// POST endpoint to fix admin role
export async function POST(req: NextRequest) {
  try {
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
    const adminUser = users?.find(u => u.email === 'admin@neo')
    
    if (!adminUser) {
      return NextResponse.json({
        error: 'Admin user not found'
      }, { status: 404 })
    }

    // Get or create organization
    let orgId: string
    const { data: orgs } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .limit(1)

    if (orgs && orgs.length > 0) {
      orgId = orgs[0].id
    } else {
      const { data: newOrg } = await supabaseAdmin
        .from('organizations')
        .insert({ name: 'Default Organization' })
        .select()
        .single()
      orgId = newOrg.id
    }

    // Create or update profile
    const { data: profile, error } = await supabaseAdmin
      .from('user_profiles')
      .upsert({
        user_id: adminUser.id,
        email: 'admin@neo',
        full_name: 'Super Admin',
        role: 'SuperAdmin',
        org_id: orgId,
        onboarding_state: 'active'
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: 'Admin profile updated successfully',
      profile
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}


























