import { supabaseAdmin } from '@/lib/supabase'

const ASSETS_BUCKET = 'missions-assets'

/**
 * Resolves relative image paths in mission_data to full public URLs
 * using assets_bucket and assets_prefix from the mission record
 */
export function resolveImagePaths(
  missionData: any,
  assetsBucket: string | null | undefined,
  assetsPrefix: string | null | undefined
): any {
  if (!missionData || typeof missionData !== 'object') {
    return missionData
  }

  // Helper to check if a path is already a full URL
  const isFullUrl = (path: string | null | undefined): boolean => {
    if (!path || typeof path !== 'string') return false
    return path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:') || path.startsWith('blob:')
  }

  // Helper to resolve a relative path to a full URL
  const resolvePath = (path: string | null | undefined): string | null | undefined => {
    if (!path || typeof path !== 'string') return path
    if (isFullUrl(path)) return path

    // If no bucket or prefix, return as-is
    const bucket = assetsBucket || ASSETS_BUCKET
    if (!bucket) return path

    // Construct storage path
    let storagePath = path
    if (assetsPrefix) {
      // Remove leading/trailing slashes from prefix
      const cleanPrefix = assetsPrefix.replace(/^\/+/, '').replace(/\/+$/, '')
      // Remove leading slash from path
      const cleanPath = path.replace(/^\/+/, '')
      
      // Check if path already includes the prefix
      if (cleanPath.startsWith(cleanPrefix)) {
        storagePath = cleanPath
      } else {
        // Check if path looks like it's in an images/ subfolder
        // If path is just a filename (no slashes), put it in images/ subfolder
        if (!cleanPath.includes('/')) {
          storagePath = `${cleanPrefix}/images/${cleanPath}`
        } else if (cleanPath.startsWith('images/') || cleanPath.startsWith('assets/')) {
          // Path already has images/ or assets/ prefix, just add the mission prefix
          storagePath = `${cleanPrefix}/${cleanPath}`
        } else {
          // Path has some other structure, prepend prefix
          storagePath = `${cleanPrefix}/${cleanPath}`
        }
      }
    }

    // Get public URL from Supabase storage
    const { data: urlData } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(storagePath)

    return urlData?.publicUrl || path
  }

  // Clone the data to avoid mutating the original
  const resolved = JSON.parse(JSON.stringify(missionData))

  // Resolve missionPageImage
  if (resolved.missionPageImage) {
    resolved.missionPageImage = resolvePath(resolved.missionPageImage)
  }

  // Resolve intro.image
  if (resolved.intro?.image) {
    resolved.intro.image = resolvePath(resolved.intro.image)
  }

  // Resolve step images
  if (Array.isArray(resolved.steps)) {
    resolved.steps = resolved.steps.map((step: any) => {
      const resolvedStep = { ...step }
      if (resolvedStep.image) {
        resolvedStep.image = resolvePath(resolvedStep.image)
      }
      // Resolve block images
      if (Array.isArray(resolvedStep.blocks)) {
        resolvedStep.blocks = resolvedStep.blocks.map((block: any) => {
          if (block.image) {
            return { ...block, image: resolvePath(block.image) }
          }
          return block
        })
      }
      return resolvedStep
    })
  }

  // Resolve resource paths
  if (Array.isArray(resolved.resources)) {
    resolved.resources = resolved.resources.map((resource: any) => {
      if (resource.path) {
        return { ...resource, path: resolvePath(resource.path) }
      }
      return resource
    })
  }

  return resolved
}

