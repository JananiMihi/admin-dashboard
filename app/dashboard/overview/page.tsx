'use client'

import { useEffect, useState } from 'react'
import { supabaseAdmin } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { 
  TrendingUp, 
  Users, 
  Target, 
  Clock, 
  Zap, 
  Activity,
  AlertTriangle,
  Monitor
} from 'lucide-react'

export default function OverviewPage() {
  const router = useRouter()
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalMissions: 0,
    totalProgress: 0,
    avgLevel: 0,
    totalXP: 0,
    avgBadges: 0,
  })
  const [profiles, setProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchData = async () => {
    try {
      // Fetch user profiles
      const { data: profilesData, error: profilesError } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (profilesError) throw profilesError

      // Try fetching from users table if it exists
      let usersData: any[] = []
      try {
        const { data: users } = await supabaseAdmin
          .from('users')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100)
        usersData = users || []
      } catch (err) {
        console.log('Users table not found')
      }

      // Try fetching from auth.users
      let authUsers: any[] = []
      try {
        const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
        authUsers = users || []
      } catch (err) {
        console.log('Cannot fetch auth users')
      }

      // Fetch missions count
      const { count: totalMissions } = await supabaseAdmin
        .from('missions')
        .select('*', { count: 'exact', head: true })

      // Fetch progress count
      const { count: totalProgress } = await supabaseAdmin
        .from('user_progress')
        .select('*', { count: 'exact', head: true })

      // Combine profiles with user data
      const enrichedProfiles = (profilesData || []).map((profile: any) => {
        const userInfo = usersData.find(u => u.id === profile.user_id) || {}
        const authUser = authUsers.find(u => u.id === profile.user_id) || {}
        
        return {
          ...profile,
          email: userInfo.email || authUser.email || 'No email',
          name: userInfo.name || authUser.user_metadata?.name || 'No name',
          created_at: profile.created_at
        }
      })

      const totalUsers = enrichedProfiles.length || 0
      const avgLevel = enrichedProfiles.reduce((sum: number, p: any) => sum + (p.level || 1), 0) / totalUsers || 0
      const totalXP = enrichedProfiles.reduce((sum: number, p: any) => sum + (p.total_xp || 0), 0) || 0
      const avgBadges = enrichedProfiles.reduce((sum: number, p: any) => sum + (p.badges?.length || 0), 0) / totalUsers || 0

      setProfiles(enrichedProfiles)
      setStats({
        totalUsers,
        totalMissions: totalMissions || 0,
        totalProgress: totalProgress || 0,
        avgLevel: Math.round(avgLevel * 10) / 10,
        totalXP,
        avgBadges: Math.round(avgBadges * 10) / 10,
      })
    } catch (error: any) {
      console.error('Error fetching data:', error.message)
    } finally {
      setLoading(false)
    }
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
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="mt-1 text-sm text-gray-500">Real-time system metrics and KPIs</p>
        </div>

        {/* Key Statistics */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Key Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div 
              onClick={() => router.push('/dashboard/users')}
              className="border rounded-lg p-4 cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                  <p className="text-xs text-blue-600 mt-1">Click to view all →</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <div 
              onClick={() => router.push('/dashboard/missions')}
              className="border rounded-lg p-4 cursor-pointer hover:bg-green-50 hover:border-green-300 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Missions</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalMissions}</p>
                  <p className="text-xs text-green-600 mt-1">Click to manage →</p>
                </div>
                <Target className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <div 
              onClick={() => router.push('/dashboard/progress')}
              className="border rounded-lg p-4 cursor-pointer hover:bg-purple-50 hover:border-purple-300 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Progress</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalProgress}</p>
                  <p className="text-xs text-purple-600 mt-1">Click to view →</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* User Profile Stats */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">User Engagement Stats</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Average Level</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.avgLevel}</p>
                </div>
                <Activity className="h-8 w-8 text-yellow-600" />
              </div>
            </div>
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total XP</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalXP.toLocaleString()}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Average Badges</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.avgBadges}</p>
                </div>
                <Target className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* User Profiles Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Recent User Profiles</h2>
            <button
              onClick={() => router.push('/dashboard/users')}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              View All Users →
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {profiles.slice(0, 10).map((profile) => {
                  // Random online/offline for demo (replace with real logic)
                  const isOnline = Math.random() > 0.5
                  return (
                    <tr key={profile.user_id || profile.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-mono text-gray-900">{profile.user_id || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{profile.email || 'No email'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-blue-600 font-medium text-xs">
                              {profile.name?.[0]?.toUpperCase() || profile.email?.[0]?.toUpperCase() || '?'}
                            </span>
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {profile.name || 'No name'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          isOnline 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          <span className={`mr-1.5 h-2 w-2 rounded-full ${
                            isOnline ? 'bg-green-400' : 'bg-gray-400'
                          }`}></span>
                          {isOnline ? 'Online' : 'Offline'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {new Date(profile.created_at).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(profile.created_at).toLocaleTimeString()}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {profiles.length === 0 && (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500">No user profiles found</p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button className="border rounded-lg p-4 hover:bg-gray-50 text-left">
              <Target className="h-6 w-6 text-blue-600 mb-2" />
              <h3 className="font-semibold text-gray-900">Create Mission</h3>
              <p className="text-sm text-gray-500">Add a new learning mission</p>
            </button>
            <button className="border rounded-lg p-4 hover:bg-gray-50 text-left">
              <Users className="h-6 w-6 text-green-600 mb-2" />
              <h3 className="font-semibold text-gray-900">Invite Users</h3>
              <p className="text-sm text-gray-500">Send invitations to new users</p>
            </button>
            <button className="border rounded-lg p-4 hover:bg-gray-50 text-left">
              <Zap className="h-6 w-6 text-yellow-600 mb-2" />
              <h3 className="font-semibold text-gray-900">Send Announcement</h3>
              <p className="text-sm text-gray-500">Broadcast message to all users</p>
            </button>
            <button className="border rounded-lg p-4 hover:bg-gray-50 text-left">
              <Activity className="h-6 w-6 text-red-600 mb-2" />
              <h3 className="font-semibold text-gray-900">View Diagnostics</h3>
              <p className="text-sm text-gray-500">Check system health status</p>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

