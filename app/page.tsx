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
        const { data } = await supabaseAdmin.auth.getSession()
        if (data.session) {
          // Check user role to redirect appropriately
          const { data: profile } = await supabaseAdmin
            .from('user_profiles')
            .select('role')
            .eq('user_id', data.session.user.id)
            .single()
          
          if (profile?.role === 'Educator') {
            router.push('/dashboard/educator')
          } else {
            router.push('/dashboard/overview')
          }
        } else {
          router.push('/login')
        }
      } catch (error) {
        router.push('/login')
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
