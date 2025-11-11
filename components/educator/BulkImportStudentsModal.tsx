'use client'

import { useState } from 'react'
import { supabaseAdmin } from '@/lib/supabase'
import { X, UploadCloud, FileSpreadsheet, Check, AlertCircle, Copy } from 'lucide-react'

type CredentialMethod = 'magic_link' | 'temp_password' | 'code_only'

interface ClassOption {
  id: string
  name: string
}

interface BulkImportStudentsModalProps {
  open: boolean
  classes: ClassOption[]
  onClose: () => void
  onSuccess: () => void
}

interface BulkResult {
  name: string
  email?: string
  phone?: string
  success: boolean
  error?: string
  temporaryPassword?: string
  joinLink?: string
  joinCode?: string
}

const credentialOptions: Array<{
  value: CredentialMethod
  label: string
  description: string
}> = [
  {
    value: 'magic_link',
    label: 'Magic link (email)',
    description:
      'Sends an email invite for each student. Rows without emails will be skipped.'
  },
  {
    value: 'temp_password',
    label: 'Temporary password',
    description:
      'Generates passwords you can export. Email is required to finalize these accounts.'
  },
  {
    value: 'code_only',
    label: 'Join link only',
    description:
      'Provides class join links/codes for you to distribute. Good for younger students.'
  }
]

export default function BulkImportStudentsModal({
  open,
  classes,
  onClose,
  onSuccess
}: BulkImportStudentsModalProps) {
  const [classId, setClassId] = useState('')
  const [credentialMethod, setCredentialMethod] =
    useState<CredentialMethod>('magic_link')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [results, setResults] = useState<BulkResult[]>([])
  const [summary, setSummary] = useState<{ total: number; success: number; failed: number } | null>(null)
  const [copying, setCopying] = useState<string | null>(null)

  const resetState = () => {
    setClassId('')
    setCredentialMethod('magic_link')
    setFile(null)
    setError(null)
    setSubmitting(false)
    setResults([])
    setSummary(null)
    setCopying(null)
  }

  const handleClose = () => {
    resetState()
    onClose()
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!file) {
      setError('Please upload a CSV file.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const { data: sessionResult } = await supabaseAdmin.auth.getSession()
      const session = sessionResult?.session
      if (!session) {
        throw new Error('Your session has expired. Please sign in again.')
      }

      const formData = new FormData()
      formData.append('file', file)
      formData.append('classId', classId)
      formData.append('credentialMethod', credentialMethod)

      const response = await fetch('/api/educator/students/bulk', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`
        },
        body: formData
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to import students.')
      }

      setResults(payload.results || [])
      setSummary(payload.summary || null)
      onSuccess()
    } catch (err: any) {
      setError(err?.message || 'Unable to import students right now.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDownloadTemplate = () => {
    const headers = ['name', 'email', 'phone', 'student_id', 'parent_email']
    const csvContent = `${headers.join(',')}\n`
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'student-import-template.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const copyValue = async (value?: string) => {
    if (!value) return
    await navigator.clipboard.writeText(value)
    setCopying(value)
    setTimeout(() => setCopying(null), 1500)
  }

  if (!open) return null

  const hasResults = results.length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
        <header className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Bulk import students
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Upload a CSV to create multiple student accounts and auto-enroll them.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="max-h-[80vh] overflow-y-auto px-6 py-6">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <section className="rounded-xl border border-gray-200 px-4 py-4 dark:border-gray-800">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                CSV format
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Include the following optional headers: <code>name</code>,{' '}
                <code>email</code>, <code>phone</code>, <code>student_id</code>,{' '}
                <code>parent_email</code>. The <code>name</code> column is required.
              </p>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="mt-3 inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Download template
              </button>
            </section>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Class <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={classId}
                  onChange={(event) => setClassId(event.target.value)}
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

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Credential delivery
                </label>
                <select
                  value={credentialMethod}
                  onChange={(event) =>
                    setCredentialMethod(event.target.value as CredentialMethod)
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  {credentialOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {credentialOptions.find(
                    (option) => option.value === credentialMethod
                  )?.description || ''}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center dark:border-gray-700">
              <input
                id="student-csv"
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(event) => {
                  const files = event.target.files
                  if (files && files[0]) {
                    setFile(files[0])
                  }
                }}
              />
              <label
                htmlFor="student-csv"
                className="flex cursor-pointer flex-col items-center justify-center gap-2 text-sm text-gray-600 transition hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-300"
              >
                <UploadCloud className="h-6 w-6" />
                {file ? (
                  <span className="font-medium text-gray-900 dark:text-white">
                    {file.name}
                  </span>
                ) : (
                  <span className="font-medium">Click to upload CSV</span>
                )}
                <span className="text-xs text-gray-500">
                  Only CSV files up to 2MB are supported.
                </span>
              </label>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-200">
              <div className="flex flex-col">
                <span className="font-medium">Auto-enroll to class</span>
                <span className="text-xs text-blue-700/70 dark:text-blue-300/70">
                  Every student added will immediately appear on the class roster.
                </span>
              </div>
              <Check className="h-5 w-5" />
            </div>

            <footer className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg px-4 py-2 text-sm text-gray-600 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !file}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
              >
                {submitting ? 'Importing...' : 'Import students'}
              </button>
            </footer>
          </form>

          {hasResults && summary && (
            <section className="mt-8 space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-200">
                <span>
                  Imported {summary.success} of {summary.total} students
                </span>
                {summary.failed > 0 && (
                  <span className="text-xs text-red-500">
                    {summary.failed} rows failed. Review messages below.
                  </span>
                )}
              </div>

              <div className="space-y-3">
                {results.map((item, index) => (
                  <div
                    key={`${item.name}-${index}`}
                    className={`rounded-xl border px-4 py-3 text-sm ${
                      item.success
                        ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-200'
                        : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">{item.name || 'Unknown'}</p>
                        <p className="text-xs opacity-80">
                          {item.email || item.phone || 'No contact provided'}
                        </p>
                      </div>
                      {item.success ? (
                        <span className="text-xs uppercase">Created</span>
                      ) : (
                        <span className="text-xs uppercase">Skipped</span>
                      )}
                    </div>
                    {!item.success && item.error && (
                      <p className="mt-2 text-xs opacity-80">{item.error}</p>
                    )}

                    {item.success && item.temporaryPassword && (
                      <div className="mt-3 flex items-center justify-between rounded-lg bg-white px-3 py-2 text-xs text-gray-900 shadow-sm dark:bg-gray-800 dark:text-gray-100">
                        <span className="font-mono">{item.temporaryPassword}</span>
                        <button
                          onClick={() => copyValue(item.temporaryPassword)}
                          className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                          {copying === item.temporaryPassword ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    )}
                    {item.success && item.joinLink && (
                      <p className="mt-2 text-xs opacity-80">
                        Join link: {item.joinLink}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}





