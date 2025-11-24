'use client'

import { useEffect, useState } from 'react'
import { supabaseAdmin } from '@/lib/supabase'
import { Mission } from '@/lib/supabase'
import { Upload, Target, Star, FileJson, X, Image as ImageIcon, Plus, GraduationCap, Check } from 'lucide-react'

interface Class {
  id: string
  name: string
  subject: string | null
  grade: string | null
  section: string | null
}

export default function EducatorMissionsPage() {
  const [missions, setMissions] = useState<any[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [jsonContent, setJsonContent] = useState('')
  const [uploadError, setUploadError] = useState('')
  const [uploadSuccess, setUploadSuccess] = useState('')
  const [jsonFile, setJsonFile] = useState<File | null>(null)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [customTitle, setCustomTitle] = useState('')
  const [customMissionUid, setCustomMissionUid] = useState('')
  const [customOrderNo, setCustomOrderNo] = useState('')
  const [selectedMission, setSelectedMission] = useState<any | null>(null)
  const [selectedClassId, setSelectedClassId] = useState<string>('')
  const [assigning, setAssigning] = useState(false)
  const [assignedClasses, setAssignedClasses] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchMissions()
    fetchClasses()
  }, [])

  useEffect(() => {
    if (selectedMission && classes.length > 0) {
      fetchAssignedClasses(selectedMission.id)
    }
  }, [selectedMission, classes])

  const fetchMissions = async () => {
    try {
      const { data, error } = await supabaseAdmin
        .from('missions')
        .select('*')
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching missions:', error.message)
        throw error
      }

      setMissions(data || [])
    } catch (error: any) {
      console.error('Error fetching missions:', error.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchClasses = async () => {
    try {
      const { data: { session } } = await supabaseAdmin.auth.getSession()
      if (!session) return

      const response = await fetch('/api/educator/classes/list', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const result = await response.json()

      if (response.ok && result.success && result.classes) {
        setClasses(result.classes)
      }
    } catch (error: any) {
      console.error('Error fetching classes:', error.message)
    }
  }

  const fetchAssignedClasses = async (missionId: string) => {
    try {
      if (classes.length === 0) return
      
      const { data: { session } } = await supabaseAdmin.auth.getSession()
      if (!session) return

      const assignedSet = new Set<string>()
      
      // Check each class to see if mission is assigned
      for (const cls of classes) {
        const response = await fetch(`/api/educator/classes/${cls.id}/missions`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        })

        const result = await response.json()
        if (response.ok && result.success && result.missions) {
          const isAssigned = result.missions.some((m: any) => m.id === missionId)
          if (isAssigned) {
            assignedSet.add(cls.id)
          }
        }
      }

      setAssignedClasses(assignedSet)
    } catch (error: any) {
      console.error('Error fetching assigned classes:', error.message)
    }
  }

  const handleAssignMission = async () => {
    if (!selectedMission || !selectedClassId) return

    setAssigning(true)
    try {
      const { data: { session } } = await supabaseAdmin.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const response = await fetch(`/api/educator/classes/${selectedClassId}/missions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          mission_id: selectedMission.id
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to assign mission')
      }

      // Update assigned classes
      setAssignedClasses(prev => {
        const newSet = new Set(prev)
        newSet.add(selectedClassId)
        return newSet
      })
      setSelectedClassId('')
      alert('Mission assigned to class successfully!')
    } catch (error: any) {
      console.error('Error assigning mission:', error)
      alert(error.message || 'Failed to assign mission to class')
    } finally {
      setAssigning(false)
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
      if (!jsonFile && !jsonContent.trim()) {
        setUploadError('Please provide a JSON file or paste JSON content')
        setUploading(false)
        return
      }

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

      if (jsonFile) {
        formData.append('json', jsonFile)
      } else if (jsonContent.trim()) {
        const blob = new Blob([jsonContent.trim()], { type: 'application/json' })
        const file = new File([blob], 'mission.json', { type: 'application/json' })
        formData.append('json', file)
      }

      if (customTitle.trim()) {
        formData.append('title', customTitle.trim())
      }

      if (customMissionUid.trim()) {
        formData.append('mission_uid', customMissionUid.trim())
      }

      if (customOrderNo.trim()) {
        formData.append('order_no', customOrderNo.trim())
      }

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
          <h1 className="text-2xl font-bold text-gray-900">Missions</h1>
          <p className="mt-1 text-sm text-gray-500">View and manage missions</p>
        </div>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus className="h-5 w-5 mr-2" />
          Create Mission
        </button>
      </div>

      {showUpload && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Create New Mission</h2>
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
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

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
                Mission JSON File
              </label>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {jsonFile && (
                <p className="mt-2 text-sm text-gray-600">Selected: {jsonFile.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mission Title (optional override)
              </label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Enter mission title"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mission UID (optional)
                </label>
                <input
                  type="text"
                  value={customMissionUid}
                  onChange={(e) => setCustomMissionUid(e.target.value)}
                  placeholder="e.g. M10 or mobile-remote-control"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Order Number (optional)
                </label>
                <input
                  type="number"
                  value={customOrderNo}
                  onChange={(e) => setCustomOrderNo(e.target.value)}
                  placeholder="e.g. 10"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
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

            <div>
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
                    Upload Mission
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
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Difficulty
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  XP Reward
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {missions.map((mission) => (
                <tr 
                  key={mission.id || mission.mission_uid} 
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedMission(mission)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{mission.title || 'No title'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500 truncate max-w-md">
                      {mission.description || 'No description'}
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
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      mission.unlocked ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {mission.unlocked ? 'Unlocked' : 'Locked'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {missions.length === 0 && (
        <div className="text-center py-12">
          <Target className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-4 text-gray-500">No missions available. Create your first mission!</p>
        </div>
      )}

      {selectedMission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">{selectedMission.title}</h2>
                <button
                  onClick={() => {
                    setSelectedMission(null)
                    setSelectedClassId('')
                    setAssignedClasses(new Set())
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedMission.description || 'No description'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Difficulty</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedMission.difficulty || 'medium'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">XP Reward</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedMission.xp_reward || 0} XP</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedMission.unlocked ? 'Unlocked' : 'Locked'}</p>
                </div>
                {selectedMission.mission_uid && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Mission UID</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedMission.mission_uid}</p>
                  </div>
                )}

                {/* Assign to Class Section */}
                <div className="border-t pt-4 mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <GraduationCap className="inline h-4 w-4 mr-2" />
                    Assign to Class
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={selectedClassId}
                      onChange={(e) => setSelectedClassId(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <option value="">Select a class...</option>
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name}
                          {cls.subject && ` - ${cls.subject}`}
                          {cls.grade && ` (Grade ${cls.grade})`}
                          {assignedClasses.has(cls.id) && ' ✓'}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleAssignMission}
                      disabled={!selectedClassId || assigning || assignedClasses.has(selectedClassId)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                      {assigning ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Assigning...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Assign
                        </>
                      )}
                    </button>
                  </div>
                  
                  {assignedClasses.size > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-gray-600 mb-2">Assigned to:</p>
                      <div className="flex flex-wrap gap-2">
                        {classes
                          .filter(cls => assignedClasses.has(cls.id))
                          .map((cls) => (
                            <span
                              key={cls.id}
                              className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 rounded text-xs"
                            >
                              <Check className="h-3 w-3 mr-1" />
                              {cls.name}
                            </span>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

