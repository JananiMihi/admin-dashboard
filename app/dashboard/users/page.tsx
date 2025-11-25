'use client'

import { useEffect, useState } from 'react'
import { supabaseAdmin } from '@/lib/supabase'
import { Search, Users, Plus, UserCheck, Key } from 'lucide-react'
import CreateEducatorModal from '@/components/admin/CreateEducatorModal'

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [filteredUsers, setFilteredUsers] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all')
  const [roleFilter, setRoleFilter] = useState<'all' | 'SuperAdmin' | 'Educator' | 'Student'>('all')
  const [loading, setLoading] = useState(true)
  const [createEducatorOpen, setCreateEducatorOpen] = useState(false)
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
  const [resettingPassword, setResettingPassword] = useState<string | null>(null)

  useEffect(() => {
    fetchCurrentUser()
    fetchUsers()
  }, [])

  useEffect(() => {
    filterUsers()
  }, [searchTerm, statusFilter, roleFilter, users])

  const fetchCurrentUser = async () => {
    try {
      const { data: { session } } = await supabaseAdmin.auth.getSession()
      if (!session) {
        console.log('No session found')
        return
      }

      console.log('Session found:', session.user.email)

      // Check email first - if admin@neo, always set as SuperAdmin
      if (session.user.email === 'admin@neo') {
        console.log('Admin email detected, setting as SuperAdmin')
        setCurrentUserRole('SuperAdmin')
        // Also set in localStorage as backup
        if (typeof window !== 'undefined') {
          localStorage.setItem('isSuperAdmin', 'true')
        }
        
        // Try to create/update profile in background
        try {
          // Get or create default org
          let orgId: string | null = null
          const { data: orgs } = await supabaseAdmin
            .from('organizations')
            .select('id')
            .limit(1)
          
          orgId = orgs?.[0]?.id || null
          
          if (!orgId) {
            const { data: newOrg } = await supabaseAdmin
              .from('organizations')
              .insert({ name: 'Default Organization' })
              .select()
              .single()
            orgId = newOrg?.id || null
          }
          
          // Create or update profile
          await supabaseAdmin
            .from('user_profiles')
            .upsert({
              user_id: session.user.id,
              email: 'admin@neo',
              full_name: 'Super Admin',
              role: 'SuperAdmin',
              org_id: orgId,
              onboarding_state: 'active'
            }, {
              onConflict: 'user_id'
            })
          
          console.log('Profile created/updated successfully')
        } catch (err) {
          console.error('Error creating/updating profile:', err)
          // Continue anyway - role is already set
        }
        return
      }

      // For other users, try to get role from user_profiles
      try {
        const { data: profile, error: profileError } = await supabaseAdmin
          .from('user_profiles')
          .select('role')
          .eq('user_id', session.user.id)
          .single()
        
        if (profileError) {
          console.log('Profile error:', profileError)
          // If error is "not found", user doesn't have profile yet
          if (profileError.code === 'PGRST116') {
            setCurrentUserRole(null)
          } else {
            setCurrentUserRole(null)
          }
        } else {
          console.log('Profile found, role:', profile?.role)
          setCurrentUserRole(profile?.role || null)
        }
      } catch (err) {
        console.error('Error fetching profile:', err)
        setCurrentUserRole(null)
      }
    } catch (error) {
      console.error('Error in fetchCurrentUser:', error)
      // Final fallback: check email
      try {
        const { data: { session } } = await supabaseAdmin.auth.getSession()
        if (session?.user?.email === 'admin@neo') {
          console.log('Fallback: Setting as SuperAdmin based on email')
          setCurrentUserRole('SuperAdmin')
        } else {
          setCurrentUserRole(null)
        }
      } catch (err) {
        console.error('Error in fallback:', err)
        setCurrentUserRole(null)
      }
    }
  }

  const resetEducatorPassword = async (userId: string, email: string) => {
    if (!confirm(`Send password reset link to ${email}?`)) {
      return
    }

    setResettingPassword(userId)
    try {
      const response = await fetch('/api/educators/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, email })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate reset link')
      }

      alert(`Password reset link has been sent to ${email}. The educator can use it to reset their password.`)
    } catch (error: any) {
      alert(error.message || 'Failed to reset password')
    } finally {
      setResettingPassword(null)
    }
  }

  const fetchUsers = async () => {
    try {
      setLoading(true)
      
      // Fetch ALL auth users FIRST (this gives us all registered users)
      let authUsers: any[] = []
      try {
        const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers()
        if (!authError && users) {
          // Filter out service accounts
          authUsers = users.filter((user: any) => {
            const email = user.email?.toLowerCase() || ''
            return !email.includes('service') && !email.includes('system')
          })
          console.log(`Fetched ${authUsers.length} auth users`)
        }
      } catch (err) {
        console.error('Cannot fetch auth users:', err)
      }

      // Fetch ALL user profiles from user_profiles table
      const { data: profilesData, error: profilesError } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError)
        throw profilesError
      }

      console.log(`Fetched ${profilesData?.length || 0} user profiles`)

      // Try to fetch from users table if it exists
      let usersData: any[] = []
      try {
        const { data: usersTable } = await supabaseAdmin
          .from('users')
          .select('*')
        usersData = usersTable || []
      } catch (err) {
        // Table doesn't exist - this is fine
      }

      // Create a map of all users combining auth users and profiles
      // Start with all auth users, then enrich with profile data where available
      const userMap = new Map()
      
      // First, add all auth users
      authUsers.forEach((authUser: any) => {
        userMap.set(authUser.id, {
          user_id: authUser.id,
          id: authUser.id,
          email: authUser.email || `User-${authUser.id?.substring(0, 8)}`,
          name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || `User ${authUser.id?.substring(0, 8)}`,
          full_name: authUser.user_metadata?.full_name || authUser.user_metadata?.name,
          role: authUser.user_metadata?.role || null,
          level: 1,
          total_xp: 0,
          badges: [],
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
            id: profile.user_id || profile.id,
            email,
            name,
            role: profile.role || authUser.user_metadata?.role || null,
            created_at: profile.created_at || existingUser?.created_at || new Date().toISOString()
          })
        })
      }

      // Convert map to array and sort by created_at (most recent first)
      const enrichedData = Array.from(userMap.values())
        .sort((a: any, b: any) => {
          const dateA = new Date(a.created_at).getTime()
          const dateB = new Date(b.created_at).getTime()
          return dateB - dateA
        })

      console.log(`Total users for display: ${enrichedData.length}`)
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

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter((user) => user.role === roleFilter)
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="mt-1 text-sm text-gray-500">View and manage all user profiles</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Debug info - remove in production */}
            {process.env.NODE_ENV === 'development' && (
              <div className="text-xs text-gray-500">
                Role: {currentUserRole || 'null'}
              </div>
            )}
            <button
              onClick={() => setCreateEducatorOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Educator
            </button>
          </div>
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
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as 'all' | 'SuperAdmin' | 'Educator' | 'Student')}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Roles</option>
            <option value="SuperAdmin">SuperAdmin</option>
            <option value="Educator">Educator</option>
            <option value="Student">Student</option>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  {currentUserRole === 'SuperAdmin' && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  )}
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
                          user.role === 'SuperAdmin' 
                            ? 'bg-purple-100 text-purple-800'
                            : user.role === 'Educator'
                            ? 'bg-blue-100 text-blue-800'
                            : user.role === 'Student'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {user.role === 'SuperAdmin' && <UserCheck className="w-3 h-3 mr-1" />}
                          {user.role || 'No role'}
                        </span>
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
                      {currentUserRole === 'SuperAdmin' && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {user.role === 'Educator' && (
                            <button
                              onClick={() => resetEducatorPassword(user.user_id || user.id, user.email)}
                              disabled={resettingPassword === (user.user_id || user.id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              title="Send password reset link"
                            >
                              <Key className="w-3 h-3" />
                              {resettingPassword === (user.user_id || user.id) ? 'Sending...' : 'Reset Password'}
                            </button>
                          )}
                        </td>
                      )}
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

      {/* Create Educator Modal */}
      <CreateEducatorModal
        open={createEducatorOpen}
        onClose={() => setCreateEducatorOpen(false)}
        onSuccess={() => {
          setCreateEducatorOpen(false)
          fetchUsers()
        }}
      />
    </>
  )
}