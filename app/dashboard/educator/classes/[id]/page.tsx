'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { ArrowLeft, Users, Settings, Copy, Check, GraduationCap, UserPlus, Mail, Phone, Trash2, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import AddStudentModal from '@/components/educator/AddStudentModal'

interface ClassData {
  id: string
  name: string
  subject: string | null
  grade: string | null
  section: string | null
  timezone: string
  created_at: string
  join_codes?: Array<{
    code: string
    used_count: number
    max_uses: number
    label: string | null
  }>
}

interface Student {
  id: string // Composite key: user_id-class_id
  user_id: string
  class_id: string
  full_name: string | null
  email: string | null
  phone: string | null
  age: number | null
  onboarding_state: string | null
  last_temporary_password: string | null
  last_password_generated_at: string | null
  status: string
  enrolled_at?: string
}

export default function ClassDetailPage() {
  const params = useParams()
  const router = useRouter()
  const classId = params.id as string
  
  const [classData, setClassData] = useState<ClassData | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'roster' | 'settings'>('overview')
  const [copied, setCopied] = useState(false)
  const [addStudentModalOpen, setAddStudentModalOpen] = useState(false)
  const [deleteClassConfirmOpen, setDeleteClassConfirmOpen] = useState(false)
  const [deleteStudentConfirmOpen, setDeleteStudentConfirmOpen] = useState(false)
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchClassData()
    fetchStudents()
    
    // Check for tab parameter in URL
    const urlParams = new URLSearchParams(window.location.search)
    const tabParam = urlParams.get('tab')
    if (tabParam === 'roster') {
      setActiveTab('roster')
    }
  }, [classId])

  const fetchClassData = async () => {
    try {
      const { data: { session } } = await supabaseAdmin.auth.getSession()
      if (!session) {
        setLoading(false)
        return
      }

      // Use API route to bypass RLS
      const response = await fetch(`/api/educator/classes/${classId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('Error fetching class:', result.error)
        setLoading(false)
        return
      }

      if (result.success && result.class) {
        setClassData(result.class as any)
      }
    } catch (error) {
      console.error('Error fetching class:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStudents = async () => {
    try {
      const { data: { session } } = await supabaseAdmin.auth.getSession()
      if (!session) {
        setStudents([])
        return
      }

      // Use API route to bypass RLS
      const response = await fetch(`/api/educator/classes/${classId}/students`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('Error fetching students:', result.error)
        setStudents([])
        return
      }

      if (result.success && result.students) {
        setStudents(result.students)
      } else {
        setStudents([])
      }
    } catch (error) {
      console.error('Error fetching students:', error)
      setStudents([])
    }
  }

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDeleteClass = async () => {
    try {
      setDeleting(true)
      const { data: { session } } = await supabaseAdmin.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const response = await fetch(`/api/educator/classes/${classId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete class')
      }

      // Redirect to classes list
      router.push('/dashboard/educator/classes')
    } catch (error: any) {
      console.error('Error deleting class:', error)
      alert(error.message || 'Failed to delete class')
    } finally {
      setDeleting(false)
      setDeleteClassConfirmOpen(false)
    }
  }

  const handleDeleteStudent = async () => {
    if (!studentToDelete) return

    try {
      setDeleting(true)
      const { data: { session } } = await supabaseAdmin.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const response = await fetch(`/api/educator/classes/${classId}/students`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          userId: studentToDelete.user_id
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to remove student')
      }

      // Refresh student list
      await fetchStudents()
      await fetchClassData()
      setDeleteStudentConfirmOpen(false)
      setStudentToDelete(null)
    } catch (error: any) {
      console.error('Error removing student:', error)
      alert(error.message || 'Failed to remove student')
    } finally {
      setDeleting(false)
    }
  }

  const getJoinLink = (code: string) => {
    return `${typeof window !== 'undefined' ? window.location.origin : ''}/join/${code}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!classData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Class Not Found</h2>
          <Link
            href="/dashboard/educator/classes"
            className="text-blue-600 hover:text-blue-700"
          >
            ← Back to Classes
          </Link>
        </div>
      </div>
    )
  }

  const joinCode = classData.join_codes?.[0]?.code
  const usedCount = classData.join_codes?.[0]?.used_count || 0
  const maxUses = classData.join_codes?.[0]?.max_uses || 0

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard/educator/classes"
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {classData.name}
                </h1>
                <div className="flex items-center gap-2 mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {classData.subject && <span>{classData.subject}</span>}
                  {classData.grade && <span>• Grade {classData.grade}</span>}
                  {classData.section && <span>• Section {classData.section}</span>}
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                setAddStudentModalOpen(true)
                setActiveTab('roster') // Switch to roster tab when adding student
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Add Student
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 -mb-px">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
                activeTab === 'overview'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border-transparent'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('roster')}
              className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 flex items-center gap-2 ${
                activeTab === 'roster'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border-transparent'
              }`}
            >
              <Users className="w-4 h-4" />
              Roster ({students.length})
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 flex items-center gap-2 ${
                activeTab === 'settings'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border-transparent'
              }`}
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Join Code Section */}
            {joinCode && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Join Code
                </h2>
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Class Join Code</p>
                    <div className="flex items-center justify-between">
                      <p className="font-mono font-bold text-3xl text-gray-900 dark:text-white">
                        {joinCode}
                      </p>
                      <button
                        onClick={() => copyToClipboard(joinCode)}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                      >
                        {copied ? (
                          <Check className="w-5 h-5 text-green-600" />
                        ) : (
                          <Copy className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Join Link</p>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm text-blue-600 dark:text-blue-400 break-all flex-1">
                        {getJoinLink(joinCode)}
                      </p>
                      <button
                        onClick={() => copyToClipboard(getJoinLink(joinCode))}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors flex-shrink-0"
                      >
                        {copied ? (
                          <Check className="w-5 h-5 text-green-600" />
                        ) : (
                          <Copy className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  {maxUses > 0 && (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Used: {usedCount} / {maxUses}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Class Information */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Class Information
              </h2>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Timezone</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">{classData.timezone}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Created</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {new Date(classData.created_at).toLocaleDateString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Students</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">{students.length}</dd>
                </div>
              </dl>
            </div>
          </div>
        )}

        {activeTab === 'roster' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Student Roster
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {students.length} {students.length === 1 ? 'student' : 'students'} enrolled
                  </p>
                </div>
                <button
                  onClick={() => setAddStudentModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Add Student
                </button>
              </div>
            </div>
            <div className="p-6">
              {students.length === 0 ? (
                <div className="text-center py-12">
                  <GraduationCap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 mb-2">No students enrolled yet</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
                    Add a student or share the join code with students to enroll
                  </p>
                  <button
                    onClick={() => setAddStudentModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <UserPlus className="w-4 h-4" />
                    Add First Student
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Student
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Contact
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Age
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Password
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Onboarding
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Enrolled
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {students.map((student) => (
                        <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                                <span className="text-blue-600 dark:text-blue-400 font-medium text-sm">
                                  {student.full_name?.[0]?.toUpperCase() || 'S'}
                                </span>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {student.full_name || 'No name'}
                                </div>
                                {student.email && (
                                  <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {student.email}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 dark:text-white">
                              {student.email && (
                                <div className="flex items-center gap-2 mb-1">
                                  <Mail className="w-4 h-4 text-gray-400" />
                                  <span>{student.email}</span>
                                </div>
                              )}
                              {student.phone && (
                                <div className="flex items-center gap-2">
                                  <Phone className="w-4 h-4 text-gray-400" />
                                  <span>{student.phone}</span>
                                </div>
                              )}
                              {!student.email && !student.phone && (
                                <span className="text-gray-400 text-sm">No contact info</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {typeof student.age === 'number' ? student.age : '—'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {student.last_temporary_password ? (
                              <div>
                                <div className="flex items-center gap-2">
                                  <code className="px-2 py-1 bg-gray-100 dark:bg-gray-900 rounded text-xs text-gray-700 dark:text-gray-200">
                                    {student.last_temporary_password}
                                  </code>
                                  <button
                                    onClick={() => copyToClipboard(student.last_temporary_password || '')}
                                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-xs"
                                  >
                                    Copy
                                  </button>
                                </div>
                                {student.last_password_generated_at && (
                                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                    Updated{' '}
                                    {new Date(student.last_password_generated_at).toLocaleString()}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {student.onboarding_state
                              ? student.onboarding_state.replace(/_/g, ' ')
                              : '—'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {student.enrolled_at
                              ? new Date(student.enrolled_at).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })
                              : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              student.status === 'active'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            }`}>
                              {student.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button
                              onClick={() => {
                                setStudentToDelete(student)
                                setDeleteStudentConfirmOpen(true)
                              }}
                              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 flex items-center gap-1"
                              title="Remove student from class"
                            >
                              <Trash2 className="w-4 h-4" />
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Class Settings
            </h2>
            
            {/* Danger Zone */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
              <h3 className="text-md font-semibold text-red-600 dark:text-red-400 mb-4">
                Danger Zone
              </h3>
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-sm text-red-800 dark:text-red-200 mb-4">
                  Once you delete a class, there is no going back. Please be certain.
                </p>
                <button
                  onClick={() => setDeleteClassConfirmOpen(true)}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  {deleting ? 'Deleting...' : 'Delete Class'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Student Modal */}
      {classData && (
        <AddStudentModal
          open={addStudentModalOpen}
          onClose={() => setAddStudentModalOpen(false)}
          onSuccess={async () => {
            // Switch to roster tab first
            setActiveTab('roster')
            // Wait a bit for the database to update
            await new Promise(resolve => setTimeout(resolve, 500))
            // Refresh student list and class data
            await fetchStudents()
            await fetchClassData()
          }}
          classId={classId}
          className={classData.name}
        />
      )}

      {/* Delete Class Confirmation Modal */}
      {deleteClassConfirmOpen && (
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
                Are you sure you want to delete <strong>{classData?.name}</strong>? 
                This will remove the class and all associated data. Students will be unenrolled from this class.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteClassConfirmOpen(false)}
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

      {/* Delete Student Confirmation Modal */}
      {deleteStudentConfirmOpen && studentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-shrink-0 w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Remove Student
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Remove student from this class
                  </p>
                </div>
              </div>
              <p className="text-gray-700 dark:text-gray-300 mb-6">
                Are you sure you want to remove <strong>{studentToDelete.full_name || studentToDelete.email || 'this student'}</strong> from <strong>{classData?.name}</strong>? 
                They will no longer have access to this class.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setDeleteStudentConfirmOpen(false)
                    setStudentToDelete(null)
                  }}
                  disabled={deleting}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteStudent}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {deleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Removing...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Remove Student
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

