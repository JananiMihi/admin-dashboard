'use client'

import { useEffect, useState } from 'react'
import { supabaseAdmin } from '@/lib/supabase'
import { Mission } from '@/lib/supabase'
import { Upload, Plus, Edit2, Trash2, Target, Check, Star } from 'lucide-react'

export default function MissionsPage() {
  const [missions, setMissions] = useState<Mission[]>([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [jsonContent, setJsonContent] = useState('')
  const [uploadError, setUploadError] = useState('')
  const [uploadSuccess, setUploadSuccess] = useState('')

  useEffect(() => {
    fetchMissions()
  }, [])

  const fetchMissions = async () => {
    try {
      const { data, error } = await supabaseAdmin
        .from('missions')
        .select('*')
        .order('order', { ascending: true })

      if (error) throw error
      setMissions(data || [])
    } catch (error: any) {
      console.error('Error fetching missions:', error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      setJsonContent(content)
    }
    reader.readAsText(file)
  }

  const handleJsonUpload = async () => {
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
            order: mission.order || 0,
            xp_reward: mission.xp_reward || 0,
            difficulty: mission.difficulty || 'medium',
            estimated_time: mission.estimated_time || 0,
            unlocked: mission.unlocked !== undefined ? mission.unlocked : true,
          })
      })

      await Promise.all(insertPromises)
      
      setUploadSuccess(`Successfully uploaded ${missionsData.length} missions!`)
      setJsonContent('')
      setShowUpload(false)
      fetchMissions()
    } catch (error: any) {
      setUploadError(error.message || 'Failed to upload missions')
    }
  }

  const handleDeleteMission = async (missionId: string) => {
    if (!confirm('Are you sure you want to delete this mission?')) return

    try {
      const { error } = await supabaseAdmin
        .from('missions')
        .delete()
        .eq('id', missionId)

      if (error) throw error
      fetchMissions()
    } catch (error: any) {
      console.error('Error deleting mission:', error.message)
      alert('Failed to delete mission: ' + error.message)
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
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Upload className="h-5 w-5 mr-2" />
            Upload JSON
          </button>
        </div>

        {/* Upload Form */}
        {showUpload && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Missions from JSON</h2>
            
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
                  Select JSON File
                </label>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Or paste JSON content
                </label>
                <textarea
                  value={jsonContent}
                  onChange={(e) => setJsonContent(e.target.value)}
                  placeholder='[{"title":"Mission 1","description":"...","order":1,"xp_reward":100}]'
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  rows={10}
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleJsonUpload}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Upload
                </button>
                <button
                  onClick={() => {
                    setShowUpload(false)
                    setJsonContent('')
                    setUploadError('')
                    setUploadSuccess('')
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>

            <div className="mt-4 p-4 bg-gray-50 rounded-md">
              <p className="text-sm font-medium text-gray-700 mb-2">Expected JSON Format:</p>
              <pre className="text-xs text-gray-600 overflow-x-auto">
{`[
  {
    "title": "Mission Title",
    "description": "Mission description",
    "order": 1,
    "xp_reward": 100,
    "difficulty": "easy",
    "estimated_time": 30,
    "unlocked": true
  }
]`}
              </pre>
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
                    Title
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
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {missions.map((mission) => (
                  <tr key={mission.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {mission.order}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{mission.title}</div>
                      <div className="text-sm text-gray-500 truncate max-w-md">
                        {mission.description}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        mission.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                        mission.difficulty === 'hard' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {mission.difficulty}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {mission.xp_reward} XP
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        mission.unlocked ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {mission.unlocked ? 'Unlocked' : 'Locked'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleDeleteMission(mission.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
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
            <p className="mt-4 text-gray-500">No missions available. Upload your first mission!</p>
          </div>
        )}
      </div>
  )
}

