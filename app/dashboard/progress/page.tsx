'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { supabaseAdmin } from '@/lib/supabase'
import { UserProgress, UserProfile } from '@/lib/supabase'
import { Target, CheckCircle, Clock, TrendingUp } from 'lucide-react'

export default function ProgressPage() {
  const [progress, setProgress] = useState<UserProgress[]>([])
  const [profiles, setProfiles] = useState<UserProfile[]>([])
  const [stats, setStats] = useState<any>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Fetch all user progress
      const { data: progressData, error: progressError } = await supabaseAdmin
        .from('user_progress')
        .select('*')

      if (progressError) throw progressError

      // Fetch all user profiles
      const { data: profilesData, error: profilesError } = await supabaseAdmin
        .from('user_profiles')
        .select('*')

      if (profilesError) throw profilesError

      setProgress(progressData || [])
      setProfiles(profilesData || [])
      calculateStats(progressData || [], profilesData || [])
    } catch (error: any) {
      console.error('Error fetching data:', error.message)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (progressData: UserProgress[], profilesData: UserProfile[]) => {
    const completedCount = progressData.filter(p => p.completed).length
    const totalProgress = progressData.length
    const completionRate = totalProgress > 0 ? (completedCount / totalProgress) * 100 : 0
    
    const totalXP = profilesData.reduce((sum, p) => sum + (p.total_xp || 0), 0)
    const avgLevel = profilesData.length > 0 
      ? profilesData.reduce((sum, p) => sum + (p.level || 0), 0) / profilesData.length 
      : 0

    setStats({
      totalUsers: profilesData.length,
      completedMissions: completedCount,
      completionRate: Math.round(completionRate),
      totalXP: totalXP,
      avgLevel: Math.round(avgLevel * 10) / 10,
    })
  }

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Progress Tracking</h1>
          <p className="mt-1 text-sm text-gray-500">Monitor student progress and achievements</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Target className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalUsers || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{stats.completedMissions || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Completion Rate</p>
                <p className="text-2xl font-bold text-gray-900">{stats.completionRate || 0}%</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Avg Level</p>
                <p className="text-2xl font-bold text-gray-900">{stats.avgLevel || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Table */}
        <div className="bg-white shadow overflow-hidden rounded-lg">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total XP
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Badges
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progress
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {profiles.map((profile) => {
                  const userProgress = progress.filter(p => p.completed).length
                  return (
                    <tr key={profile.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {profile.user_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        Level {profile.level}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {profile.total_xp} XP
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {profile.badges?.length || 0} badges
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${stats.completionRate}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {profiles.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No progress data available</p>
          </div>
        )}
      </div>
    </>
  )
}

