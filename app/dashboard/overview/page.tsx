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
    // Small delay to ensure Supabase is ready after login
    const timer = setTimeout(() => {
      fetchData()
    }, 100)
    
    const interval = setInterval(fetchData, 30000)
    return () => {
      clearTimeout(timer)
      clearInterval(interval)
    }
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch ALL auth users (this gives us the actual user count)
      let authUsers: any[] = []
      let totalAuthUsers = 0
      try {
        const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers()
        if (!authError && users) {
          // Filter out service accounts
          authUsers = users.filter((user: any) => {
            const email = user.email?.toLowerCase() || ''
            return !email.includes('service') && !email.includes('system')
          })
          totalAuthUsers = authUsers.length
          console.log(`Fetched ${totalAuthUsers} auth users`)
        }
      } catch (err) {
        console.error('Cannot fetch auth users:', err)
      }

      // Fetch ALL user profiles (no limit to get accurate count)
      const { data: profilesData, error: profilesError } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError)
        throw profilesError
      }

      console.log(`Fetched ${profilesData?.length || 0} user profiles`)

      // Try fetching from users table if it exists
      let usersData: any[] = []
      try {
        const { data: users } = await supabaseAdmin
          .from('users')
          .select('*')
        usersData = users || []
      } catch (err) {
        // Table doesn't exist - this is fine
      }

      // Fetch missions count
      const { count: totalMissions } = await supabaseAdmin
        .from('missions')
        .select('*', { count: 'exact', head: true })

      // Fetch total progress from user_data table
      const { data: userData, error: userDataError } = await supabaseAdmin
        .from('user_data')
        .select('current_mission')
      
      let totalProgress = 0
      if (!userDataError && userData) {
        totalProgress = userData.filter((user: any) => user.current_mission > 0).length
      }

      // Create a map of all users combining auth users and profiles
      // Start with all auth users, then enrich with profile data where available
      const userMap = new Map()
      
      // First, add all auth users
      authUsers.forEach((authUser: any) => {
        userMap.set(authUser.id, {
          user_id: authUser.id,
          email: authUser.email || `User-${authUser.id?.substring(0, 8)}`,
          name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || `User ${authUser.id?.substring(0, 8)}`,
          full_name: authUser.user_metadata?.full_name || authUser.user_metadata?.name,
          level: 1,
          total_xp: 0,
          badges: [],
          role: authUser.user_metadata?.role || null,
          created_at: authUser.created_at || new Date().toISOString()
        })
      })

      // Then, enrich with profile data where available
      if (profilesData && profilesData.length > 0) {
        profilesData.forEach((profile: any) => {
          const existingUser = userMap.get(profile.user_id)
          const userInfo = usersData.find(u => u.id === profile.user_id) || {}
          const authUser = authUsers.find(u => u.id === profile.user_id) || {}
          
          const email = userInfo.email || authUser.email || profile.email || profile.full_name || existingUser?.email || `User-${profile.user_id?.substring(0, 8) || 'Unknown'}`
          const name = userInfo.name || authUser.user_metadata?.full_name || authUser.user_metadata?.name || profile.full_name || profile.name || existingUser?.name || `User ${profile.user_id?.substring(0, 8) || 'Unknown'}`
          
          userMap.set(profile.user_id, {
            ...profile,
            email,
            name,
            created_at: profile.created_at || existingUser?.created_at || new Date().toISOString()
          })
        })
      }

      // Convert map to array and sort by created_at (most recent first)
      const enrichedProfiles = Array.from(userMap.values())
        .sort((a: any, b: any) => {
          const dateA = new Date(a.created_at).getTime()
          const dateB = new Date(b.created_at).getTime()
          return dateB - dateA
        })
        .slice(0, 100) // Limit to 100 for display

      console.log(`Total enriched profiles for display: ${enrichedProfiles.length}`)

      // Use auth users count for total users (most accurate)
      const totalUsers = totalAuthUsers > 0 ? totalAuthUsers : enrichedProfiles.length
      
      // Calculate stats from profiles that have data
      const profilesWithData = enrichedProfiles.filter(p => p.level !== undefined || p.total_xp !== undefined)
      const avgLevel = profilesWithData.length > 0 
        ? profilesWithData.reduce((sum: number, p: any) => sum + (p.level || 1), 0) / profilesWithData.length 
        : 0
      const totalXP = enrichedProfiles.reduce((sum: number, p: any) => sum + (p.total_xp || 0), 0) || 0
      const avgBadges = profilesWithData.length > 0
        ? profilesWithData.reduce((sum: number, p: any) => sum + (p.badges?.length || 0), 0) / profilesWithData.length 
        : 0

      console.log('Setting stats:', {
        totalUsers,
        totalMissions: totalMissions || 0,
        totalProgress,
        profilesCount: enrichedProfiles.length
      })

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
                  <p className="text-sm text-gray-500">Active Users</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalProgress}</p>
                  <p className="text-xs text-purple-600 mt-1">Have started missions →</p>
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

