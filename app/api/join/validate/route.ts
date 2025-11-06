import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const code = searchParams.get('code')

    if (!code) {
      return NextResponse.json(
        { error: 'Join code is required' },
        { status: 400 }
      )
    }

    // Use service role to bypass RLS
    const { data: codeData, error: codeError } = await supabaseAdmin
      .from('join_codes')
      .select(`
        *,
        classes(id, name, subject, grade, section)
      `)
      .eq('code', code)
      .single()

    if (codeError || !codeData) {
      return NextResponse.json(
        { error: 'Invalid join code' },
        { status: 404 }
      )
    }

    // Check if code is valid
    if (codeData.revoked) {
      return NextResponse.json(
        { error: 'This join code has been revoked' },
        { status: 400 }
      )
    }

    if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'This join code has expired' },
        { status: 400 }
      )
    }

    if (codeData.max_uses > 0 && codeData.used_count >= codeData.max_uses) {
      return NextResponse.json(
        { error: 'This join code has reached its usage limit' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      valid: true,
      code: codeData,
      class: codeData.classes
    })
  } catch (error: any) {
    console.error('Error validating join code:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

