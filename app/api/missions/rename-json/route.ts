import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    // Fetch all missions from database
    const { data: missions, error: fetchError } = await supabaseAdmin
      .from('missions')
      .select('mission_uid, order_no, title, object_path')
      .order('order_no', { ascending: true })

    if (fetchError) {
      return NextResponse.json(
        { error: `Failed to fetch missions: ${fetchError.message}` },
        { status: 500 }
      )
    }

    if (!missions || missions.length === 0) {
      return NextResponse.json(
        { error: 'No missions found in database' },
        { status: 404 }
      )
    }

    const jsonBucketName = 'missions-json'
    const renamedFiles: string[] = []
    const errors: string[] = []

    // Check if bucket exists
    const { data: buckets } = await supabaseAdmin.storage.listBuckets()
    const bucketExists = buckets?.some(b => b.name === jsonBucketName)

    if (!bucketExists) {
      return NextResponse.json(
        { error: `Storage bucket '${jsonBucketName}' not found` },
        { status: 404 }
      )
    }

    // We won't rely on a flat listing because some files may be in subfolders (e.g. "missions/")

    // Process each mission
    for (const mission of missions) {
      if (!mission.mission_uid) {
        errors.push(`Mission ${mission.order_no} (${mission.title}) has no mission_uid`)
        continue
      }

      // Determine candidate old paths to support both root and foldered layouts
      const providedPath = mission.object_path as string | null
      const candidates: string[] = []
      if (providedPath) {
        candidates.push(providedPath)
      }
      // Common historical patterns
      candidates.push(`${mission.order_no}.json`)
      candidates.push(`missions/${mission.order_no}.json`)
      // In case someone already named it by mission_uid but different folder
      candidates.push(`${mission.mission_uid}.json`)
      candidates.push(`missions/${mission.mission_uid}.json`)

      // Pick first candidate that actually exists by attempting download
      let foundOldPath: string | null = null
      let fileDataBlob: Blob | null = null

      for (const candidate of candidates) {
        try {
          const { data, error } = await supabaseAdmin.storage
            .from(jsonBucketName)
            .download(candidate)

          if (!error && data) {
            foundOldPath = candidate
            fileDataBlob = data
            break
          }
        } catch (_e) {
          // try next candidate
        }
      }

      if (!foundOldPath || !fileDataBlob) {
        errors.push(`Could not locate JSON for mission ${mission.order_no} (${mission.mission_uid})`)
        continue
      }

      // Decide target folder: preserve folder if provided path had one; else, if found path is under 'missions/', keep that; otherwise root
      const pathHasDir = (p: string) => p.includes('/')
      const dirFromPath = (p: string) => p.substring(0, p.lastIndexOf('/') + 1)

      const targetDir = providedPath && pathHasDir(providedPath)
        ? dirFromPath(providedPath)
        : (foundOldPath.startsWith('missions/') ? 'missions/' : '')

      const newPath = `${targetDir}${mission.mission_uid}.json`

      // If already in correct place with correct name, skip
      if (foundOldPath === newPath) {
        continue
      }

      try {
        // Upload with new name (idempotent)
        const { error: uploadError } = await supabaseAdmin.storage
          .from(jsonBucketName)
          .upload(newPath, fileDataBlob, {
            cacheControl: '3600',
            upsert: true
          })

        if (uploadError) {
          errors.push(`Failed to upload ${newPath}: ${uploadError.message}`)
          continue
        }

        // Delete old path if different
        if (foundOldPath !== newPath) {
          const { error: deleteError } = await supabaseAdmin.storage
            .from(jsonBucketName)
            .remove([foundOldPath])

          if (deleteError) {
            console.warn(`Failed to delete old file ${foundOldPath}: ${deleteError.message}`)
          }
        }

        // Update DB object_path to the normalized path
        const { error: updateError } = await supabaseAdmin
          .from('missions')
          .update({ object_path: newPath })
          .eq('mission_uid', mission.mission_uid)

        if (updateError) {
          console.warn(`Failed to update object_path for ${mission.mission_uid}: ${updateError.message}`)
        }

        renamedFiles.push(`${foundOldPath} → ${newPath}`)
      } catch (error: any) {
        errors.push(`Error processing ${foundOldPath}: ${error.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Renamed ${renamedFiles.length} files`,
      renamedFiles,
      errors: errors.length > 0 ? errors : undefined,
      totalMissions: missions.length,
      renamedCount: renamedFiles.length,
      errorCount: errors.length
    })
  } catch (error: any) {
    console.error('Rename error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to rename JSON files' },
      { status: 500 }
    )
  }
}


