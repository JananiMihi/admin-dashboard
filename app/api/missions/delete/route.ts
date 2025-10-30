import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const missionId = body.id as string | number | undefined
    const missionUid = body.mission_uid as string | undefined

    if (!missionId && !missionUid) {
      return NextResponse.json(
        { error: 'Provide id or mission_uid to delete' },
        { status: 400 }
      )
    }

    // Fetch mission
    let mission: any = null
    if (missionId) {
      const { data, error } = await supabaseAdmin
        .from('missions')
        .select('*')
        .eq('id', missionId)
        .single()
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }
      mission = data
    } else if (missionUid) {
      const { data, error } = await supabaseAdmin
        .from('missions')
        .select('*')
        .eq('mission_uid', missionUid)
        .single()
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }
      mission = data
    }

    // Attempt to remove JSON from storage if present
    const jsonBucketName = 'missions-json'
    const objectPath = mission?.object_path as string | undefined
    if (objectPath) {
      try {
        await supabaseAdmin.storage.from(jsonBucketName).remove([objectPath])
      } catch (_e) {
        // non-fatal
      }
    }

    // Delete DB row using available unique key
    let delError: any = null
    if (mission?.id !== undefined && mission?.id !== null) {
      const res = await supabaseAdmin
        .from('missions')
        .delete()
        .eq('id', mission.id)
      delError = res.error
    } else if (mission?.mission_uid) {
      const res = await supabaseAdmin
        .from('missions')
        .delete()
        .eq('mission_uid', mission.mission_uid)
      delError = res.error
    } else {
      return NextResponse.json({ error: 'Mission record missing identifiable key' }, { status: 400 })
    }

    if (delError) {
      return NextResponse.json({ error: delError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete mission' },
      { status: 500 }
    )
  }
}


