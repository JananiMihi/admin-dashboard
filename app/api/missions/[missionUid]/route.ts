import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { resolveImagePaths } from '@/lib/utils/mission-image-resolver'

const JSON_BUCKET = 'missions-json'
const ASSETS_BUCKET = 'missions-assets'

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

  // Resolve relative image paths to full URLs
  if (missionData) {
    missionData = resolveImagePaths(
      missionData,
      data.assets_bucket,
      data.assets_prefix
    )
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

  // Check if request is FormData (for image uploads) or JSON
  const contentType = req.headers.get('content-type') || ''
  let payload: any
  let imageFiles: File[] = []
  let providedImageFolder: string | null = null

  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData()
    // Parse JSON from formData if present
    const jsonData = formData.get('mission_data')
    if (jsonData) {
      try {
        payload = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData
      } catch {
        payload = {}
      }
    } else {
      payload = {}
    }

    // Get other fields from formData
    const title = formData.get('title')
    const description = formData.get('description')
    const orderNo = formData.get('order_no')
    const assetsPrefix = formData.get('assets_prefix')
    const imageFolder = formData.get('image_folder')

    if (title) payload.title = title.toString()
    if (description) payload.description = description.toString()
    if (orderNo) payload.order_no = orderNo.toString()
    if (assetsPrefix) payload.assets_prefix = assetsPrefix.toString()
    if (imageFolder) providedImageFolder = imageFolder.toString()

    // Get image files
    const images = formData.getAll('images')
    imageFiles = images.filter((img): img is File => img instanceof File && img.size > 0)
  } else {
    payload = await req.json()
  }

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

  // Handle image uploads if provided
  if (imageFiles.length > 0) {
    const assetsBucket = existingMission.assets_bucket || ASSETS_BUCKET
    const assetsPrefix = updatePayload.assets_prefix || existingMission.assets_prefix || ''
    
    // Determine folder for images
    const folderBase = providedImageFolder || assetsPrefix || `M${String(existingMission.order_no || '').padStart(2, '0')}`

    // Ensure bucket exists
    const { data: buckets } = await supabaseAdmin.storage.listBuckets()
    const bucketExists = buckets?.some(b => b.name === assetsBucket)
    
    if (!bucketExists) {
      await supabaseAdmin.storage.createBucket(assetsBucket, {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        fileSizeLimit: 5242880 // 5MB
      })
    }

    // Upload images and update mission_data references
    const imagePaths: Record<string, string> = {}
    for (const imageFile of imageFiles) {
      if (imageFile && imageFile.size > 0) {
        const originalName = imageFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const filePath = `${folderBase}/images/${originalName}`

        const { error: uploadError } = await supabaseAdmin.storage
          .from(assetsBucket)
          .upload(filePath, imageFile, {
            cacheControl: '3600',
            upsert: true, // Allow overwriting existing images
            contentType: imageFile.type || 'application/octet-stream'
          })

        if (uploadError) {
          console.error(`Error uploading image ${imageFile.name}:`, uploadError)
          continue
        }

        // Get public URL
        const { data: urlData } = supabaseAdmin.storage
          .from(assetsBucket)
          .getPublicUrl(filePath)

        if (urlData?.publicUrl) {
          imagePaths[imageFile.name] = urlData.publicUrl
          // Replace image references in mission data
          const imageName = imageFile.name
          const imageUrl = urlData.publicUrl
          const jsonString = JSON.stringify(missionData || {})
          const updatedJsonString = jsonString.replace(
            new RegExp(imageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
            imageUrl
          )
          try {
            missionData = JSON.parse(updatedJsonString)
          } catch (parseError) {
            console.error('Error parsing updated mission data:', parseError)
          }
        }
      }
    }
  }

  let updateError: any = null
  let updatedRecord = existingMission

  const applyUpdate = async (data: Record<string, any>) =>
    supabaseAdmin
      .from('missions')
      .update(data)
      .eq('mission_uid', missionUid)
      .select()
      .single()

  // Determine JSON file path
  const jsonFileName = existingMission.order_no 
    ? `${existingMission.order_no}.json` 
    : `${missionUid}.json`
  const storagePath = normalizeStoragePath(
    payload.object_path?.trim() ||
      existingMission.object_path ||
      jsonFileName
  )

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

  // Always update JSON file in storage if mission_data changed
  if (missionData !== undefined && missionData !== null) {
    try {
      const jsonContent = JSON.stringify(missionData, null, 2)
      const buffer = Buffer.from(jsonContent, 'utf-8')

      // Ensure JSON bucket exists
      const { data: buckets } = await supabaseAdmin.storage.listBuckets()
      const jsonBucketExists = buckets?.some(b => b.name === JSON_BUCKET)
      
      if (!jsonBucketExists) {
        await supabaseAdmin.storage.createBucket(JSON_BUCKET, {
          public: true,
          allowedMimeTypes: ['application/json'],
          fileSizeLimit: 10485760 // 10MB
        })
      }

      const { error: uploadError } = await supabaseAdmin.storage
        .from(JSON_BUCKET)
        .upload(storagePath, buffer, {
          cacheControl: '3600',
          upsert: true, // Always update existing file
          contentType: 'application/json'
        })

      if (uploadError) {
        console.error('Error uploading JSON to storage:', uploadError)
        // Don't fail the request, but log the error
      } else {
        // Update object_path if it changed
        if (storagePath !== existingMission.object_path) {
          await supabaseAdmin
            .from('missions')
            .update({ object_path: storagePath })
            .eq('mission_uid', missionUid)
        }
      }
    } catch (storageError: any) {
      console.error('Error updating JSON file in storage:', storageError)
      // Don't fail the request, but log the error
    }
  }

  // Handle database update errors
  if (
    updateError &&
    (updateError?.message?.includes('mission_data') ||
      updateError?.code === '42703' ||
      updateError?.details?.includes('mission_data'))
  ) {
    // Retry without mission_data (JSON is already in storage)
    try {
      if (Object.keys(updatePayload).length > 0) {
        const { data, error } = await applyUpdate(updatePayload)
        updateError = error
        updatedRecord = data || existingMission
      } else {
        updateError = null
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
    mission: updatedRecord,
    message: 'Mission updated successfully. Images and JSON file updated in storage.'
  })
}

