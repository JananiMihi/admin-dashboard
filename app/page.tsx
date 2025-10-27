'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Simple check if admin is authenticated
    const checkAuth = async () => {
      try {
        const { data } = await supabaseAdmin.auth.getSession()
        if (data.session) {
          router.push('/dashboard/overview')
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
