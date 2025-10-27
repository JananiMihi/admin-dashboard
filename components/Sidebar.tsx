'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Target,
  Wand2,
  FolderOpen,
  Megaphone,
  GraduationCap,
  MessageSquare,
  BarChart3,
  Settings,
  Activity,
  Flag,
  FileCheck,
  Home
} from 'lucide-react'

interface SidebarProps {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

export default function Sidebar({ sidebarOpen, setSidebarOpen }: SidebarProps) {
  const pathname = usePathname()

  const menuItems = [
    { icon: Home, label: 'Overview', href: '/dashboard/overview' },
    { icon: Users, label: 'Users', href: '/dashboard/users' },
    { icon: Target, label: 'Missions', href: '/dashboard/missions' },
    { icon: Wand2, label: 'Mission Generator', href: '/dashboard/mission-generator' },
    { icon: FolderOpen, label: 'Projects', href: '/dashboard/projects' },
    { icon: Megaphone, label: 'Announcements', href: '/dashboard/announcements' },
    { icon: GraduationCap, label: 'Cohorts', href: '/dashboard/cohorts' },
    { icon: MessageSquare, label: 'Chat Sessions', href: '/dashboard/chat-sessions' },
    { icon: BarChart3, label: 'Analytics', href: '/dashboard/analytics' },
    { icon: Activity, label: 'Diagnostics', href: '/dashboard/diagnostics' },
    { icon: Flag, label: 'Experiments', href: '/dashboard/experiments' },
    { icon: FileCheck, label: 'Compliance', href: '/dashboard/compliance' },
    { icon: Settings, label: 'Settings', href: '/dashboard/settings' },
  ]

  const isActive = (href: string) => pathname === href

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h1 className="text-xl font-bold text-blue-600">Neo Buddy Admin</h1>
          </div>
          <nav className="flex-1 overflow-y-auto p-4">
            {menuItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center px-4 py-3 mb-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive(item.href)
                      ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col lg:bg-white lg:border-r lg:border-gray-200">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h1 className="text-xl font-bold text-blue-600">Neo Buddy Admin</h1>
          </div>
          <nav className="flex-1 overflow-y-auto p-4">
            {menuItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center px-4 py-3 mb-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive(item.href)
                      ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>
    </>
  )
}
