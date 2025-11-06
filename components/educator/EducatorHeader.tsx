'use client'

import { useState, useEffect } from 'react'
import { supabaseAdmin } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Bell, Search, LogOut, User } from 'lucide-react'

export default function EducatorHeader() {
  const [user, setUser] = useState<any>(null)
  const [notifications, setNotifications] = useState(0)
  const router = useRouter()

  useEffect(() => {
    fetchUser()
  }, [])

  const fetchUser = async () => {
    try {
      const { data: { session } } = await supabaseAdmin.auth.getSession()
      if (session) {
        const { data: profile } = await supabaseAdmin
          .from('user_profiles')
          .select('full_name, email, org_id, role')
          .eq('user_id', session.user.id)
          .single()
        
        // Fetch organization name if org_id exists
        let organizationName = null
        if (profile?.org_id) {
          const { data: org } = await supabaseAdmin
            .from('organizations')
            .select('name')
            .eq('id', profile.org_id)
            .single()
          organizationName = org?.name || null
        }
        
        setUser({
          ...session.user,
          profile: {
            ...profile,
            organizationName
          }
        })
      }
    } catch (error) {
      console.error('Error fetching user:', error)
    }
  }

  const handleLogout = async () => {
    await supabaseAdmin.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Search */}
          <div className="flex flex-1 items-center">
            <div className="relative w-full max-w-md">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search classes, students..."
                className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 py-2 pl-10 pr-3 text-sm placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {/* Notifications */}
            <button className="relative p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
              <Bell className="h-6 w-6" />
              {notifications > 0 && (
                <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                  {notifications}
                </span>
              )}
            </button>

            {/* User menu */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {user?.profile?.full_name || user?.email || 'Educator'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {user?.profile?.role === 'Educator' ? 'Educator' : user?.profile?.organizationName || 'Educator'}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white">
                <User className="h-5 w-5" />
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                title="Logout"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}




