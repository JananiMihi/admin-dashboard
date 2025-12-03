import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// API endpoint to create dummy organizations for testing
export async function POST(req: NextRequest) {
  try {
    // Create 2-3 dummy organizations
    const dummyOrgs = [
      { name: 'Neo Academy' },
      { name: 'Tech Learning Institute' },
      { name: 'Future Skills School' }
    ]

    // Check existing organizations
    const { data: existingOrgs } = await supabaseAdmin
      .from('organizations')
      .select('name')

    const existingNames = existingOrgs?.map(org => org.name.toLowerCase()) || []

    // Only insert organizations that don't exist
    const orgsToInsert = dummyOrgs.filter(
      org => !existingNames.includes(org.name.toLowerCase())
    )

    if (orgsToInsert.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Dummy organizations already exist',
        organizations: existingOrgs
      })
    }

    // Insert new organizations
    const { data: newOrgs, error } = await supabaseAdmin
      .from('organizations')
      .insert(orgsToInsert)
      .select()

    if (error) throw error

    // Get all organizations
    const { data: allOrgs } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .order('name', { ascending: true })

    return NextResponse.json({
      success: true,
      message: `Created ${orgsToInsert.length} dummy organization(s)`,
      created: newOrgs,
      all: allOrgs
    })
  } catch (error: any) {
    console.error('Error creating dummy organizations:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create dummy organizations' },
      { status: 500 }
    )
  }
}

// GET endpoint to check organizations
export async function GET() {
  try {
    const { data: orgs, error } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .order('name', { ascending: true })

    if (error) throw error

    return NextResponse.json({
      success: true,
      organizations: orgs || [],
      count: orgs?.length || 0
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}


























