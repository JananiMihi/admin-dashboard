'use client'

import DashboardLayout from '@/components/DashboardLayout'
import { Flag, Plus } from 'lucide-react'

export default function ExperimentsPage() {
  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Experiments & Flags</h1>
            <p className="mt-1 text-sm text-gray-500">Manage feature flags and A/B testing</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            <Plus className="h-5 w-5" />
            New Flag
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Flag className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Feature Flags</h3>
              <p className="text-sm text-gray-500">Create feature flags for A/B testing and gradual rollouts.</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

