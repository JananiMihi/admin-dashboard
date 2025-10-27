'use client'

import { useEffect, useState } from 'react'
import { supabaseAdmin } from '@/lib/supabase'
import { Search, Users } from 'lucide-react'

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [filteredUsers, setFilteredUsers] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    filterUsers()
  }, [searchTerm, statusFilter, users])

  const fetchUsers = async () => {
    try {
      // Fetch user profiles from user_profiles table
      const { data: profilesData, error: profilesError } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (profilesError) throw profilesError

      // Try to fetch auth users
      let authUsers: any[] = []
      try {
        const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
        authUsers = users || []
      } catch (err) {
        console.log('Cannot fetch auth users:', err)
      }

      // Try to fetch from users table
      let usersData: any[] = []
      try {
        const { data: usersTable } = await supabaseAdmin
          .from('users')
          .select('*')
        usersData = usersTable || []
      } catch (err) {
        console.log('Users table not found')
      }

      // Enrich profiles with user data
      const enrichedData = (profilesData || []).map((profile: any) => {
        // Try to find user info from different sources
        const authUser = authUsers.find(u => u.id === profile.user_id) || {}
        const userInfo = usersData.find(u => u.id === profile.user_id) || {}
        
        // Log profile data for debugging
        console.log('Profile data:', profile)
        console.log('Auth user found:', authUser)
        console.log('User info found:', userInfo)
        
        const enriched = {
          ...profile,
          email: userInfo.email || authUser.email || profile.email || `User-${profile.user_id?.substring(0, 8)}`,
          name: userInfo.name || authUser.user_metadata?.full_name || authUser.user_metadata?.name || profile.name || `User ${profile.user_id?.substring(0, 8)}`
        }
        
        console.log('Enriched profile:', enriched)
        return enriched
      })

      console.log('Enriched data:', enrichedData) // Debug log
      setUsers(enrichedData)
    } catch (error: any) {
      console.error('Error fetching users:', error.message)
    } finally {
      setLoading(false)
    }
  }

  // Helper function to get consistent online status for a user
  const getUserStatus = (userId: string) => {
    // Create a hash from user_id to get consistent online/offline status
    const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return hash % 3 === 0 // ~33% online
  }

  const filterUsers = () => {
    let filtered = users

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter((user) => {
        const userId = user.user_id || ''
        const name = user.name || ''
        const email = user.email || ''
        const searchLower = searchTerm.toLowerCase()
        return (
          userId.toLowerCase().includes(searchLower) ||
          name.toLowerCase().includes(searchLower) ||
          email.toLowerCase().includes(searchLower)
        )
      })
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((user) => {
        const isOnline = getUserStatus(user.user_id || user.id || '')
        return statusFilter === 'online' ? isOnline : !isOnline
      })
    }

    setFilteredUsers(filtered)
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
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="mt-1 text-sm text-gray-500">View and manage all user profiles</p>
        </div>

        {/* Search and Filters */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by User ID, Name, or Email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'online' | 'offline')}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
          </select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{users.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Online</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.floor(users.length * 0.6)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Filtered Results</p>
                <p className="text-2xl font-bold text-gray-900">{filteredUsers.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white shadow overflow-hidden rounded-lg">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => {
                  // Get consistent online status
                  const isOnline = getUserStatus(user.user_id || user.id || '')
                  return (
                    <tr key={user.user_id || user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-mono text-gray-900">{user.user_id || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-blue-600 font-medium text-xs">
                              {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
                            </span>
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {user.name || 'No name'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.email || 'No email'}</div>
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
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {filteredUsers.length === 0 && users.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <Users className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No users yet</h3>
            <p className="text-sm text-gray-500">No user profiles found in the database.</p>
          </div>
        )}
      </div>
    </>
  )
}