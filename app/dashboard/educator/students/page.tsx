'use client'

import { useState, useEffect } from 'react'
import { supabaseAdmin } from '@/lib/supabase'
import { Users, Search, GraduationCap, Mail, Phone, Filter, UserPlus } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Student {
  id: string
  user_id: string
  full_name: string | null
  email: string | null
  phone: string | null
  role: string
  status: string
  classes: Array<{
    id: string
    name: string
    subject: string | null
  }>
}

export default function StudentsPage() {
  const router = useRouter()
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterClass, setFilterClass] = useState<string>('all')
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([])
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([])

  useEffect(() => {
    fetchStudents()
    fetchClasses()
  }, [])

  useEffect(() => {
    filterStudents()
  }, [searchTerm, filterClass, students])

  const fetchClasses = async () => {
    try {
      const { data: { session } } = await supabaseAdmin.auth.getSession()
      if (!session) return

      const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('org_id')
        .eq('user_id', session.user.id)
        .single()

      if (!profile?.org_id) return

      const response = await fetch('/api/educator/classes/list', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const result = await response.json()
      if (result.success && result.classes) {
        setClasses(result.classes.map((cls: any) => ({ id: cls.id, name: cls.name })))
      }
    } catch (error) {
      console.error('Error fetching classes:', error)
    }
  }

  const fetchStudents = async () => {
    try {
      const { data: { session } } = await supabaseAdmin.auth.getSession()
      if (!session) {
        setLoading(false)
        return
      }

      // Get user's org_id
      const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('org_id')
        .eq('user_id', session.user.id)
        .single()

      if (!profile?.org_id) {
        setLoading(false)
        return
      }

      // Fetch all students in the organization
      const { data: orgStudents, error: studentsError } = await supabaseAdmin
        .from('user_profiles')
        .select('user_id, full_name, email, phone, role')
        .eq('org_id', profile.org_id)
        .eq('role', 'Student')

      if (studentsError) throw studentsError

      // Get enrollments for all students
      const userIds = (orgStudents || []).map(s => s.user_id)
      
      if (userIds.length === 0) {
        setStudents([])
        setLoading(false)
        return
      }

      const { data: enrollments, error: enrollmentsError } = await supabaseAdmin
        .from('enrollments')
        .select('user_id, class_id, status, classes(id, name, subject)')
        .in('user_id', userIds)

      if (enrollmentsError) throw enrollmentsError

      // Group enrollments by user_id
      const enrollmentsByUser = new Map<string, any[]>()
      enrollments?.forEach((enrollment: any) => {
        if (!enrollmentsByUser.has(enrollment.user_id)) {
          enrollmentsByUser.set(enrollment.user_id, [])
        }
        enrollmentsByUser.get(enrollment.user_id)!.push({
          id: enrollment.class_id,
          name: enrollment.classes?.name || 'Unknown',
          subject: enrollment.classes?.subject || null,
          status: enrollment.status
        })
      })

      // Combine student data with their classes
      const studentsData = (orgStudents || []).map((student: any) => ({
        id: student.user_id,
        user_id: student.user_id,
        full_name: student.full_name,
        email: student.email,
        phone: student.phone,
        role: student.role,
        status: 'active', // Default status
        classes: enrollmentsByUser.get(student.user_id) || []
      }))

      setStudents(studentsData)
    } catch (error) {
      console.error('Error fetching students:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterStudents = () => {
    let filtered = [...students]

    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(student =>
        student.full_name?.toLowerCase().includes(search) ||
        student.email?.toLowerCase().includes(search) ||
        student.phone?.includes(search)
      )
    }

    // Filter by class
    if (filterClass !== 'all') {
      filtered = filtered.filter(student =>
        student.classes.some(cls => cls.id === filterClass)
      )
    }

    setFilteredStudents(filtered)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Students</h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Manage and view all students in your organization
              </p>
            </div>
            {classes.length > 0 && (
              <button
                onClick={() => {
                  // Navigate to first class or show class selector
                  if (classes.length === 1) {
                    router.push(`/dashboard/educator/classes/${classes[0].id}?tab=roster`)
                  } else {
                    // Could show a modal to select class, for now just go to classes page
                    router.push('/dashboard/educator/classes')
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                Add Student to Class
              </button>
            )}
          </div>

          {/* Search and Filter */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search students by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Filter className="h-5 w-5 text-gray-400" />
              </div>
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                <option value="all">All Classes</option>
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

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {filteredStudents.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {searchTerm || filterClass !== 'all' ? 'No students found' : 'No students yet'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm || filterClass !== 'all'
                ? 'Try adjusting your search or filter criteria'
                : 'Students will appear here once they join your classes'}
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Classes
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                            <span className="text-blue-600 dark:text-blue-400 font-medium">
                              {student.full_name?.[0]?.toUpperCase() || 'S'}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {student.full_name || 'No name'}
                            </div>
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
                            <span className="text-gray-400">No contact info</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          {student.classes.length > 0 ? (
                            student.classes.map((cls) => (
                              <span
                                key={cls.id}
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                              >
                                <GraduationCap className="w-3 h-3 mr-1" />
                                {cls.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-sm text-gray-400">Not enrolled</span>
                          )}
                        </div>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Summary */}
        {filteredStudents.length > 0 && (
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            Showing {filteredStudents.length} of {students.length} students
            {filterClass !== 'all' && ` in selected class`}
            {searchTerm && ` matching "${searchTerm}"`}
          </div>
        )}
      </div>
    </div>
  )
}

