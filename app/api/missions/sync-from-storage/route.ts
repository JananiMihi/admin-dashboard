import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const JSON_BUCKET = 'missions-json'

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `mission-${Date.now()}`

const uniqueValue = (base: string, exists: (candidate: string) => boolean) => {
  if (!exists(base)) return base
  let counter = 1
  let candidate = `${base}-${counter}`
  while (exists(candidate)) {
    counter += 1
    candidate = `${base}-${counter}`
  }
  return candidate
}

const parseNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const listJsonFiles = async (prefix = ''): Promise<string[]> => {
  const paths: string[] = []
  const { data, error } = await supabaseAdmin.storage
    .from(JSON_BUCKET)
    .list(prefix, { limit: 1000 })

  if (error) {
    throw new Error(error.message)
  }

  for (const item of data || []) {
    if (!item) continue
    const isFolder = !item.id && !item.updated_at && !item.metadata?.size
    const currentPath = prefix ? `${prefix}/${item.name}` : item.name

    if (isFolder) {
      const nested = await listJsonFiles(currentPath)
      paths.push(...nested)
      continue
    }

    if (item.name.toLowerCase().endsWith('.json')) {
      paths.push(currentPath)
    }
  }

  return paths
}

export async function POST() {
  try {
    const { data: buckets, error: listBucketsError } = await supabaseAdmin.storage.listBuckets()
    if (listBucketsError) {
      throw new Error(`Unable to list storage buckets: ${listBucketsError.message}`)
    }
    const bucketExists = buckets?.some((bucket) => bucket.name === JSON_BUCKET)
    if (!bucketExists) {
      return NextResponse.json(
        {
          success: false,
          message: `Storage bucket '${JSON_BUCKET}' not found.`,
          summary: { filesScanned: 0, inserted: 0, updated: 0, skipped: 0, errors: [] }
        },
        { status: 404 }
      )
    }

    const jsonFiles = await listJsonFiles()

    if (jsonFiles.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No mission JSON files found in storage bucket.',
        summary: { filesScanned: 0, inserted: 0, updated: 0, skipped: 0, errors: [] }
      })
    }

    const { data: existingMissions, error: fetchMissionsError } = await supabaseAdmin
      .from('missions')
      .select('mission_uid, order_no, object_path, title, assets_bucket, assets_prefix, unlock_playground, unlocks_projects')

    if (fetchMissionsError) {
      throw new Error(`Unable to read missions table: ${fetchMissionsError.message}`)
    }

    const byMissionUid = new Map<string, any>()
    const byOrder = new Map<number, any>()
    const byPath = new Map<string, any>()
    const usedOrders = new Set<number>()

    for (const mission of existingMissions || []) {
      if (mission.mission_uid) {
        byMissionUid.set(mission.mission_uid, mission)
      }
      if (mission.order_no !== null && mission.order_no !== undefined) {
        const orderValue = Number(mission.order_no)
        if (Number.isFinite(orderValue)) {
          byOrder.set(orderValue, mission)
          usedOrders.add(orderValue)
        }
      }
      if (mission.object_path) {
        byPath.set(mission.object_path, mission)
      }
    }

    let inserted = 0
    let updated = 0
    let skipped = 0
    const errors: Array<{ path: string; reason: string }> = []

    const ensureNextOrder = () => {
      let candidate = usedOrders.size ? Math.max(...Array.from(usedOrders)) + 1 : 1
      while (usedOrders.has(candidate)) {
        candidate += 1
      }
      usedOrders.add(candidate)
      return candidate
    }

    for (const path of jsonFiles) {
      try {
        const { data: blob, error: downloadError } = await supabaseAdmin.storage
          .from(JSON_BUCKET)
          .download(path)

        if (downloadError || !blob) {
          skipped += 1
          errors.push({
            path,
            reason: downloadError?.message || 'Unable to download file'
          })
          continue
        }

        const jsonText = await blob.text()
        let missionData: any
        try {
          missionData = JSON.parse(jsonText)
        } catch (parseError: any) {
          skipped += 1
          errors.push({
            path,
            reason: `Invalid JSON format: ${parseError.message || 'Parse error'}`
          })
          continue
        }

        const fileName = path.split('/').pop() || ''
        const orderFromFile = parseNumber(fileName.replace('.json', ''))
        const orderCandidates = [
          parseNumber(missionData.order),
          parseNumber(missionData.order_no),
          parseNumber(missionData.orderNo),
          parseNumber(missionData.index),
          orderFromFile
        ].filter((value) => value !== null) as number[]

        const titleCandidate = typeof missionData.title === 'string' && missionData.title.trim().length > 0
          ? missionData.title.trim()
          : fileName.replace('.json', '')

        const rawMissionUid =
          (typeof missionData.mission_uid === 'string' && missionData.mission_uid) ||
          (typeof missionData.missionUid === 'string' && missionData.missionUid) ||
          (typeof missionData.uid === 'string' && missionData.uid) ||
          titleCandidate

        const normalizedMissionUid = typeof rawMissionUid === 'string' && rawMissionUid.trim().length > 0
          ? slugify(rawMissionUid)
          : slugify(`mission-${Date.now()}`)

        const existingRecord =
          byPath.get(path) ||
          byMissionUid.get(normalizedMissionUid) ||
          (orderCandidates.length > 0 ? byOrder.get(orderCandidates[0]!) : undefined)

        if (existingRecord) {
          const updatePayload: Record<string, any> = { mission_data: missionData }
          if (!existingRecord.mission_uid) {
            updatePayload.mission_uid = normalizedMissionUid
          }
          if (existingRecord.object_path !== path) {
            updatePayload.object_path = path
          }
          if (!existingRecord.assets_bucket) {
            updatePayload.assets_bucket = 'missions-assets'
          }
          const existingPrefix = existingRecord.assets_prefix as string | undefined
          const desiredPrefix = (() => {
            const uid = existingRecord.mission_uid || normalizedMissionUid
            if (!uid) return null
            const upper = uid.trim().toUpperCase()
            const prefixBody = upper.startsWith('M') ? upper : `M${upper}`
            return `${prefixBody}/`
          })()
          if (desiredPrefix && existingPrefix !== desiredPrefix) {
            updatePayload.assets_prefix = desiredPrefix
          }
          updatePayload.unlock_playground = true
          updatePayload.unlocks_projects = true
          if (titleCandidate && titleCandidate !== existingRecord.title) {
            updatePayload.title = titleCandidate
          }

          let updateQuery = supabaseAdmin.from('missions').update(updatePayload)
          if (existingRecord.mission_uid) {
            updateQuery = updateQuery.eq('mission_uid', existingRecord.mission_uid)
          } else if (
            existingRecord.order_no !== null &&
            existingRecord.order_no !== undefined
          ) {
            updateQuery = updateQuery.eq('order_no', existingRecord.order_no)
          } else if (existingRecord.object_path) {
            updateQuery = updateQuery.eq('object_path', existingRecord.object_path)
          } else {
            skipped += 1
            errors.push({
              path,
              reason: 'Unable to determine identifier for existing mission row.'
            })
            continue
          }

          const { error: updateError } = await updateQuery

          if (updateError) {
            skipped += 1
            errors.push({
              path,
              reason: `Failed to update mission '${existingRecord.mission_uid || existingRecord.object_path || 'unknown'}': ${updateError.message}`
            })
            continue
          }

          if (!existingRecord.object_path) {
            existingRecord.object_path = path
            byPath.set(path, existingRecord)
          }
          if (!existingRecord.mission_uid) {
            existingRecord.mission_uid = normalizedMissionUid
            byMissionUid.set(normalizedMissionUid, existingRecord)
          }
          existingRecord.assets_bucket =
            existingRecord.assets_bucket || updatePayload.assets_bucket || 'missions-assets'
          if (desiredPrefix) {
            existingRecord.assets_prefix = desiredPrefix
          }
          existingRecord.unlock_playground = true
          existingRecord.unlocks_projects = true

          updated += 1
          continue
        }

        let orderToUse: number | null = orderCandidates.length > 0 ? orderCandidates[0]! : null
        if (orderToUse !== null) {
          while (usedOrders.has(orderToUse)) {
            orderToUse += 1
          }
        } else {
          orderToUse = ensureNextOrder()
        }
        usedOrders.add(orderToUse)

        const finalMissionUid = uniqueValue(normalizedMissionUid, (candidate) =>
          byMissionUid.has(candidate)
        )

        const baseInsert = {
          title: titleCandidate,
          mission_uid: finalMissionUid,
          order_no: orderToUse,
          object_path: path,
          assets_bucket: 'missions-assets',
          assets_prefix: (() => {
            const upper = finalMissionUid.trim().toUpperCase()
            const prefixBody = upper.startsWith('M') ? upper : `M${upper}`
            return `${prefixBody}/`
          })(),
          unlock_playground: true,
          unlocks_projects: true
        }

        let insertResult = await supabaseAdmin
          .from('missions')
          .insert({ ...baseInsert, mission_data: missionData })
          .select()
          .single()

        if (insertResult.error) {
          const fallbackResult = await supabaseAdmin
            .from('missions')
            .insert(baseInsert)
            .select()
            .single()

          if (fallbackResult.error) {
            skipped += 1
            errors.push({
              path,
              reason: `Database insert failed: ${fallbackResult.error.message}`
            })
            continue
          }

          insertResult = fallbackResult
        }

        const insertedMission = insertResult.data
        if (insertedMission) {
          const recordToStore: any = {
            ...insertedMission,
            mission_uid: insertedMission.mission_uid ?? finalMissionUid,
            order_no: insertedMission.order_no ?? orderToUse,
            object_path: insertedMission.object_path ?? path,
            title: insertedMission.title ?? titleCandidate,
            assets_bucket: insertedMission.assets_bucket ?? 'missions-assets',
            assets_prefix:
              insertedMission.assets_prefix ??
              (() => {
                const upper = finalMissionUid.trim().toUpperCase()
                const prefixBody = upper.startsWith('M') ? upper : `M${upper}`
                return `${prefixBody}/`
              })(),
            unlock_playground:
              insertedMission.unlock_playground !== undefined
                ? insertedMission.unlock_playground
                : true,
            unlocks_projects:
              insertedMission.unlocks_projects !== undefined
                ? insertedMission.unlocks_projects
                : true
          }

          byMissionUid.set(recordToStore.mission_uid, recordToStore)
          byOrder.set(recordToStore.order_no, recordToStore)
          byPath.set(path, recordToStore)
          inserted += 1
        }
      } catch (error: any) {
        skipped += 1
        errors.push({
          path,
          reason: error?.message || 'Unexpected error during sync'
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Sync completed.',
      summary: {
        filesScanned: jsonFiles.length,
        inserted,
        updated,
        skipped,
        errors
      }
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error?.message || 'Failed to sync missions from storage.',
        summary: { filesScanned: 0, inserted: 0, updated: 0, skipped: 0, errors: [] }
      },
      { status: 500 }
    )
  }
}

