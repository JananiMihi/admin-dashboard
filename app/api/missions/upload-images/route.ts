import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const BUCKET_NAME = 'missions-assets'

const sanitizeFileName = (name: string) =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '') || `image-${Date.now()}`

const sanitizeAssetPath = (path: string) =>
  path
    .toLowerCase()
    .trim()
    .replace(/^assets\//, '')
    .replace(/[^a-z0-9/._-]+/g, '-')
    .replace(/^-+|-+$/g, '')

const sanitizeMissionUid = (value: string) =>
  value
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toUpperCase()

const missionFolderFromUid = (missionUid?: string | null) => {
  if (!missionUid) {
    return ''
  }
  const sanitized = sanitizeMissionUid(missionUid || '')
  if (!sanitized) {
    return ''
  }
  return sanitized.startsWith('M') ? sanitized : `M${sanitized}`
}

const sanitizeCustomFolder = (folder: string) =>
  folder
    .trim()
    .replace(/^[./]+/, '')
    .replace(/[^a-zA-Z0-9/_-]+/g, '-')
    .replace(/\/+/g, '/')
    .replace(/^-+|-+$/g, '')

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll('images') as File[]
    const providedPaths = formData.getAll('paths[]').map((value) => value?.toString() ?? '')

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No images provided. Attach images[] in the request.' },
        { status: 400 }
      )
    }

    const missionUid = (formData.get('mission_uid') || '').toString().trim()
    const missionFolder = missionFolderFromUid(missionUid)
    const customFolder = sanitizeCustomFolder(
      (formData.get('image_folder') || '').toString()
    )

    const ensureBucket = async () => {
      const { data: buckets, error } = await supabaseAdmin.storage.listBuckets()
      if (error) {
        throw new Error(`Unable to list storage buckets: ${error.message}`)
      }

      const exists = buckets?.some((bucket) => bucket.name === BUCKET_NAME)
      if (!exists) {
        const { error: createError } = await supabaseAdmin.storage.createBucket(BUCKET_NAME, {
          public: true,
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
          fileSizeLimit: 5242880 // 5MB
        })

        if (createError && !createError.message.includes('already exists')) {
          throw new Error(`Unable to create storage bucket: ${createError.message}`)
        }
      }
    }

    await ensureBucket()

    const uploadedMap: Record<string, string> = {}

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index]
      if (!file || file.size === 0) {
        continue
      }

      const originalPath = providedPaths[index] || file.name
      const sanitizedPath = sanitizeAssetPath(originalPath)
      const safeName = sanitizeFileName(file.name)

      const resolvedFileName = sanitizedPath.split('/').pop() || safeName
      const baseFolder =
        customFolder ||
        missionFolder ||
        `generator/${Date.now().toString(36)}-${index.toString(36)}`
      const storagePath = `${baseFolder}/images/${resolvedFileName}`

      const { error: uploadError } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type || 'application/octet-stream'
        })

      if (uploadError) {
        throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`)
      }

      const { data: publicUrlData, error: publicUrlError } = supabaseAdmin.storage
        .from(BUCKET_NAME)
        .getPublicUrl(storagePath)

      if (publicUrlError || !publicUrlData?.publicUrl) {
        throw new Error(`Failed to retrieve public URL for ${file.name}`)
      }

      uploadedMap[originalPath] = publicUrlData.publicUrl
    }

    return NextResponse.json({
      success: true,
      uploadedImages: uploadedMap,
      message: `Uploaded ${Object.keys(uploadedMap).length} image${
        Object.keys(uploadedMap).length === 1 ? '' : 's'
      } to storage.`
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error?.message || 'Failed to upload images to storage.'
      },
      { status: 500 }
    )
  }
}

