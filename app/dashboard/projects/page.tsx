'use client'

import DashboardLayout from '@/components/DashboardLayout'
import { FolderOpen, Search } from 'lucide-react'

export default function ProjectsPage() {
  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="mt-1 text-sm text-gray-500">Manage user playground projects</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <FolderOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Projects Feature</h3>
              <p className="text-sm text-gray-500">This page will display all user projects and playground creations.</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

