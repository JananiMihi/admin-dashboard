'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { useState } from 'react'
import { LogIn } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Check if already logged in
    const checkSession = async () => {
      const { data: { session } } = await supabaseAdmin.auth.getSession()
      if (session) {
        // Check user role and redirect accordingly
        try {
          const { data: profile } = await supabaseAdmin
            .from('user_profiles')
            .select('role')
            .eq('user_id', session.user.id)
            .single()

          // SuperAdmin and other admin roles go to admin dashboard
          if (profile?.role === 'SuperAdmin' || profile?.role === 'Admin') {
            router.push('/dashboard')
          } else if (profile?.role === 'Educator') {
            // Educators should use educator login page
            router.push('/auth/educator-login')
          } else {
            router.push('/dashboard')
          }
        } catch (error) {
          router.push('/dashboard')
        }
      }
    }
    checkSession()
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Check if this is the hardcoded admin user
      const HARDCODED_EMAIL = 'admin@neo'
      const HARDCODED_PASSWORD = 'admin123'

      if (email === HARDCODED_EMAIL && password === HARDCODED_PASSWORD) {
        // Check if user exists, if not create them
        let loginData = await supabaseAdmin.auth.signInWithPassword({
          email: HARDCODED_EMAIL,
          password: HARDCODED_PASSWORD,
        })

        if (loginData.error && loginData.error.message.includes('Invalid login credentials')) {
          // User doesn't exist, create them
          const { data: signUpData, error: signUpError } = await supabaseAdmin.auth.signUp({
            email: HARDCODED_EMAIL,
            password: HARDCODED_PASSWORD,
          })

          if (signUpError) {
            console.error('Sign up error:', signUpError)
            // Continue anyway - user is created
          }

          // Login with new user
          loginData = await supabaseAdmin.auth.signInWithPassword({
            email: HARDCODED_EMAIL,
            password: HARDCODED_PASSWORD,
          })

          if (loginData.error) throw loginData.error
        } else if (loginData.error) {
          throw loginData.error
        }

        if (loginData.data?.session) {
          router.push('/dashboard')
        }
      } else {
        // Regular login for other users (should not be educators - they use educator-login)
        const { data, error } = await supabaseAdmin.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error

        if (data.session) {
          // Check user role and redirect accordingly
          const { data: profile } = await supabaseAdmin
            .from('user_profiles')
            .select('role')
            .eq('user_id', data.session.user.id)
            .single()

          // If educator tries to login here, redirect to educator login page
          if (profile?.role === 'Educator') {
            await supabaseAdmin.auth.signOut()
            router.push('/auth/educator-login')
            setError('Please use the Educator Login page to sign in.')
            setLoading(false)
            return
          } else {
            // SuperAdmin and other admin roles go to admin dashboard
            router.push('/dashboard')
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 text-blue-600 flex items-center justify-center">
            <LogIn className="h-12 w-12" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">Admin Dashboard</h2>
          <p className="mt-2 text-sm text-gray-600">Sign in to manage student progress</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <form className="mt-8 space-y-6 bg-white rounded-lg shadow p-6" onSubmit={handleLogin}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              placeholder="admin@neo"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              placeholder="••••••••"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Are you an educator?{' '}
            <a href="/auth/educator-login" className="font-medium text-blue-600 hover:text-blue-500">
              Educator Login
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
