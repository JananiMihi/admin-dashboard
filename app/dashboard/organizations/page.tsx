'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { supabaseAdmin } from '@/lib/supabase'
import {
  Plus,
  Building2,
  Users,
  CheckCircle2,
  X,
  Loader2,
  Mail
} from 'lucide-react'

interface Organization {
  id: string
  name: string
  created_at: string
}

interface OrganizationMember {
  id: string
  full_name: string | null
  email: string | null
  role: string | null
  onboarding_state: string | null
}

interface OrganizationClass {
  id: string
  name: string
  subject: string | null
  grade: string | null
  archived: boolean | null
  created_at: string | null
}

interface OrganizationDetails extends Organization {
  updated_at: string | null
  created_by: string | null
  educatorCount: number
  studentCount: number
  classCount: number
  educators: OrganizationMember[]
  students: OrganizationMember[]
  recentClasses: OrganizationClass[]
}

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [orgDetails, setOrgDetails] = useState<OrganizationDetails | null>(null)
  const [detailsError, setDetailsError] = useState<string | null>(null)

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

  const fetchOrganizationDetails = async (orgId: string) => {
    setDetailsLoading(true)
    setDetailsError(null)
    setOrgDetails(null)

    try {
      const { data, error } = await supabaseAdmin
        .from('organizations')
        .select(`
          id,
          name,
          created_at,
          updated_at,
          created_by,
          user_profiles (
            id,
            full_name,
            email,
            role,
            onboarding_state
          ),
          classes (
            id,
            name,
            subject,
            grade,
            archived,
            created_at
          )
        `)
        .eq('id', orgId)
        .maybeSingle()

      if (error) throw error
      if (!data) {
        setDetailsError('Organization details not found.')
        return
      }

      const relatedProfiles: OrganizationMember[] =
        (data as any).user_profiles || []
      const relatedClasses: OrganizationClass[] = (data as any).classes || []

      const educators = relatedProfiles.filter(
        (profile) => profile.role === 'Educator'
      )
      const students = relatedProfiles.filter(
        (profile) => profile.role === 'Student'
      )

      setOrgDetails({
        id: data.id,
        name: data.name,
        created_at: data.created_at,
        updated_at: data.updated_at ?? null,
        created_by: data.created_by ?? null,
        educatorCount: educators.length,
        studentCount: students.length,
        classCount: relatedClasses.length,
        educators,
        students,
        recentClasses: relatedClasses
      })
    } catch (error: any) {
      console.error('Error fetching organization details:', error)
      setDetailsError(
        error?.message || 'Unable to load organization details right now.'
      )
    } finally {
      setDetailsLoading(false)
    }
  }

  const handleSelectOrganization = (org: Organization) => {
    setSelectedOrg(org)
    setDetailsOpen(true)
    fetchOrganizationDetails(org.id)
  }

  const handleCloseDetails = () => {
    setDetailsOpen(false)
    setSelectedOrg(null)
    setOrgDetails(null)
    setDetailsError(null)
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
              role="button"
              tabIndex={0}
              onClick={() => handleSelectOrganization(org)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  handleSelectOrganization(org)
                }
              }}
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

      <OrganizationDetailsDrawer
        open={detailsOpen}
        onClose={handleCloseDetails}
        organization={selectedOrg}
        loading={detailsLoading}
        details={orgDetails}
        error={detailsError}
      />
    </div>
  )
}

interface OrganizationDetailsDrawerProps {
  open: boolean
  onClose: () => void
  organization: Organization | null
  loading: boolean
  details: OrganizationDetails | null
  error: string | null
}

function OrganizationDetailsDrawer({
  open,
  onClose,
  organization,
  loading,
  details,
  error
}: OrganizationDetailsDrawerProps) {
  if (!open || !organization) return null

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-end bg-black/40 backdrop-blur-sm">
      <div className="h-full w-full max-w-xl bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 shadow-xl flex flex-col">
        <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Organization
            </p>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              {organization.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-md text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close details panel"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {loading && (
            <div className="flex items-center justify-center py-20 text-gray-500 dark:text-gray-400">
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Loading organization details...
            </div>
          )}

          {!loading && error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-900/20 dark:text-red-300">
              {error}
            </div>
          )}

          {!loading && !error && details && (
            <div className="space-y-8">
              <section>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Snapshot
                </h3>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <StatCard
                    icon={<Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                    label="Educators"
                    value={details.educatorCount}
                  />
                  <StatCard
                    icon={<GraduationIcon />}
                    label="Students"
                    value={details.studentCount}
                  />
                  <StatCard
                    icon={<Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                    label="Classes"
                    value={details.classCount}
                  />
                </div>
                <dl className="mt-4 grid grid-cols-1 gap-3 text-sm text-gray-600 dark:text-gray-300">
                  <div className="flex justify-between">
                    <dt>Created</dt>
                    <dd>{new Date(details.created_at).toLocaleString()}</dd>
                  </div>
                  {details.updated_at && (
                    <div className="flex justify-between">
                      <dt>Last updated</dt>
                      <dd>{new Date(details.updated_at).toLocaleString()}</dd>
                    </div>
                  )}
                  {details.created_by && (
                    <div className="flex justify-between">
                      <dt>Created by (user id)</dt>
                      <dd className="truncate max-w-[60%] text-right text-xs font-mono">
                        {details.created_by}
                      </dd>
                    </div>
                  )}
                </dl>
              </section>

              <section>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Educators
                </h3>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Same roster available when creating an educator account.
                </p>
                <div className="mt-3 space-y-3">
                  {details.educators.length === 0 && (
                    <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                      No educators assigned yet.
                    </div>
                  )}
                  {details.educators.map((member) => (
                    <div
                      key={member.id}
                      className="rounded-lg border border-gray-200 dark:border-gray-800 px-4 py-3 bg-white dark:bg-gray-800/60"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {member.full_name || 'Unnamed educator'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {member.email || 'No email on record'}
                          </p>
                        </div>
                        <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/30 dark:text-blue-200">
                          {member.onboarding_state === 'active'
                            ? 'Active'
                            : 'Pending'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Recent Classes
                </h3>
                <div className="mt-3 space-y-3">
                  {details.recentClasses.length === 0 && (
                    <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                      No classes recorded for this organization yet.
                    </div>
                  )}
                  {details.recentClasses.map((orgClass) => (
                    <div
                      key={orgClass.id}
                      className="rounded-lg border border-gray-200 dark:border-gray-800 px-4 py-3 bg-white dark:bg-gray-800/60"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {orgClass.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {[orgClass.subject, orgClass.grade]
                              .filter(Boolean)
                              .join(' · ') || 'General'}
                          </p>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {orgClass.created_at
                            ? new Date(orgClass.created_at).toLocaleDateString()
                            : '—'}
                        </span>
                      </div>
                      {orgClass.archived && (
                        <span className="mt-2 inline-flex items-center rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                          Archived
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              {details.students.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Students
                  </h3>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Snapshot of learners tied to this institute.
                  </p>
                  <div className="mt-3 space-y-3">
                    {details.students.map((student) => (
                      <div
                        key={student.id}
                        className="rounded-lg border border-gray-200 dark:border-gray-800 px-4 py-3 bg-white dark:bg-gray-800/60"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {student.full_name || 'Unnamed student'}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {student.email || 'No email'}
                            </p>
                          </div>
                          <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 dark:border-green-900/40 dark:bg-green-900/30 dark:text-green-200">
                            {student.onboarding_state === 'active'
                              ? 'Active'
                              : 'Pending'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface StatCardProps {
  icon: ReactNode
  label: string
  value: number
}

function StatCard({ icon, label, value }: StatCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800/60 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {icon}
          <span>{label}</span>
        </div>
        <span className="text-lg font-semibold text-gray-900 dark:text-white">
          {value}
        </span>
      </div>
    </div>
  )
}

function GraduationIcon() {
  return (
    <svg
      className="w-4 h-4 text-purple-600 dark:text-purple-400"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 10L12 4 2 10l10 6 10-6z" />
      <path d="M6 12v5c3 1.5 9 1.5 12 0v-5" />
    </svg>
  )
}





