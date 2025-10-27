'use client'

import DashboardLayout from '@/components/DashboardLayout'
import { Megaphone, Plus } from 'lucide-react'

export default function AnnouncementsPage() {
  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
            <p className="mt-1 text-sm text-gray-500">Create and manage announcements</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            <Plus className="h-5 w-5" />
            New Announcement
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Megaphone className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Announcements</h3>
              <p className="text-sm text-gray-500">Create your first announcement to notify all users.</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

