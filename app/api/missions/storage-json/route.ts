import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const JSON_BUCKET = 'missions-json'

export async function GET(_req: NextRequest) {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from(JSON_BUCKET)
      .list('', { limit: 1000, sortBy: { column: 'name', order: 'asc' } })

    if (error) {
      throw error
    }

    const files = (data || [])
      .filter((item) => item?.name?.toLowerCase().endsWith('.json'))
      .map((item) => item.name)

    return NextResponse.json({ files })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Unable to list mission JSON files.' },
      { status: 500 }
    )
  }
}

