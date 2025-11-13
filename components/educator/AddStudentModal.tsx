'use client'

import { useState } from 'react'
import { supabaseAdmin } from '@/lib/supabase'
import { X, UserPlus, Mail, Phone, User, Check } from 'lucide-react'

interface AddStudentModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  classId: string
  className: string
}

export default function AddStudentModal({ open, onClose, onSuccess, classId, className }: AddStudentModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    email: '',
    phone: '',
    authMethod: 'temp_password' as 'magic_link' | 'temp_password',
    passwordMode: 'auto' as 'auto' | 'manual',
    manualPassword: '',
    sendInvitation: true
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [resultDetails, setResultDetails] = useState<{
    email: string | null
    phone: string | null
    age: number | null
    password?: string
    credentialMethod?: string
    enrollmentStatus?: string
    invitationSent?: boolean
  } | null>(null)

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)
    setResultDetails(null)

    try {
      const { data: { session } } = await supabaseAdmin.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      if (!formData.email && !formData.phone) {
        throw new Error('Provide at least an email or phone number.')
      }

      if (formData.authMethod === 'magic_link' && !formData.email) {
        throw new Error('Email is required to send a magic link.')
      }

      if (formData.authMethod === 'temp_password' && formData.passwordMode === 'manual') {
        if (!formData.manualPassword || formData.manualPassword.trim().length < 8) {
          throw new Error('Manual password must be at least 8 characters long.')
        }
      }

      const response = await fetch('/api/educator/students/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          name: formData.name,
          age: formData.age ? Number(formData.age) : null,
          email: formData.email || null,
          phone: formData.phone || null,
          classId,
          credentialMethod: formData.authMethod,
          passwordMode: formData.authMethod === 'temp_password' ? formData.passwordMode : undefined,
          manualPassword:
            formData.authMethod === 'temp_password' && formData.passwordMode === 'manual'
              ? formData.manualPassword
              : undefined
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to add student')
      }

      setSuccess(true)
      setResultDetails({
        email: (result.student?.email ?? formData.email) || null,
        phone: (result.student?.phone ?? formData.phone) || null,
        age: typeof result.student?.age === 'number' ? result.student.age : formData.age ? Number(formData.age) : null,
        password:
          result.student?.last_temporary_password ??
          (formData.authMethod === 'temp_password'
            ? formData.passwordMode === 'manual'
              ? formData.manualPassword
              : result.temporaryPassword
            : undefined),
        credentialMethod: result.credentialMethod,
        enrollmentStatus: result.enrollmentStatus,
        invitationSent: result.invitationSent
      })

      await onSuccess()
    } catch (error: any) {
      console.error('Error adding student:', error)
      setError(error.message || 'Failed to add student')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      name: '',
      age: '',
      email: '',
      phone: '',
      authMethod: 'temp_password',
      passwordMode: 'auto',
      manualPassword: '',
      sendInvitation: true
    })
    setError('')
    setSuccess(false)
    setResultDetails(null)
    onClose()
  }

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*'
    let pwd = ''
    for (let i = 0; i < 12; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setFormData((prev) => ({ ...prev, manualPassword: pwd, passwordMode: 'manual', authMethod: 'temp_password' }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {success ? (
          <div className="p-6 text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Student Added Successfully!
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {resultDetails?.credentialMethod === 'magic_link'
                ? resultDetails?.invitationSent
                  ? 'Invitation email has been sent to the student.'
                  : 'Student invited via magic link.'
                : 'Share the password with the student to log in.'}
            </p>
            {resultDetails && (
              <div className="text-left bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-4 space-y-2 text-sm text-gray-700 dark:text-gray-300">
                {resultDetails.age !== null && (
                  <div>
                    <span className="font-semibold">Age:</span> {resultDetails.age}
                  </div>
                )}
                {resultDetails.email && (
                  <div>
                    <span className="font-semibold">Email:</span> {resultDetails.email}
                  </div>
                )}
                {resultDetails.phone && (
                  <div>
                    <span className="font-semibold">Phone:</span> {resultDetails.phone}
                  </div>
                )}
                {resultDetails.password && (
                  <div className="space-y-1">
                    <div className="font-semibold">Password:</div>
                    <div className="flex items-center gap-2">
                      <code className="px-2 py-1 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 text-sm">
                        {resultDetails.password}
                      </code>
                      <button
                        onClick={() => navigator.clipboard.writeText(resultDetails.password || '')}
                        className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                )}
                {resultDetails.enrollmentStatus && (
                  <div>
                    <span className="font-semibold">Account Activity:</span> {resultDetails.enrollmentStatus}
                  </div>
                )}
              </div>
            )}
            <button
              onClick={handleClose}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Add Student</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Add to {className}</p>
              </div>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 p-4 rounded">
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <User className="w-4 h-4 inline mr-2" />
                  Student Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter student's full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Age
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter student's age"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Authentication Method
                  </label>
                  <select
                    value={formData.authMethod}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        authMethod: e.target.value as 'magic_link' | 'temp_password'
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="temp_password">Temporary Password</option>
                    <option value="magic_link">Magic Link (Email)</option>
                  </select>
                </div>
                {formData.authMethod === 'temp_password' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Password Mode
                    </label>
                    <select
                      value={formData.passwordMode}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          passwordMode: e.target.value as 'auto' | 'manual'
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="auto">Generate Automatically</option>
                      <option value="manual">Enter Manually</option>
                    </select>
                  </div>
                )}
              </div>

              {formData.authMethod === 'temp_password' && formData.passwordMode === 'manual' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Set Password <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.manualPassword}
                      onChange={(e) => setFormData({ ...formData, manualPassword: e.target.value })}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Enter password (min 8 characters)"
                    />
                    <button
                      type="button"
                      onClick={generatePassword}
                      className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm"
                    >
                      Generate
                    </button>
                  </div>
                </div>
              )}

              {formData.authMethod === 'temp_password' && formData.passwordMode === 'auto' && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  A secure password will be generated automatically. You can copy it after creation.
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Mail className="w-4 h-4 inline mr-2" />
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="student@example.com"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Required if you want to send an invitation email
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Phone className="w-4 h-4 inline mr-2" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="+1234567890"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  At least one of email or phone is required
                </p>
              </div>

              {formData.authMethod === 'magic_link' && formData.email && (
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="sendInvitation"
                    checked={formData.sendInvitation}
                    onChange={(e) => setFormData({ ...formData, sendInvitation: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="sendInvitation" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    Send invitation email with join code
                  </label>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    loading ||
                    (!formData.email && !formData.phone) ||
                    (formData.authMethod === 'magic_link' && !formData.email) ||
                    (formData.authMethod === 'temp_password' &&
                      formData.passwordMode === 'manual' &&
                      (!formData.manualPassword || formData.manualPassword.trim().length < 8))
                  }
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Adding...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Add Student
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

