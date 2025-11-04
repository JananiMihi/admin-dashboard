'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { LogIn } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Hardcoded SuperAdmin credentials
      const HARDCODED_EMAIL = 'admin@neo'
      const HARDCODED_PASSWORD = 'Admin@1234'

      // Check if it's the hardcoded admin
      if (email === HARDCODED_EMAIL && password === HARDCODED_PASSWORD) {
        // Try to login, or create user if doesn't exist
        let loginData = await supabaseAdmin.auth.signInWithPassword({
          email: HARDCODED_EMAIL,
          password: HARDCODED_PASSWORD,
        })

        // If user doesn't exist, create it
        if (loginData.error && loginData.error.message.includes('Invalid login credentials')) {
          // Create the admin user
          const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: HARDCODED_EMAIL,
            password: HARDCODED_PASSWORD,
            email_confirm: true,
            user_metadata: {
              name: 'Super Admin',
              role: 'SuperAdmin'
            }
          })

          if (createError) throw createError

          // Create default organization if doesn't exist
          let orgId: string
          const { data: orgs } = await supabaseAdmin
            .from('organizations')
            .select('id')
            .limit(1)

          if (orgs && orgs.length > 0) {
            orgId = orgs[0].id
          } else {
            const { data: newOrg, error: orgError } = await supabaseAdmin
              .from('organizations')
              .insert({ name: 'Default Organization' })
              .select()
              .single()

            if (orgError) {
              console.error('Organization error:', orgError)
              orgId = '' // Continue without org
            } else {
              orgId = newOrg.id
            }
          }

          // Create user profile with SuperAdmin role
          const { error: profileError } = await supabaseAdmin
            .from('user_profiles')
            .upsert({
              user_id: createData.user.id,
              email: HARDCODED_EMAIL,
              full_name: 'Super Admin',
              role: 'SuperAdmin',
              org_id: orgId || null,
              onboarding_state: 'active'
            }, {
              onConflict: 'user_id'
            })

          if (profileError) {
            console.error('Profile error:', profileError)
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
        // Regular login for other users
        const { data, error } = await supabaseAdmin.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error

        if (data.session) {
          router.push('/dashboard')
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <LogIn className="mx-auto h-12 w-12 text-blue-600" />
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Admin Dashboard
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to manage student progress
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
