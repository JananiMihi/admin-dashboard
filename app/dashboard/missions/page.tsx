'use client'

import { useEffect, useState } from 'react'
import { supabaseAdmin } from '@/lib/supabase'
import { Mission } from '@/lib/supabase'
import { Upload, Target, Check, Star, Users, Image as ImageIcon, FileJson, X, RefreshCw, Trash2 } from 'lucide-react'

export default function MissionsPage() {
  const [missions, setMissions] = useState<Mission[]>([])
  const [missionsWithStats, setMissionsWithStats] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [jsonContent, setJsonContent] = useState('')
  const [uploadError, setUploadError] = useState('')
  const [uploadSuccess, setUploadSuccess] = useState('')
  const [jsonFile, setJsonFile] = useState<File | null>(null)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [customTitle, setCustomTitle] = useState('')
  const [customMissionUid, setCustomMissionUid] = useState('')
  const [customOrderNo, setCustomOrderNo] = useState('')
  const [deletingId, setDeletingId] = useState<string | number | null>(null)

  useEffect(() => {
    fetchMissions()
  }, [])

  const fetchMissions = async () => {
    try {
      // Fetch missions - try to order by 'order' column, fallback to created_at
      let missionsQuery = supabaseAdmin
        .from('missions')
        .select('*')

      const { data, error } = await missionsQuery.order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching missions:', error.message)
        throw error
      }
      
      setMissions(data || [])

      // Fetch user data to count users who completed each mission
      const { data: userData, error: userDataError } = await supabaseAdmin
        .from('user_data')
        .select('current_mission')

      if (userDataError) {
        console.error('Error fetching user data:', userDataError.message)
      }

      // Calculate how many users have completed each mission
      // user_data.current_mission contains the ORDER NUMBER (0, 1, 2, etc.)
      // A user has "completed" a mission if their current_mission > that mission's index
      // (meaning they've passed that mission and moved on)
      const missionsWithCompletion = (data || []).map((mission: any, missionIndex: number) => {
        // Count users who have COMPLETED this mission
        // (users with current_mission > missionIndex have passed this mission)
        const usersCompleted = userData?.filter((user: any) => {
          return user.current_mission > missionIndex
        }) || []
        
        return {
          ...mission,
          completedUsers: usersCompleted.length,
        }
      })

      setMissionsWithStats(missionsWithCompletion)
    } catch (error: any) {
      console.error('Error fetching missions:', error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setJsonFile(file)
    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      setJsonContent(content)
    }
    reader.readAsText(file)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setImageFiles(prev => [...prev, ...files])
  }

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleJsonUpload = async () => {
    setUploadError('')
    setUploadSuccess('')
    setUploading(true)

    try {
      // Validate input
      if (!jsonFile && !jsonContent.trim()) {
        setUploadError('Please provide a JSON file or paste JSON content')
        setUploading(false)
        return
      }

      // If only content is provided, validate it's valid JSON first
      if (!jsonFile && jsonContent.trim()) {
        try {
          JSON.parse(jsonContent.trim())
        } catch (parseError: any) {
          setUploadError(`Invalid JSON format: ${parseError.message}`)
          setUploading(false)
          return
        }
      }

      const formData = new FormData()
      
      // Add JSON file or create a blob from content
      if (jsonFile) {
        formData.append('json', jsonFile)
      } else if (jsonContent.trim()) {
        const blob = new Blob([jsonContent.trim()], { type: 'application/json' })
        const file = new File([blob], 'mission.json', { type: 'application/json' })
        formData.append('json', file)
      }

      // Optional admin-provided title override
      if (customTitle.trim()) {
        formData.append('title', customTitle.trim())
      }

      // Optional admin-provided mission_uid and order_no
      if (customMissionUid.trim()) {
        formData.append('mission_uid', customMissionUid.trim())
      }
      if (customOrderNo.trim()) {
        formData.append('order_no', customOrderNo.trim())
      }

      // Add image files
      imageFiles.forEach((image) => {
        formData.append('images', image)
      })

      const response = await fetch('/api/missions/upload', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to upload mission')
      }

      setUploadSuccess(
        result.message || 
        `Mission uploaded successfully!${result.images?.length ? ` ${result.images.length} images uploaded.` : ''}`
      )
      setJsonContent('')
      setJsonFile(null)
      setImageFiles([])
      setCustomTitle('')
      setCustomMissionUid('')
      setCustomOrderNo('')
      setTimeout(() => {
        setShowUpload(false)
        fetchMissions()
      }, 2000)
    } catch (error: any) {
      setUploadError(error.message || 'Failed to upload mission')
      console.error('Upload error:', error)
    } finally {
      setUploading(false)
    }
  }

  const handleRenameJsonFiles = async () => {
    if (!confirm('This will rename all JSON files in storage from numbers to mission_uid format. Continue?')) {
      return
    }

    setRenaming(true)
    setUploadError('')
    setUploadSuccess('')

    try {
      const response = await fetch('/api/missions/rename-json', {
        method: 'POST'
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to rename JSON files')
      }

      setUploadSuccess(
        `Successfully renamed ${result.renamedCount} files. ` +
        (result.errors && result.errors.length > 0 
          ? `${result.errors.length} errors occurred. Check console for details.`
          : '')
      )
      
      if (result.errors && result.errors.length > 0) {
        console.error('Rename errors:', result.errors)
      }
      
      fetchMissions()
    } catch (error: any) {
      setUploadError(error.message || 'Failed to rename JSON files')
    } finally {
      setRenaming(false)
    }
  }

  const handleLegacyArrayUpload = async () => {
    setUploadError('')
    setUploadSuccess('')

    try {
      // Parse JSON
      const missionsData = JSON.parse(jsonContent)

      // Ensure it's an array
      if (!Array.isArray(missionsData)) {
        throw new Error('JSON must contain an array of missions')
      }

      // Validate and insert missions
      const insertPromises = missionsData.map((mission) => {
        return supabaseAdmin
          .from('missions')
          .upsert({
            title: mission.title,
            description: mission.description,
            xp_reward: mission.xp_reward || 0,
            difficulty: mission.difficulty || 'medium',
            estimated_time: mission.estimated_time || 0,
            unlocked: mission.unlocked !== undefined ? mission.unlocked : true,
          })
      })

      await Promise.all(insertPromises)
      
      setUploadSuccess(`Successfully uploaded ${missionsData.length} missions!`)
      setJsonContent('')
      setJsonFile(null)
      setShowUpload(false)
      fetchMissions()
    } catch (error: any) {
      setUploadError(error.message || 'Failed to upload missions')
    }
  }


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mission Management</h1>
            <p className="mt-1 text-sm text-gray-500">Upload and manage learning missions</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowUpload(!showUpload)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Upload className="h-5 w-5 mr-2" />
              Upload JSON
            </button>
            <button
              onClick={handleRenameJsonFiles}
              disabled={renaming}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {renaming ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Renaming...
                </>
              ) : (
                <>
                  <RefreshCw className="h-5 w-5 mr-2" />
                  Rename JSON Files
                </>
              )}
            </button>
          </div>
        </div>

        {/* Upload Form */}
        {showUpload && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Mission to Supabase</h2>
            
            {uploadError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {uploadError}
              </div>
            )}

            {uploadSuccess && (
              <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                {uploadSuccess}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FileJson className="inline h-4 w-4 mr-2" />
                  Mission JSON File (Full Format)
                </label>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {jsonFile && (
                  <p className="mt-2 text-sm text-gray-600">
                    Selected: {jsonFile.name}
                  </p>
                )}
              </div>

            {/* Admin override: Mission Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mission Title (optional override)
              </label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Enter mission title shown to users"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">If provided, this will override the title inside the JSON.</p>
            </div>

            {/* Admin override: mission_uid and order_no */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mission UID (optional)</label>
                <input
                  type="text"
                  value={customMissionUid}
                  onChange={(e) => setCustomMissionUid(e.target.value)}
                  placeholder="e.g. M10 or mobile-remote-control"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">Used for identifier and JSON filename. Will be slugified.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Order Number (optional)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={customOrderNo}
                  onChange={(e) => setCustomOrderNo(e.target.value)}
                  placeholder="e.g. 10"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">If omitted, it auto-assigns next available.</p>
              </div>
            </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <ImageIcon className="inline h-4 w-4 mr-2" />
                  Mission Images (Optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {imageFiles.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {imageFiles.map((img, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <span className="text-sm text-gray-700">{img.name}</span>
                        <button
                          onClick={() => removeImage(idx)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Or paste JSON content
                </label>
                <textarea
                  value={jsonContent}
                  onChange={(e) => setJsonContent(e.target.value)}
                  placeholder='{"title":"Mission Title","description":"...","steps":[...]}'
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  rows={10}
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleJsonUpload}
                  disabled={uploading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload to Supabase
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowUpload(false)
                    setJsonContent('')
                    setJsonFile(null)
                    setImageFiles([])
                    setCustomTitle('')
                    setCustomMissionUid('')
                    setCustomOrderNo('')
                    setUploadError('')
                    setUploadSuccess('')
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-md border border-blue-200">
                <p className="text-sm font-medium text-blue-900 mb-2">✨ Full Mission Format</p>
                <p className="text-xs text-blue-700">
                  Upload complete mission JSON (from Mission Generator) with all steps, blocks, images, etc. 
                  The full JSON will be stored in Supabase database and images uploaded to storage bucket.
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
                <p className="text-sm font-medium text-gray-900 mb-2">📋 Simple Array Format</p>
                <p className="text-xs text-gray-700">
                  For simple mission metadata uploads. Uses basic fields like title, description, xp_reward, etc.
                </p>
                <button
                  onClick={handleLegacyArrayUpload}
                  className="mt-2 px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Upload Array Format
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Missions Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Target className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Missions</p>
                <p className="text-2xl font-bold text-gray-900">{missions.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Check className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Unlocked</p>
                <p className="text-2xl font-bold text-gray-900">
                  {missions.filter(m => m.unlocked).length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Star className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total XP Available</p>
                <p className="text-2xl font-bold text-gray-900">
                  {missions.reduce((sum, m) => sum + (m.xp_reward || 0), 0)} XP
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Missions List */}
        <div className="bg-white shadow overflow-hidden rounded-lg">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mission Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Active Users
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Difficulty
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total XP
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {missionsWithStats.map((mission, index) => (
                  <tr key={`mission-${index}-${mission.id || mission.title || index}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{index + 1}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{mission.title || 'No title'}</div>
                      <div className="text-sm text-gray-500 truncate max-w-md">
                        {mission.description || 'No description'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Users className="h-4 w-4 text-green-600 mr-2" />
                        <span className="text-sm font-medium text-gray-900">
                          {mission.completedUsers || 0} users
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        mission.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                        mission.difficulty === 'hard' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {mission.difficulty || 'medium'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-yellow-500 mr-2" />
                        <span className="text-sm font-medium text-gray-900">
                          {mission.xp_reward || 0} XP
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        className="inline-flex items-center px-3 py-1.5 rounded-md bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50"
                        onClick={async () => {
                          if (!confirm(`Delete mission \"${mission.title}\"? This cannot be undone.`)) return
                          try {
                            setDeletingId(mission.id)
                            const res = await fetch('/api/missions/delete', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify(
                                mission.id ? { id: mission.id } : { mission_uid: mission.mission_uid }
                              )
                            })
                            const data = await res.json()
                            if (!res.ok) throw new Error(data.error || 'Delete failed')
                            await fetchMissions()
                          } catch (e) {
                            console.error(e)
                            alert((e as any).message || 'Failed to delete mission')
                          } finally {
                            setDeletingId(null)
                          }
                        }}
                        disabled={deletingId === mission.id || (!mission.id && !mission.mission_uid)}
                        title="Delete mission"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        {deletingId === mission.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {missionsWithStats.length === 0 && (
          <div className="text-center py-12">
            <Target className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-4 text-gray-500">No missions available. Upload your first mission!</p>
          </div>
        )}
      </div>
  )
}

