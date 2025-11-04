'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import EducatorSidebar from '@/components/educator/EducatorSidebar'
import EducatorHeader from '@/components/educator/EducatorHeader'

export default function EducatorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkUserRole()
  }, [])

  const checkUserRole = async () => {
    try {
      const { data: { session } } = await supabaseAdmin.auth.getSession()
      
      if (!session) {
        router.push('/login')
        return
      }

      // Get user profile to check role
      const { data: profile, error } = await supabaseAdmin
        .from('user_profiles')
        .select('role, org_id')
        .eq('user_id', session.user.id)
        .single()

      if (error || !profile) {
        console.error('Error fetching user profile:', error)
        router.push('/login')
        return
      }

      // Redirect if not educator (SuperAdmin can still access but see admin dashboard)
      if (profile.role === 'Student') {
        router.push('/dashboard/overview')
        return
      }

      // If SuperAdmin, they can access but might want to stay on admin dashboard
      if (profile.role === 'SuperAdmin') {
        // Optional: redirect to admin dashboard
        // router.push('/dashboard/overview')
      }

      setLoading(false)
    } catch (error) {
      console.error('Error checking user role:', error)
      router.push('/login')
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <EducatorSidebar />
      <div className="lg:pl-64">
        <EducatorHeader />
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}


