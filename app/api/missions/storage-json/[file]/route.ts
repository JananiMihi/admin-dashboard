import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const JSON_BUCKET = 'missions-json'

const normalizeFileName = (file: string) =>
  file
    .trim()
    .replace(/^\/+/, '')

export async function GET(
  _req: NextRequest,
  { params }: { params: { file: string } }
) {
  const fileNameRaw = params.file

  if (!fileNameRaw) {
    return NextResponse.json({ error: 'File name is required.' }, { status: 400 })
  }

  const fileName = normalizeFileName(decodeURIComponent(fileNameRaw))

  try {
    const { data, error } = await supabaseAdmin.storage
      .from(JSON_BUCKET)
      .download(fileName)

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || `File '${fileName}' not found.` },
        { status: 404 }
      )
    }

    const content = await data.text()
    const json = JSON.parse(content)

    return NextResponse.json({ mission: json, file: fileName })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Unable to load mission JSON.' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { file: string } }
) {
  const fileNameRaw = params.file
  if (!fileNameRaw) {
    return NextResponse.json({ error: 'File name is required.' }, { status: 400 })
  }

  const fileName = normalizeFileName(decodeURIComponent(fileNameRaw))

  try {
    const body = await request.json()

    const missionData =
      body?.mission_data !== undefined ? body.mission_data : body

    const content =
      typeof missionData === 'string'
        ? missionData
        : JSON.stringify(missionData, null, 2)

    const { error: uploadError } = await supabaseAdmin.storage
      .from(JSON_BUCKET)
      .upload(fileName, Buffer.from(content, 'utf-8'), {
        cacheControl: '3600',
        upsert: true,
        contentType: 'application/json'
      })

    if (uploadError) {
      throw uploadError
    }

    return NextResponse.json({
      success: true,
      message: `Mission JSON '${fileName}' updated successfully.`,
      mission: missionData
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to update mission JSON.' },
      { status: 500 }
    )
  }
}

