import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json()

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Organization name is required' },
        { status: 400 }
      )
    }

    // Check if organization with same name already exists
    const { data: existing } = await supabaseAdmin
      .from('organizations')
      .select('id, name')
      .ilike('name', name.trim())
      .maybeSingle()

    if (existing) {
      return NextResponse.json({
        success: true,
        organization: existing,
        message: 'Organization already exists',
        alreadyExists: true
      })
    }

    // Create new organization
    const { data: newOrg, error } = await supabaseAdmin
      .from('organizations')
      .insert({ name: name.trim() })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      organization: newOrg,
      message: 'Organization created successfully'
    })
  } catch (error: any) {
    console.error('Error creating organization:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create organization' },
      { status: 500 }
    )
  }
}



















