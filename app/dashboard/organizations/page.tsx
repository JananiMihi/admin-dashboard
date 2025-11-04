'use client'

import { useState, useEffect } from 'react'
import { supabaseAdmin } from '@/lib/supabase'
import { Plus, Building2, Users, CheckCircle2 } from 'lucide-react'

interface Organization {
  id: string
  name: string
  created_at: string
}

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetchOrganizations()
  }, [])

  const fetchOrganizations = async () => {
    try {
      const { data, error } = await supabaseAdmin
        .from('organizations')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      setOrganizations(data || [])
    } catch (error) {
      console.error('Error fetching organizations:', error)
    } finally {
      setLoading(false)
    }
  }

  const createDummyOrganizations = async () => {
    setCreating(true)
    try {
      const response = await fetch('/api/organizations/create-dummy', {
        method: 'POST'
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create organizations')
      }

      // Refresh the list
      await fetchOrganizations()
      
      alert(`Successfully created ${result.created?.length || 0} organization(s)!`)
    } catch (error: any) {
      alert(error.message || 'Failed to create dummy organizations')
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Organizations</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage organizations for educators
          </p>
        </div>
        <button
          onClick={createDummyOrganizations}
          disabled={creating}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Plus className="w-5 h-5" />
          {creating ? 'Creating...' : 'Create Dummy Organizations'}
        </button>
      </div>

      {/* Organizations List */}
      {organizations.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No organizations yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Create dummy organizations to get started
          </p>
          <button
            onClick={createDummyOrganizations}
            disabled={creating}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create Dummy Organizations'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {organizations.map((org) => (
            <div
              key={org.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {org.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Created {new Date(org.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      {organizations.length > 0 && (
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <strong>Total Organizations:</strong> {organizations.length}
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
            These organizations will appear in the "Create Educator" form for selection.
          </p>
        </div>
      )}
    </div>
  )
}


