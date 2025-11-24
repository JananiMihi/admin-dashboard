import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const JSON_BUCKET = 'missions-json'

const sanitizeMissionUid = (value: string) =>
  value
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')

const normalizeStoragePath = (path: string) => {
  let sanitized = path.trim().replace(/^\/+/, '')
  if (sanitized.startsWith(`${JSON_BUCKET}/`)) {
    sanitized = sanitized.substring(JSON_BUCKET.length + 1)
  }
  return sanitized
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { missionUid: string } }
) {
  const missionUid = params.missionUid

  if (!missionUid) {
    return NextResponse.json({ error: 'Mission UID is required.' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('missions')
    .select('*')
    .eq('mission_uid', missionUid)
    .single()

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || `Mission '${missionUid}' not found.` },
      { status: 404 }
    )
  }

  let missionData = data.mission_data

  if (!missionData && data.object_path) {
    try {
      const path = normalizeStoragePath(data.object_path)
      const { data: fileData, error: fileError } = await supabaseAdmin.storage
        .from(JSON_BUCKET)
        .download(path)

      if (!fileError && fileData) {
        const text = await fileData.text()
        missionData = JSON.parse(text)
      }
    } catch (_error) {
      // ignore storage/parse errors; missionData remains null
    }
  }

  return NextResponse.json({ mission: { ...data, mission_data: missionData } })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { missionUid: string } }
) {
  const missionUidRaw = params.missionUid
  if (!missionUidRaw) {
    return NextResponse.json({ error: 'Mission UID is required.' }, { status: 400 })
  }
  const missionUid = sanitizeMissionUid(missionUidRaw)

  const payload = await req.json()

  const { data: existingMission, error: findError } = await supabaseAdmin
    .from('missions')
    .select('*')
    .eq('mission_uid', missionUid)
    .single()

  if (findError || !existingMission) {
    return NextResponse.json(
      {
        error:
          findError?.message || `Mission '${missionUid}' not found. Upload it before editing.`
      },
      { status: 404 }
    )
  }

  const updatePayload: Record<string, any> = {}
  const candidateKeys = [
    'title',
    'description',
    'order_no',
    'object_path',
    'assets_prefix',
    'xp_reward',
    'difficulty',
    'estimated_time',
    'unlocked'
  ] as const

  const directKeys = candidateKeys.filter((key) =>
    Object.prototype.hasOwnProperty.call(existingMission, key)
  )

  directKeys.forEach((key) => {
    if (payload[key] !== undefined) {
      updatePayload[key] = payload[key]
    }
  })

  let missionData = payload.mission_data ?? existingMission.mission_data
  let updateError: any = null
  let updatedRecord = existingMission

  const applyUpdate = async (data: Record<string, any>) =>
    supabaseAdmin
      .from('missions')
      .update(data)
      .eq('mission_uid', missionUid)
      .select()
      .single()

  try {
    const fullPayload =
      missionData !== undefined ? { ...updatePayload, mission_data: missionData } : updatePayload

    if (Object.keys(fullPayload).length > 0) {
      const { data, error } = await applyUpdate(fullPayload)
      updatedRecord = data || existingMission
      updateError = error
    }
  } catch (error: any) {
    updateError = error
  }

  if (
    updateError &&
    (updateError?.message?.includes('mission_data') ||
      updateError?.code === '42703' ||
      updateError?.details?.includes('mission_data'))
  ) {
    // Retry without mission_data and store JSON in storage
    try {
      if (Object.keys(updatePayload).length > 0) {
        const { data, error } = await applyUpdate(updatePayload)
        updateError = error
        updatedRecord = data || existingMission
      } else {
        updateError = null
      }

      if (missionData !== undefined) {
        const jsonContent = JSON.stringify(missionData, null, 2)
        const buffer = Buffer.from(jsonContent, 'utf-8')
        const storagePath = normalizeStoragePath(
          payload.object_path?.trim() ||
            existingMission.object_path ||
            `${missionUid}.json`
        )

        const { error: uploadError } = await supabaseAdmin.storage
          .from(JSON_BUCKET)
          .upload(storagePath, buffer, {
            cacheControl: '3600',
            upsert: true,
            contentType: 'application/json'
          })

        if (uploadError) {
          throw uploadError
        }

        await supabaseAdmin
          .from('missions')
          .update({ object_path: storagePath })
          .eq('mission_uid', missionUid)
      }
    } catch (fallbackError: any) {
      return NextResponse.json(
        { error: fallbackError?.message || 'Failed to update mission.' },
        { status: 500 }
      )
    }
  } else if (updateError) {
    return NextResponse.json(
      { error: updateError?.message || 'Failed to update mission.' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    mission: updatedRecord
  })
}

