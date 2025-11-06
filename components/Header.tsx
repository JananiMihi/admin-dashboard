'use client'

import { useState, useEffect } from 'react'
import { Menu, Search, Bell, LogOut } from 'lucide-react'
import { supabaseAdmin } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface HeaderProps {
  onMenuClick: () => void
}

function UserMenu({ user }: { user: any }) {
  const [role, setRole] = useState<string>('Administrator')
  
  useEffect(() => {
    const fetchRole = async () => {
      if (user?.id) {
        try {
          const { data: profile } = await supabaseAdmin
            .from('user_profiles')
            .select('role')
            .eq('user_id', user.id)
            .single()
          
          if (profile?.role) {
            setRole(profile.role === 'Educator' ? 'Educator' : profile.role === 'SuperAdmin' ? 'Super Admin' : 'Administrator')
          }
        } catch (error) {
          console.error('Error fetching role:', error)
        }
      }
    }
    fetchRole()
  }, [user])
  
  return (
    <div className="text-right hidden md:block">
      <p className="text-sm font-medium text-gray-900">{user?.email || 'Admin'}</p>
      <p className="text-xs text-gray-500">{role}</p>
    </div>
  )
}

export default function Header({ onMenuClick }: HeaderProps) {
  const [user, setUser] = useState<any>(null)
  const [onlineUsers, setOnlineUsers] = useState(0)
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabaseAdmin.auth.getUser()
      setUser(user)
    }
    getUser()

    // Simulate online users count (update every 30 seconds)
    const updateOnlineUsers = () => {
      setOnlineUsers(Math.floor(Math.random() * 50) + 10)
    }
    updateOnlineUsers()
    const interval = setInterval(updateOnlineUsers, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleLogout = async () => {
    await supabaseAdmin.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="sticky top-0 z-30 bg-white border-b border-gray-200">
      <div className="flex h-16 items-center gap-4 px-4 sm:px-6 lg:px-8">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 text-gray-500 hover:text-gray-700"
        >
          <Menu className="h-6 w-6" />
        </button>

        {/* Search bar */}
        <div className="flex-1 flex items-center gap-4">
          <div className="relative flex-1 max-w-2xl">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="search"
              placeholder="Search users, missions, sessions..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="hidden md:flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            {onlineUsers} Online
          </div>
        </div>

        {/* Notifications */}
        <button className="relative p-2 text-gray-500 hover:text-gray-700">
          <Bell className="h-6 w-6" />
          <span className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
            3
          </span>
        </button>

        {/* User menu */}
        <div className="flex items-center gap-3">
          <UserMenu user={user} />
          <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-blue-600 font-medium text-sm">
              {user?.email?.[0]?.toUpperCase() || 'A'}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-gray-500 hover:text-red-600"
            title="Logout"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
