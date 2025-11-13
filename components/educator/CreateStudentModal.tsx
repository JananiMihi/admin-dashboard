'use client'

import { useEffect, useState } from 'react'
import { supabaseAdmin } from '@/lib/supabase'
import {
  X,
  Check,
  Copy,
  AlertCircle,
  Link2,
  Mail,
  Phone,
  ClipboardPenLine
} from 'lucide-react'

type CredentialMethod = 'magic_link' | 'temp_password' | 'code_only'

interface ClassOption {
  id: string
  name: string
}

interface CreateStudentModalProps {
  open: boolean
  classes: ClassOption[]
  onClose: () => void
  onSuccess: () => void
}

interface CreationResult {
  temporaryPassword?: string
  joinLink?: string
  joinCode?: string
  credentialMethod: CredentialMethod
  invitationSent?: boolean
  name: string
  email?: string | null
  phone?: string | null
}

const credentialOptions: Array<{
  value: CredentialMethod
  label: string
  description: string
  badge: string
}> = [
  {
    value: 'magic_link',
    label: 'Magic link',
    badge: 'Recommended',
    description:
      'Send a one-time verification link to the student by email. They choose their password on first login.'
  },
  {
    value: 'temp_password',
    label: 'Temporary password',
    badge: 'Manual',
    description:
      'Generate a temporary password you can share directly. Student must change it after first login.'
  },
  {
    value: 'code_only',
    label: 'Join code only',
    badge: 'Self-signup',
    description:
      'Share the class join link or code. The student completes their signup on their own.'
  }
]

export default function CreateStudentModal({
  open,
  classes,
  onClose,
  onSuccess
}: CreateStudentModalProps) {
  const [step, setStep] = useState<'form' | 'success'>('form')
  const [credentialMethod, setCredentialMethod] =
    useState<CredentialMethod>('magic_link')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copying, setCopying] = useState(false)
  const [passwordMode, setPasswordMode] = useState<'auto' | 'manual'>('auto')
  const [manualPassword, setManualPassword] = useState('')
  const [result, setResult] = useState<CreationResult | null>(null)
  useEffect(() => {
    if (credentialMethod !== 'temp_password') {
      setPasswordMode('auto')
      setManualPassword('')
    }
  }, [credentialMethod])

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    age: '',
    classId: ''
  })

  const closeModal = () => {
    setStep('form')
    setFormData({
      name: '',
      email: '',
      phone: '',
      age: '',
      classId: ''
    })
    setCredentialMethod('magic_link')
    setPasswordMode('auto')
    setManualPassword('')
    setError(null)
    setResult(null)
    onClose()
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const { data: sessionResult } = await supabaseAdmin.auth.getSession()
      const session = sessionResult?.session

      if (!session) {
        throw new Error('Your session has expired. Please sign in again.')
      }

      const trimmedManualPassword = manualPassword.trim()

      if (
        credentialMethod === 'temp_password' &&
        passwordMode === 'manual' &&
        trimmedManualPassword.length < 8
      ) {
        throw new Error('Manual password must be at least 8 characters.')
      }

      const response = await fetch('/api/educator/students/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim() || null,
          phone: formData.phone.trim() || null,
          age: formData.age ? Number(formData.age) : null,
          classId: formData.classId,
          credentialMethod,
          passwordMode,
          manualPassword:
            credentialMethod === 'temp_password' && passwordMode === 'manual'
              ? trimmedManualPassword
              : null
        })
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to create student.')
      }

      setResult({
        credentialMethod,
        temporaryPassword:
          payload.student?.last_temporary_password ?? payload.temporaryPassword ?? null,
        joinLink: payload.joinLink,
        joinCode: payload.joinCode,
        invitationSent: payload.invitationSent,
        name: formData.name.trim(),
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null
      })
      setStep('success')
      onSuccess()
    } catch (err: any) {
      setError(err?.message || 'Unable to create student right now.')
    } finally {
      setSubmitting(false)
    }
  }

  const copyToClipboard = async (value?: string | null) => {
    if (!value) return
    await navigator.clipboard.writeText(value)
    setCopying(true)
    setTimeout(() => setCopying(false), 1800)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
        <header className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Create student account
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Collect a few details and choose how the student receives access.
            </p>
          </div>
          <button
            onClick={closeModal}
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="max-h-[80vh] overflow-y-auto px-6 py-6">
          {step === 'form' && (
            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="col-span-full">
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Full name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        name: event.target.value
                      }))
                    }
                    placeholder="Avery Johnson"
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email
                  </label>
                  <div className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(event) =>
                        setFormData((prev) => ({
                          ...prev,
                          email: event.target.value
                        }))
                      }
                      placeholder="student@example.com"
                      className="flex-1 bg-transparent text-gray-900 outline-none dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Phone
                  </label>
                  <div className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(event) =>
                        setFormData((prev) => ({
                          ...prev,
                          phone: event.target.value
                        }))
                      }
                      placeholder="+1 555 123 4567"
                      className="flex-1 bg-transparent text-gray-900 outline-none dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Age
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formData.age}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        age: event.target.value
                      }))
                    }
                    placeholder="12"
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Class <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.classId}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        classId: event.target.value
                      }))
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="">Select class</option>
                    {classes.map((classOption) => (
                      <option key={classOption.id} value={classOption.id}>
                        {classOption.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <section>
                <p className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Credential delivery <span className="text-red-500">*</span>
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {credentialOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setCredentialMethod(option.value)}
                      className={`rounded-xl border p-4 text-left transition ${
                        credentialMethod === option.value
                          ? 'border-blue-500 bg-blue-50 dark:border-blue-500/70 dark:bg-blue-900/20'
                          : 'border-gray-200 hover:border-blue-400 dark:border-gray-800 dark:hover:border-blue-400'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {option.label}
                        </span>
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:bg-gray-800 dark:text-gray-300">
                          {option.badge}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        {option.description}
                      </p>
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Choose how the student (or their family) receives login
                  instructions. Email is required for magic links or temporary
                  passwords.
                </p>
              </section>

              {credentialMethod === 'temp_password' && (
                <section className="space-y-3 rounded-xl border border-purple-200 bg-purple-50 px-4 py-4 dark:border-purple-900/40 dark:bg-purple-900/20">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-purple-800 dark:text-purple-200">
                      Password delivery
                    </p>
                    <span className="text-xs text-purple-700/70 dark:text-purple-300/70">
                      Share securely with the student or guardian.
                    </span>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setPasswordMode('auto')}
                      className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition ${
                        passwordMode === 'auto'
                          ? 'border-purple-500 bg-white text-purple-700 dark:bg-purple-950 dark:text-purple-200'
                          : 'border-purple-200 bg-purple-100/40 text-purple-700 hover:border-purple-400 dark:border-purple-800 dark:bg-purple-900/40 dark:text-purple-200'
                      }`}
                    >
                      <span className="font-medium">Auto-generate</span>
                      <ClipboardPenLine className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPasswordMode('manual')}
                      className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition ${
                        passwordMode === 'manual'
                          ? 'border-purple-500 bg-white text-purple-700 dark:bg-purple-950 dark:text-purple-200'
                          : 'border-purple-200 bg-purple-100/40 text-purple-700 hover:border-purple-400 dark:border-purple-800 dark:bg-purple-900/40 dark:text-purple-200'
                      }`}
                    >
                      <span className="font-medium">Enter manually</span>
                      <span className="text-xs uppercase tracking-wide">
                        Choose
                      </span>
                    </button>
                  </div>

                  {passwordMode === 'manual' && (
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-purple-700 dark:text-purple-200">
                        Set temporary password <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={manualPassword}
                        onChange={(event) => setManualPassword(event.target.value)}
                        placeholder="Minimum 8 characters"
                        className="w-full rounded-lg border border-purple-300 bg-white px-4 py-2 text-sm text-purple-900 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-400/40 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-100"
                      />
                      <p className="text-xs text-purple-700/70 dark:text-purple-300/70">
                        Students will be prompted to change this after their first login.
                      </p>
                    </div>
                  )}
                </section>
              )}

              <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-200">
                <div className="flex flex-col">
                  <span className="font-medium">Auto-enroll to class</span>
                  <span className="text-xs text-blue-700/70 dark:text-blue-300/70">
                    Students are immediately added to the class roster you
                    choose.
                  </span>
                </div>
                <Check className="h-5 w-5" />
              </div>

              <footer className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg px-4 py-2 text-sm text-gray-600 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
                >
                  {submitting ? 'Creating...' : 'Create student'}
                </button>
              </footer>
            </form>
          )}

          {step === 'success' && result && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-700 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-200">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                  <Check className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Student ready</p>
                  <p className="text-xs text-green-700/70 dark:text-green-300/70">
                    {result.name} has been added and enrolled in the selected
                    class.
                  </p>
                </div>
              </div>

              <section className="space-y-4 rounded-xl border border-gray-200 px-4 py-4 dark:border-gray-800">
                <div className="flex justify-between">
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Credential method
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {credentialOptions.find(
                      (option) => option.value === result.credentialMethod
                    )?.label || result.credentialMethod}
                  </span>
                </div>
                {result.credentialMethod === 'magic_link' && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-200">
                    {result.invitationSent
                      ? 'Magic link email sent automatically.'
                      : 'Attempted to send magic link. Double-check the student email if they do not receive it.'}
                  </div>
                )}
                {result.credentialMethod === 'temp_password' && (
                  <div className="space-y-2 rounded-lg border border-purple-200 bg-purple-50 px-4 py-3 text-sm text-purple-700 dark:border-purple-900/40 dark:bg-purple-900/20 dark:text-purple-200">
                    <p className="font-semibold">Temporary password</p>
                    <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm text-gray-900 shadow-sm dark:bg-gray-800 dark:text-gray-100">
                      <span className="font-mono">
                        {result.temporaryPassword || 'Unavailable'}
                      </span>
                      <button
                        onClick={() =>
                          copyToClipboard(result.temporaryPassword ?? '')
                        }
                        className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        {copying ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-purple-600/70 dark:text-purple-300/70">
                      Share this password securely. The student will be prompted
                      to set a new one on first login.
                    </p>
                  </div>
                )}
                {result.credentialMethod === 'code_only' && (
                  <div className="space-y-2 rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-700 dark:border-gray-800 dark:text-gray-300">
                    <div className="flex items-center gap-2">
                      <Link2 className="h-4 w-4" />
                      <span>Share this join link with the student:</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm font-mono text-gray-900 shadow-sm dark:bg-gray-800 dark:text-gray-100">
                      <span className="truncate">{result.joinLink}</span>
                      <button
                        onClick={() => copyToClipboard(result.joinLink)}
                        className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        {copying ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {result.joinCode && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Join code: <span className="font-semibold">{result.joinCode}</span>
                      </p>
                    )}
                  </div>
                )}
              </section>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setStep('form')
                    setResult(null)
                    setFormData((prev) => ({
                      ...prev,
                      name: '',
                      email: '',
                      phone: '',
                      age: ''
                    }))
                    setPasswordMode('auto')
                    setManualPassword('')
                    setError(null)
                  }}
                  className="rounded-lg px-4 py-2 text-sm text-gray-600 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Add another
                </button>
                <button
                  onClick={closeModal}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


