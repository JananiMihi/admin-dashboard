'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Check auth and redirect based on role
    const checkAuth = async () => {
      try {
        const { data, error: sessionError } = await supabaseAdmin.auth.getSession()
        
        if (sessionError || !data.session) {
          router.push('/login')
          return
        }

        // Check user role to redirect appropriately
        const { data: profile, error: profileError } = await supabaseAdmin
          .from('user_profiles')
          .select('role')
          .eq('user_id', data.session.user.id)
          .single()
        
        // If profile query fails but session is valid, still allow access
        // This handles cases where profile might not exist yet or RLS issues
        if (profileError) {
          console.warn('Profile query failed, but session is valid:', profileError)
          // Default to student dashboard if we can't determine role
          router.push('/dashboard/overview')
          return
        }
        
        if (profile?.role === 'Educator') {
          router.push('/dashboard/educator')
        } else if (profile?.role === 'Student') {
          router.push('/dashboard/overview')
        } else if (profile?.role === 'SuperAdmin' || profile?.role === 'Admin') {
          router.push('/dashboard')
        } else {
          // Default to overview for students or unknown roles
          router.push('/dashboard/overview')
        }
      } catch (error) {
        console.error('Auth check error:', error)
        // Only redirect to login if it's a critical error
        // If session exists, try to proceed anyway
        const { data } = await supabaseAdmin.auth.getSession()
        if (data.session) {
          router.push('/dashboard/overview')
        } else {
          router.push('/login')
        }
      }
    }
    checkAuth()
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  )
}
