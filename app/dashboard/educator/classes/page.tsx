'use client'

import { useState, useEffect } from 'react'
import { supabaseAdmin } from '@/lib/supabase'
import { Plus, GraduationCap, Users, Copy, ExternalLink, Trash2, AlertTriangle } from 'lucide-react'
import CreateClassModal from '@/components/educator/CreateClassModal'
import Link from 'next/link'

interface Class {
  id: string
  name: string
  subject: string | null
  grade: string | null
  section: string | null
  created_at: string
  join_codes?: {
    code: string
    used_count: number
    max_uses: number
  }[]
}

export default function ClassesPage() {
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(true)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [deleteClassConfirmOpen, setDeleteClassConfirmOpen] = useState(false)
  const [classToDelete, setClassToDelete] = useState<Class | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchClasses()
  }, [])

  const fetchClasses = async () => {
    try {
      const { data: { session } } = await supabaseAdmin.auth.getSession()
      if (!session) {
        setLoading(false)
        return
      }

      // Use API route to bypass RLS
      const response = await fetch('/api/educator/classes/list', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch classes')
      }

      if (result.success && result.classes) {
        setClasses(result.classes as any)
      }
    } catch (error) {
      console.error('Error fetching classes:', error)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text)
    // You can add a toast notification here
    alert('Copied to clipboard!')
  }

  const getJoinLink = (code: string) => {
    return `${window.location.origin}/join/${code}`
  }

  const handleDeleteClass = async () => {
    if (!classToDelete) return

    try {
      setDeleting(true)
      const { data: { session } } = await supabaseAdmin.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const response = await fetch(`/api/educator/classes/${classToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete class')
      }

      // Refresh classes list
      await fetchClasses()
      setDeleteClassConfirmOpen(false)
      setClassToDelete(null)
    } catch (error: any) {
      console.error('Error deleting class:', error)
      alert(error.message || 'Failed to delete class')
    } finally {
      setDeleting(false)
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Classes</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your classes and student enrollments
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create Class
          </button>
        </div>
      </div>

      {/* Classes Grid */}
      {classes.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <GraduationCap className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No classes yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Create your first class to get started
          </p>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create Class
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((cls) => {
            const joinCode = cls.join_codes?.[0]?.code
            const usedCount = cls.join_codes?.[0]?.used_count || 0
            const maxUses = cls.join_codes?.[0]?.max_uses || 0

            return (
              <div
                key={cls.id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow"
              >
                {/* Class Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <Link href={`/dashboard/educator/classes/${cls.id}`}>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer">
                        {cls.name}
                      </h3>
                    </Link>
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {cls.subject && <span>{cls.subject}</span>}
                      {cls.grade && <span>• Grade {cls.grade}</span>}
                      {cls.section && <span>• Section {cls.section}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setClassToDelete(cls)
                      setDeleteClassConfirmOpen(true)
                    }}
                    className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    title="Delete class"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                {/* Join Code */}
                {joinCode && (
                  <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Join Code</p>
                        <p className="font-mono font-bold text-lg text-gray-900 dark:text-white">
                          {joinCode}
                        </p>
                      </div>
                      <button
                        onClick={() => copyToClipboard(joinCode)}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                        title="Copy code"
                      >
                        <Copy className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        onClick={() => copyToClipboard(getJoinLink(joinCode))}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Copy Join Link
                      </button>
                      {maxUses > 0 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {usedCount} / {maxUses} uses
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Stats */}
                <div className="flex items-center gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Users className="w-4 h-4" />
                    <span>{(cls as any).student_count || 0} students</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Class Modal */}
      <CreateClassModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => {
          setCreateModalOpen(false)
          fetchClasses()
        }}
      />

      {/* Delete Class Confirmation Modal */}
      {deleteClassConfirmOpen && classToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-shrink-0 w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Delete Class
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    This action cannot be undone
                  </p>
                </div>
              </div>
              <p className="text-gray-700 dark:text-gray-300 mb-6">
                Are you sure you want to delete <strong>{classToDelete.name}</strong>? 
                This will remove the class and all associated data. Students will be unenrolled from this class.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setDeleteClassConfirmOpen(false)
                    setClassToDelete(null)
                  }}
                  disabled={deleting}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteClass}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {deleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete Class
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}





