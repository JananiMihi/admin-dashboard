'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabaseAdmin } from '@/lib/supabase'
import {
  Users,
  Search,
  GraduationCap,
  Mail,
  Phone,
  Filter,
  UserPlus,
  Download,
  RefreshCw,
  Send,
  Trash2,
  Clock,
  Loader2
} from 'lucide-react'
import CreateStudentModal from '@/components/educator/CreateStudentModal'
import BulkImportStudentsModal from '@/components/educator/BulkImportStudentsModal'

interface StudentClass {
  id: string
  name: string
  subject: string | null
}

interface Student {
  user_id: string
  full_name: string | null
  email: string | null
  phone: string | null
  role: string
  onboarding_state: string | null
  student_id: string | null
  parent_email: string | null
  last_seen_at: string | null
  age: number | null
  status: 'active' | 'pending'
  lastSeenDisplay: string | null
  classes: StudentClass[]
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterClass, setFilterClass] = useState<string>('all')
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([])
  const [isCreateModalOpen, setCreateModalOpen] = useState(false)
  const [isBulkModalOpen, setBulkModalOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    refreshData()
  }, [])

  const refreshData = async () => {
    await Promise.all([fetchStudents(), fetchClasses()])
  }

  const fetchClasses = async () => {
    try {
      const {
        data: { session }
      } = await supabaseAdmin.auth.getSession()
      if (!session) return

      const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('org_id')
        .eq('user_id', session.user.id)
        .single()

      if (!profile?.org_id) return

      const response = await fetch('/api/educator/classes/list', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      })

      const result = await response.json()
      if (result.success && result.classes) {
        setClasses(
          result.classes.map((cls: any) => ({
            id: cls.id,
            name: cls.name
          }))
        )
      }
    } catch (error) {
      console.error('Error fetching classes:', error)
    }
  }

  const fetchStudents = async () => {
    setLoading(true)
    try {
      const {
        data: { session }
      } = await supabaseAdmin.auth.getSession()
      if (!session) {
        setStudents([])
        return
      }

      const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('org_id')
        .eq('user_id', session.user.id)
        .single()

      if (!profile?.org_id) {
        setStudents([])
        return
      }

      const { data: orgStudents, error: studentsError } = await supabaseAdmin
        .from('user_profiles')
        .select(
          'user_id, full_name, email, phone, role, onboarding_state, student_id, parent_email, age, last_seen_at'
        )
        .eq('org_id', profile.org_id)
        .eq('role', 'Student')

      if (studentsError) throw studentsError

      const userIds = (orgStudents || []).map((student) => student.user_id)
      if (userIds.length === 0) {
        setStudents([])
        return
      }

      const { data: enrollments, error: enrollmentsError } = await supabaseAdmin
        .from('enrollments')
        .select('user_id, class_id, status, classes(id, name, subject)')
        .in('user_id', userIds)

      if (enrollmentsError) throw enrollmentsError

      const enrollmentsByUser = new Map<string, StudentClass[]>()
      enrollments?.forEach((enrollment: any) => {
        if (!enrollmentsByUser.has(enrollment.user_id)) {
          enrollmentsByUser.set(enrollment.user_id, [])
        }
        enrollmentsByUser.get(enrollment.user_id)!.push({
          id: enrollment.class_id,
          name: enrollment.classes?.name || 'Unknown class',
          subject: enrollment.classes?.subject || null
        })
      })

      const lastSeenMap = await fetchLastSeenMap(userIds)

      const studentsData: Student[] = (orgStudents || []).map((student: any) => {
        const lastSeen =
          student.last_seen_at ||
          lastSeenMap.get(student.user_id) ||
          null
        const status =
          student.onboarding_state === 'active' || lastSeen
            ? 'active'
            : 'pending'

        return {
          user_id: student.user_id,
          full_name: student.full_name,
          email: student.email,
          phone: student.phone,
          role: student.role,
          onboarding_state: student.onboarding_state,
          student_id: student.student_id,
          parent_email: student.parent_email,
          age: typeof student.age === 'number' ? student.age : student.age ? Number(student.age) || null : null,
          last_seen_at: lastSeen,
          status,
          lastSeenDisplay: lastSeen ? new Date(lastSeen).toLocaleString() : null,
          classes: enrollmentsByUser.get(student.user_id) || []
        }
      })

      setStudents(studentsData)
    } catch (error) {
      console.error('Error fetching students:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchLastSeenMap = async (userIds: string[]) => {
    const lastSeen = new Map<string, string>()
    const idsToFind = new Set(userIds)
    let page = 0
    const perPage = 200

    while (idsToFind.size > 0) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage
      })

      if (error) {
        console.error('Error listing auth users:', error)
        break
      }

      data?.users?.forEach((user) => {
        if (idsToFind.has(user.id)) {
          if (user.last_sign_in_at) {
            lastSeen.set(user.id, user.last_sign_in_at)
          } else if (user.confirmed_at) {
            lastSeen.set(user.id, user.confirmed_at)
          }
          idsToFind.delete(user.id)
        }
      })

      if (!data?.users || data.users.length < perPage) {
        break
      }
      page += 1
    }

    return lastSeen
  }

  const filteredStudents = useMemo(() => {
    const search = searchTerm.toLowerCase()
    return students.filter((student) => {
      const matchesSearch =
        !search ||
        student.full_name?.toLowerCase().includes(search) ||
        student.email?.toLowerCase().includes(search) ||
        student.phone?.includes(search) ||
        student.student_id?.toLowerCase().includes(search)

      const matchesClass =
        filterClass === 'all' ||
        student.classes.some((cls) => cls.id === filterClass)

      return matchesSearch && matchesClass
    })
  }, [students, searchTerm, filterClass])

  const handleResetPassword = async (student: Student) => {
    setActionLoading(`reset-${student.user_id}`)
    try {
      const {
        data: { session }
      } = await supabaseAdmin.auth.getSession()
      if (!session) {
        throw new Error('Your session has expired. Please sign in again.')
      }

      const response = await fetch('/api/educator/students/manage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          action: 'reset_password',
          studentId: student.user_id
        })
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to reset password.')
      }

      alert(
        `Temporary password for ${student.full_name || 'student'}: ${
          payload.temporaryPassword
        }`
      )
    } catch (error: any) {
      alert(error?.message || 'Unable to reset password.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleResendInvite = async (student: Student) => {
    setActionLoading(`invite-${student.user_id}`)
    try {
      const {
        data: { session }
      } = await supabaseAdmin.auth.getSession()
      if (!session) {
        throw new Error('Your session has expired. Please sign in again.')
      }

      const response = await fetch('/api/educator/students/manage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          action: 'resend_invite',
          studentId: student.user_id
        })
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to resend invite.')
      }

      alert(`Invite resent to ${payload.email}`)
    } catch (error: any) {
      alert(error?.message || 'Unable to resend invite.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleRemoveStudent = async (student: Student) => {
    const targetClassId =
      filterClass !== 'all'
        ? filterClass
        : student.classes[0]?.id

    if (!targetClassId) {
      alert('Student is not enrolled in any classes.')
      return
    }

    const confirmed = window.confirm(
      `Remove ${student.full_name || 'this student'} from the selected class?`
    )
    if (!confirmed) return

    setActionLoading(`remove-${student.user_id}`)
    try {
      const {
        data: { session }
      } = await supabaseAdmin.auth.getSession()
      if (!session) {
        throw new Error('Your session has expired. Please sign in again.')
      }

      const response = await fetch('/api/educator/students/manage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          action: 'remove',
          studentId: student.user_id,
          classId: targetClassId
        })
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to remove student.')
      }

      await fetchStudents()
    } catch (error: any) {
      alert(error?.message || 'Unable to remove student.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleExport = () => {
    if (filteredStudents.length === 0) return
    setExporting(true)
    const headers = [
      'Name',
      'Email',
      'Phone',
      'Age',
      'Student ID',
      'Parent Email',
      'Status',
      'Last Seen',
      'Classes'
    ]

    const rows = filteredStudents.map((student) => {
      const classes = student.classes.map((cls) => cls.name).join('; ')
      return [
        `"${student.full_name || ''}"`,
        `"${student.email || ''}"`,
        `"${student.phone || ''}"`,
        `"${student.age ?? ''}"`,
        `"${student.student_id || ''}"`,
        `"${student.parent_email || ''}"`,
        `"${student.status}"`,
        `"${student.lastSeenDisplay || ''}"`,
        `"${classes}"`
      ].join(',')
    })

    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'students.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    setExporting(false)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 pb-6 pt-8 sm:px-6 lg:px-8">
          <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">
                Students
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Create, import, and manage student accounts for your classes.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleExport}
                disabled={filteredStudents.length === 0 || exporting}
                className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                {exporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Export CSV
              </button>
              <button
                onClick={() => setBulkModalOpen(true)}
                className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                <Users className="h-4 w-4" />
                Import CSV
              </button>
              <button
                onClick={() => setCreateModalOpen(true)}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                <UserPlus className="h-4 w-4" />
                Add student
              </button>
            </div>
          </header>

          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by name, email, phone, or student ID"
                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm text-gray-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div className="relative w-full md:w-56">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Filter className="h-5 w-5 text-gray-400" />
              </div>
              <select
                value={filterClass}
                onChange={(event) => setFilterClass(event.target.value)}
                className="w-full appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-8 text-sm text-gray-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="all">All classes</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {filteredStudents.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <Users className="mx-auto mb-4 h-16 w-16 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {searchTerm || filterClass !== 'all'
                ? 'No students found'
                : 'No students yet'}
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {searchTerm || filterClass !== 'all'
                ? 'Try adjusting your search terms or clearing the class filter.'
                : 'Create a student or import a CSV to populate your roster.'}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-900 dark:text-gray-400">
                  <tr>
                    <th className="px-6 py-3 text-left">Name</th>
                    <th className="px-6 py-3 text-left">Username / contact</th>
                    <th className="px-6 py-3 text-left">Status</th>
                    <th className="px-6 py-3 text-left">Last seen</th>
                    <th className="px-6 py-3 text-left">Classes</th>
                    <th className="px-6 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm dark:divide-gray-800">
                  {filteredStudents.map((student) => (
                    <tr
                      key={student.user_id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/70"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600 dark:bg-blue-900 dark:text-blue-200">
                            {student.full_name?.[0]?.toUpperCase() || 'S'}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {student.full_name || 'Unnamed student'}
                            </p>
                            {student.student_id && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                ID: {student.student_id}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1 text-gray-700 dark:text-gray-200">
                          {student.email ? (
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-gray-400" />
                              <span>{student.email}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">
                              No email provided
                            </span>
                          )}
                          {student.phone ? (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-gray-400" />
                              <span>{student.phone}</span>
                            </div>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            student.status === 'active'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-200'
                          }`}
                        >
                          {student.status === 'active' ? 'Active' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span>{student.lastSeenDisplay || 'Not seen yet'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          {student.classes.length > 0 ? (
                            student.classes.map((cls) => (
                              <span
                                key={cls.id}
                                className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-200"
                              >
                                <GraduationCap className="h-3 w-3" />
                                {cls.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-gray-400">
                              Not enrolled
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <button
                            onClick={() => handleResetPassword(student)}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2 py-1 text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                          >
                            {actionLoading === `reset-${student.user_id}` ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3.5 w-3.5" />
                            )}
                            Reset
                          </button>
                          <button
                            onClick={() => handleResendInvite(student)}
                            disabled={!student.email}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2 py-1 text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                          >
                            {actionLoading === `invite-${student.user_id}` ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Send className="h-3.5 w-3.5" />
                            )}
                            Invite
                          </button>
                          <button
                            onClick={() => handleRemoveStudent(student)}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-2 py-1 text-red-600 transition hover:bg-red-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/20"
                          >
                            {actionLoading === `remove-${student.user_id}` ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {filteredStudents.length > 0 && (
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            Showing {filteredStudents.length} of {students.length} students
            {filterClass !== 'all' && ' in selected class'}
            {searchTerm && ` matching “${searchTerm}”`}
          </div>
        )}
      </div>

      <CreateStudentModal
        open={isCreateModalOpen}
        onClose={() => setCreateModalOpen(false)}
        classes={classes}
        onSuccess={fetchStudents}
      />

      <BulkImportStudentsModal
        open={isBulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        classes={classes}
        onSuccess={fetchStudents}
      />
    </div>
  )
}

