'use client'

import { useState, useEffect } from 'react'
import { supabaseAdmin } from '@/lib/supabase'
import { X, Check, Copy, Mail } from 'lucide-react'

interface CreateEducatorModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

interface Organization {
  id: string
  name: string
}

export default function CreateEducatorModal({ open, onClose, onSuccess }: CreateEducatorModalProps) {
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'form' | 'success'>('form')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    orgId: ''
  })
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [createdEducator, setCreatedEducator] = useState<{
    userId: string
    email: string
    verificationLink?: string
    loginUrl?: string
    resetLink?: string
  } | null>(null)
  const [copied, setCopied] = useState(false)
  const [showCreateOrg, setShowCreateOrg] = useState(false)
  const [newOrgName, setNewOrgName] = useState('')
  const [creatingOrg, setCreatingOrg] = useState(false)

  useEffect(() => {
    if (open) {
      fetchOrganizations()
    }
  }, [open])

  const fetchOrganizations = async () => {
    try {
      const { data, error } = await supabaseAdmin
        .from('organizations')
        .select('id, name')
        .order('name', { ascending: true })

      if (error) throw error
      
      // If no organizations exist, create dummy ones
      if (!data || data.length === 0) {
        await createDummyOrganizations()
        // Fetch again after creating
        const { data: newData, error: newError } = await supabaseAdmin
          .from('organizations')
          .select('id, name')
          .order('name', { ascending: true })
        
        if (newError) throw newError
        setOrganizations(newData || [])
      } else {
        setOrganizations(data || [])
      }
    } catch (error) {
      console.error('Error fetching organizations:', error)
      // Try to create dummy organizations as fallback
      await createDummyOrganizations()
      fetchOrganizations()
    }
  }

  const createDummyOrganizations = async () => {
    try {
      await fetch('/api/organizations/create-dummy', {
        method: 'POST'
      })
    } catch (error) {
      console.error('Error creating dummy organizations:', error)
    }
  }

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/educators/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create educator')
      }

      setCreatedEducator({
        userId: result.userId,
        email: result.email,
        verificationLink: result.verificationLink,
        loginUrl: result.loginUrl,
        resetLink: result.resetLink
      })
      setStep('success')
      
      // Refresh organizations list in case a new one was created
      if (showCreateOrg) {
        fetchOrganizations()
      }
    } catch (error: any) {
      // Better error handling
      const errorMessage = error.message || 'Failed to create educator'
      
      // Show user-friendly error message
      if (errorMessage.includes('already been registered') || errorMessage.includes('already exists')) {
        alert('This email is already registered. Please use a different email address or update the existing user.')
      } else {
        alert(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    if (text) {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const createOrganization = async () => {
    if (!newOrgName.trim()) {
      alert('Please enter an organization name')
      return
    }

    setCreatingOrg(true)
    try {
      const response = await fetch('/api/organizations/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newOrgName.trim() })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create organization')
      }

      // Refresh organizations list
      await fetchOrganizations()
      
      // Select the newly created organization
      setFormData({ ...formData, orgId: result.organization.id })
      
      // Hide create org form
      setShowCreateOrg(false)
      setNewOrgName('')
    } catch (error: any) {
      alert(error.message || 'Failed to create organization')
    } finally {
      setCreatingOrg(false)
    }
  }

  const handleClose = () => {
    setStep('form')
    setFormData({
      name: '',
      email: '',
      orgId: ''
    })
    setCreatedEducator(null)
    setShowCreateOrg(false)
    setNewOrgName('')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {step === 'form' ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create Educator</h2>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="educator@example.com"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Verification email will be sent to this email address
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Organization <span className="text-red-500">*</span>
                </label>
                {!showCreateOrg ? (
                  <>
                    <select
                      required={!showCreateOrg}
                      value={formData.orgId}
                      onChange={(e) => setFormData({ ...formData, orgId: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Select an organization</option>
                      {organizations.map((org) => (
                        <option key={org.id} value={org.id}>
                          {org.name}
                        </option>
                      ))}
                    </select>
                    {organizations.length === 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        No organizations found. Click below to create one.
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowCreateOrg(true)}
                      className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      + Create New Organization
                    </button>
                  </>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={newOrgName}
                      onChange={(e) => setNewOrgName(e.target.value)}
                      placeholder="Enter organization name"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={createOrganization}
                        disabled={creatingOrg}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
                      >
                        {creatingOrg ? 'Creating...' : 'Create Organization'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCreateOrg(false)
                          setNewOrgName('')
                        }}
                        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Info box */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <strong>Note:</strong> After creating the educator account, a verification email will be sent
                  to the educator's email address. They must click the verification link to set up their password and activate their account.
                </p>
              </div>

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
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Creating...' : 'Create Educator'}
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            {/* Success View */}
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
                  <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Educator Created Successfully!
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Verification email has been sent to the educator's email address
                </p>
              </div>

              {/* Magic Link */}
              {createdEducator && (
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Educator Email</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{createdEducator.email}</p>
                  </div>

                  {createdEducator.verificationLink && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-300 flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          Verification Link
                        </p>
                        <button
                          onClick={() => copyToClipboard(createdEducator.verificationLink!)}
                          className="p-2 hover:bg-blue-100 dark:hover:bg-blue-800 rounded transition-colors"
                          title="Copy verification link"
                        >
                          {copied ? (
                            <Check className="w-5 h-5 text-green-600" />
                          ) : (
                            <Copy className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-blue-800 dark:text-blue-400 break-all font-mono bg-white dark:bg-gray-800 p-2 rounded mt-2">
                        {createdEducator.verificationLink}
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-500 mt-2">
                        Verification email has been sent. The educator can click this link to verify their account and set up their password.
                      </p>
                    </div>
                  )}
                  
                  {createdEducator.resetLink && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-300 flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          Password Reset Link
                        </p>
                        <button
                          onClick={() => copyToClipboard(createdEducator.resetLink!)}
                          className="p-2 hover:bg-blue-100 dark:hover:bg-blue-800 rounded transition-colors"
                          title="Copy reset link"
                        >
                          {copied ? (
                            <Check className="w-5 h-5 text-green-600" />
                          ) : (
                            <Copy className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-blue-800 dark:text-blue-400 break-all font-mono bg-white dark:bg-gray-800 p-2 rounded mt-2">
                        {createdEducator.resetLink}
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-500 mt-2">
                        Password reset link has been sent via email.
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleClose}
                      className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => {
                        handleClose()
                        onSuccess()
                      }}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

